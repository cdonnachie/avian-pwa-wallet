import React, { useState, useEffect, useCallback } from 'react'
import { useWallet } from '@/contexts/WalletContext'
import { EnhancedUTXO } from '@/services/UTXOSelectionService'
import { Coins, TrendingUp, Check, X, Clock, AlertCircle, Info } from 'lucide-react'

interface UTXOSelectorProps {
    isOpen: boolean
    onClose: () => void
    onSelect: (selectedUTXOs: EnhancedUTXO[]) => void
    targetAmount?: number // Optional target amount to help user select enough UTXOs
    initialSelection?: EnhancedUTXO[] // For restoring a previous selection
    feeRate?: number // To calculate if enough has been selected
}

export function UTXOSelector({
    isOpen,
    onClose,
    onSelect,
    targetAmount = 0,
    initialSelection = [],
    feeRate = 10000
}: UTXOSelectorProps) {
    const { wallet, electrum, address, balance } = useWallet()
    const [utxos, setUtxos] = useState<EnhancedUTXO[]>([])
    const [selectedUtxos, setSelectedUtxos] = useState<EnhancedUTXO[]>(initialSelection)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [selectedAmount, setSelectedAmount] = useState(0)
    const [enoughSelected, setEnoughSelected] = useState(false)
    const [sortBy, setSortBy] = useState<'value' | 'age'>('value')
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
    const [filterDust, setFilterDust] = useState(false)
    const [filterUnconfirmed, setFilterUnconfirmed] = useState(false)

    // Load UTXOs from the wallet
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

    // Calculate total selected amount
    useEffect(() => {
        const total = selectedUtxos.reduce((sum, utxo) => sum + utxo.value, 0)
        setSelectedAmount(total)

        // Check if enough is selected to cover target + fees
        const estimatedFee = feeRate + (selectedUtxos.length * 200) // Base fee + ~200 satoshis per input
        setEnoughSelected(total >= (targetAmount + estimatedFee))
    }, [selectedUtxos, targetAmount, feeRate])

    // Load UTXOs when modal opens
    useEffect(() => {
        if (isOpen && electrum && address) {
            loadUTXOs()
        }
    }, [isOpen, electrum, address, loadUTXOs])

    // Initialize from any provided initial selection
    useEffect(() => {
        if (initialSelection && initialSelection.length > 0) {
            setSelectedUtxos(initialSelection)
        }
    }, [initialSelection])

    // Toggle UTXO selection
    const toggleSelection = (utxo: EnhancedUTXO) => {
        const isSelected = selectedUtxos.some(u => u.txid === utxo.txid && u.vout === utxo.vout)
        if (isSelected) {
            setSelectedUtxos(selectedUtxos.filter(u => !(u.txid === utxo.txid && u.vout === utxo.vout)))
        } else {
            setSelectedUtxos([...selectedUtxos, utxo])
        }
    }

    // Select all UTXOs
    const selectAll = () => {
        setSelectedUtxos([...utxos])
    }

    // Clear selection
    const clearSelection = () => {
        setSelectedUtxos([])
    }

    // Sort and filter UTXOs
    const getSortedFilteredUTXOs = () => {
        let filtered = [...utxos]

        // Apply filters
        if (filterDust) {
            filtered = filtered.filter(utxo => !utxo.isDust)
        }

        if (filterUnconfirmed) {
            filtered = filtered.filter(utxo => utxo.isConfirmed)
        }

        // Apply sorting
        filtered.sort((a, b) => {
            if (sortBy === 'value') {
                return sortDirection === 'asc' ? a.value - b.value : b.value - a.value
            } else { // age
                const ageA = a.ageInBlocks || 0
                const ageB = b.ageInBlocks || 0
                return sortDirection === 'asc' ? ageA - ageB : ageB - ageA
            }
        })

        return filtered
    }

    // Format satoshis as AVN with 8 decimal places
    const formatAVN = (satoshis: number) => {
        return (satoshis / 100000000).toFixed(8)
    }

    // Convert confirmations to a user-friendly status
    const getConfirmationStatus = (utxo: EnhancedUTXO) => {
        if (!utxo.confirmations) return 'Unconfirmed'
        if (utxo.confirmations === 1) return '1 confirmation'
        return `${utxo.confirmations} confirmations`
    }

    // Handle confirm button click
    const handleConfirm = () => {
        onSelect(selectedUtxos)
        onClose()
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                        <Coins className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Manual UTXO Selection
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Status and Info */}
                    <div className="mb-4 flex flex-wrap gap-2">
                        <div className="flex-1 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-gray-600 dark:text-gray-300">Selected Amount:</span>
                                <span className="font-mono font-medium text-sm text-gray-900 dark:text-white">
                                    {formatAVN(selectedAmount)} AVN
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600 dark:text-gray-300">Selected UTXOs:</span>
                                <span className="font-medium text-sm text-gray-900 dark:text-white">
                                    {selectedUtxos.length} / {utxos.length}
                                </span>
                            </div>
                        </div>

                        {targetAmount > 0 && (
                            <div className={`flex-1 p-3 rounded-lg border ${enoughSelected
                                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                                    : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                                }`}>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-gray-600 dark:text-gray-300">Target Amount:</span>
                                    <span className="font-mono font-medium text-sm text-gray-900 dark:text-white">
                                        {formatAVN(targetAmount)} AVN
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600 dark:text-gray-300">Status:</span>
                                    <span className={`font-medium text-sm ${enoughSelected
                                            ? 'text-green-600 dark:text-green-400'
                                            : 'text-amber-600 dark:text-amber-400'
                                        }`}>
                                        {enoughSelected ? 'Sufficient' : 'Insufficient'}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Controls */}
                    <div className="mb-4 flex flex-wrap gap-2">
                        <div className="flex-1 flex gap-2">
                            <button
                                onClick={selectAll}
                                className="px-3 py-2 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-md flex-1"
                            >
                                Select All
                            </button>
                            <button
                                onClick={clearSelection}
                                className="px-3 py-2 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded-md flex-1"
                                disabled={selectedUtxos.length === 0}
                            >
                                Clear
                            </button>
                        </div>
                        <div className="flex-1 flex gap-2">
                            <select
                                value={`${sortBy}-${sortDirection}`}
                                onChange={(e) => {
                                    const [newSortBy, newSortDirection] = e.target.value.split('-') as ['value' | 'age', 'asc' | 'desc']
                                    setSortBy(newSortBy)
                                    setSortDirection(newSortDirection)
                                }}
                                className="px-3 py-2 text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md flex-1"
                            >
                                <option value="value-desc">Largest First</option>
                                <option value="value-asc">Smallest First</option>
                                <option value="age-desc">Newest First</option>
                                <option value="age-asc">Oldest First</option>
                            </select>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="mb-4 flex gap-4">
                        <label className="flex items-center text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={filterDust}
                                onChange={() => setFilterDust(!filterDust)}
                                className="mr-2 h-4 w-4 accent-blue-600"
                            />
                            Hide Dust
                        </label>
                        <label className="flex items-center text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={filterUnconfirmed}
                                onChange={() => setFilterUnconfirmed(!filterUnconfirmed)}
                                className="mr-2 h-4 w-4 accent-blue-600"
                            />
                            Hide Unconfirmed
                        </label>
                    </div>

                    {/* Loading State */}
                    {loading && (
                        <div className="text-center py-8">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-blue-600 mb-2"></div>
                            <p className="text-gray-600 dark:text-gray-400">Loading UTXOs...</p>
                        </div>
                    )}

                    {/* Error State */}
                    {error && (
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-center mb-4">
                            <AlertCircle className="inline-block w-6 h-6 text-red-500 mb-2" />
                            <p className="text-red-700 dark:text-red-300">{error}</p>
                            <button
                                onClick={loadUTXOs}
                                className="mt-2 px-3 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded-md"
                            >
                                Retry
                            </button>
                        </div>
                    )}

                    {/* Empty State */}
                    {!loading && !error && utxos.length === 0 && (
                        <div className="text-center py-8">
                            <Info className="inline-block w-8 h-8 text-blue-500 mb-2" />
                            <p className="text-gray-600 dark:text-gray-400">No UTXOs found in this wallet.</p>
                        </div>
                    )}

                    {/* UTXO List */}
                    {!loading && !error && utxos.length > 0 && (
                        <div className="space-y-2 mt-2">
                            {getSortedFilteredUTXOs().map((utxo) => {
                                const isSelected = selectedUtxos.some(u => u.txid === utxo.txid && u.vout === utxo.vout)
                                return (
                                    <div
                                        key={`${utxo.txid}-${utxo.vout}`}
                                        onClick={() => toggleSelection(utxo)}
                                        className={`p-3 border rounded-lg cursor-pointer flex items-center transition-colors ${isSelected
                                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                                : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                                            }`}
                                    >
                                        {/* Selection checkbox */}
                                        <div className="mr-3">
                                            <div className={`w-5 h-5 flex items-center justify-center rounded-sm border ${isSelected
                                                    ? 'bg-blue-500 border-blue-500'
                                                    : 'border-gray-300 dark:border-gray-500'
                                                }`}>
                                                {isSelected && <Check className="w-3 h-3 text-white" />}
                                            </div>
                                        </div>

                                        {/* UTXO Info */}
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between">
                                                <span className="font-medium text-sm text-gray-900 dark:text-white">
                                                    {formatAVN(utxo.value)} AVN
                                                </span>
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${utxo.isDust
                                                        ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200'
                                                        : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
                                                    }`}>
                                                    {utxo.isDust ? 'Dust' : 'UTXO'}
                                                </span>
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center mt-1">
                                                <span className="font-mono truncate flex-1" style={{ maxWidth: '150px' }}>
                                                    {utxo.txid.substring(0, 8)}...{utxo.txid.substring(utxo.txid.length - 8)}:{utxo.vout}
                                                </span>
                                                <span className="flex items-center">
                                                    <Clock className="inline-block w-3 h-3 mr-1" />
                                                    {getConfirmationStatus(utxo)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 dark:border-gray-700 p-4 flex justify-between">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={selectedUtxos.length === 0 || (targetAmount > 0 && !enoughSelected)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg flex items-center"
                    >
                        <Check className="w-4 h-4 mr-2" />
                        Confirm Selection
                    </button>
                </div>
            </div>
        </div>
    )
}
