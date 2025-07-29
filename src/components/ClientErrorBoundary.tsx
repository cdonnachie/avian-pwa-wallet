'use client';

import { ReactNode, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import ErrorBoundary to ensure it only runs on client
const ErrorBoundary = dynamic(() => import('@/components/ErrorBoundary'), { ssr: false });

interface ClientErrorBoundaryProps {
  name?: string;
  children: ReactNode;
  fallback?: ReactNode;
  isolate?: boolean;
}

/**
 * Client-side only Error Boundary wrapper
 *
 * This ensures error boundaries only operate in the browser environment
 * where localStorage is available and user privacy is maintained.
 *
 * Benefits:
 * - No server-side error exposure
 * - Client-side error storage only
 * - Privacy-first error reporting
 * - PWA-optimized error handling
 */
export function ClientErrorBoundary({
  name = 'ClientSide',
  children,
  fallback,
  isolate = false,
}: ClientErrorBoundaryProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // During SSR or before hydration, just render children without error boundary
  if (!isMounted) {
    return <>{children}</>;
  }

  // Once mounted (client-side), use the full error boundary
  return (
    <ErrorBoundary name={name} fallback={fallback} isolate={isolate}>
      {children}
    </ErrorBoundary>
  );
}

export default ClientErrorBoundary;
