'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// Loading component for Suspense fallback
function UpiPaymentLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-[#ff3f6c] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Loading payment page...</p>
      </div>
    </div>
  );
}

// Main page component wrapper with Suspense
export default function UpiPaymentPage() {
  return (
    <Suspense fallback={<UpiPaymentLoading />}>
      <UpiPaymentContent />
    </Suspense>
  );
}

// Inner component that uses useSearchParams
function UpiPaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const orderId = searchParams.get('orderId');
  const upiId = searchParams.get('upiId');
  const amount = searchParams.get('amount');
  const upiApp = searchParams.get('app');
  
  const [timer, setTimer] = useState(300); // 5 minutes
  const [isProcessing, setIsProcessing] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'checking' | 'failed' | 'timeout'>('pending');

  // Countdown timer
  useEffect(() => {
    if (timer <= 0 && paymentStatus === 'pending') {
      setPaymentStatus('timeout');
      return;
    }

    if (paymentStatus === 'pending') {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timer, paymentStatus]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getAppDetails = () => {
    switch (upiApp) {
      case 'gpay':
        return {
          name: 'Google Pay',
          icon: (
            <svg className="w-12 h-12 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15l-5-5 1.41-1.41L11 14.17l7.59-7.59L20 8l-9 9z"/>
            </svg>
          ),
          gradient: 'from-blue-500 via-blue-600 to-blue-700',
        };
      case 'phonepe':
        return {
          name: 'PhonePe',
          icon: (
            <svg className="w-12 h-12 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
            </svg>
          ),
          gradient: 'from-purple-600 via-purple-700 to-purple-800',
        };
      case 'paytm':
        return {
          name: 'Paytm',
          icon: (
            <svg className="w-12 h-12 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
            </svg>
          ),
          gradient: 'from-cyan-500 via-blue-500 to-blue-600',
        };
      case 'bhim':
        return {
          name: 'BHIM',
          icon: <span className="text-white font-black text-4xl">B</span>,
          gradient: 'from-orange-500 via-red-500 to-red-600',
        };
      case 'amazonpay':
        return {
          name: 'Amazon Pay',
          icon: <span className="text-white font-black text-4xl">a</span>,
          gradient: 'from-yellow-400 via-orange-500 to-orange-600',
        };
      default:
        return {
          name: 'UPI App',
          icon: (
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          ),
          gradient: 'from-gray-500 to-gray-600',
        };
    }
  };

  const appDetails = getAppDetails();

  const handlePaymentComplete = () => {
    setPaymentStatus('checking');
    // Simulate payment verification (in real app, this would be API call)
    setTimeout(() => {
      setIsProcessing(false);
      router.push(`/order-confirmation?orderId=${orderId}`);
    }, 1500);
  };

  const handlePaymentFailed = () => {
    setPaymentStatus('failed');
  };

  const handleRetry = () => {
    setTimer(300);
    setPaymentStatus('pending');
  };

  const handleCancel = () => {
    // Clear pending order
    localStorage.removeItem('pendingOrder');
    router.push('/checkout');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full shadow-lg mb-4 ${
            paymentStatus === 'pending' ? 'bg-white' :
            paymentStatus === 'checking' ? 'bg-blue-50' :
            paymentStatus === 'failed' ? 'bg-red-50' :
            paymentStatus === 'timeout' ? 'bg-orange-50' : 'bg-white'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              paymentStatus === 'pending' ? 'bg-green-500 animate-pulse' :
              paymentStatus === 'checking' ? 'bg-blue-500 animate-pulse' :
              paymentStatus === 'failed' ? 'bg-red-500' :
              paymentStatus === 'timeout' ? 'bg-orange-500' : 'bg-green-500'
            }`}></div>
            <span className="text-sm font-bold text-gray-700">
              {paymentStatus === 'pending' && 'Payment in Progress'}
              {paymentStatus === 'checking' && 'Verifying Payment...'}
              {paymentStatus === 'failed' && 'Payment Failed'}
              {paymentStatus === 'timeout' && 'Payment Timeout'}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-800 mb-2">
            {paymentStatus === 'pending' || paymentStatus === 'checking' ? 'Complete Your Payment' : 'Payment Unsuccessful'}
          </h1>
          <p className="text-sm text-gray-600">Order ID: <span className="font-mono font-bold">{orderId}</span></p>
        </div>

        {/* Payment Checking State */}
        {paymentStatus === 'checking' && (
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-4">
              <svg className="w-10 h-10 text-blue-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <h2 className="text-xl font-black text-gray-800 mb-2">Verifying Your Payment</h2>
            <p className="text-sm text-gray-600">Please wait while we confirm your transaction...</p>
          </div>
        )}

        {/* Payment Failed State */}
        {(paymentStatus === 'failed' || paymentStatus === 'timeout') && (
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className={`p-8 text-center ${
              paymentStatus === 'timeout' ? 'bg-gradient-to-br from-orange-50 to-red-50' : 'bg-gradient-to-br from-red-50 to-pink-50'
            }`}>
              <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 ${
                paymentStatus === 'timeout' ? 'bg-orange-100' : 'bg-red-100'
              }`}>
                <svg className={`w-10 h-10 ${
                  paymentStatus === 'timeout' ? 'text-orange-600' : 'text-red-600'
                }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-2xl font-black text-gray-800 mb-2">
                {paymentStatus === 'timeout' ? 'Payment Time Expired' : 'Payment Failed'}
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                {paymentStatus === 'timeout' 
                  ? 'The payment time limit of 5 minutes has expired. Please try again.'
                  : 'Your payment could not be processed. This could be due to insufficient balance, wrong PIN, or network issues.'
                }
              </p>
            </div>

            {/* Failed Payment Details */}
            <div className="p-6 bg-gray-50 border-b border-gray-200">
              <h3 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide">Order Details</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-white p-3 rounded-lg">
                  <span className="text-sm text-gray-600">Order ID</span>
                  <span className="text-sm font-bold text-gray-800 font-mono">{orderId}</span>
                </div>
                <div className="flex items-center justify-between bg-white p-3 rounded-lg">
                  <span className="text-sm text-gray-600">Amount</span>
                  <span className="text-xl font-black text-gray-800">₹{amount ? parseFloat(amount).toLocaleString() : '0'}</span>
                </div>
                <div className="flex items-center justify-between bg-white p-3 rounded-lg">
                  <span className="text-sm text-gray-600">Status</span>
                  <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                    paymentStatus === 'timeout' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {paymentStatus === 'timeout' ? 'Timeout' : 'Failed'}
                  </span>
                </div>
              </div>
            </div>

            {/* Common Reasons */}
            <div className="p-6 bg-yellow-50 border-b border-yellow-200">
              <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                Common Reasons for Failure
              </h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-yellow-600">•</span>
                  <span>Insufficient balance in your account</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-600">•</span>
                  <span>Incorrect UPI PIN entered</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-600">•</span>
                  <span>Network connectivity issues</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-600">•</span>
                  <span>Payment declined by your bank</span>
                </li>
                {paymentStatus === 'timeout' && (
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-600">•</span>
                    <span>Payment request not completed within time limit</span>
                  </li>
                )}
              </ul>
            </div>

            {/* Action Buttons for Failed Payment */}
            <div className="p-6">
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <button
                  onClick={handleRetry}
                  className="flex-1 px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold text-sm shadow-lg hover:shadow-xl transform hover:scale-105 transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Retry Payment
                </button>
                <button
                  onClick={() => router.push('/checkout?payment=failed')}
                  className="flex-1 px-6 py-4 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all"
                >
                  Change Payment Method
                </button>
              </div>
              <button
                onClick={handleCancel}
                className="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-200 transition-all"
              >
                Cancel Order
              </button>
            </div>
          </div>
        )}

        {/* Main Card - Payment in Progress */}
        {paymentStatus === 'pending' && (
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Timer Section */}
          <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 p-6 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4 backdrop-blur-sm">
              <svg className="w-8 h-8 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-white text-5xl font-black mb-2 font-mono">
              {formatTime(timer)}
            </div>
            <p className="text-white/90 text-sm font-semibold">Time remaining to complete payment</p>
          </div>

          {/* Selected UPI App */}
          <div className="p-6 border-b border-gray-200">
            <p className="text-xs font-bold text-gray-500 mb-4 text-center uppercase tracking-wider">
              Complete Payment On
            </p>
            <div className="flex flex-col items-center animate-bounce-slow">
              <div className={`w-24 h-24 bg-gradient-to-br ${appDetails.gradient} rounded-2xl flex items-center justify-center shadow-2xl mb-3`}>
                {appDetails.icon}
              </div>
              <p className="text-xl font-black text-gray-800">{appDetails.name}</p>
            </div>
          </div>

          {/* Payment Details */}
          <div className="p-6 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide">Payment Details</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-white p-3 rounded-lg">
                <span className="text-sm text-gray-600">UPI ID</span>
                <span className="text-sm font-bold text-gray-800 font-mono">{upiId}</span>
              </div>
              <div className="flex items-center justify-between bg-white p-3 rounded-lg">
                <span className="text-sm text-gray-600">Amount to Pay</span>
                <span className="text-2xl font-black text-green-600">₹{amount ? parseFloat(amount).toLocaleString() : '0'}</span>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50">
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              Steps to Complete Payment
            </h3>
            <ol className="space-y-2">
              <li className="flex items-start gap-3 text-sm text-gray-700">
                <span className="flex-shrink-0 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-xs">1</span>
                <span>Open your {appDetails.name} application</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-gray-700">
                <span className="flex-shrink-0 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-xs">2</span>
                <span>Check for the payment request notification</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-gray-700">
                <span className="flex-shrink-0 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-xs">3</span>
                <span>Enter your UPI PIN to authorize the payment</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-gray-700">
                <span className="flex-shrink-0 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-xs">4</span>
                <span>Wait for payment confirmation</span>
              </li>
            </ol>
          </div>

          {/* Action Buttons */}
          <div className="p-6 space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handlePaymentComplete}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold text-sm shadow-lg hover:shadow-xl transform hover:scale-105 transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Payment Completed
              </button>
              <button
                onClick={handlePaymentFailed}
                className="flex-1 px-6 py-4 bg-white border-2 border-red-300 text-red-600 rounded-xl font-bold text-sm hover:bg-red-50 transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Payment Failed
              </button>
            </div>
            <button
              onClick={handleCancel}
              className="w-full px-6 py-3 bg-gray-100 text-gray-600 rounded-xl font-semibold text-sm hover:bg-gray-200 transition-all"
            >
              ← Back to Checkout
            </button>
          </div>
        </div>
        )}

        {/* Help Section */}
        {paymentStatus === 'pending' && (
          <div className="mt-6 bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-200">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm font-bold text-gray-800 mb-1">Need Help?</p>
                <p className="text-xs text-gray-600">Make sure you have sufficient balance in your UPI account. If the timer expires, you can retry the payment or change your payment method.</p>
              </div>
            </div>
          </div>
        )}

        {(paymentStatus === 'failed' || paymentStatus === 'timeout') && (
          <div className="mt-6 bg-blue-50 rounded-xl p-4 border border-blue-200">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm font-bold text-blue-900 mb-1">Don't worry, no money was deducted</p>
                <p className="text-xs text-blue-800">Since the payment failed, no amount has been debited from your account. You can safely retry the payment or choose a different payment method.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
