'use client'

import { Wallet, Send, QrCode, Settings, RefreshCw, History, Loader } from 'lucide-react'
import { useWallet } from '@/contexts/WalletContext'
import { useState } from 'react'
import SendForm from '@/components/SendForm'
import ReceiveContent from '@/components/ReceiveContent'
import WalletSettings from '@/components/WalletSettings'
import { TransactionHistory } from '@/components/TransactionHistory'
import ConnectionStatus from '@/components/ConnectionStatus'
import ThemeSwitcher from '@/components/ThemeSwitcher'

export default function Home() {
    const { wallet, balance, address, isLoading, processingProgress } = useWallet()
    const [activeTab, setActiveTab] = useState<'send' | 'receive' | 'history' | 'settings'>('send')
    const [showTransactionHistory, setShowTransactionHistory] = useState(false)

    const formatBalance = (balance: number) => {
        const avnBalance = (balance / 100000000).toFixed(8) // Convert satoshis to AVN
        return avnBalance
    }

    const formatAddress = (address: string) => {
        if (!address) return ''
        return `${address.slice(0, 8)}...${address.slice(-8)}`
    }

    return (
        <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-md mx-auto">
                    {/* Header */}
                    <div className="text-center mb-8 relative">
                        {/* Theme Switcher - Top Right */}
                        <div className="absolute top-0 right-0">
                            <ThemeSwitcher />
                        </div>

                        <div className="flex justify-center items-center mb-4">
                            <Wallet className="w-12 h-12 text-avian-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            Avian Wallet
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400">
                            Manage your AVN cryptocurrency securely and easily.
                        </p>
                    </div>

                    {/* Wallet Card */}
                    <div className="wallet-card mb-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold">Balance</h2>
                            <button
                                onClick={() => window.location.reload()}
                                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                            >
                                <RefreshCw className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="text-3xl font-bold mb-2 flex items-center">
                            {isLoading && !processingProgress.isProcessing ? (
                                'Loading...'
                            ) : (
                                <>
                                    {`${formatBalance(balance)} AVN`}
                                    {processingProgress.isProcessing && (
                                        <Loader className="w-5 h-5 ml-2 animate-spin opacity-70" />
                                    )}
                                </>
                            )}
                        </div>
                        <div className="text-sm opacity-80">
                            {address ? formatAddress(address) : 'No wallet loaded'}
                        </div>
                        {processingProgress.isProcessing && (
                            <div className="text-xs opacity-70 mt-2">
                                Processing transactions... {processingProgress.processed}/{processingProgress.total}
                                {processingProgress.currentTx && (
                                    <div className="truncate">
                                        Current: {processingProgress.currentTx.slice(0, 8)}...
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex bg-white dark:bg-gray-800 rounded-lg p-1 mb-6 shadow-sm">
                        <button
                            onClick={() => setActiveTab('send')}
                            className={`flex-1 flex items-center justify-center py-2 px-3 rounded-md font-medium transition-colors text-sm ${activeTab === 'send'
                                ? 'bg-avian-600 text-white'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                }`}
                        >
                            <Send className="w-4 h-4 mr-1" />
                            Send
                        </button>
                        <button
                            onClick={() => setActiveTab('receive')}
                            className={`flex-1 flex items-center justify-center py-2 px-3 rounded-md font-medium transition-colors text-sm ${activeTab === 'receive'
                                ? 'bg-avian-600 text-white'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                }`}
                        >
                            <QrCode className="w-4 h-4 mr-1" />
                            Receive
                        </button>
                        <button
                            onClick={() => {
                                setActiveTab('history')
                                setShowTransactionHistory(true)
                            }}
                            className={`flex-1 flex items-center justify-center py-2 px-3 rounded-md font-medium transition-colors text-sm ${activeTab === 'history'
                                ? 'bg-avian-600 text-white'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                }`}
                        >
                            <History className="w-4 h-4 mr-1" />
                            History
                        </button>
                        <button
                            onClick={() => setActiveTab('settings')}
                            className={`flex-1 flex items-center justify-center py-2 px-3 rounded-md font-medium transition-colors text-sm ${activeTab === 'settings'
                                ? 'bg-avian-600 text-white'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                }`}
                        >
                            <Settings className="w-4 h-4 mr-1" />
                            Settings
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm mb-6">
                        {activeTab === 'send' && <SendForm />}
                        {activeTab === 'receive' && <ReceiveContent address={address || ''} />}
                        {activeTab === 'settings' && <WalletSettings />}
                    </div>

                    {/* Connection Status */}
                    <ConnectionStatus className="mb-6" />

                    {/* Transaction History Modal */}
                    <TransactionHistory
                        isOpen={showTransactionHistory}
                        onClose={() => {
                            setShowTransactionHistory(false)
                            setActiveTab('send') // Reset to send tab when closing
                        }}
                    />
                </div>
            </div>
        </main>
    )
}
