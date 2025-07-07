'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { StorageService } from '@/services/StorageService'
import { WalletService } from '@/services/WalletService'
import { useWallet } from '@/contexts/WalletContext'
import { ArrowUpRight, ArrowDownLeft, Clock, Check, AlertCircle, ExternalLink, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'

interface TransactionData {
    id?: number
    txid: string
    amount: number
    address: string
    fromAddress?: string
    type: 'send' | 'receive'
    timestamp: Date | string // Can be string when retrieved from database
    confirmations: number
    blockHeight?: number
}

// Extended interface to support virtual transaction entries for self-transfers
interface EnhancedTransactionData extends TransactionData {
    isVirtual?: boolean; // Marks this as a UI-only transaction entry
}

// Helper function to check if a transaction is a self-transfer
const isSelfTransfer = (tx: TransactionData, walletAddress: string): boolean => {
    return tx.address === tx.fromAddress && tx.address === walletAddress;
}

// Helper function to process transactions for display
const processTransactionsForDisplay = (txs: TransactionData[], walletAddress: string): EnhancedTransactionData[] => {
    const result: EnhancedTransactionData[] = [];

    // Group transactions by txid to help identify self-transfers with potential duplicates
    const txsByTxid = new Map<string, TransactionData[]>();

    // Group all transactions by txid
    txs.forEach(tx => {
        if (!txsByTxid.has(tx.txid)) {
            txsByTxid.set(tx.txid, []);
        }
        txsByTxid.get(tx.txid)!.push(tx);
    });

    // Process each transaction group
    txsByTxid.forEach((transactions, txid) => {
        // Check if any transaction in this group is a self-transfer
        const selfTransferTxs = transactions.filter(tx => isSelfTransfer(tx, walletAddress));
        const hasSelfTransfer = selfTransferTxs.length > 0;

        // For self-transfers, we'll add exactly one send and one receive entry
        if (hasSelfTransfer) {
            // Get all unique transactions by type (in case of duplicates)
            // For each type, take only the first transaction to avoid duplicates
            const sendTxs = transactions.filter(tx => tx.type === 'send');
            const receiveTxs = transactions.filter(tx => tx.type === 'receive');

            // Take only the first of each type to avoid duplicates
            const sendTx = sendTxs.length > 0 ? sendTxs[0] : null;
            const receiveTx = receiveTxs.length > 0 ? receiveTxs[0] : null;

            // If we don't have a send transaction, create a virtual one from the receive
            if (!sendTx && receiveTx) {
                result.push({
                    ...receiveTx,
                    type: 'send',
                    isVirtual: true,
                    id: receiveTx.id ? receiveTx.id * -1 : undefined // Ensure unique ID
                });
            }
            // If we have a send transaction, add only the first one
            else if (sendTx) {
                result.push(sendTx);
            }

            // If we don't have a receive transaction, create a virtual one from the send
            if (!receiveTx && sendTx) {
                result.push({
                    ...sendTx,
                    type: 'receive',
                    isVirtual: true,
                    id: sendTx.id ? sendTx.id * -1 : undefined // Ensure unique ID
                });
            }
            // If we have a receive transaction, add only the first one
            else if (receiveTx) {
                result.push(receiveTx);
            }
        } else {
            // For regular transactions, deduplicate by type
            // Create a map to track if we've seen a transaction of each type for this txid
            const typesAdded = new Set<string>();

            // Add only the first instance of each transaction type
            transactions.forEach(tx => {
                // Only add this transaction if we haven't seen its type before
                if (!typesAdded.has(tx.type)) {
                    result.push(tx);
                    typesAdded.add(tx.type);
                }
            });
        }
    });

    return result;
};

interface TransactionHistoryProps {
    isOpen: boolean
    onClose: () => void
}

export function TransactionHistory({ isOpen, onClose }: TransactionHistoryProps) {
    const { address, refreshTransactionHistory, processingProgress, reprocessTransactionHistoryProgressive } = useWallet()
    const [transactions, setTransactions] = useState<EnhancedTransactionData[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [filter, setFilter] = useState<'all' | 'send' | 'receive'>('all')
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage] = useState(20) // Show 20 transactions per page    // Function to refresh transaction history with progress updates
    const refreshTransactionHistoryWithProgress = useCallback(async () => {
        if (!address) return

        try {
            setIsRefreshing(true)

            // Use the progressive method that updates UI in real-time
            await reprocessTransactionHistoryProgressive()

            // Final reload after processing is complete
            const finalTxHistory = await StorageService.getTransactionHistory(address)
            const finalSorted = finalTxHistory.sort((a, b) =>
                new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            )

            // Process transactions to handle self-transfers
            const enhancedTransactions = processTransactionsForDisplay(finalSorted, address);
            setTransactions(enhancedTransactions)

        } catch (error) {
            console.error('Progressive refresh failed:', error)
            throw error
        } finally {
            setIsRefreshing(false)
        }
    }, [address, reprocessTransactionHistoryProgressive])

    const loadTransactions = useCallback(async () => {
        if (!address) return

        try {
            setIsLoading(true)

            // Load from local storage first
            const txHistory = await StorageService.getTransactionHistory(address)
            const sortedTx = txHistory.sort((a, b) =>
                new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            )

            // Process transactions to handle self-transfers
            const enhancedTransactions = processTransactionsForDisplay(sortedTx, address);
            setTransactions(enhancedTransactions)
            setIsLoading(false)

            // Only refresh from blockchain if we have no local data
            if (txHistory.length === 0) {
                try {
                    await refreshTransactionHistory()
                    // Reload after refresh
                    const updatedTxHistory = await StorageService.getTransactionHistory(address)
                    const updatedSorted = updatedTxHistory.sort((a, b) =>
                        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                    )

                    // Process transactions to handle self-transfers
                    const enhancedTransactions = processTransactionsForDisplay(updatedSorted, address);
                    setTransactions(enhancedTransactions)
                } catch (refreshError) {
                    console.warn('Failed to refresh from blockchain:', refreshError)
                }
            }
        } catch (error) {
            console.error('Failed to load transaction history:', error)
            setIsLoading(false)
        }
    }, [address, refreshTransactionHistory])

    useEffect(() => {
        const loadTransactionsEffect = async () => {
            if (isOpen) {
                await loadTransactions()
                setCurrentPage(1) // Reset to first page when opening
            }
        }

        loadTransactionsEffect()
    }, [isOpen, loadTransactions])

    // Separate effect to handle real-time updates during processing
    useEffect(() => {
        if (!isOpen || !address || !processingProgress.isProcessing) {
            return
        }

        const updateInterval = setInterval(async () => {
            try {
                const txHistory = await StorageService.getTransactionHistory(address)
                const sortedTx = txHistory.sort((a, b) =>
                    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                )

                // Process transactions to handle self-transfers
                const enhancedTransactions = processTransactionsForDisplay(sortedTx, address);
                setTransactions(enhancedTransactions)
            } catch (error) {
                console.error('Error updating transactions during processing:', error)
            }
        }, 3000) // Update every 3 seconds during processing

        return () => clearInterval(updateInterval)
    }, [isOpen, address, processingProgress.isProcessing])

    // Reset page when filter changes
    useEffect(() => {
        setCurrentPage(1)
    }, [filter])

    const filteredTransactions = transactions.filter(tx => {
        if (filter === 'all') return true
        return tx.type === filter
    })

    // Pagination calculations
    const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex)

    const nextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage(currentPage + 1)
        }
    }

    const prevPage = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1)
        }
    }

    const goToPage = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page)
        }
    }

    const formatAmount = (amount: number, type: 'send' | 'receive') => {
        const sign = type === 'send' ? '-' : '+'
        const color = type === 'send' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
        return (
            <span className={`font-medium ${color}`}>
                {sign}{amount.toFixed(8)} AVN
            </span>
        )
    }

    const formatDate = (date: Date | string) => {
        const now = new Date()
        // Ensure we have a proper Date object
        const txDate = new Date(date)

        // Check if the date is valid
        if (isNaN(txDate.getTime())) {
            return 'Unknown date'
        }

        const diffMs = now.getTime() - txDate.getTime()
        const diffMinutes = Math.floor(diffMs / (1000 * 60))
        const diffHours = Math.floor(diffMinutes / 60)
        const diffDays = Math.floor(diffHours / 24)

        if (diffMinutes < 1) return 'Just now'
        if (diffMinutes < 60) return `${diffMinutes}m ago`
        if (diffHours < 24) return `${diffHours}h ago`
        if (diffDays === 1) return 'Yesterday'
        if (diffDays < 7) return `${diffDays} days ago`

        return txDate.toLocaleDateString()
    }

    const getStatusIcon = (confirmations: number) => {
        if (confirmations === 0) {
            return <Clock className="w-4 h-4 text-yellow-500" />
        } else if (confirmations < 6) {
            return <AlertCircle className="w-4 h-4 text-orange-500" />
        } else {
            return <Check className="w-4 h-4 text-green-500" />
        }
    }

    const getStatusText = (confirmations: number) => {
        if (confirmations === 0) return 'Pending'
        if (confirmations < 6) return `${confirmations}/6 confirmations`
        return 'Confirmed'
    }

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text)
            // Could add a toast notification here
        } catch (error) {
            console.error('Failed to copy to clipboard:', error)
        }
    }

    const openExplorer = (txid: string) => {
        // Open the transaction in the Avian block explorer
        WalletService.openTransactionInExplorer(txid)
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        Transaction History
                    </h2>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={refreshTransactionHistoryWithProgress}
                            disabled={isRefreshing || processingProgress.isProcessing}
                            className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
                            title="Refresh transaction history"
                        >
                            <RefreshCw className={`w-4 h-4 ${isRefreshing || processingProgress.isProcessing ? 'animate-spin' : ''}`} />
                            <span className="hidden sm:inline">
                                {isRefreshing || processingProgress.isProcessing ? 'Refreshing...' : 'Refresh'}
                            </span>
                        </button>
                        <button
                            onClick={onClose}
                            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-2"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Filter Controls */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <div className="flex flex-wrap gap-2 mb-3">
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-3 py-1 rounded-lg text-sm transition-colors ${filter === 'all'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                        >
                            All Transactions ({transactions.length})
                        </button>
                        <button
                            onClick={() => setFilter('receive')}
                            className={`px-3 py-1 rounded-lg text-sm transition-colors ${filter === 'receive'
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                        >
                            Received ({transactions.filter(tx => tx.type === 'receive').length})
                        </button>
                        <button
                            onClick={() => setFilter('send')}
                            className={`px-3 py-1 rounded-lg text-sm transition-colors ${filter === 'send'
                                ? 'bg-red-600 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                        >
                            Sent ({transactions.filter(tx => tx.type === 'send').length})
                        </button>
                    </div>

                    {/* Processing Progress */}
                    {processingProgress.isProcessing && processingProgress.total > 0 && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-blue-900 dark:text-blue-200">
                                    Processing transaction history...
                                </span>
                                <span className="text-xs text-blue-700 dark:text-blue-300">
                                    {processingProgress.processed}/{processingProgress.total}
                                </span>
                            </div>
                            <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                                <div
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                    style={{
                                        width: processingProgress.total > 0
                                            ? `${(processingProgress.processed / processingProgress.total) * 100}%`
                                            : '0%'
                                    }}
                                />
                            </div>
                            <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                New transactions will appear as they&apos;re processed
                            </div>
                            {processingProgress.currentTx && (
                                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 font-mono">
                                    Processing: {processingProgress.currentTx.slice(0, 16)}...
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Transaction List - Flexible height */}
                <div className="flex-1 overflow-y-auto min-h-0">{/* min-h-0 ensures flex child can shrink */}
                    {isLoading ? (
                        <div className="flex items-center justify-center p-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <span className="ml-2 text-gray-600 dark:text-gray-300">Loading transactions...</span>
                        </div>
                    ) : paginatedTransactions.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="text-gray-400 dark:text-gray-500 mb-2">
                                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                </svg>
                            </div>
                            <p className="text-gray-600 dark:text-gray-400 text-lg">
                                {filter === 'all' ? 'No transactions found' : `No ${filter} transactions found`}
                            </p>
                            <p className="text-gray-500 dark:text-gray-500 text-sm mt-1">
                                Transactions will appear here once you start using your wallet
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200 dark:divide-gray-700">
                            {paginatedTransactions.map((tx) => (
                                <div key={`${tx.id || tx.txid}-${tx.type}${tx.isVirtual ? '-virtual' : ''}`} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-3 min-w-0 flex-1">
                                            {/* Transaction Icon */}
                                            <div className={`flex-shrink-0 p-2 rounded-full ${tx.type === 'send'
                                                ? 'bg-red-100 dark:bg-red-900/20'
                                                : 'bg-green-100 dark:bg-green-900/20'
                                                }`}>
                                                {tx.type === 'send' ? (
                                                    <ArrowUpRight className="w-4 h-4 text-red-600 dark:text-red-400" />
                                                ) : (
                                                    <ArrowDownLeft className="w-4 h-4 text-green-600 dark:text-green-400" />
                                                )}
                                            </div>

                                            {/* Transaction Details */}
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-medium text-gray-900 dark:text-white capitalize">
                                                        {tx.type}
                                                    </span>
                                                    {getStatusIcon(tx.confirmations)}
                                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                                        {getStatusText(tx.confirmations)}
                                                    </span>
                                                </div>

                                                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                                    {tx.type === 'send' ? 'To: ' : 'From: '}
                                                    <span className="font-mono break-all">
                                                        {(() => {
                                                            const displayAddress = tx.type === 'send' ? tx.address : (tx.fromAddress || tx.address);
                                                            return displayAddress.length > 40
                                                                ? `${displayAddress.slice(0, 20)}...${displayAddress.slice(-20)}`
                                                                : displayAddress;
                                                        })()}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                                        {formatDate(tx.timestamp)}
                                                    </span>
                                                    <button
                                                        onClick={() => openExplorer(tx.txid)}
                                                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                                                    >
                                                        <ExternalLink className="w-3 h-3" />
                                                        View Details
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Amount */}
                                        <div className="flex-shrink-0 text-right">
                                            {formatAmount(tx.amount, tx.type)}
                                            {tx.blockHeight && (
                                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                    Block #{tx.blockHeight}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer with Pagination - Always visible at bottom */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 flex-shrink-0">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                        <span>
                            Showing {startIndex + 1}-{Math.min(endIndex, filteredTransactions.length)} of {filteredTransactions.length} {filter === 'all' ? 'transactions' : `${filter} transactions`}
                        </span>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={prevPage}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>

                                {/* Page Numbers */}
                                <div className="flex items-center gap-1">
                                    {(() => {
                                        const maxVisiblePages = 5
                                        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
                                        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)

                                        if (endPage - startPage + 1 < maxVisiblePages) {
                                            startPage = Math.max(1, endPage - maxVisiblePages + 1)
                                        }

                                        const pages = []

                                        if (startPage > 1) {
                                            pages.push(
                                                <button
                                                    key={1}
                                                    onClick={() => goToPage(1)}
                                                    className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600"
                                                >
                                                    1
                                                </button>
                                            )
                                            if (startPage > 2) {
                                                pages.push(<span key="ellipsis1" className="px-1">...</span>)
                                            }
                                        }

                                        for (let i = startPage; i <= endPage; i++) {
                                            pages.push(
                                                <button
                                                    key={i}
                                                    onClick={() => goToPage(i)}
                                                    className={`px-2 py-1 rounded border ${i === currentPage
                                                        ? 'bg-blue-600 text-white border-blue-600'
                                                        : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                                                        }`}
                                                >
                                                    {i}
                                                </button>
                                            )
                                        }

                                        if (endPage < totalPages) {
                                            if (endPage < totalPages - 1) {
                                                pages.push(<span key="ellipsis2" className="px-1">...</span>)
                                            }
                                            pages.push(
                                                <button
                                                    key={totalPages}
                                                    onClick={() => goToPage(totalPages)}
                                                    className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600"
                                                >
                                                    {totalPages}
                                                </button>
                                            )
                                        }

                                        return pages
                                    })()}
                                </div>

                                <button
                                    onClick={nextPage}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        )}

                        <button
                            onClick={async () => {
                                // If we have many transactions, use progressive refresh
                                if (transactions.length > 100) {
                                    await refreshTransactionHistoryWithProgress()
                                } else {
                                    await loadTransactions()
                                }
                            }}
                            disabled={processingProgress.isProcessing}
                            className="text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {processingProgress.isProcessing ? 'Processing...' : 'Refresh'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
