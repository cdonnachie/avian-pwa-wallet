'use client';

import {
    Wallet,
    Send,
    QrCode,
    Settings,
    RefreshCw,
    History,
    Loader,
    Lock,
    Unlock,
    Copy,
    HelpCircle,
} from 'lucide-react';
import { useWallet } from '@/contexts/WalletContext';
import { useSecurity } from '@/contexts/SecurityContext';
import { useState, useEffect, useRef } from 'react';
import SendForm from '@/components/SendForm';
import ReceiveContent from '@/components/ReceiveContent';
import WalletSettingsDashboard from '@/components/WalletSettingsDashboard';
import { TransactionHistory } from '@/components/TransactionHistory';
import ConnectionStatus from '@/components/ConnectionStatus';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import GradientBackground from '@/components/GradientBackground';
import WelcomeDialog from '@/components/WelcomeDialog';
import AboutModal from '@/components/AboutModal';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Image from 'next/image';

export default function Home() {
    const { wallet, balance, address, isLoading, processingProgress, updateBalance } = useWallet();
    const { lockWallet, isLocked } = useSecurity();
    const [activeTab, setActiveTab] = useState<'send' | 'receive' | 'history' | 'settings'>('send');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);
    const [showAboutModal, setShowAboutModal] = useState(false);
    const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

    const fullRefreshRequestedRef = useRef(false);

    // Check if wallet exists on initial load
    useEffect(() => {
        if (!address && !isLoading && typeof window !== 'undefined') {
            const walletData = localStorage.getItem('wallets') || localStorage.getItem('activeWallet');
            if (!walletData) {
                setShowWelcomeDialog(true);
            }
        }
    }, [address, isLoading]);

    const formatBalance = (balance: number) => {
        const avnBalance = (balance / 100000000).toFixed(8); // Convert satoshis to AVN
        return avnBalance;
    };

    const formatAddress = (address: string) => {
        if (!address) return '';
        return `${address.slice(0, 8)}...${address.slice(-8)}`;
    };

    const handleCopyAddress = async (address: string) => {
        try {
            await navigator.clipboard.writeText(address);
            setCopiedAddress(address);
            toast.success('Address copied to clipboard', {
                description: 'Wallet address has been copied successfully',
            });

            // Reset the copied state after 2 seconds
            setTimeout(() => {
                setCopiedAddress(null);
            }, 2000);
        } catch (error) {
            toast.error('Copy Failed', {
                description: 'Could not copy address to clipboard',
            });
        }
    };
    const handleRefresh = async () => {
        try {
            setIsRefreshing(true);

            // Check if this is a full refresh (long press) or just a balance update
            const isFullRefresh = fullRefreshRequestedRef.current;
            fullRefreshRequestedRef.current = false;

            if (isFullRefresh && wallet?.reprocessTransactionHistory) {
                // Full refresh requested - reprocess all transactions

                toast.info('Full refresh in progress', {
                    description: 'Reprocessing all transactions...',
                    duration: 3000,
                });
                await wallet.reprocessTransactionHistory();
                toast.success('Transaction history fully refreshed');
            } else {
                // Regular refresh - just update balance and any new transactions
                if (updateBalance) {
                    await updateBalance();
                    // Regular refresh doesn't need to reprocess all transactions
                    await wallet?.refreshTransactionHistory();
                }
            }
        } catch (error) {
            toast.error('Refresh failed', {
                description: 'Could not update balance information',
            });
        } finally {
            setIsRefreshing(false);
        }
    };

    // Track press duration for the refresh button
    const pressTimer = useRef<NodeJS.Timeout | null>(null);

    const handleRefreshMouseDown = () => {
        pressTimer.current = setTimeout(() => {
            fullRefreshRequestedRef.current = true;
            toast.info('Full refresh requested', {
                description: 'Reprocessing all transactions...',
            });
        }, 1500); // 1.5 seconds for long press
    };

    const handleRefreshMouseUp = () => {
        if (pressTimer.current) {
            clearTimeout(pressTimer.current);
        }
    };

    return (
        <GradientBackground>
            <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
                {/* Multi-panel dashboard for desktop, single column for mobile */}
                <div className="block lg:hidden max-w-xl md:max-w-2xl mx-auto space-y-6">
                    {/* Mobile layout */}
                    {/* Header */}
                    <Card className="mb-8 relative border-0 shadow-none bg-transparent pt-2">
                        <div className="absolute top-2 right-0 flex items-center space-x-2 z-10">
                            {/* Lock Button */}
                            {address && (
                                <Button
                                    onClick={() => lockWallet()}
                                    variant="ghost"
                                    size="icon"
                                    className="w-9 h-9"
                                    aria-label="Lock wallet"
                                    title="Lock wallet"
                                >
                                    {isLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                                </Button>
                            )}

                            {/* Help Button */}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="w-9 h-9 text-white"
                                onClick={() => setShowAboutModal(true)}
                                title="About wallet & FAQ"
                            >
                                <HelpCircle className="h-4 w-4" />
                            </Button>

                            {/* Theme Switcher */}
                            <ThemeSwitcher />
                        </div>

                        <CardContent className="flex flex-col items-center">
                            <div className="flex justify-center items-center">
                                <Image
                                    src="/Avian_logo.svg"
                                    alt="Avian Logo"
                                    width={48}
                                    height={48}
                                    className="text-avian-600 invert"
                                    priority
                                />
                            </div>
                            <CardTitle className="text-2xl font-bold mb-2 text-white">Avian FlightDeck</CardTitle>
                            <CardDescription className="text-center text-muted dark:text-muted-foreground">
                                Manage your AVN cryptocurrency securely and easily.
                            </CardDescription>
                        </CardContent>
                    </Card>

                    {/* Wallet Card */}
                    <Card className="mb-6 wallet-card relative bg-avian-600">
                        <CardHeader className="py-3 px-4 relative z-10">
                            <div className="flex justify-between items-center">
                                <CardTitle className="text-base sm:text-lg md:text-xl text-white">
                                    Balance
                                </CardTitle>
                                <Button
                                    onClick={handleRefresh}
                                    onMouseDown={handleRefreshMouseDown}
                                    onMouseUp={handleRefreshMouseUp}
                                    onMouseLeave={handleRefreshMouseUp}
                                    onTouchStart={handleRefreshMouseDown}
                                    onTouchEnd={handleRefreshMouseUp}
                                    disabled={isRefreshing}
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 md:h-8 md:w-8 text-white hover:text-white/80"
                                    title="Refresh balance (hold for full refresh)"
                                >
                                    <RefreshCw
                                        className={`w-3 h-3 md:w-4 md:h-4 ${isRefreshing ? 'animate-spin' : ''}`}
                                    />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="relative z-10">
                            <div className="text-xl md:text-2xl lg:text-3xl font-bold mb-2 flex items-center flex-wrap text-white">
                                {isLoading && !processingProgress.isProcessing ? (
                                    'Loading...'
                                ) : (
                                    <>
                                        {`${formatBalance(balance)} AVN`}
                                        {processingProgress.isProcessing && (
                                            <Loader className="w-4 h-4 md:w-5 md:h-5 ml-2 animate-spin opacity-70" />
                                        )}
                                    </>
                                )}
                            </div>
                            <div className="text-xs md:text-sm font-mono flex items-center space-x-1 text-white/90">
                                <span className="truncate max-w-[180px] sm:max-w-[220px] md:max-w-[300px]">
                                    {address ? address : 'No wallet loaded'}
                                </span>
                                {address && (
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleCopyAddress(address);
                                        }}
                                        className="p-1 text-white/90 hover:text-white rounded hover:bg-white/10 transition-colors flex-shrink-0"
                                        title="Copy address to clipboard"
                                    >
                                        <Copy
                                            size={14}
                                            className={`md:w-4 md:h-4 ${copiedAddress === address ? 'text-green-300' : ''}`}
                                        />
                                    </button>
                                )}
                            </div>
                            {processingProgress.isProcessing && (
                                <div className="text-xs mt-2 bg-white/20 p-2 rounded border border-white/30 text-white">
                                    <div className="flex items-center flex-wrap">
                                        <Loader className="w-3 h-3 mr-1.5 animate-spin text-white flex-shrink-0" />
                                        <span className="font-medium text-white">
                                            Processing... {processingProgress.processed}/{processingProgress.total}
                                        </span>
                                    </div>
                                    {processingProgress.currentTx && (
                                        <div className="truncate mt-1 pl-4 text-white/80">
                                            TX: {processingProgress.currentTx.slice(0, 6)}...
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Navigation Tabs */}
                    <Tabs
                        value={activeTab}
                        onValueChange={(value) =>
                            setActiveTab(value as 'send' | 'receive' | 'history' | 'settings')
                        }
                        className="mb-6 border-b border-gray-200 dark:border-gray-700"
                    >
                        <TabsList className="flex h-auto bg-background p-0 w-full">
                            <TabsTrigger
                                value="send"
                                className="flex-1 flex flex-col items-center justify-center px-6 py-4 data-[state=active]:border-b-1 data-[state=active]:border-avian-400 data-[state=active]:text-avian-400 data-[state=active]:after:h-0.5 data-[state=active]:after:bg-avian-400 data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:w-full bg-background rounded-tl-lg text-gray-500 dark:text-gray-400 h-auto relative"
                            >
                                <Send className="h-4 w-4 mr-2" />
                                <span>Send</span>
                            </TabsTrigger>
                            <TabsTrigger
                                value="receive"
                                className="flex-1 flex  flex-col items-center justify-center px-6 py-4 data-[state=active]:border-b-1 data-[state=active]:border-avian-400 data-[state=active]:text-avian-400 data-[state=active]:after:h-0.5 data-[state=active]:after:bg-avian-400 data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:w-full bg-background rounded-none text-gray-500 dark:text-gray-400 h-auto relative"
                            >
                                <QrCode className="h-4 w-4 mr-2" />
                                <span>Receive</span>
                            </TabsTrigger>
                            <TabsTrigger
                                value="history"
                                className="flex-1 flex flex-col items-center justify-center px-6 py-4 data-[state=active]:border-b-1 data-[state=active]:border-avian-400 data-[state=active]:text-avian-400 data-[state=active]:after:h-0.5 data-[state=active]:after:bg-avian-400 data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:w-full bg-background rounded-none text-gray-500 dark:text-gray-400 h-auto relative"
                            >
                                <History className="h-4 w-4 mr-2" />
                                <span>History</span>
                            </TabsTrigger>
                            <TabsTrigger
                                value="settings"
                                className="flex-1 flex flex-col items-center justify-center px-6 py-4 data-[state=active]:border-b-1 data-[state=active]:border-avian-400 data-[state=active]:text-avian-400 data-[state=active]:after:h-0.5 data-[state=active]:after:bg-avian-400 data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:w-full bg-background rounded-br-none rounded-tr-lg text-gray-500 dark:text-gray-400 h-auto relative"
                            >
                                <Settings className="h-4 w-4 mr-2" />
                                <span>Settings</span>
                            </TabsTrigger>
                        </TabsList>

                        <Card className="mt-2">
                            <CardContent className="p-0">
                                <TabsContent value="send" className="m-0">
                                    <SendForm />
                                </TabsContent>
                                <TabsContent value="receive" className="m-0">
                                    <ReceiveContent address={address || ''} />
                                </TabsContent>
                                <TabsContent value="history" className="m-0">
                                    <TransactionHistory />
                                </TabsContent>
                                <TabsContent value="settings" className="m-0">
                                    <WalletSettingsDashboard />
                                </TabsContent>
                            </CardContent>
                        </Card>
                    </Tabs>

                    {/* Connection Status */}
                    <Card>
                        <CardContent className="p-0">
                            <ConnectionStatus />
                        </CardContent>
                    </Card>
                </div>

                {/* Desktop Multi-Panel Dashboard */}
                <div className="hidden lg:block lg:max-w-7xl mx-auto">
                    {/* Top Header - Full Width */}
                    <Card className="relative border-0 shadow-none bg-transparent mb-8 pt-2">
                        <div className="absolute top-2 right-0 flex items-center space-x-2 z-10">
                            {/* Lock Button */}
                            {address && (
                                <Button
                                    onClick={() => lockWallet()}
                                    variant="ghost"
                                    size="icon"
                                    className="w-9 h-9 text-white"
                                    aria-label="Lock wallet"
                                    title="Lock wallet"
                                >
                                    {isLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                                </Button>
                            )}

                            {/* Help Button */}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="w-9 h-9 text-white"
                                onClick={() => setShowAboutModal(true)}
                                title="About wallet & FAQ"
                            >
                                <HelpCircle className="h-4 w-4" />
                            </Button>

                            {/* Theme Switcher */}
                            <ThemeSwitcher />
                        </div>

                        <CardContent className="flex flex-col items-center">
                            <div className="flex mb-2 justify-center items-center">
                                <Image
                                    src="/Avian_logo.svg"
                                    alt="Avian Logo"
                                    width={48}
                                    height={48}
                                    className="text-avian-600 invert"
                                    priority
                                />
                            </div>
                            <CardTitle className="text-2xl text-white font-bold mb-2">Avian FlightDeck</CardTitle>
                            <CardDescription className="text-center text-muted dark:text-muted-foreground ">
                                Manage your AVN cryptocurrency securely and easily.
                            </CardDescription>
                        </CardContent>
                    </Card>

                    {/* Wallet Balance Card - Full Width */}
                    <Card className="wallet-card relative bg-avian-600 mb-8">
                        <CardHeader className="py-3 px-4 relative z-10">
                            <div className="flex justify-between items-center">
                                <CardTitle className="text-xl text-white">Balance</CardTitle>
                                <Button
                                    onClick={handleRefresh}
                                    onMouseDown={handleRefreshMouseDown}
                                    onMouseUp={handleRefreshMouseUp}
                                    onMouseLeave={handleRefreshMouseUp}
                                    onTouchStart={handleRefreshMouseDown}
                                    onTouchEnd={handleRefreshMouseUp}
                                    disabled={isRefreshing}
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-white hover:text-white/80"
                                    title="Refresh balance (hold for full refresh)"
                                >
                                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="relative z-10">
                            <div className="text-2xl lg:text-3xl font-bold mb-2 flex items-center text-white">
                                {isLoading && !processingProgress.isProcessing ? (
                                    'Loading...'
                                ) : (
                                    <>
                                        <span className="break-all whitespace-normal overflow-hidden">
                                            {`${formatBalance(balance)} AVN`}
                                        </span>
                                        {processingProgress.isProcessing && (
                                            <Loader className="w-5 h-5 ml-2 flex-shrink-0 animate-spin opacity-70" />
                                        )}
                                    </>
                                )}
                            </div>
                            <div className="text-sm font-mono flex items-center space-x-1 text-white/90">
                                <span className="truncate max-w-[300px]">
                                    {address ? address : 'No wallet loaded'}
                                </span>
                                {address && (
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleCopyAddress(address);
                                        }}
                                        className="p-1 text-white/90 hover:text-white rounded hover:bg-white/10 transition-colors flex-shrink-0"
                                        title="Copy address to clipboard"
                                    >
                                        <Copy
                                            size={14}
                                            className={`w-4 h-4 ${copiedAddress === address ? 'text-green-300' : ''}`}
                                        />
                                    </button>
                                )}
                            </div>
                            {processingProgress.isProcessing && (
                                <div className="text-xs mt-2 bg-white/20 p-2 rounded border border-white/30 text-white">
                                    <div className="flex items-center flex-wrap">
                                        <Loader className="w-3 h-3 mr-1.5 animate-spin text-white flex-shrink-0" />
                                        <span className="font-medium text-white">
                                            Processing... {processingProgress.processed}/{processingProgress.total}
                                        </span>
                                    </div>
                                    {processingProgress.currentTx && (
                                        <div className="truncate mt-1 pl-4 text-white/80">
                                            TX: {processingProgress.currentTx.slice(0, 6)}...
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-12 gap-8">
                        {/* Send Panel - Left top */}
                        <div className="col-span-12 lg:col-span-6 xl:col-span-6">
                            <Card className="h-full rounded-none rounded-t-md">
                                <CardHeader className="py-3 px-4 bg-gradient-to-r from-avian-400 via-avian-700 to-avian-400 text-white flex items-center rounded-t-md">
                                    <Send className="h-5 w-5 mr-2 flex-shrink-0" />
                                    <CardTitle className="text-lg">Send AVN</CardTitle>
                                </CardHeader>
                                <CardContent className="p-0 pt-2">
                                    <SendForm />
                                </CardContent>
                            </Card>
                        </div>

                        {/* Receive Panel - Right top */}
                        <div className="col-span-12 lg:col-span-6 xl:col-span-6">
                            <Card className="h-full rounded-t-md">
                                <CardHeader className="py-3 px-4 bg-gradient-to-r from-avian-400 via-avian-700 to-avian-400 text-white flex items-center rounded-t-md">
                                    <QrCode className="h-5 w-5 mr-2 flex-shrink-0" />
                                    <CardTitle className="text-lg">Receive AVN</CardTitle>
                                </CardHeader>
                                <CardContent className="p-0 pt-2">
                                    <ReceiveContent address={address || ''} />
                                </CardContent>
                            </Card>
                        </div>

                        {/* Transaction History - Full width bottom */}
                        <div className="col-span-12">
                            <Card className="h-full rounded-t-md">
                                <CardHeader className="py-3 px-4 bg-gradient-to-r from-avian-400 via-avian-700 to-avian-400 text-white flex items-center rounded-t-md">
                                    <History className="h-5 w-5 mr-2 flex-shrink-0" />
                                    <CardTitle className="text-lg">Transaction History</CardTitle>
                                </CardHeader>
                                <CardContent className="p-4">
                                    <TransactionHistory />
                                </CardContent>
                            </Card>
                        </div>

                        {/* Settings Panel - Full width bottom */}
                        <div className="col-span-12">
                            <Card className="h-full rounded-t-md">
                                <CardHeader className="py-3 px-4 bg-gradient-to-r from-avian-400 via-avian-700 to-avian-400 text-white flex items-center rounded-t-md">
                                    <Settings className="h-5 w-5 mr-2 flex-shrink-0" />
                                    <CardTitle className="text-lg">Wallet Settings</CardTitle>
                                </CardHeader>
                                <CardContent className="p-4">
                                    <WalletSettingsDashboard />
                                </CardContent>
                            </Card>
                        </div>

                        {/* Connection Status - Full width at bottom */}
                        <div className="col-span-12">
                            <Card>
                                <CardContent className="p-0">
                                    <ConnectionStatus />
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>

                {/* Welcome Dialog */}
                {showWelcomeDialog && <WelcomeDialog onClose={() => setShowWelcomeDialog(false)} />}

                {/* About Modal */}
                <AboutModal isOpen={showAboutModal} onClose={() => setShowAboutModal(false)} />
            </div>
        </GradientBackground>
    );
}
