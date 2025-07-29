'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface WalletSettingsDashboardProps {
  shouldRedirect?: boolean;
}

export default function WalletSettingsDashboard({ shouldRedirect = false }: WalletSettingsDashboardProps) {
  const router = useRouter();

  useEffect(() => {
    if (shouldRedirect) {
      // Navigate to the new settings page only when explicitly requested
      router.push('/settings');
    }
  }, [router, shouldRedirect]);

  if (shouldRedirect) {
    // This component no longer renders UI when redirecting - it just handles navigation
    return null;
  }

  // For now, show a message that settings have moved
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
        <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-2">Settings Available Here</h3>
        <p className="text-muted-foreground mb-4">
          Access all wallet settings, security options, and backup tools right here in this tab.
        </p>
        <button
          onClick={() => router.push('/settings')}
          className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Open Full Settings
          <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
