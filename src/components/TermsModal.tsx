'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface TermsModalProps {
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export default function TermsModal({ isOpen, onAccept, onDecline }: TermsModalProps) {
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      // Check if terms have been accepted
      const termsAccepted = localStorage.getItem('terms-accepted');
      if (termsAccepted) {
        // Terms already accepted, proceed
        onAccept();
      } else {
        // Terms not accepted, redirect to terms page
        router.push('/terms');
      }
    }
  }, [isOpen, onAccept, router]);

  // This component no longer renders UI - it just handles navigation
  return null;
}
