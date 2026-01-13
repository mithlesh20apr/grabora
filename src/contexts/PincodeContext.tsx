'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  getOrDetectPincode,
  savePincodeToStorage,
  removePincodeFromStorage,
  isValidPincode,
} from '@/services/location';

interface PincodeContextType {
  pincode: string | null;
  isLoading: boolean;
  showModal: boolean;
  setPincode: (pincode: string) => void;
  clearPincode: () => void;
  openModal: () => void;
  closeModal: () => void;
}

const PincodeContext = createContext<PincodeContextType | undefined>(undefined);

export function PincodeProvider({ children }: { children: ReactNode }) {
  const [pincode, setPincodeState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Initialize pincode on mount
  useEffect(() => {
    let isMounted = true;

    async function initializePincode() {
      try {
        const detectedPincode = await getOrDetectPincode();

        if (!isMounted) return;

        if (detectedPincode) {
          setPincodeState(detectedPincode);
        } else {
          // Show modal if no pincode could be detected
          setShowModal(true);
        }
      } catch (error) {
        console.error('Error initializing pincode:', error);
        // Don't show modal on error, let app continue without pincode
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initializePincode();

    return () => {
      isMounted = false;
    };
  }, []);

  const setPincode = (newPincode: string) => {
    if (isValidPincode(newPincode)) {
      setPincodeState(newPincode);
      savePincodeToStorage(newPincode);
      setShowModal(false);
    } else {
      throw new Error('Invalid pincode format. Must be 6 digits.');
    }
  };

  const clearPincode = () => {
    setPincodeState(null);
    removePincodeFromStorage();
  };

  const openModal = () => {
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  return (
    <PincodeContext.Provider
      value={{
        pincode,
        isLoading,
        showModal,
        setPincode,
        clearPincode,
        openModal,
        closeModal,
      }}
    >
      {children}
    </PincodeContext.Provider>
  );
}

export function usePincode() {
  const context = useContext(PincodeContext);
  if (context === undefined) {
    throw new Error('usePincode must be used within a PincodeProvider');
  }
  return context;
}
