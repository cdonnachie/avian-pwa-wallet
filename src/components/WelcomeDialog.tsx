'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { StorageService } from '@/services/core/StorageService';

interface WelcomeDialogProps {
  onClose: () => void;
}

export default function WelcomeDialog({ onClose }: WelcomeDialogProps) {
  const router = useRouter();

  useEffect(() => {
    const checkWalletAndRedirect = async () => {
      // Check if wallet actually exists
      const walletExists = await StorageService.hasWallet();

      // Close the dialog
      onClose();

      if (walletExists) {
        // If wallet exists, don't redirect to onboarding
        return;
      } else {
        // Only redirect to onboarding if no wallet exists
        router.push('/onboarding');
      }
    };

    checkWalletAndRedirect();
  }, [onClose, router]);

  // This component no longer renders UI - it just handles navigation
  return null;
}
