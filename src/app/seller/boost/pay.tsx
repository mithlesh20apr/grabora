import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSeller } from '@/contexts/SellerContext';

interface BoostPlan {
  id: string;
  name: string;
  price: number;
  durationDays: number;
}

const BoostPayPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const planId = searchParams.get('planId');
  const [plan, setPlan] = useState<BoostPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'upi' | 'netbanking'>('card');
  const [cardDetails, setCardDetails] = useState({ cardNumber: '', cardHolder: '', expiryMonth: '', expiryYear: '', cvv: '' });
  const [upiId, setUpiId] = useState('');
  const [selectedBank, setSelectedBank] = useState('');
  const [paying, setPaying] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'success' | 'failure'>('idle');
  const { apiCall } = useSeller();

  useEffect(() => {
    if (!planId) {
      setError('No plan selected');
      setLoading(false);
      return;
    }
    const fetchPlan = async () => {
      try {
        const res = await apiCall('/boost/plans?id=' + planId, {
          headers: { 'Authorization': `Bearer ${sessionStorage.getItem('sellerToken')}` }
        });
        if (!res.ok) throw new Error('Failed to fetch plan');
        const data = await res.json();
        // Fix: find the plan from array if not directly available
        let foundPlan = data.plan;
        if (!foundPlan && Array.isArray(data.plans)) {
          foundPlan = data.plans.find((p: any) => p.key === planId || p.id === planId);
          if (foundPlan) {
            foundPlan.id = foundPlan.key;
            foundPlan.name = foundPlan.label;
            foundPlan.price = foundPlan.price;
            foundPlan.durationDays = foundPlan.durationInDays;
          }
        }
        if (!foundPlan) throw new Error('Plan not found');
        setPlan(foundPlan);
      } catch (err: any) {
        setError(err.message || 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    fetchPlan();
  }, [planId]);

  const handlePay = async () => {
    if (!plan) return;
    setPaying(true);
    setError(null);
    try {
      // Create boost order
      const orderRes = await apiCall('/boost/create-order', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionStorage.getItem('sellerToken')}` },
        body: JSON.stringify({ planId: plan.id }),
      });
      if (!orderRes.ok) throw new Error('Failed to create order');
      const orderData = await orderRes.json();
      // Load Razorpay script
      await new Promise((resolve, reject) => {
        if (document.getElementById('razorpay-script')) return resolve(true);
        const script = document.createElement('script');
        script.id = 'razorpay-script';
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => reject('Failed to load Razorpay');
        document.body.appendChild(script);
      });
      // Configure Razorpay payment method
      const paymentMethodConfig = {
        card: paymentMethod === 'card',
        upi: paymentMethod === 'upi',
        netbanking: paymentMethod === 'netbanking',
        wallet: false,
        emi: false,
        paylater: false,
      };
      // Prefill config
      const prefillConfig = {
        name: cardDetails.cardHolder || 'Seller',
        email: orderData.sellerEmail,
        contact: orderData.sellerMobile,
        vpa: paymentMethod === 'upi' ? upiId : undefined,
      };
      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Grabora Seller Boost',
        description: plan.name,
        order_id: orderData.orderId,
        prefill: prefillConfig,
        method: paymentMethodConfig,
        theme: { color: '#f26322' },
        handler: async function (response: any) {
          // Verify payment
          const verifyRes = await apiCall('/boost/verify-payment', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${sessionStorage.getItem('sellerToken')}` },
            body: JSON.stringify({
              orderId: orderData.orderId,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            }),
          });
          if (!verifyRes.ok) {
            setPaymentStatus('failure');
            setError('Payment verification failed');
            return;
          }
          setPaymentStatus('success');
          setTimeout(() => router.push('/seller/dashboard'), 2000);
        },
      };
      // @ts-ignore
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: any) {
      setError(err.message || 'Payment failed');
      setPaymentStatus('failure');
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center py-10 px-4">
      <div className="max-w-lg w-full">
        <h1 className="text-2xl font-bold text-white mb-4">Boost Payment</h1>
        {loading ? (
          <div className="text-white">Loading plan...</div>
        ) : error ? (
          <div className="text-red-400">{error}</div>
        ) : plan ? (
          <div className="bg-gradient-to-r from-[#f26322]/20 to-[#f26322]/5 border border-[#f26322]/20 rounded-2xl p-6 mb-6">
            <h2 className="text-xl font-bold text-white mb-1">{plan.name}</h2>
            <p className="text-lg text-[#f26322] font-semibold mb-2">₹{plan.price.toLocaleString()} / {plan.durationDays} days</p>
            {/* Payment Method Selection */}
            <div className="mb-4">
              <label className="block text-white font-semibold mb-2">Select Payment Method:</label>
              <div className="flex gap-4">
                <button type="button" className={`px-4 py-2 rounded-xl font-bold border-2 ${paymentMethod === 'card' ? 'bg-[#f26322] text-white border-[#f26322]' : 'bg-white text-[#f26322] border-[#f26322]'}`} onClick={() => setPaymentMethod('card')}>Card</button>
                <button type="button" className={`px-4 py-2 rounded-xl font-bold border-2 ${paymentMethod === 'upi' ? 'bg-[#f26322] text-white border-[#f26322]' : 'bg-white text-[#f26322] border-[#f26322]'}`} onClick={() => setPaymentMethod('upi')}>UPI</button>
                <button type="button" className={`px-4 py-2 rounded-xl font-bold border-2 ${paymentMethod === 'netbanking' ? 'bg-[#f26322] text-white border-[#f26322]' : 'bg-white text-[#f26322] border-[#f26322]'}`} onClick={() => setPaymentMethod('netbanking')}>Net Banking</button>
              </div>
            </div>
            {/* Payment Method Forms */}
            {paymentMethod === 'card' && (
              <div className="mb-4">
                <label className="block text-white font-semibold mb-2">Card Details</label>
                <input type="text" className="w-full mb-2 px-3 py-2 rounded bg-white/10 text-white" placeholder="Card Number" value={cardDetails.cardNumber} onChange={e => setCardDetails({ ...cardDetails, cardNumber: e.target.value })} />
                <input type="text" className="w-full mb-2 px-3 py-2 rounded bg-white/10 text-white" placeholder="Card Holder Name" value={cardDetails.cardHolder} onChange={e => setCardDetails({ ...cardDetails, cardHolder: e.target.value })} />
                <div className="flex gap-2">
                  <input type="text" className="w-1/2 mb-2 px-3 py-2 rounded bg-white/10 text-white" placeholder="MM" value={cardDetails.expiryMonth} onChange={e => setCardDetails({ ...cardDetails, expiryMonth: e.target.value })} />
                  <input type="text" className="w-1/2 mb-2 px-3 py-2 rounded bg-white/10 text-white" placeholder="YY" value={cardDetails.expiryYear} onChange={e => setCardDetails({ ...cardDetails, expiryYear: e.target.value })} />
                  <input type="text" className="w-1/2 mb-2 px-3 py-2 rounded bg-white/10 text-white" placeholder="CVV" value={cardDetails.cvv} onChange={e => setCardDetails({ ...cardDetails, cvv: e.target.value })} />
                </div>
              </div>
            )}
            {paymentMethod === 'upi' && (
              <div className="mb-4">
                <label className="block text-white font-semibold mb-2">UPI ID</label>
                <input type="text" className="w-full mb-2 px-3 py-2 rounded bg-white/10 text-white" placeholder="yourupi@bank" value={upiId} onChange={e => setUpiId(e.target.value)} />
              </div>
            )}
            {paymentMethod === 'netbanking' && (
              <div className="mb-4">
                <label className="block text-white font-semibold mb-2">Select Bank</label>
                <select className="w-full mb-2 px-3 py-2 rounded bg-white/10 text-white" value={selectedBank} onChange={e => setSelectedBank(e.target.value)}>
                  <option value="">Select Bank</option>
                  <option value="SBI">State Bank of India</option>
                  <option value="HDFC">HDFC Bank</option>
                  <option value="ICICI">ICICI Bank</option>
                  <option value="AXIS">Axis Bank</option>
                  <option value="KOTAK">Kotak Mahindra Bank</option>
                  <option value="PNB">Punjab National Bank</option>
                  <option value="BOB">Bank of Baroda</option>
                  <option value="IDFC">IDFC First Bank</option>
                  {/* Add more banks as needed */}
                </select>
              </div>
            )}
            <button
              className="px-6 py-3 bg-[#f26322] hover:bg-[#e05512] text-white font-semibold rounded-xl transition-all shadow-lg shadow-[#f26322]/25 w-full mt-4"
              onClick={handlePay}
              disabled={paying || paymentStatus === 'success'}
            >
              {paying ? 'Processing...' : paymentStatus === 'success' ? 'Payment Successful!' : 'Pay & Boost Now'}
            </button>
            {paymentStatus === 'failure' && (
              <div className="text-red-400 mt-2">Payment failed. Please try again.</div>
            )}
            {paymentStatus === 'success' && (
              <div className="text-emerald-400 mt-2">Payment successful! Redirecting...</div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default BoostPayPage;
