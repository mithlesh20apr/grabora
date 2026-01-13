'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useSeller } from '@/contexts/SellerContext';
import { PageLoader, ButtonLoader } from '@/components/ui/Loader';

export default function SellerLoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: contextLoading } = useSeller();

  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [step, setStep] = useState<'mobile' | 'otp'>('mobile');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !contextLoading) {
      router.replace('/seller/dashboard');
    }
  }, [isAuthenticated, contextLoading, router]);

  // Resend OTP timer
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  const validateMobile = (mobileValue: string): string => {
    if (!mobileValue.trim()) return 'Mobile number is required';
    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(mobileValue)) return 'Enter valid 10-digit Indian mobile number';
    return '';
  };

  const handleMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
    setMobile(value);
    if (touched.mobile) {
      const error = validateMobile(value);
      setErrors(prev => ({ ...prev, mobile: error }));
    }
  };

  const handleMobileBlur = () => {
    setTouched(prev => ({ ...prev, mobile: true }));
    const error = validateMobile(mobile);
    setErrors(prev => ({ ...prev, mobile: error }));
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (/^\d+$/.test(pastedData)) {
      const newOtp = pastedData.split('').concat(Array(6 - pastedData.length).fill(''));
      setOtp(newOtp);
    }
  };

  const sendOTP = async () => {
    const mobileError = validateMobile(mobile);
    if (mobileError) {
      setErrors({ mobile: mobileError });
      setTouched({ mobile: true });
      return;
    }

    setIsLoading(true);
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v2';
      const response = await fetch(`${apiBaseUrl}/seller/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile }),
      });

      const result = await response.json();

      if (result.success) {
        setStep('otp');
        setResendTimer(30);
        showToast(result.message || 'OTP sent successfully!', 'success');
        if (result.data?.otp) {
          console.log('Development OTP:', result.data.otp);
        }
      } else {
        showToast(result.message || 'Failed to send OTP', 'error');
      }
    } catch (error) {
      showToast('Failed to send OTP. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const resendOTP = async () => {
    setIsLoading(true);
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v2';
      const response = await fetch(`${apiBaseUrl}/seller/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile }),
      });

      const result = await response.json();

      if (result.success) {
        setResendTimer(30);
        setOtp(['', '', '', '', '', '']);
        showToast(result.message || 'OTP resent successfully!', 'success');
        if (result.data?.otp) {
          console.log('Development OTP:', result.data.otp);
        }
      } else {
        showToast(result.message || 'Failed to resend OTP', 'error');
      }
    } catch (error) {
      showToast('Failed to resend OTP. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOTP = async () => {
    const otpValue = otp.join('');
    if (otpValue.length !== 6) {
      showToast('Please enter complete OTP', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v2';
      const response = await fetch(`${apiBaseUrl}/seller/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, otp: otpValue }),
      });

      const result = await response.json();

      if (result.success && result.data?.tokens?.accessToken) {
        // Store credentials in sessionStorage
        sessionStorage.setItem('sellerToken', result.data.tokens.accessToken);
        sessionStorage.setItem('sellerRefreshToken', result.data.tokens.refreshToken || '');
        if (result.data.seller) {
          sessionStorage.setItem('seller', JSON.stringify(result.data.seller));
        }
        showToast('Login successful! Redirecting...', 'success');

        // Redirect to dashboard - the SellerContext will pick up the stored data
        setTimeout(() => {
          window.location.href = '/seller/dashboard';
        }, 1000);
      } else {
        showToast(result.message || 'Invalid OTP', 'error');
        setOtp(['', '', '', '', '', '']);
      }
    } catch (error) {
      showToast('Login failed. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (contextLoading) {
    return <PageLoader message="Loading..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] flex">
      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl backdrop-blur-sm border ${
          toast.type === 'success'
            ? 'bg-emerald-500/90 border-emerald-400/50'
            : 'bg-red-500/90 border-red-400/50'
        } text-white animate-in slide-in-from-right duration-300`}>
          {toast.type === 'success' ? (
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          <span className="font-medium">{toast.message}</span>
        </div>
      )}

      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#f26322] via-[#e05512] to-[#c44a0f]">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl"></div>
            <div className="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          </div>
        </div>

        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div>
            <Link href="/" className="inline-block">
              <Image src="/logo/logo.svg" alt="Grabora" width={160} height={45} style={{ height: 'auto' }} />
            </Link>
          </div>

          <div className="space-y-8">
            <div>
              <h1 className="text-4xl font-bold mb-4">Welcome back, Seller!</h1>
              <p className="text-xl text-white/80">Access your dashboard to manage products, orders, and grow your business.</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold">Real-time Analytics</h3>
                  <p className="text-sm text-white/70">Track sales, revenue, and performance</p>
                </div>
              </div>

              <div className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold">Fast Payouts</h3>
                  <p className="text-sm text-white/70">Get paid within 7 days of delivery</p>
                </div>
              </div>

              <div className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold">24/7 Support</h3>
                  <p className="text-sm text-white/70">Dedicated seller support team</p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-sm text-white/60">
            © 2026 Grabora. All rights reserved.
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <Link href="/" className="inline-block">
              <Image src="/logo/logo.svg" alt="Grabora" width={150} height={42} style={{ height: 'auto' }} />
            </Link>
          </div>

          {/* Form Card */}
          <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-8 shadow-2xl">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Seller Login</h2>
              <p className="text-gray-400">
                {step === 'mobile' ? 'Enter your mobile number to continue' : 'Verify OTP sent to your mobile'}
              </p>
            </div>

            {/* Step 1: Mobile Number */}
            {step === 'mobile' && (
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Mobile Number</label>
                  <div className="flex">
                    <span className="inline-flex items-center px-4 rounded-l-xl border border-r-0 border-white/10 bg-white/5 text-gray-400 text-sm font-medium">
                      +91
                    </span>
                    <input
                      type="tel"
                      value={mobile}
                      onChange={handleMobileChange}
                      onBlur={handleMobileBlur}
                      maxLength={10}
                      className={`flex-1 bg-white/5 border ${
                        errors.mobile && touched.mobile
                          ? 'border-red-500 focus:border-red-500'
                          : 'border-white/10 focus:border-[#f26322]'
                      } rounded-r-xl px-4 py-3.5 text-white placeholder-gray-500 focus:ring-4 focus:ring-[#f26322]/20 outline-none transition-all`}
                      placeholder="9876543210"
                      autoFocus
                    />
                  </div>
                  {errors.mobile && touched.mobile && (
                    <p className="mt-2 text-sm text-red-400">{errors.mobile}</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={sendOTP}
                  disabled={isLoading}
                  className="w-full bg-[#f26322] hover:bg-[#e05512] text-white font-semibold py-4 rounded-xl transition-all duration-300 shadow-lg shadow-[#f26322]/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <ButtonLoader />
                      Sending OTP...
                    </>
                  ) : (
                    <>
                      Send OTP
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Step 2: OTP Verification */}
            {step === 'otp' && (
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-4 text-center">
                    Enter 6-digit OTP
                  </label>
                  <div className="flex justify-center gap-2 mb-4">
                    {otp.map((digit, index) => (
                      <input
                        key={index}
                        id={`otp-${index}`}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        onPaste={handleOtpPaste}
                        className="w-12 h-14 bg-white/5 border border-white/10 focus:border-[#f26322] rounded-xl text-center text-white text-xl font-semibold focus:ring-4 focus:ring-[#f26322]/20 outline-none transition-all"
                      />
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 text-center">
                    OTP sent to +91 {mobile}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={verifyOTP}
                  disabled={isLoading}
                  className="w-full bg-[#f26322] hover:bg-[#e05512] text-white font-semibold py-4 rounded-xl transition-all duration-300 shadow-lg shadow-[#f26322]/25 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Verifying...' : 'Verify & Login'}
                </button>

                <div className="text-center">
                  {resendTimer > 0 ? (
                    <p className="text-sm text-gray-400">
                      Resend OTP in {resendTimer}s
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={resendOTP}
                      disabled={isLoading}
                      className="text-sm text-[#f26322] hover:text-[#ff7a45] font-semibold disabled:opacity-50"
                    >
                      Resend OTP
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setStep('mobile');
                    setOtp(['', '', '', '', '', '']);
                  }}
                  className="w-full border-2 border-white/10 text-white font-semibold py-3 rounded-xl hover:bg-white/5 transition-all text-sm"
                >
                  Change Mobile Number
                </button>
              </div>
            )}

            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-transparent text-gray-500">New to Grabora Seller?</span>
              </div>
            </div>

            {/* Register Link */}
            <Link
              href="/seller/register"
              className="w-full flex items-center justify-center gap-2 py-3.5 border-2 border-white/10 rounded-xl text-white font-medium hover:bg-white/5 hover:border-white/20 transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Create Seller Account
            </Link>
          </div>

          {/* Back to Store */}
          <div className="mt-8 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Store
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
