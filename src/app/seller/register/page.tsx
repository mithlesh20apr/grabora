'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useSeller } from '@/contexts/SellerContext';

interface FormData {
  name: string;
  email: string;
  mobile: string;
  storeName: string;
  storeDescription: string;
  businessType: string;
  agreeTerms: boolean;
}

export default function SellerRegisterPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: contextLoading } = useSeller();

  const [step, setStep] = useState(1); // 1: Mobile, 2: OTP, 3: Store Details
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    mobile: '',
    storeName: '',
    storeDescription: '',
    businessType: 'individual',
    agreeTerms: false,
  });

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success'
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !contextLoading) {
      router.push('/seller/dashboard');
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

  const validateMobile = (mobile: string): string => {
    if (!mobile.trim()) return 'Mobile number is required';
    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(mobile)) return 'Enter valid 10-digit Indian mobile number';
    return '';
  };

  const validateField = (name: string, value: string): string => {
    switch (name) {
      case 'name':
        if (!value.trim()) return 'Full name is required';
        if (value.length < 2) return 'Name must be at least 2 characters';
        if (value.length > 100) return 'Name must be less than 100 characters';
        return '';
      case 'email':
        if (!value.trim()) return ''; // Email is optional
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (value.trim() && !emailRegex.test(value)) return 'Please enter a valid email address';
        return '';
      case 'mobile':
        return validateMobile(value);
      case 'storeName':
        if (!value.trim()) return 'Store name is required';
        if (value.length < 3) return 'Store name must be at least 3 characters';
        if (value.length > 100) return 'Store name must be less than 100 characters';
        return '';
      case 'storeDescription':
        if (value && value.length > 500) return 'Description must be less than 500 characters';
        return '';
      default:
        return '';
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData(prev => ({ ...prev, [name]: newValue }));

    if (touched[name] && type !== 'checkbox') {
      const error = validateField(name, value);
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    const error = validateField(name, value);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // Only allow digits

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
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
    const mobileError = validateMobile(formData.mobile);
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
        body: JSON.stringify({ mobile: formData.mobile }),
      });

      const result = await response.json();

      if (result.success) {
        setOtpSent(true);
        setStep(2);
        setResendTimer(30);
        showToast(result.message || 'OTP sent successfully!', 'success');
        // Show OTP in dev mode
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
        body: JSON.stringify({ mobile: formData.mobile }),
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
        body: JSON.stringify({
          mobile: formData.mobile,
          otp: otpValue
        }),
      });

      const result = await response.json();

      if (result.success) {
        showToast('OTP verified successfully!', 'success');
        setStep(3);
      } else {
        showToast(result.message || 'Invalid OTP', 'error');
        setOtp(['', '', '', '', '', '']);
      }
    } catch (error) {
      showToast('Failed to verify OTP. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    const nameError = validateField('name', formData.name);
    const storeNameError = validateField('storeName', formData.storeName);
    const emailError = validateField('email', formData.email);

    if (nameError || storeNameError || emailError) {
      setErrors({ name: nameError, storeName: storeNameError, email: emailError });
      setTouched({ name: true, storeName: true, email: true });
      return;
    }

    if (!formData.agreeTerms) {
      showToast('Please agree to the Terms of Service and Privacy Policy', 'error');
      return;
    }

    setIsLoading(true);

    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v2';
      const response = await fetch(`${apiBaseUrl}/seller/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobile: formData.mobile,
          name: formData.name,
          email: formData.email || undefined,
          storeName: formData.storeName,
          storeDescription: formData.storeDescription || undefined,
          businessType: formData.businessType,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Store auth token
        if (result.data.token) {
          sessionStorage.setItem('seller_token', result.data.token);
        }

        showToast('Account created successfully! Redirecting...', 'success');
        setTimeout(() => {
          router.push('/seller/dashboard');
        }, 1500);
      } else {
        showToast(result.message || 'Registration failed. Please try again.', 'error');
      }
    } catch (error) {
      showToast('An unexpected error occurred. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const businessTypes = [
    { value: 'individual', label: 'Individual', icon: '👤' },
    { value: 'proprietorship', label: 'Proprietorship', icon: '🏪' },
    { value: 'partnership', label: 'Partnership', icon: '🤝' },
    { value: 'pvt_ltd', label: 'Private Limited', icon: '🏢' },
    { value: 'llp', label: 'LLP', icon: '📋' },
  ];

  if (contextLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-[#f26322]/20"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#f26322] animate-spin"></div>
          </div>
          <p className="text-white/70">Loading...</p>
        </div>
      </div>
    );
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
              <h1 className="text-4xl font-bold mb-4">Start Selling Today!</h1>
              <p className="text-xl text-white/80">Reach customers <b>near your shop </b> within 1-5 km
Deliver locally. Get paid fast.</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold">🏪 Local Delivery Supported</h3>
                  <p className="text-sm text-white/70">Deliver yourself to nearby customers</p>
                </div>
              </div>

              <div className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold">10L+ Active Customers</h3>
                  <p className="text-sm text-white/70">Reach a massive customer base</p>
                </div>
              </div>

              <div className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold">₹0 Registration Fee</h3>
                  <p className="text-sm text-white/70">Start selling with zero upfront cost</p>
                </div>
              </div>

              <div className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold">Fast 7-Day Payouts</h3>
                  <p className="text-sm text-white/70">Quick and reliable payments</p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-sm text-white/60">
            © 2026 Grabora. All rights reserved.
          </div>
        </div>
      </div>

      {/* Right Panel - Registration Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12 overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <Link href="/" className="inline-block">
              <Image src="/logo/logo.svg" alt="Grabora" width={150} height={42} style={{ height: 'auto' }} />
            </Link>
          </div>

          <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-6 lg:p-8 shadow-2xl">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Create Seller Account</h2>
              <p className="text-gray-400 text-sm">
                {step === 1 && 'Enter your mobile number to get started'}
                {step === 2 && 'Verify OTP sent to your mobile'}
                {step === 3 && 'Complete your seller profile'}
              </p>
            </div>

            {/* Step 1: Mobile Number */}
            {step === 1 && (
              <div className="space-y-5 animate-in fade-in duration-300">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Mobile Number *
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center px-4 rounded-l-xl border border-r-0 border-white/10 bg-white/5 text-gray-400 text-sm font-medium">
                      +91
                    </span>
                    <input
                      type="tel"
                      name="mobile"
                      value={formData.mobile}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
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
                  <p className="text-xs text-gray-500 mt-2">
                    We'll send you an OTP for verification
                  </p>
                </div>

                <button
                  type="button"
                  onClick={sendOTP}
                  disabled={isLoading}
                  className="w-full bg-[#f26322] hover:bg-[#e05512] text-white font-semibold py-4 rounded-xl transition-all duration-300 shadow-lg shadow-[#f26322]/25 hover:shadow-xl hover:shadow-[#f26322]/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
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
            {step === 2 && (
              <div className="space-y-5 animate-in fade-in duration-300">
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
                    OTP sent to +91 {formData.mobile}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={verifyOTP}
                  disabled={isLoading}
                  className="w-full bg-[#f26322] hover:bg-[#e05512] text-white font-semibold py-4 rounded-xl transition-all duration-300 shadow-lg shadow-[#f26322]/25 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Verifying...' : 'Verify OTP'}
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

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="w-1/2 border-2 border-white/10 text-white font-semibold py-3 rounded-xl hover:bg-white/5 transition-all text-sm"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="w-1/2 border-2 border-white/10 text-white font-semibold py-3 rounded-xl hover:bg-white/5 transition-all text-sm"
                  >
                    Change Mobile Number
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Store Details */}
            {step === 3 && (
              <form onSubmit={handleSubmit} className="space-y-5 animate-in fade-in duration-300">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Full Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    className={`w-full bg-white/5 border ${
                      errors.name && touched.name
                        ? 'border-red-500 focus:border-red-500'
                        : 'border-white/10 focus:border-[#f26322]'
                    } rounded-xl px-4 py-3.5 text-white placeholder-gray-500 focus:ring-4 focus:ring-[#f26322]/20 outline-none transition-all`}
                    placeholder="Enter your full name"
                  />
                  {errors.name && touched.name && (
                    <p className="mt-2 text-sm text-red-400">{errors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    className={`w-full bg-white/5 border ${
                      errors.email && touched.email
                        ? 'border-red-500 focus:border-red-500'
                        : 'border-white/10 focus:border-[#f26322]'
                    } rounded-xl px-4 py-3.5 text-white placeholder-gray-500 focus:ring-4 focus:ring-[#f26322]/20 outline-none transition-all`}
                    placeholder="seller@example.com"
                  />
                  {errors.email && touched.email && (
                    <p className="mt-2 text-sm text-red-400">{errors.email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Store Name *</label>
                  <input
                    type="text"
                    name="storeName"
                    value={formData.storeName}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    className={`w-full bg-white/5 border ${
                      errors.storeName && touched.storeName
                        ? 'border-red-500 focus:border-red-500'
                        : 'border-white/10 focus:border-[#f26322]'
                    } rounded-xl px-4 py-3.5 text-white placeholder-gray-500 focus:ring-4 focus:ring-[#f26322]/20 outline-none transition-all`}
                    placeholder="Your awesome store name"
                  />
                  {errors.storeName && touched.storeName && (
                    <p className="mt-2 text-sm text-red-400">{errors.storeName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Business Type</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {businessTypes.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, businessType: type.value }))}
                        className={`p-3 rounded-xl border transition-all duration-200 text-left ${
                          formData.businessType === type.value
                            ? 'border-[#f26322] bg-[#f26322]/10 text-white'
                            : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20'
                        }`}
                      >
                        <span className="text-lg mb-1 block">{type.icon}</span>
                        <span className="text-xs font-medium">{type.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Store Description (Optional)
                  </label>
                  <textarea
                    name="storeDescription"
                    value={formData.storeDescription}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 focus:border-[#f26322] rounded-xl px-4 py-3.5 text-white placeholder-gray-500 focus:ring-4 focus:ring-[#f26322]/20 outline-none transition-all resize-none"
                    placeholder="Tell customers about your store..."
                  />
                  <p className="text-xs text-gray-500 mt-1 text-right">{formData.storeDescription.length}/500</p>
                </div>

                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    name="agreeTerms"
                    checked={formData.agreeTerms}
                    onChange={handleInputChange}
                    className="w-5 h-5 mt-0.5 rounded border-white/20 bg-white/5 text-[#f26322] focus:ring-[#f26322] focus:ring-offset-0"
                  />
                  <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
                    I agree to the{' '}
                    <Link href="/terms" className="text-[#f26322] hover:underline">Terms of Service</Link>
                    {' '}and{' '}
                    <Link href="/privacy" className="text-[#f26322] hover:underline">Privacy Policy</Link>
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#f26322] hover:bg-[#e05512] text-white font-semibold py-4 rounded-xl transition-all duration-300 shadow-lg shadow-[#f26322]/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Creating Account...
                    </>
                  ) : (
                    <>
                      Create Account
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </>
                  )}
                </button>
              </form>
            )}

            <div className="mt-6 text-center">
              <p className="text-gray-400 text-sm">
                Already have a seller account?{' '}
                <Link href="/seller/login" className="text-[#f26322] hover:text-[#ff7a45] font-semibold transition-colors">
                  Sign In
                </Link>
              </p>
            </div>
          </div>

          <div className="mt-6 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
