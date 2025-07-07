import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import '@/utils/browser-polyfills'
import { WalletProvider } from '@/contexts/WalletContext'
import { SecurityProvider } from '@/contexts/SecurityContext'
import { TermsProvider } from '@/contexts/TermsContext'
import { ToastProvider } from '@/components/Toast'
import dynamic from 'next/dynamic'

// Import the service worker registrar with no SSR to ensure it only runs on client
const ServiceWorkerRegistrar = dynamic(
    () => import('@/components/ServiceWorkerRegistrar'),
    { ssr: false }
)

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'Avian FlightDeck',
    description: 'Avian cryptocurrency wallet',
    manifest: '/manifest.json',
    icons: {
        icon: '/icons/icon-192x192.png',
        apple: '/icons/icon-192x192.png',
    },
}

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    themeColor: '#0ea5e9',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" className="system" suppressHydrationWarning>
            <head>
                <link rel="icon" href="/icons/icon-192x192.png" />
                <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
                <meta name="mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="default" />
                <meta name="apple-mobile-web-app-title" content="Avian FlightDeck" />
                <script
                    dangerouslySetInnerHTML={{
                        __html: `
                            (function() {
                                try {
                                    const savedTheme = localStorage.getItem('theme') || 'system';
                                    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                                    const root = document.documentElement;
                                    
                                    // Remove existing theme classes
                                    root.classList.remove('light', 'dark', 'system');
                                    
                                    if (savedTheme === 'system') {
                                        root.classList.add('system');
                                        if (systemPrefersDark) {
                                            root.classList.add('dark');
                                        } else {
                                            root.classList.add('light');
                                        }
                                    } else {
                                        root.classList.add(savedTheme);
                                    }
                                } catch (e) {
                                    // Fallback to light theme if anything fails
                                    document.documentElement.classList.add('light');
                                }
                            })();
                        `,
                    }}
                />
            </head>
            <body className={inter.className}>
                <ServiceWorkerRegistrar />
                <ToastProvider>
                    <TermsProvider>
                        <SecurityProvider>
                            <WalletProvider>
                                {children}
                            </WalletProvider>
                        </SecurityProvider>
                    </TermsProvider>
                </ToastProvider>
            </body>
        </html>
    )
}
