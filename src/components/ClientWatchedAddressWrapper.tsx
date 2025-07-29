'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useNotifications } from '@/contexts/NotificationContext';

// Dynamically import the WatchedAddressMonitor with ssr:false
// This uses the one that leverages the notification context
const WatchedAddressMonitorComponent = dynamic(() => import('@/components/WatchedAddressMonitor'), {
  ssr: false,
});

export default function ClientWatchedAddressWrapper() {
  // Use the notifications context to ensure we have access to notification functions
  const { isEnabled } = useNotifications();

  // Only render if notifications are enabled
  return isEnabled ? <WatchedAddressMonitorComponent /> : null;
}
