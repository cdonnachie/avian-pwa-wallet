'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { termsService } from '@/services/core/TermsService';
import TermsModal from '@/components/TermsModal';
import { toast } from 'sonner';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

interface TermsContextType {
  hasAcceptedTerms: boolean;
  showTermsModal: () => void;
}

const TermsContext = createContext<TermsContextType | undefined>(undefined);

interface TermsProviderProps {
  children: ReactNode;
}

export function TermsProvider({ children }: TermsProviderProps) {
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showExitScreen, setShowExitScreen] = useState(false);

  useEffect(() => {
    const checkTermsAcceptance = async () => {
      try {
        const accepted = await termsService.hasAcceptedCurrentTerms();
        setHasAcceptedTerms(accepted);

        if (!accepted) {
          setShowModal(true);
        }
      } catch (error) {
        setShowModal(true);
      } finally {
        setIsLoading(false);
      }
    };

    checkTermsAcceptance();
  }, []);

  const handleAcceptTerms = async () => {
    try {
      await termsService.acceptTerms();
      setHasAcceptedTerms(true);
      setShowModal(false);
    } catch (error) {
      toast.error('Failed to accept terms', {
        description: 'Failed to save terms acceptance. Please try again.',
      });
    }
  };

  const handleDeclineTerms = () => {
    // If user declines, hide the terms modal and show the exit screen
    setShowModal(false);
    setShowExitScreen(true);
  };

  const showTermsModal = () => {
    setShowModal(true);
  };

  // Show loading screen while checking terms
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center justify-center">
          <div>
            <Image src="/avian_spinner.png" alt="Loading..." width={128} height={128} unoptimized />
          </div>
          <p className="text-primary dark:text-white mt-2">Loading Avian FlightDeck...</p>
        </div>
      </div>
    );
  }

  // Exit screen when user declines terms
  if (showExitScreen) {
    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md p-8 rounded-lg bg-gray-800 border border-gray-700 shadow-lg">
          <div className="mx-auto mb-6 bg-amber-500/10 p-3 rounded-full w-16 h-16 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8 text-amber-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-amber-400 mb-3">Terms Not Accepted</h2>
          <p className="text-gray-300 mb-4">You must accept the terms to use Avian FlightDeck.</p>
          <p className="text-gray-400 text-sm mb-6">
            Please close this window and try again when you&apos;re ready to accept the terms.
          </p>
        </div>
      </div>
    );
  }

  // Don't render the app until terms are accepted
  if (!hasAcceptedTerms) {
    return (
      <>
        <TermsModal
          isOpen={showModal}
          onAccept={handleAcceptTerms}
          onDecline={handleDeclineTerms}
        />
        {/* Render a minimal fallback while terms modal is shown */}
        <div className="fixed inset-0 bg-gray-900"></div>
      </>
    );
  }

  return (
    <TermsContext.Provider
      value={{
        hasAcceptedTerms,
        showTermsModal,
      }}
    >
      {children}
      <TermsModal isOpen={showModal} onAccept={handleAcceptTerms} onDecline={handleDeclineTerms} />
    </TermsContext.Provider>
  );
}

export function useTerms() {
  const context = useContext(TermsContext);
  if (context === undefined) {
    throw new Error('useTerms must be used within a TermsProvider');
  }
  return context;
}
