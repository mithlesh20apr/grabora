'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useLoader } from '@/components/ui/Loader';

interface SupportTicket {
  _id: string;
  ticketId?: string;
  ticketNumber?: string;  // e.g., TKT-2026-00001
  userId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  subject: string;
  category: 'order' | 'payment' | 'delivery' | 'refund' | 'product' | 'account' | 'technical' | 'feedback' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  description?: string;
  orderId?: string;
  productId?: string;
  createdAt: string;
  updatedAt?: string;
  lastActivityAt?: string;
  rating?: {
    rating: number;  // 1-5 stars
    feedback: string;
  };
  messages?: TicketMessage[];
}

interface TicketMessage {
  _id: string;
  ticketId: string;
  senderId: string;
  senderName: string;
  senderType: 'customer' | 'support';
  message: string;
  createdAt: string;
}

export default function SupportPage() {
  const { user, isAuthenticated } = useAuth();
  const { showLoader, hideLoader } = useLoader();
  const [activeTab, setActiveTab] = useState<'new' | 'tickets' | 'faq'>('new');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });

  // New ticket form state
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    subject: '',
    category: 'order' as 'order' | 'payment' | 'delivery' | 'refund' | 'product' | 'account' | 'technical' | 'feedback' | 'other',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    description: '',
    orderId: '',
    productId: ''
  });

  // Reply form state
  const [replyMessage, setReplyMessage] = useState('');
  const [isReplySubmitting, setIsReplySubmitting] = useState(false);

  // Rating state
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingFeedback, setRatingFeedback] = useState('');
  const [isRatingSubmitting, setIsRatingSubmitting] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  // Load user data on mount
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        customerName: user.fullName || '',
        customerEmail: user.email || '',
        customerPhone: user.phone || ''
      }));
    }
  }, [user]);

  // Load user's support tickets
  useEffect(() => {
    if (isAuthenticated && activeTab === 'tickets') {
      loadUserTickets();
    }
  }, [activeTab, isAuthenticated]);

  const loadUserTickets = async () => {
    if (!isAuthenticated) {
      showToast('Please login to view your tickets', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const token = sessionStorage.getItem('token');
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v2';

      const response = await fetch(`${apiBaseUrl}/support/my-tickets`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const ticketsData = Array.isArray(result.data) ? result.data : [result.data];
          setTickets(ticketsData);
        }
      } else {
        showToast('Failed to load tickets', 'error');
      }
    } catch (error) {
      showToast('Error loading tickets', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated) {
      showToast('Please login to submit a ticket', 'error');
      return;
    }

    if (!formData.customerName.trim() || !formData.customerEmail.trim() || !formData.customerPhone.trim() || !formData.subject.trim() || !formData.description.trim()) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    setIsLoading(true);
    showLoader('Creating support ticket...');

    try {
      const token = sessionStorage.getItem('token');
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v2';

      const response = await fetch(`${apiBaseUrl}/support/tickets`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customerName: formData.customerName,
          customerEmail: formData.customerEmail,
          customerPhone: formData.customerPhone,
          subject: formData.subject,
          description: formData.description,
          category: formData.category,
          priority: formData.priority,
          ...(formData.orderId && { orderId: formData.orderId }),
          ...(formData.productId && { productId: formData.productId })
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          showToast('✅ Support ticket submitted successfully!', 'success');
          
          // Reset form
          setFormData({
            customerName: user?.fullName || '',
            customerEmail: user?.email || '',
            customerPhone: user?.phone || '',
            subject: '',
            category: 'order',
            priority: 'medium',
            description: '',
            orderId: '',
            productId: ''
          });

          // Load fresh tickets
          setTimeout(() => {
            setActiveTab('tickets');
            loadUserTickets();
          }, 1000);
        }
      } else {
        showToast('Failed to submit ticket', 'error');
      }
    } catch (error) {
      showToast('Error submitting ticket', 'error');
    } finally {
      setIsLoading(false);
      hideLoader();
    }
  };

  const handleReplyToTicket = async () => {
    if (!selectedTicket || !replyMessage.trim()) {
      showToast('Please enter a message', 'error');
      return;
    }

    setIsReplySubmitting(true);
    showLoader('Sending reply...');

    try {
      const token = sessionStorage.getItem('token');
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v2';

      const response = await fetch(`${apiBaseUrl}/support/tickets/${selectedTicket._id}/message`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: replyMessage
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          showToast('Reply sent successfully!', 'success');
          setReplyMessage('');
          
          // Reload ticket details
          loadTicketDetails(selectedTicket._id);
        }
      } else {
        showToast('Failed to send reply', 'error');
      }
    } catch (error) {
      showToast('Error sending reply', 'error');
    } finally {
      setIsReplySubmitting(false);
      hideLoader();
    }
  };

  const handleRateTicket = async () => {
    if (!selectedTicket) {
      showToast('No ticket selected', 'error');
      return;
    }

    setIsRatingSubmitting(true);
    showLoader('Submitting rating...');

    try {
      const token = sessionStorage.getItem('token');
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v2';

      const response = await fetch(`${apiBaseUrl}/support/tickets/${selectedTicket._id}/rate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          rating: ratingScore,
          feedback: ratingFeedback
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          showToast('Rating submitted! Thank you for your feedback.', 'success');
          setRatingScore(5);
          setRatingFeedback('');
          
          // Reload ticket details
          loadTicketDetails(selectedTicket._id);
        }
      } else {
        showToast('Failed to submit rating', 'error');
      }
    } catch (error) {
      showToast('Error submitting rating', 'error');
    } finally {
      setIsRatingSubmitting(false);
      hideLoader();
    }
  };

  const loadTicketDetails = async (ticketId: string) => {
    try {
      const token = sessionStorage.getItem('token');
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v2';

      const response = await fetch(`${apiBaseUrl}/support/tickets/${ticketId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setSelectedTicket(result.data);
        }
      }
    } catch (error) {
    }
  };

  const handleSelectTicket = async (ticket: SupportTicket) => {
    await loadTicketDetails(ticket._id);
  }

  const categories = [
    { value: 'order', label: 'Order Issue' },
    { value: 'payment', label: 'Payment Problem' },
    { value: 'delivery', label: 'Shipping & Delivery' },
    { value: 'refund', label: 'Return & Refund' },
    { value: 'product', label: 'Product Question' },
    { value: 'account', label: 'Account Help' },
    { value: 'technical', label: 'Technical Support' },
    { value: 'feedback', label: 'Feedback' },
    { value: 'other', label: 'Other' }
  ];

  const faqs = [
    {
      question: 'How do I track my order?',
      answer: 'You can track your order by going to the "Orders" page from your account menu or clicking "Track Order" in the More menu. Enter your order ID to see real-time tracking information.'
    },
    {
      question: 'What is your return policy?',
      answer: 'We offer a 7-day return policy for most products. Items must be unused and in original packaging. To initiate a return, go to your order details and click "Return Order".'
    },
    {
      question: 'How long does delivery take?',
      answer: 'Standard delivery takes 3-5 business days. Express delivery is available for 1-2 day shipping. Delivery times may vary based on your location.'
    },
    {
      question: 'How can I cancel my order?',
      answer: 'Orders can be cancelled within 24 hours of placement. Go to "My Orders", select the order, and click "Cancel Order". Refunds are processed within 5-7 business days.'
    },
    {
      question: 'What payment methods do you accept?',
      answer: 'We accept Credit/Debit Cards, UPI, Net Banking, Wallets, and Cash on Delivery (COD) for eligible orders.'
    },
    {
      question: 'How do I change my delivery address?',
      answer: 'If your order hasn\'t been shipped yet, you can update the address from your order details. Once shipped, please contact support for assistance.'
    },
    {
      question: 'Do you offer international shipping?',
      answer: 'Currently, we only ship within India. International shipping is coming soon!'
    },
    {
      question: 'How do I apply a coupon code?',
      answer: 'Enter your coupon code in the "Apply Coupon" field on the checkout page before completing your payment.'
    }
  ];

  const statusColors = {
    open: 'bg-blue-100 text-blue-800 border-blue-300',
    'in-progress': 'bg-purple-100 text-purple-800 border-purple-300',
    resolved: 'bg-green-100 text-green-800 border-green-300',
    closed: 'bg-gray-100 text-gray-800 border-gray-300'
  };

  const priorityColors = {
    low: 'bg-green-100 text-green-800 border-green-300',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    high: 'bg-orange-100 text-orange-800 border-orange-300',
    urgent: 'bg-red-100 text-red-800 border-red-300'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header - Mobile Optimized */}
        <div className="text-center mb-6 md:mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 md:w-20 md:h-20 bg-gradient-to-br from-[#184979] to-[#f26322] rounded-full mb-3 md:mb-4 shadow-lg">
            <svg className="w-7 h-7 md:w-10 md:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <h1 className="text-2xl md:text-4xl font-black text-[#184979] mb-1 md:mb-2">24×7 Customer Support</h1>
          <p className="text-gray-600 text-sm md:text-lg">We're here to help you anytime, anywhere</p>
          
          {/* Quick Contact Options - Mobile Stack */}
          <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-2 md:gap-4 mt-4 md:mt-6">
            <a href="tel:+918800000000" className="flex items-center justify-center gap-2 bg-white px-3 py-2 md:px-4 md:py-2 rounded-lg shadow hover:shadow-lg transition-all active:scale-95">
              <svg className="w-4 h-4 md:w-5 md:h-5 text-[#184979]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span className="font-semibold text-gray-700 text-sm md:text-base">+91 8800000000</span>
            </a>
            <a href="mailto:support@grabora.com" className="flex items-center justify-center gap-2 bg-white px-3 py-2 md:px-4 md:py-2 rounded-lg shadow hover:shadow-lg transition-all active:scale-95">
              <svg className="w-4 h-4 md:w-5 md:h-5 text-[#184979]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="font-semibold text-gray-700 text-sm md:text-base">support@grabora.com</span>
            </a>
          </div>
        </div>

        {/* Tabs - Mobile Scrollable */}
        <div className="bg-white rounded-xl shadow-lg mb-4 md:mb-6 overflow-hidden">
          <div className="flex border-b border-gray-200 overflow-x-auto scrollbar-hide">
            {[
              { id: 'new', label: 'Submit Ticket', shortLabel: 'New', icon: '✉️' },
              { id: 'tickets', label: 'My Tickets', shortLabel: 'Tickets', icon: '📋', count: tickets.length },
              { id: 'faq', label: 'FAQs', shortLabel: 'FAQs', icon: '❓' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 min-w-[100px] px-3 py-3 md:px-6 md:py-4 font-bold transition-all relative text-xs md:text-base whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-[#184979] to-[#f26322] text-white'
                    : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                }`}
              >
                <span className="mr-1 md:mr-2">{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.shortLabel}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`ml-1 md:ml-2 px-1.5 md:px-2 py-0.5 rounded-full text-[10px] md:text-xs font-bold ${
                    activeTab === tab.id ? 'bg-white text-[#184979]' : 'bg-[#f26322] text-white'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-xl shadow-lg p-4 md:p-6">
          {/* Submit New Ticket Tab */}
          {activeTab === 'new' && (
            <div className="max-w-3xl mx-auto">
              <h2 className="text-lg md:text-2xl font-black text-[#184979] mb-4 md:mb-6">Submit a Support Ticket</h2>
              {!isAuthenticated ? (
                <div className="text-center py-8 md:py-12 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
                  <svg className="w-12 h-12 md:w-16 md:h-16 text-blue-400 mx-auto mb-3 md:mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-2">Please Login</h3>
                  <p className="text-gray-600 mb-4 md:mb-6 text-sm md:text-base px-4">You need to be logged in to submit a support ticket.</p>
                  <Link
                    href="/login"
                    className="bg-gradient-to-r from-[#184979] to-[#f26322] text-white px-5 py-2.5 md:px-6 md:py-3 rounded-xl font-bold hover:shadow-lg transition-all inline-block text-sm md:text-base"
                  >
                    Go to Login
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSubmitTicket} className="space-y-4 md:space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div>
                      <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1.5 md:mb-2">Your Name *</label>
                      <input
                        type="text"
                        value={formData.customerName}
                        onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                        className="w-full px-3 py-2.5 md:px-4 md:py-3 text-sm md:text-base border-2 border-gray-300 rounded-lg md:rounded-xl focus:border-[#184979] focus:ring-2 focus:ring-[#184979]/20 outline-none transition-all bg-white text-gray-900 placeholder:text-gray-500"
                        required
                        placeholder="Enter your name"
                      />
                    </div>
                    <div>
                      <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1.5 md:mb-2">Email *</label>
                      <input
                        type="email"
                        value={formData.customerEmail}
                        onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                        className="w-full px-3 py-2.5 md:px-4 md:py-3 text-sm md:text-base border-2 border-gray-300 rounded-lg md:rounded-xl focus:border-[#184979] focus:ring-2 focus:ring-[#184979]/20 outline-none transition-all bg-white text-gray-900 placeholder:text-gray-500"
                        required
                        placeholder="Your email"
                      />
                    </div>
                    <div>
                      <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1.5 md:mb-2">Phone Number *</label>
                      <input
                        type="tel"
                        value={formData.customerPhone}
                        onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                        className="w-full px-3 py-2.5 md:px-4 md:py-3 text-sm md:text-base border-2 border-gray-300 rounded-lg md:rounded-xl focus:border-[#184979] focus:ring-2 focus:ring-[#184979]/20 outline-none transition-all bg-white text-gray-900 placeholder:text-gray-500"
                        required
                        placeholder="10-digit phone number"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div>
                      <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1.5 md:mb-2">Category *</label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                        className="w-full px-3 py-2.5 md:px-4 md:py-3 text-sm md:text-base border-2 border-gray-300 rounded-lg md:rounded-xl focus:border-[#184979] focus:ring-2 focus:ring-[#184979]/20 outline-none transition-all bg-white text-gray-900"
                        required
                      >
                        {categories.map(cat => (
                          <option key={cat.value} value={cat.value}>{cat.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1.5 md:mb-2">Priority *</label>
                      <select
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                        className="w-full px-3 py-2.5 md:px-4 md:py-3 text-sm md:text-base border-2 border-gray-300 rounded-lg md:rounded-xl focus:border-[#184979] focus:ring-2 focus:ring-[#184979]/20 outline-none transition-all bg-white text-gray-900"
                        required
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div>
                      <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1.5 md:mb-2">Order ID (Optional)</label>
                      <input
                        type="text"
                        value={formData.orderId}
                        onChange={(e) => setFormData({ ...formData, orderId: e.target.value })}
                        className="w-full px-3 py-2.5 md:px-4 md:py-3 text-sm md:text-base border-2 border-gray-300 rounded-lg md:rounded-xl focus:border-[#184979] focus:ring-2 focus:ring-[#184979]/20 outline-none transition-all bg-white text-gray-900 placeholder:text-gray-500"
                        placeholder="e.g., ORD-2026-00123"
                      />
                    </div>
                    <div>
                      <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1.5 md:mb-2">Product ID (Optional)</label>
                      <input
                        type="text"
                        value={formData.productId}
                        onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                        className="w-full px-3 py-2.5 md:px-4 md:py-3 text-sm md:text-base border-2 border-gray-300 rounded-lg md:rounded-xl focus:border-[#184979] focus:ring-2 focus:ring-[#184979]/20 outline-none transition-all bg-white text-gray-900 placeholder:text-gray-500"
                        placeholder="Product ID"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1.5 md:mb-2">Subject *</label>
                    <input
                      type="text"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full px-3 py-2.5 md:px-4 md:py-3 text-sm md:text-base border-2 border-gray-300 rounded-lg md:rounded-xl focus:border-[#184979] focus:ring-2 focus:ring-[#184979]/20 outline-none transition-all bg-white text-gray-900 placeholder:text-gray-500"
                      required
                      placeholder="Brief subject of your issue"
                    />
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1.5 md:mb-2">Description *</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2.5 md:px-4 md:py-3 text-sm md:text-base border-2 border-gray-300 rounded-lg md:rounded-xl focus:border-[#184979] focus:ring-2 focus:ring-[#184979]/20 outline-none transition-all bg-white text-gray-900 placeholder:text-gray-500 min-h-[120px] md:min-h-[150px]"
                      required
                      placeholder="Please describe your issue in detail..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-[#184979] to-[#f26322] text-white py-3 md:py-4 rounded-lg md:rounded-xl font-bold text-sm md:text-lg hover:shadow-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Submitting...' : 'Submit Ticket'}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* My Tickets Tab - Mobile Optimized */}
          {activeTab === 'tickets' && (
            <div>
              {!isAuthenticated ? (
                <div className="text-center py-8 md:py-12 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
                  <svg className="w-12 h-12 md:w-16 md:h-16 text-blue-400 mx-auto mb-3 md:mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-2">Please Login</h3>
                  <p className="text-gray-600 mb-4 md:mb-6 text-sm md:text-base px-4">You need to be logged in to view your support tickets.</p>
                  <Link
                    href="/login"
                    className="bg-gradient-to-r from-[#184979] to-[#f26322] text-white px-5 py-2.5 md:px-6 md:py-3 rounded-xl font-bold hover:shadow-lg transition-all inline-block text-sm md:text-base"
                  >
                    Go to Login
                  </Link>
                </div>
              ) : !selectedTicket ? (
                <>
                  <div className="flex items-center justify-between mb-4 md:mb-6">
                    <h2 className="text-lg md:text-2xl font-black text-[#184979]">Your Support Tickets</h2>
                    {tickets.length > 0 && (
                      <button
                        onClick={loadUserTickets}
                        className="flex items-center gap-1.5 md:gap-2 bg-gradient-to-r from-[#184979] to-[#f26322] text-white px-3 py-1.5 md:px-4 md:py-2 rounded-lg hover:shadow-lg transition-all font-bold text-xs md:text-sm active:scale-95"
                      >
                        <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span className="hidden sm:inline">Refresh</span>
                      </button>
                    )}
                  </div>
                  {isLoading ? (
                    <div className="text-center py-8 md:py-12">
                      <div className="inline-block animate-spin rounded-full h-10 w-10 md:h-12 md:w-12 border-b-4 border-[#184979]"></div>
                      <p className="text-gray-600 mt-3 md:mt-4 text-sm md:text-base">Loading your tickets...</p>
                    </div>
                  ) : tickets.length === 0 ? (
                    <div className="text-center py-8 md:py-12">
                      <div className="inline-flex items-center justify-center w-20 h-20 md:w-24 md:h-24 bg-gray-100 rounded-full mb-3 md:mb-4">
                        <svg className="w-10 h-10 md:w-12 md:h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                      </div>
                      <h3 className="text-lg md:text-xl font-bold text-gray-700 mb-2">No Support Tickets</h3>
                      <p className="text-gray-500 mb-4 md:mb-6 text-sm md:text-base">You haven't submitted any support tickets yet.</p>
                      <button
                        onClick={() => setActiveTab('new')}
                        className="bg-gradient-to-r from-[#184979] to-[#f26322] text-white px-5 py-2.5 md:px-6 md:py-3 rounded-xl font-bold hover:shadow-lg transition-all active:scale-95 text-sm md:text-base"
                      >
                        Submit Your First Ticket
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3 md:space-y-4">
                      {tickets.map(ticket => (
                        <div
                          key={ticket._id}
                          onClick={() => handleSelectTicket(ticket)}
                          className="border-2 border-gray-200 rounded-lg md:rounded-xl p-3 md:p-4 hover:border-[#184979] hover:shadow-lg transition-all cursor-pointer active:bg-gray-50"
                        >
                          <div className="flex items-start justify-between mb-2 md:mb-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 md:gap-2 mb-1.5 md:mb-2 flex-wrap">
                                <span className="font-bold text-gray-500 text-xs md:text-sm">#{ticket.ticketNumber || ticket._id.slice(-6)}</span>
                                <span className={`px-1.5 py-0.5 md:px-2 md:py-1 rounded-full text-[10px] md:text-xs font-bold border ${statusColors[ticket.status]}`}>
                                  {ticket.status}
                                </span>
                                <span className={`px-1.5 py-0.5 md:px-2 md:py-1 rounded-full text-[10px] md:text-xs font-bold border ${priorityColors[ticket.priority]}`}>
                                  {ticket.priority}
                                </span>
                              </div>
                              <h3 className="text-sm md:text-lg font-bold text-gray-900 mb-0.5 md:mb-1 truncate">{ticket.subject}</h3>
                              <p className="text-xs md:text-sm text-gray-600 mb-1 md:mb-2">{ticket.category}</p>
                              {ticket.description && (
                                <p className="text-xs md:text-sm text-gray-500 line-clamp-1 md:line-clamp-2">{ticket.description}</p>
                              )}
                            </div>
                            <svg className="w-5 h-5 md:w-6 md:h-6 text-gray-400 flex-shrink-0 ml-2 md:ml-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[10px] md:text-xs text-gray-500 pt-2 md:pt-3 border-t border-gray-200 gap-1">
                            <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                            {ticket.messages && ticket.messages.length > 0 && (
                              <span className="font-semibold text-[#184979]">{ticket.messages.length} {ticket.messages.length === 1 ? 'msg' : 'msgs'}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                // Ticket Details View - Mobile Optimized
                <div>
                  <button
                    onClick={() => setSelectedTicket(null)}
                    className="flex items-center gap-2 text-[#184979] hover:text-[#f26322] font-bold mb-4 md:mb-6 transition-colors text-sm md:text-base active:scale-95"
                  >
                    <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Tickets
                  </button>

                  <div className="border-2 border-gray-200 rounded-xl p-3 md:p-6 mb-4 md:mb-6">
                    <div className="flex flex-col md:flex-row md:items-start justify-between mb-3 md:mb-4">
                      <div>
                        <div className="flex items-center gap-1.5 md:gap-2 mb-2 md:mb-3 flex-wrap">
                          <span className="font-bold text-gray-500 text-xs md:text-sm">#{selectedTicket._id.slice(-6)}</span>
                          <span className={`px-2 py-0.5 md:px-3 md:py-1 rounded-full text-xs md:text-sm font-bold border ${statusColors[selectedTicket.status]}`}>
                            {selectedTicket.status}
                          </span>
                          <span className={`px-2 py-0.5 md:px-3 md:py-1 rounded-full text-xs md:text-sm font-bold border ${priorityColors[selectedTicket.priority]}`}>
                            {selectedTicket.priority}
                          </span>
                        </div>
                        <h2 className="text-lg md:text-2xl font-black text-gray-900 mb-1 md:mb-2">{selectedTicket.subject}</h2>
                        <p className="text-gray-600 font-semibold text-sm md:text-base">{selectedTicket.category}</p>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-3 md:p-4 mb-3 md:mb-4">
                      <p className="text-gray-700 whitespace-pre-wrap text-sm md:text-base">{selectedTicket.description}</p>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs md:text-sm text-gray-500 gap-1">
                      <span>Created: {new Date(selectedTicket.createdAt).toLocaleDateString()}</span>
                      {selectedTicket.updatedAt && (
                        <span>Updated: {new Date(selectedTicket.updatedAt).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>

                  {/* Messages Section - Mobile Optimized */}
                  <div className="mb-4 md:mb-6">
                    <h3 className="text-base md:text-xl font-black text-gray-900 mb-3 md:mb-4">Conversation ({selectedTicket.messages?.length || 0})</h3>
                    <div className="space-y-3 md:space-y-4 mb-4 md:mb-6 max-h-[400px] md:max-h-[500px] overflow-y-auto">
                      {selectedTicket.messages && selectedTicket.messages.length > 0 ? (
                        selectedTicket.messages.map(msg => (
                          <div
                            key={msg._id}
                            className={`flex ${msg.senderType === 'customer' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`max-w-[85%] md:max-w-[70%] ${
                              msg.senderType === 'customer'
                                ? 'bg-gradient-to-r from-[#184979] to-[#2d6ba5] text-white'
                                : 'bg-gray-100 text-gray-900'
                            } rounded-xl p-3 md:p-4 shadow`}>
                              <div className="flex items-center gap-1.5 md:gap-2 mb-1.5 md:mb-2">
                                <span className="font-bold text-xs md:text-sm">{msg.senderName}</span>
                                {msg.senderType === 'support' && (
                                  <span className="px-1.5 py-0.5 md:px-2 bg-[#f26322] text-white text-[10px] md:text-xs rounded-full font-bold">Support</span>
                                )}
                              </div>
                              <p className="whitespace-pre-wrap text-sm md:text-base">{msg.message}</p>
                              <p className={`text-[10px] md:text-xs mt-1.5 md:mt-2 ${msg.senderType === 'customer' ? 'text-white/70' : 'text-gray-500'}`}>
                                {new Date(msg.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-center text-gray-500 text-sm md:text-base">No messages yet</p>
                      )}
                    </div>

                    {/* Reply Form - Mobile Optimized */}
                    {selectedTicket.status !== 'closed' && (
                      <div className="border-2 border-gray-200 rounded-xl p-3 md:p-4">
                        <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1.5 md:mb-2">Add a Reply</label>
                        <textarea
                          value={replyMessage}
                          onChange={(e) => setReplyMessage(e.target.value)}
                          className="w-full px-3 py-2.5 md:px-4 md:py-3 text-sm md:text-base border-2 border-gray-300 rounded-lg md:rounded-xl focus:border-[#184979] focus:ring-2 focus:ring-[#184979]/20 outline-none transition-all min-h-[80px] md:min-h-[100px] mb-2 md:mb-3 bg-white text-gray-900 placeholder:text-gray-500"
                          placeholder="Type your message..."
                        />
                        <button
                          onClick={handleReplyToTicket}
                          disabled={!replyMessage.trim() || isReplySubmitting}
                          className="w-full md:w-auto bg-gradient-to-r from-[#184979] to-[#f26322] text-white px-5 py-2.5 md:px-6 md:py-3 rounded-lg md:rounded-xl font-bold text-sm md:text-base hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                        >
                          {isReplySubmitting ? 'Sending...' : 'Send Reply'}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Rating Section - Mobile Optimized */}
                  {selectedTicket.status === 'resolved' && !selectedTicket.rating && (
                    <div className="border-2 border-amber-200 bg-amber-50 rounded-xl p-4 md:p-6">
                      <h3 className="text-base md:text-lg font-black text-gray-900 mb-3 md:mb-4">Rate This Support Experience</h3>
                      <div className="space-y-3 md:space-y-4">
                        <div>
                          <label className="block text-xs md:text-sm font-bold text-gray-700 mb-2 md:mb-3">How would you rate this ticket? *</label>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 md:gap-3">
                            <div className="flex items-center gap-2 md:gap-3">
                              {[1, 2, 3, 4, 5].map(star => (
                                <button
                                  key={star}
                                  onClick={() => setRatingScore(star)}
                                  className={`transition-all transform hover:scale-110 active:scale-95 text-xl md:text-2xl ${
                                    star <= ratingScore ? 'text-amber-400' : 'text-gray-300'
                                  }`}
                                >
                                  ★
                                </button>
                              ))}
                            </div>
                            <span className="font-bold text-gray-700 text-sm md:text-base">{ratingScore}/5</span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1.5 md:mb-2">Feedback (Optional)</label>
                          <textarea
                            value={ratingFeedback}
                            onChange={(e) => setRatingFeedback(e.target.value)}
                            className="w-full px-3 py-2.5 md:px-4 md:py-3 text-sm md:text-base border-2 border-gray-300 rounded-lg md:rounded-xl focus:border-[#184979] focus:ring-2 focus:ring-[#184979]/20 outline-none transition-all min-h-[60px] md:min-h-[80px] bg-white text-gray-900 placeholder:text-gray-500"
                            placeholder="Share your feedback..."
                          />
                        </div>

                        <button
                          onClick={handleRateTicket}
                          disabled={isRatingSubmitting}
                          className="w-full md:w-auto bg-gradient-to-r from-[#184979] to-[#f26322] text-white px-5 py-2.5 md:px-6 md:py-3 rounded-lg md:rounded-xl font-bold text-sm md:text-base hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                        >
                          {isRatingSubmitting ? 'Submitting...' : 'Submit Rating'}
                        </button>
                      </div>
                    </div>
                  )}

                  {selectedTicket.rating && (
                    <div className="border-2 border-green-200 bg-green-50 rounded-xl p-4 md:p-6">
                      <h3 className="text-base md:text-lg font-black text-gray-900 mb-2">Your Rating</h3>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-amber-400 text-base md:text-lg">{'★'.repeat(selectedTicket.rating.rating)}</span>
                        <span className="font-bold text-gray-700 text-sm md:text-base">{selectedTicket.rating.rating}/5</span>
                      </div>
                      {selectedTicket.rating.feedback && (
                        <p className="text-gray-700 mt-2 md:mt-3 text-sm md:text-base">{selectedTicket.rating.feedback}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* FAQs Tab - Mobile Optimized */}
          {activeTab === 'faq' && (
            <div className="max-w-4xl mx-auto">
              <h2 className="text-lg md:text-2xl font-black text-[#184979] mb-4 md:mb-6">Frequently Asked Questions</h2>
              <div className="space-y-2 md:space-y-4">
                {faqs.map((faq, index) => (
                  <details
                    key={index}
                    className="group border-2 border-gray-200 rounded-lg md:rounded-xl overflow-hidden hover:border-[#184979] transition-all"
                  >
                    <summary className="flex items-center justify-between p-3 md:p-4 cursor-pointer font-bold text-gray-900 hover:bg-gray-50 active:bg-gray-100 text-sm md:text-base">
                      <span className="flex items-center gap-2 md:gap-3">
                        <span className="flex-shrink-0 w-6 h-6 md:w-8 md:h-8 bg-gradient-to-br from-[#184979] to-[#f26322] text-white rounded-full flex items-center justify-center text-xs md:text-sm font-bold">
                          {index + 1}
                        </span>
                        <span className="pr-2">{faq.question}</span>
                      </span>
                      <svg className="w-4 h-4 md:w-5 md:h-5 text-gray-500 group-open:rotate-180 transition-transform flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </summary>
                    <div className="px-3 pb-3 pt-2 md:px-4 md:pb-4 bg-gray-50 text-gray-700 text-sm md:text-base">
                      {faq.answer}
                    </div>
                  </details>
                ))}
              </div>

              <div className="mt-6 md:mt-8 bg-gradient-to-r from-[#184979] to-[#f26322] text-white rounded-xl p-4 md:p-6 text-center">
                <h3 className="text-lg md:text-xl font-black mb-1 md:mb-2">Still need help?</h3>
                <p className="mb-3 md:mb-4 text-sm md:text-base opacity-90">Can't find the answer? Submit a support ticket and we'll get back to you soon.</p>
                <button
                  onClick={() => setActiveTab('new')}
                  className="bg-white text-[#184979] px-5 py-2.5 md:px-6 md:py-3 rounded-lg md:rounded-xl font-bold hover:shadow-xl transition-all active:scale-95 text-sm md:text-base"
                >
                  Submit a Ticket
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
