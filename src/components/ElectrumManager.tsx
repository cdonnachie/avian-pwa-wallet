'use client';

import { useEffect } from 'react';
import ElectrumBridge from '@/lib/electrum-bridge';

/**
 * Component to initialize and manage ElectrumX connections
 * This is loaded in the app layout to ensure the connection is maintained
 */
export default function ElectrumManager() {
  useEffect(() => {
    // Initialize the ElectrumBridge singleton
    const client = ElectrumBridge.getInstance();

    // ElectrumBridge handles connection internally

    // Cleanup on unmount
    return () => {
      client.disconnect();
    };
  }, []);

  // This is a utility component, so it doesn't render anything
  return null;
}
