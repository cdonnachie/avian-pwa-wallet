import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import './globals.css';
import './vendor-prefixes.css';
import { WalletProvider } from '@/contexts/WalletContext';
import { SecurityProvider } from '@/contexts/SecurityContext';
import { TermsProvider } from '@/contexts/TermsContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { Toaster } from '@/components/ui/sonner';
import dynamic from 'next/dynamic';
import ClientErrorBoundary from '@/components/ClientErrorBoundary';

const ServiceWorkerRegistrar = dynamic(() => import('@/components/ServiceWorkerRegistrar'));

import ElectrumManagerWrapper from '@/components/ElectrumManagerWrapper';
import ClientWatchedAddressWrapper from '@/components/ClientWatchedAddressWrapper';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Avian FlightDeck',
  description: 'Avian cryptocurrency wallet',
  manifest: '/manifest.json',
  icons: {
    icon: '/icons/icon-192x192.png',
    apple: '/icons/icon-192x192.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0ea5e9',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className="text-size-adjust">
      <head>
        <link rel="icon" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Avian FlightDeck" />
      </head>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ClientErrorBoundary name="Application">
            <ServiceWorkerRegistrar />
            <ElectrumManagerWrapper />
            <Toaster position="top-right" closeButton />
            <TermsProvider>
              <SecurityProvider>
                <WalletProvider>
                  <NotificationProvider>
                    {children}
                    <ClientWatchedAddressWrapper />
                  </NotificationProvider>
                </WalletProvider>
              </SecurityProvider>
            </TermsProvider>
          </ClientErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  );
}
