"use client";
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
  const [paying, setPaying] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'success' | 'failure'>('idle');
  const { apiCall } = useSeller();
  const RAZORPAY_KEY = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'upi' | 'netbanking'>('card');
  // Removed local payment details state, Razorpay will handle input

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
        if (!foundPlan && data.data && Array.isArray(data.data.plans)) {
          foundPlan = data.data.plans.find((p: any) => p.key === planId || p.id === planId);
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
    if (!plan) {
      setError('No plan found, aborting payment.');
      return;
    }
    setPaying(true);
    setError(null);
    try {
      // Create order
      const orderRes = await apiCall('/boost/create-order', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionStorage.getItem('sellerToken')}` },
        body: JSON.stringify({ plan: plan.id }),
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
      // Prefill config (minimal, Razorpay will collect details)
      const prefillConfig = {
        name: 'Seller',
        email: orderData.sellerEmail,
        contact: orderData.sellerMobile,
      };
      const options = {
        key: orderData.key || RAZORPAY_KEY,
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
          console.log('Razorpay response:', response);
          let planKey = planId;
          if ((!planKey || planKey === 'null') && plan) planKey = plan.id;
          // Razorpay response keys: razorpay_order_id, razorpay_payment_id, razorpay_signature
          const verifyRes = await apiCall('/boost/verify-payment', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${sessionStorage.getItem('sellerToken')}` },
            body: JSON.stringify({
              razorpay_order_id: orderData.orderId,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan: planKey,
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
      rzp.on('payment.failed', function () {
        setPaymentStatus('failure');
        setError('Razorpay payment failed');
      });
      if (options.modal) {
        options.modal.ondismiss = function () {
          setError('Razorpay modal closed/cancelled');
        };
      } else {
        options.modal = {
          ondismiss: function () {
            setError('Razorpay modal closed/cancelled');
          }
        };
      }
      rzp.open();
    } catch (err: any) {
      setError(err.message || 'Payment failed');
      setPaymentStatus('failure');
    } finally {
      setPaying(false);
    }
  };

  // Debug: Show sessionStorage contents in UI
  const [debugSession, setDebugSession] = useState<string>('');
  useEffect(() => {
    if (typeof window !== 'undefined') {
      let debugStr = '';
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        debugStr += key + ': ' + sessionStorage.getItem(key) + '\n';
      }
      setDebugSession(debugStr);
    }
  }, [paying, loading]);

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
            {/* No input boxes for payment details; Razorpay will handle all inputs */}
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
