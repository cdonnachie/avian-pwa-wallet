'use client'

import { useState } from 'react'
import { Send, AlertCircle, ExternalLink, BookOpen, Settings, Coins, Lock } from 'lucide-react'
import { useWallet } from '@/contexts/WalletContext'
import { useSecurity } from '@/contexts/SecurityContext'
import { WalletService } from '@/services/WalletService'
import { StorageService } from '@/services/StorageService'
import { CoinSelectionStrategy } from '@/services/UTXOSelectionService'
import AddressBook from './AddressBook'
import { UTXOSelectionSettings } from './UTXOSelectionSettings'
import { UTXOOverview } from './UTXOOverview'

export default function SendForm() {
    const { sendTransaction, balance, isLoading, isConnected, isEncrypted } = useWallet()
    const { requireAuth } = useSecurity()
    const [toAddress, setToAddress] = useState('')
    const [amount, setAmount] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [successTxId, setSuccessTxId] = useState('')
    const [isSending, setIsSending] = useState(false)
    const [showAddressBook, setShowAddressBook] = useState(false)
    const [askToSaveAddress, setAskToSaveAddress] = useState(false)
    const [showUTXOSettings, setShowUTXOSettings] = useState(false)
    const [showUTXOOverview, setShowUTXOOverview] = useState(false)
    const [utxoOptions, setUtxoOptions] = useState<{
        strategy?: CoinSelectionStrategy
        feeRate?: number
        maxInputs?: number
        minConfirmations?: number
    }>({
        strategy: CoinSelectionStrategy.BEST_FIT,
        feeRate: 10000,
        maxInputs: 20,
        minConfirmations: 0
    })

    const validateAddress = (address: string): boolean => {
        // Avian addresses should be base58 encoded and start with 'R'
        // Length should be between 26-35 characters for P2PKH addresses
        if (!address || address.length < 26 || address.length > 35) {
            return false
        }

        // Must start with 'R' for Avian mainnet
        if (!address.startsWith('R')) {
            return false
        }

        // Basic character validation - should only contain base58 characters
        const base58Regex = /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/
        return base58Regex.test(address)
    }

    const openExplorer = (txid: string) => {
        WalletService.openTransactionInExplorer(txid)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setSuccess('')
        setSuccessTxId('')

        // Require authentication for sensitive operation
        const authRequired = await requireAuth()
        if (!authRequired) {
            setError('Authentication required for sending transactions')
            return
        }

        if (!toAddress || !amount) {
            setError('Please fill in all fields')
            return
        }

        if (!isConnected) {
            setError('Not connected to Avian network. Please check your connection.')
            return
        }

        if (!validateAddress(toAddress)) {
            setError('Invalid Avian address. Address must start with "R" and be 26-35 characters long.')
            return
        }

        const amountSatoshis = Math.floor(parseFloat(amount) * 100000000)
        const fee = 10000 // 0.0001 AVN fee

        if (amountSatoshis <= 0) {
            setError('Amount must be greater than 0')
            return
        }

        if (balance < fee) {
            setError('Insufficient funds to cover network fee (0.0001 AVN required)')
            return
        }

        if (amountSatoshis + fee > balance) {
            setError(`Insufficient funds. Maximum sendable: ${maxAmount.toFixed(8)} AVN (after fee)`)
            return
        }

        try {
            setIsSending(true)
            setError('') // Clear any previous errors



            const txId = await sendTransaction(toAddress, amountSatoshis, password, utxoOptions)

            setSuccess('Transaction sent successfully!')
            setSuccessTxId(txId)

            // Check if we should ask to save this address
            const savedAddresses = await StorageService.getSavedAddresses()
            const isAddressSaved = savedAddresses.some(addr => addr.address === toAddress)

            if (!isAddressSaved && validateAddress(toAddress)) {
                setAskToSaveAddress(true)
            }

            // Update usage count if address is already saved
            if (isAddressSaved) {
                await StorageService.updateAddressUsage(toAddress)
            }

            // Clear form on success
            setToAddress('')
            setAmount('')
            setPassword('')


        } catch (error: any) {
            console.error('Send transaction error:', error)

            // Provide more specific error messages
            let errorMessage = 'Failed to send transaction'

            if (error.message) {
                if (error.message.includes('Insufficient funds')) {
                    errorMessage = 'Insufficient funds (including network fee)'
                } else if (error.message.includes('Invalid password')) {
                    errorMessage = 'Invalid wallet password'
                } else if (error.message.includes('No unspent')) {
                    errorMessage = 'No available funds to spend'
                } else if (error.message.includes('broadcast')) {
                    errorMessage = 'Failed to broadcast transaction to network'
                } else if (error.message.includes('connection') || error.message.includes('network')) {
                    errorMessage = 'Network connection error. Please check your connection and try again.'
                } else {
                    errorMessage = error.message
                }
            }

            setError(errorMessage)
        } finally {
            setIsSending(false)
        }
    }

    const handleSelectAddress = (address: string) => {
        setToAddress(address)
        setShowAddressBook(false)
    }

    const handleSaveAddressFromTransaction = async (name: string, description?: string) => {
        const lastUsedAddress = successTxId ? toAddress : '' // Store the address from successful transaction
        if (lastUsedAddress) {
            const addressData = {
                id: '',
                name: name.trim(),
                address: lastUsedAddress,
                description: description?.trim(),
                dateAdded: new Date(),
                useCount: 1,
                lastUsed: new Date()
            }

            await StorageService.saveAddress(addressData)
        }
        setAskToSaveAddress(false)
    }

    const maxAmount = Math.max(0, (balance - 10000) / 100000000) // Subtract fee

    const resetUTXOSettings = () => {
        setUtxoOptions({
            strategy: CoinSelectionStrategy.BEST_FIT,
            feeRate: 10000,
            maxInputs: 20,
            minConfirmations: 0
        })
    }

    return (
        <div className="p-6">
            <div className="mb-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                        <Send className="w-5 h-5 mr-2 text-avian-600" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Send AVN
                        </h3>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowUTXOOverview(true)}
                        className="flex items-center px-3 py-2 text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700 transition-colors"
                        title="View Available UTXOs"
                    >
                        <Coins className="w-4 h-4 mr-1.5" />
                        UTXOs
                    </button>
                    <button
                        onClick={() => setShowUTXOSettings(true)}
                        className={`relative flex items-center px-3 py-2 text-sm rounded-lg border transition-colors ${utxoOptions.strategy !== CoinSelectionStrategy.BEST_FIT ||
                            utxoOptions.feeRate !== 10000 ||
                            utxoOptions.maxInputs !== 20 ||
                            utxoOptions.minConfirmations !== 0
                            ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700'
                            : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 border-gray-200 dark:border-gray-600'
                            }`}
                        title="Advanced Transaction Settings"
                    >
                        <Settings className="w-4 h-4 mr-1.5" />
                        Advanced
                        {(utxoOptions.strategy !== CoinSelectionStrategy.BEST_FIT ||
                            utxoOptions.feeRate !== 10000 ||
                            utxoOptions.maxInputs !== 20 ||
                            utxoOptions.minConfirmations !== 0) && (
                                <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full"></span>
                            )}
                    </button>
                    <button
                        onClick={() => setShowAddressBook(!showAddressBook)}
                        className={`flex items-center px-3 py-2 text-sm rounded-lg border transition-colors ${showAddressBook
                            ? 'bg-avian-100 dark:bg-avian-900/20 text-avian-700 dark:text-avian-300 border-avian-200 dark:border-avian-700'
                            : 'bg-avian-50 dark:bg-avian-900/10 text-avian-600 dark:text-avian-400 hover:bg-avian-100 dark:hover:bg-avian-900/20 border-avian-200 dark:border-avian-700'
                            }`}
                        title="Address Book"
                    >
                        <BookOpen className="w-4 h-4 mr-1.5" />
                        Address Book
                    </button>
                </div>
            </div>

            {/* UTXO Selection Status */}
            {(utxoOptions.strategy !== CoinSelectionStrategy.BEST_FIT ||
                utxoOptions.feeRate !== 10000 ||
                utxoOptions.maxInputs !== 20 ||
                utxoOptions.minConfirmations !== 0) && (
                    <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <Settings className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
                                <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                                    Custom Transaction Settings Active
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={resetUTXOSettings}
                                    className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 underline"
                                >
                                    Reset
                                </button>
                                <button
                                    onClick={() => setShowUTXOSettings(true)}
                                    className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline"
                                >
                                    Modify
                                </button>
                            </div>
                        </div>
                        <div className="mt-2 text-xs text-blue-700 dark:text-blue-300 space-y-1">
                            {utxoOptions.strategy !== CoinSelectionStrategy.BEST_FIT && (
                                <div>Strategy: {utxoOptions.strategy?.replace(/_/g, ' ')}</div>
                            )}
                            {utxoOptions.feeRate !== 10000 && (
                                <div>Fee Rate: {utxoOptions.feeRate} sat/vB</div>
                            )}
                            {utxoOptions.maxInputs !== 20 && (
                                <div>Max Inputs: {utxoOptions.maxInputs}</div>
                            )}
                            {utxoOptions.minConfirmations !== 0 && (
                                <div>Min Confirmations: {utxoOptions.minConfirmations}</div>
                            )}
                        </div>
                    </div>
                )}

            {/* Address Book */}
            {showAddressBook && (
                <div className="mb-6 p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700">
                    <AddressBook
                        onSelectAddress={handleSelectAddress}
                        currentAddress={toAddress}
                    />
                </div>
            )}

            {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg flex items-center text-red-700">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    {error}
                </div>
            )}

            {success && (
                <div className="mb-4 p-3 bg-green-100 border border-green-300 rounded-lg text-green-700 text-sm">
                    <div className="font-medium mb-2">{success}</div>
                    {successTxId && (
                        <div className="space-y-2">
                            <div className="text-xs text-green-600">
                                Transaction ID:
                                <span className="font-mono ml-1 break-all">
                                    {successTxId.length > 20
                                        ? `${successTxId.slice(0, 10)}...${successTxId.slice(-10)}`
                                        : successTxId
                                    }
                                </span>
                            </div>
                            <button
                                onClick={() => openExplorer(successTxId)}
                                className="inline-flex items-center gap-1 text-xs text-green-700 hover:text-green-800 font-medium underline"
                            >
                                <ExternalLink className="w-3 h-3" />
                                View on Explorer
                            </button>
                        </div>
                    )}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="toAddress" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        To Address
                    </label>
                    <input
                        type="text"
                        id="toAddress"
                        value={toAddress}
                        onChange={(e) => setToAddress(e.target.value)}
                        placeholder="Enter Avian address (R...)"
                        className="input-field"
                        disabled={isSending}
                    />
                </div>

                <div>
                    <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Amount (AVN)
                    </label>
                    <div className="relative">
                        <input
                            type="number"
                            id="amount"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00000000"
                            step="0.00000001"
                            min="0"
                            className="input-field pr-16"
                            disabled={isSending}
                        />
                        <button
                            type="button"
                            onClick={() => setAmount(maxAmount.toString())}
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-avian-600 hover:text-avian-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                            disabled={isSending || maxAmount <= 0}
                        >
                            MAX
                        </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                        Fee: 0.0001 AVN | Max sendable: {maxAmount.toFixed(8)} AVN
                        {maxAmount <= 0 && (
                            <span className="text-red-500 ml-2">(Insufficient funds for fee)</span>
                        )}
                    </p>
                </div>

                {/* Password field - only show if wallet is encrypted */}
                {isEncrypted && (
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Wallet Password
                        </label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter wallet password"
                            className="input-field"
                            disabled={isSending}
                        />
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isSending || isLoading}
                    className="w-full button-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSending ? 'Sending...' : 'Send Transaction'}
                </button>
            </form>

            {/* Save Address Prompt */}
            {askToSaveAddress && (
                <div className="mt-4 p-4 bg-yellow-100 border border-yellow-300 rounded-lg text-yellow-700 text-sm">
                    <div className="font-medium mb-2">
                        Do you want to save this address to your address book?
                    </div>
                    <button
                        onClick={() => handleSaveAddressFromTransaction('Untitled')}
                        className="mr-2 px-3 py-1 text-xs bg-green-500 hover:bg-green-600 text-white rounded-lg"
                    >
                        Save Address
                    </button>
                    <button
                        onClick={() => setAskToSaveAddress(false)}
                        className="px-3 py-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded-lg"
                    >
                        No, Thanks
                    </button>
                </div>
            )}

            {/* UTXO Selection Settings Modal */}
            <UTXOSelectionSettings
                isOpen={showUTXOSettings}
                onClose={() => setShowUTXOSettings(false)}
                onApply={(options) => setUtxoOptions(options)}
                currentOptions={utxoOptions}
            />

            {/* UTXO Overview Modal */}
            <UTXOOverview
                isOpen={showUTXOOverview}
                onClose={() => setShowUTXOOverview(false)}
            />
        </div>
    )
}
