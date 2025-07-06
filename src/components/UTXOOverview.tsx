import React, { useState, useEffect, useCallback } from 'react'
import { useWallet } from '@/contexts/WalletContext'
import { EnhancedUTXO, UTXOSelectionService } from '@/services/UTXOSelectionService'
import { Coins, TrendingUp, TrendingDown, AlertCircle, Clock, Check } from 'lucide-react'

interface UTXOOverviewProps {
    isOpen: boolean
    onClose: () => void
}

export function UTXOOverview({ isOpen, onClose }: UTXOOverviewProps) {
    const { wallet, electrum, address, balance } = useWallet()
    const [utxos, setUtxos] = useState<EnhancedUTXO[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const loadUTXOs = useCallback(async () => {
        try {
            setLoading(true)
            setError('')

            if (!electrum || !address) return

            const rawUTXOs = await electrum.getUTXOs(address)
            const currentBlockHeight = await electrum.getCurrentBlockHeight()

            const enhancedUTXOs: EnhancedUTXO[] = rawUTXOs.map((utxo: any) => ({
                ...utxo,
                confirmations: utxo.height ? Math.max(0, currentBlockHeight - utxo.height + 1) : 0,
                isConfirmed: utxo.height ? (currentBlockHeight - utxo.height + 1) >= 1 : false,
                ageInBlocks: utxo.height ? currentBlockHeight - utxo.height + 1 : 0,
                isDust: utxo.value <= 1000, // 0.00001 AVN threshold
                address: address
            }))

            setUtxos(enhancedUTXOs)
        } catch (err) {
            setError('Failed to load UTXOs')
            console.error('Error loading UTXOs:', err)
        } finally {
            setLoading(false)
        }
    }, [electrum, address])

    useEffect(() => {
        if (isOpen && electrum && address) {
            loadUTXOs()
        }
    }, [isOpen, electrum, address, loadUTXOs])

    if (!isOpen) return null

    const totalUTXOs = utxos.length
    const confirmedUTXOs = utxos.filter(u => u.isConfirmed).length
    const dustUTXOs = utxos.filter(u => u.isDust).length
    const largeUTXOs = utxos.filter(u => u.value > 100000000).length // > 1 AVN

    const formatAVN = (satoshis: number) => {
        return (satoshis / 100000000).toFixed(8)
    }

    const formatTxId = (txid: string) => {
        return `${txid.slice(0, 8)}...${txid.slice(-8)}`
    }

    const getConfirmationIcon = (confirmations: number) => {
        if (confirmations === 0) return <Clock className="w-4 h-4 text-yellow-500" />
        if (confirmations < 6) return <AlertCircle className="w-4 h-4 text-orange-500" />
        return <Check className="w-4 h-4 text-green-500" />
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                        <Coins className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            UTXO Overview
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Stats */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">{totalUTXOs}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">Total UTXOs</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{confirmedUTXOs}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">Confirmed</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{dustUTXOs}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">Dust UTXOs</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{largeUTXOs}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">Large UTXOs</div>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    {loading ? (
                        <div className="flex items-center justify-center p-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <span className="ml-2 text-gray-600 dark:text-gray-300">Loading UTXOs...</span>
                        </div>
                    ) : error ? (
                        <div className="text-center p-8">
                            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                            <p className="text-red-600 dark:text-red-400">{error}</p>
                            <button
                                onClick={loadUTXOs}
                                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Retry
                            </button>
                        </div>
                    ) : utxos.length === 0 ? (
                        <div className="text-center p-8">
                            <Coins className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600 dark:text-gray-400">No UTXOs found</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* UTXO List */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-200 dark:border-gray-700">
                                            <th className="text-left p-2 font-medium text-gray-900 dark:text-white">Transaction</th>
                                            <th className="text-left p-2 font-medium text-gray-900 dark:text-white">Output</th>
                                            <th className="text-left p-2 font-medium text-gray-900 dark:text-white">Amount</th>
                                            <th className="text-left p-2 font-medium text-gray-900 dark:text-white">Confirmations</th>
                                            <th className="text-left p-2 font-medium text-gray-900 dark:text-white">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {utxos.map((utxo, index) => (
                                            <tr key={`${utxo.txid}-${utxo.vout}`} className="border-b border-gray-100 dark:border-gray-700">
                                                <td className="p-2">
                                                    <span className="font-mono text-xs text-gray-600 dark:text-gray-400">
                                                        {formatTxId(utxo.txid)}
                                                    </span>
                                                </td>
                                                <td className="p-2">
                                                    <span className="font-mono text-sm text-gray-900 dark:text-white">
                                                        {utxo.vout}
                                                    </span>
                                                </td>
                                                <td className="p-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono text-sm text-gray-900 dark:text-white">
                                                            {formatAVN(utxo.value)} AVN
                                                        </span>
                                                        {utxo.isDust && (
                                                            <span className="text-xs bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 px-1.5 py-0.5 rounded">
                                                                Dust
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-2">
                                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                                        {utxo.confirmations || 0}
                                                    </span>
                                                </td>
                                                <td className="p-2">
                                                    <div className="flex items-center gap-2">
                                                        {getConfirmationIcon(utxo.confirmations || 0)}
                                                        <span className="text-sm text-gray-600 dark:text-gray-400">
                                                            {utxo.confirmations === 0 ? 'Pending' :
                                                                utxo.confirmations! < 6 ? 'Confirming' : 'Confirmed'}
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Recommendations */}
                            {dustUTXOs > 5 && (
                                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                                        <h3 className="font-medium text-yellow-800 dark:text-yellow-200">
                                            Dust Consolidation Recommended
                                        </h3>
                                    </div>
                                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                                        You have {dustUTXOs} dust UTXOs (very small amounts). Consider consolidating them
                                        in a low-priority transaction to reduce future transaction fees.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    )
}
