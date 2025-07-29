'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface BackupQRModalProps {
  open: boolean;
  onClose: () => void;
  mode?: 'both' | 'restore-only'; // New prop to control which tabs are shown
}

export function BackupQRModal({ open, onClose, mode = 'both' }: BackupQRModalProps) {
  const router = useRouter();

  useEffect(() => {
    if (open) {
      // Close the modal and navigate to the QR backup page
      onClose();

      // Navigate to the QR backup page with mode as query parameter
      const params = new URLSearchParams();
      if (mode === 'restore-only') {
        params.set('tab', 'restore');
      }

      const url = params.toString() ? `/backup/qr?${params.toString()}` : '/backup/qr';
      router.push(url);
    }
  }, [open, onClose, router, mode]);

  // This component no longer renders UI - it just handles navigation
  return null;
}
