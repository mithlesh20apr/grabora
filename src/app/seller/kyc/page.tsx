'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useSeller, KYCStatus, KYCDocument } from '@/contexts/SellerContext';
import toast from 'react-hot-toast';
import { PageLoader } from '@/components/ui/Loader';

type DocumentType = 'pan' | 'aadhaar' | 'gst' | 'business_registration';

interface DocumentConfig {
  type: DocumentType;
  label: string;
  description: string;
  required: boolean;
  numberPlaceholder: string;
  numberPattern: RegExp;
  numberHelp: string;
}

const DOCUMENT_CONFIGS: DocumentConfig[] = [
  {
    type: 'pan',
    label: 'PAN Card',
    description: 'Your Permanent Account Number',
    required: true,
    numberPlaceholder: 'ABCDE1234F',
    numberPattern: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
    numberHelp: 'Format: ABCDE1234F (5 letters, 4 digits, 1 letter)',
  },
  {
    type: 'aadhaar',
    label: 'Aadhaar Card',
    description: 'Your 12-digit Aadhaar number',
    required: true,
    numberPlaceholder: '123456789012',
    numberPattern: /^[0-9]{12}$/,
    numberHelp: 'Enter 12-digit Aadhaar number',
  },
  {
    type: 'gst',
    label: 'GST Certificate',
    description: 'Your GST registration number (if applicable)',
    required: false,
    numberPlaceholder: '22AAAAA0000A1Z5',
    numberPattern: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
    numberHelp: 'Format: 22AAAAA0000A1Z5 (15 characters)',
  },
  {
    type: 'business_registration',
    label: 'Business Registration',
    description: 'Shop Act license, Incorporation certificate, or Partnership deed',
    required: false,
    numberPlaceholder: 'Registration Number',
    numberPattern: /^.{3,50}$/,
    numberHelp: 'Enter your business registration number',
  },
];

interface DocumentFormData {
  documentNumber: string;
  file: File | null;
  fileName: string;
}

export default function SellerKYCPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, submitKYCDocument, getKYCStatus } = useSeller();
  
  const [kycStatus, setKycStatus] = useState<KYCStatus | null>(null);
  const [documents, setDocuments] = useState<KYCDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [submittingDoc, setSubmittingDoc] = useState<DocumentType | null>(null);
  const [editingDoc, setEditingDoc] = useState<DocumentType | null>(null);
  const [formData, setFormData] = useState<{ [key in DocumentType]?: DocumentFormData }>({});
  const [errors, setErrors] = useState<{ [key in DocumentType]?: { number?: string; file?: string } }>({});

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/seller/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    let isMounted = true;
    
    const loadKYCStatus = async () => {
      if (isAuthenticated) {
        const data = await getKYCStatus();
        if (isMounted && data) {
          setKycStatus(data.status as KYCStatus);
          setDocuments(data.documents || []);
          // Debug log
          console.log('[KYC] Loaded KYC status:', data.status, 'Documents:', data.documents);
        }
      }
      if (isMounted) {
        setIsLoading(false);
      }
    };
    loadKYCStatus();
    
    return () => {
      isMounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]); // Only run when authentication changes, not when getKYCStatus reference changes

  const getDocumentStatus = (type: DocumentType): KYCDocument | undefined => {
    return documents.find(doc => (doc.type?.toLowerCase?.() || doc.type) === type.toLowerCase());
  };

  const validateForm = (type: DocumentType): boolean => {
    const config = DOCUMENT_CONFIGS.find(c => c.type === type);
    const data = formData[type];
    const newErrors: { number?: string; file?: string } = {};
    
    if (!data?.documentNumber) {
      newErrors.number = 'Document number is required';
    } else if (config && !config.numberPattern.test(data.documentNumber)) {
      newErrors.number = 'Invalid format. ' + config.numberHelp;
    }
    
    if (!data?.file) {
      newErrors.file = 'Please attach a document file';
    }
    
    setErrors(prev => ({ ...prev, [type]: newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (type: DocumentType, value: string) => {
    setFormData(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        documentNumber: value,
      },
    }));
    // Clear error when user types
    if (errors[type]?.number) {
      setErrors(prev => ({
        ...prev,
        [type]: {
          ...prev[type],
          number: undefined,
        },
      }));
    }
  };

  const handleFileSelect = (type: DocumentType, file: File | null) => {
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({
          ...prev,
          [type]: {
            ...prev[type],
            file: 'File size must be less than 5MB',
          },
        }));
        return;
      }
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        setErrors(prev => ({
          ...prev,
          [type]: {
            ...prev[type],
            file: 'Only JPG, PNG, or PDF files are allowed',
          },
        }));
        return;
      }
    }
    setFormData(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        file: file,
        fileName: file?.name || '',
      },
    }));
    // Clear error when file is selected
    if (errors[type]?.file) {
      setErrors(prev => ({
        ...prev,
        [type]: {
          ...prev[type],
          file: undefined,
        },
      }));
    }
  };

  const handleSubmitDocument = async (type: DocumentType) => {
    if (!validateForm(type)) {
      return;
    }

    const data = formData[type];
    if (!data || !data.file) return;

    setSubmittingDoc(type);
    
    try {
      const result = await submitKYCDocument(type, data.documentNumber, data.file);
      if (result.success) {
        // Refresh KYC status
        const statusData = await getKYCStatus();
        if (statusData) {
          setKycStatus(statusData.status as KYCStatus);
          setDocuments(statusData.documents || []);
          // Debug log
          console.log('[KYC] After submit, status:', statusData.status, 'Documents:', statusData.documents);
        }
        setEditingDoc(null);
        setFormData(prev => ({ ...prev, [type]: undefined }));
        toast.success(result.message || 'Document submitted successfully');
      } else {
        toast.error(result.message || 'Failed to submit document');
      }
    } catch {
      toast.error('Failed to submit document');
    } finally {
      setSubmittingDoc(null);
    }
  };

  const startEditing = (type: DocumentType) => {
    const existingDoc = getDocumentStatus(type);
    setFormData(prev => ({
      ...prev,
      [type]: {
        documentNumber: existingDoc?.documentNumber || '',
        file: null,
        fileName: '',
      },
    }));
    setEditingDoc(type);
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Rejected
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Pending Review
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            Not Submitted
          </span>
        );
    }
  };

  const getOverallStatus = () => {
    switch (kycStatus) {
      case 'verified':
        return {
          color: 'green',
          icon: (
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          ),
          title: 'KYC Verified',
          description: 'Your KYC documents have been verified successfully.',
        };
      case 'rejected':
        return {
          color: 'red',
          icon: (
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          ),
          title: 'KYC Rejected',
          description: 'Some documents were rejected. Please re-upload them.',
        };
      case 'pending':
        return {
          color: 'yellow',
          icon: (
            <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          title: 'Under Review',
          description: 'Your documents are being reviewed. This may take 24-48 hours.',
        };
      default:
        return {
          color: 'blue',
          icon: (
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          ),
          title: 'Submit KYC Documents',
          description: 'Please upload the required documents to complete your KYC verification.',
        };
    }
  };

  if (authLoading || isLoading) {
    return <PageLoader message="Loading..." />;
  }

  if (!isAuthenticated) {
    return null;
  }

  const overallStatus = getOverallStatus();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/seller/dashboard" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Back to Dashboard</span>
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/">
                <Image
                  src="/logo/logo.svg"
                  alt="Grabora"
                  width={120}
                  height={35}
                  className="h-8 w-auto"
                />
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">KYC Verification</h1>

        {/* Status Banner */}
        <div className={`bg-${overallStatus.color}-50 border border-${overallStatus.color}-200 rounded-2xl p-6 mb-6`}>
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 bg-${overallStatus.color}-100 rounded-xl flex items-center justify-center flex-shrink-0`}>
              {overallStatus.icon}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">{overallStatus.title}</h2>
              <p className="text-gray-600">{overallStatus.description}</p>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Verification Progress</h3>
            <span className="text-sm text-gray-500">
              {documents.filter(d => d.status === 'approved').length} / {DOCUMENT_CONFIGS.filter(d => d.required).length} Required Docs
            </span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#184979] to-[#f26322] rounded-full transition-all duration-500"
              style={{
                width: `${(documents.filter(d => d.status === 'approved').length / DOCUMENT_CONFIGS.filter(d => d.required).length) * 100}%`
              }}
            ></div>
          </div>
        </div>

        {/* Documents List */}
        <div className="space-y-4">
          {DOCUMENT_CONFIGS.map((config) => {
            const doc = getDocumentStatus(config.type);
            const isSubmitting = submittingDoc === config.type;
            const isEditing = editingDoc === config.type;
            const docErrors = errors[config.type];

            return (
              <div key={config.type} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex flex-col gap-4">
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-800">{config.label}</h3>
                        {config.required && (
                          <span className="text-xs text-red-500 font-medium">Required</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mb-2">{config.description}</p>
                      <p className="text-xs text-gray-400">{config.numberHelp}</p>
                      {doc?.rejectionReason && (
                        <div className="mt-2 p-2 bg-red-50 rounded-lg">
                          <p className="text-sm text-red-600">
                            <span className="font-medium">Rejection Reason:</span> {doc.rejectionReason}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      {getStatusBadge(doc?.status)}
                      
                      {!isEditing && (!doc || doc.status === 'rejected') && (
                        <button
                          onClick={() => startEditing(config.type)}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-[#f26322] text-white hover:bg-[#e05512] transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          {doc ? 'Re-submit' : 'Add Document'}
                        </button>
                      )}

                      {!isEditing && doc?.status === 'pending' && (
                        <button
                          onClick={() => startEditing(config.type)}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </button>
                      )}

                      {doc?.status === 'approved' && (
                        <span className="text-sm text-gray-500">
                          Verified {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Submitted Info (when not editing) */}
                  {!isEditing && doc && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Document Number</p>
                          <p className="text-sm font-medium text-gray-800">{doc.documentNumber || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Document URL</p>
                          <a 
                            href={doc.documentUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-blue-600 hover:text-blue-800 truncate block"
                          >
                            {doc.documentUrl || 'N/A'}
                          </a>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Edit Form */}
                  {isEditing && (
                    <div className="border-t border-gray-100 pt-4 mt-2">
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Document Number
                          </label>
                          <input
                            type="text"
                            value={formData[config.type]?.documentNumber || ''}
                            onChange={(e) => handleInputChange(config.type, e.target.value.toUpperCase())}
                            placeholder={config.numberPlaceholder}
                            className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-[#f26322] focus:border-transparent outline-none transition-all ${
                              docErrors?.number ? 'border-red-300 bg-red-50' : 'border-gray-200'
                            }`}
                          />
                          {docErrors?.number && (
                            <p className="mt-1 text-sm text-red-600">{docErrors.number}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Attach Document
                          </label>
                          <div className={`relative border-2 border-dashed rounded-xl p-4 transition-all ${
                            docErrors?.file ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-[#f26322]'
                          }`}>
                            <input
                              type="file"
                              accept=".jpg,.jpeg,.png,.pdf"
                              onChange={(e) => handleFileSelect(config.type, e.target.files?.[0] || null)}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            {formData[config.type]?.fileName ? (
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-800 truncate">{formData[config.type]?.fileName}</p>
                                  <p className="text-xs text-gray-500">Click to change file</p>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                  </svg>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-600">Click to attach file</p>
                                  <p className="text-xs text-gray-400">JPG, PNG or PDF (max 5MB)</p>
                                </div>
                              </div>
                            )}
                          </div>
                          {docErrors?.file && (
                            <p className="mt-1 text-sm text-red-600">{docErrors.file}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-4">
                        <button
                          onClick={() => handleSubmitDocument(config.type)}
                          disabled={isSubmitting}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                            isSubmitting
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-[#f26322] text-white hover:bg-[#e05512]'
                          }`}
                        >
                          {isSubmitting ? (
                            <>
                              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Submitting...
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Submit
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setEditingDoc(null);
                            setFormData(prev => ({ ...prev, [config.type]: undefined }));
                            setErrors(prev => ({ ...prev, [config.type]: undefined }));
                          }}
                          disabled={isSubmitting}
                          className="px-4 py-2 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Help Section */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-blue-800 mb-2">Need Help?</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Enter your document number exactly as it appears on the document</li>
                <li>• Attach a clear, readable image or PDF of your document</li>
                <li>• Accepted formats: JPG, PNG, or PDF (max 5MB)</li>
                <li>• Document details should match your profile information</li>
              </ul>
              <Link
                href="/support"
                className="inline-flex items-center gap-1 mt-3 text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                Contact Support
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
