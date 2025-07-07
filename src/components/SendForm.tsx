'use client'

import { useState, useEffect } from 'react'
import { Send, AlertCircle, ExternalLink, BookOpen, Settings, Coins, Lock, UserCheck } from 'lucide-react'
import { useWallet } from '@/contexts/WalletContext'
import { useSecurity } from '@/contexts/SecurityContext'
import { WalletService } from '@/services/WalletService'
import { StorageService } from '@/services/StorageService'
import { securityService } from '@/services/SecurityService'
import { CoinSelectionStrategy, EnhancedUTXO } from '@/services/UTXOSelectionService'
import AddressBook from './AddressBook'
import { UTXOSelectionSettings } from './UTXOSelectionSettings'
import { UTXOOverview } from './UTXOOverview'
import { UTXOSelector } from './UTXOSelector'

export default function SendForm() {
    const { sendTransaction, balance, isLoading, isConnected, isEncrypted } = useWallet()
    const { requireAuth, wasBiometricAuth, storedWalletPassword } = useSecurity()
    const [toAddress, setToAddress] = useState('')
    const [amount, setAmount] = useState('')
    const [password, setPassword] = useState('')
    const [usingBiometricAuth, setUsingBiometricAuth] = useState(false)
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
    const [isConsolidatingToSelf, setIsConsolidatingToSelf] = useState(false)
    const [selectedUTXOs, setSelectedUTXOs] = useState<EnhancedUTXO[]>([])
    const [showUTXOSelector, setShowUTXOSelector] = useState(false)
    const [manuallySelectedUTXOs, setManuallySelectedUTXOs] = useState<EnhancedUTXO[]>([])

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

        // Get security settings to determine if biometrics are required
        const settings = await securityService.getSecuritySettings()
        const biometricsRequired = settings.biometric.enabled && settings.biometric.requireForTransactions

        // If biometrics are required, the password field will be hidden and we'll use biometric auth
        // Set this state early to update UI and show "Authenticating..." message if needed
        if (biometricsRequired) {
            setUsingBiometricAuth(true)
        }

        // Require authentication for sensitive operation
        const authResult = await requireAuth()
        if (!authResult.success) {
            setError('Authentication required for sending transactions')
            // Reset UI if authentication failed
            setUsingBiometricAuth(wasBiometricAuth && !!storedWalletPassword)
            return
        }

        // First, ensure we set the password correctly from biometric auth
        if (authResult.password) {
            // Using direct password from auth result
            setPassword(authResult.password);
            setUsingBiometricAuth(true);
        } else if (isEncrypted && storedWalletPassword) {
            // Fallback to stored wallet password
            setPassword(storedWalletPassword);
            setUsingBiometricAuth(true);
        }

        // Wait a moment to ensure the password state is updated before proceeding
        await new Promise(resolve => setTimeout(resolve, 10));

        if (!toAddress || !amount) {
            setError('Please fill in all fields')
            return
        }

        // If using manual UTXO selection, make sure UTXOs have been selected
        if (utxoOptions.strategy === CoinSelectionStrategy.MANUAL && manuallySelectedUTXOs.length === 0) {
            setError('Please select UTXOs for your transaction')
            setShowUTXOSelector(true)
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

        // Make sure we have a password when the wallet is encrypted before sending
        // This is a critical check - without it transactions will fail even if UI shows biometric auth
        if (isEncrypted) {
            const effectivePassword = password || storedWalletPassword || authResult.password;

            if (!effectivePassword) {
                setError('Password required for encrypted wallet');
                return;
            }

            // Ensure we're using the most recently authenticated password
            if (effectivePassword !== password) {
                setPassword(effectivePassword);
            }
        }

        try {
            setIsSending(true)
            setError('') // Clear any previous errors

            // Prepare transaction options including manual UTXO selection if applicable
            const txOptions = {
                ...utxoOptions,
                manualSelection: utxoOptions.strategy === CoinSelectionStrategy.MANUAL
                    ? manuallySelectedUTXOs
                    : undefined
            }

            // Ensure we use the most up-to-date password
            const effectivePassword = password || storedWalletPassword || authResult.password;
            const txId = await sendTransaction(toAddress, amountSatoshis, effectivePassword, txOptions)

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

            // Clear form fields on success but keep authentication state
            setToAddress('')
            setAmount('')

            // Only clear password if not using biometric auth
            // This prevents repeatedly asking for authentication
            if (!wasBiometricAuth) {
                setPassword('')
            }

            // Clear manually selected UTXOs and reset strategy after successful transaction
            if (utxoOptions.strategy === CoinSelectionStrategy.MANUAL) {
                setManuallySelectedUTXOs([])
                setSelectedUTXOs([]) // Clear the other UTXOs state as well
                setShowUTXOSelector(false)
                // Reset strategy back to default
                resetUTXOSettings()
            }

            // Clear consolidation flag if set
            if (isConsolidatingToSelf) {
                setIsConsolidatingToSelf(false)
            }


        } catch (error: any) {
            console.error('Send transaction error:', error)

            // Provide more specific error messages
            let errorMessage = 'Failed to send transaction'

            if (error.message) {
                if (error.message.includes('Insufficient funds')) {
                    errorMessage = 'Insufficient funds (including network fee)'
                } else if (error.message.includes('Invalid password') || error.message.includes('Password required')) {
                    errorMessage = error.message.includes('Invalid') ? 'Invalid wallet password' : 'Password required for encrypted wallet'
                    // If password is invalid/missing and we were using biometric auth, reset the flag
                    if (usingBiometricAuth) {
                        console.error('Biometric auth failed to provide valid password:', error.message);
                        setUsingBiometricAuth(false);
                        setPassword('');
                    }
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

    // Add wallet address to address book
    const addWalletAddressToBook = async () => {
        try {
            const wallet = await StorageService.getActiveWallet()
            if (wallet) {
                const addressData = {
                    id: '',
                    name: wallet.name,
                    address: wallet.address,
                    description: 'My wallet address for consolidating funds',
                    dateAdded: new Date(),
                    useCount: 0,
                    isOwnWallet: true
                }

                const success = await StorageService.saveAddress(addressData)
                if (success) {
                    setToAddress(wallet.address)
                }
            }
        } catch (error) {
            console.error("Failed to add wallet address to address book:", error)
        }
    }

    // Handle UTXO settings changes and auto-fill wallet address for dust consolidation
    const handleUTXOSettingsApply = async (options: any) => {
        setUtxoOptions(options)

        if (options.strategy === CoinSelectionStrategy.CONSOLIDATE_DUST) {
            try {
                // Get the current wallet's address for auto-consolidation
                const wallet = await StorageService.getActiveWallet()
                if (wallet) {
                    setToAddress(wallet.address)
                    setIsConsolidatingToSelf(true)
                }
            } catch (error) {
                console.error("Failed to get wallet address for consolidation:", error)
            }
        } else if (options.strategy === CoinSelectionStrategy.MANUAL) {
            // When manual selection is chosen, show the UTXO selector
            setShowUTXOSelector(true)
        } else if (isConsolidatingToSelf) {
            // If we're switching away from consolidation, clear the address field if it was auto-filled
            setToAddress('')
            setIsConsolidatingToSelf(false)
        }
    }

    // Initialize and update biometric auth state from security context
    useEffect(() => {
        const initializeBiometricState = async () => {
            try {
                // Check if biometrics are required for transactions
                const settings = await securityService.getSecuritySettings();
                const biometricsRequired = settings.biometric.enabled && settings.biometric.requireForTransactions;

                // Determine if we should use biometric auth based on settings and context
                const shouldUseBiometric =
                    (biometricsRequired || (wasBiometricAuth && !!storedWalletPassword));

                setUsingBiometricAuth(shouldUseBiometric);

                // If we have a stored password from biometric auth, use it
                if (shouldUseBiometric && storedWalletPassword) {
                    setPassword(storedWalletPassword);
                } else if (isEncrypted && !storedWalletPassword && shouldUseBiometric) {
                    console.warn("Using biometric auth but no stored password available!");
                }
            } catch (error) {
                console.error("Error initializing biometric state:", error);
            }
        };

        initializeBiometricState();
    }, [wasBiometricAuth, storedWalletPassword, isEncrypted])

    // Initialize password state when component mounts or when storedWalletPassword changes
    useEffect(() => {
        if (storedWalletPassword) {
            setPassword(storedWalletPassword);
            setUsingBiometricAuth(true);  // If we have a stored password, we must have used biometrics
        } else if (wasBiometricAuth) {
            console.warn("wasBiometricAuth is true but no storedWalletPassword available");
        }
    }, [storedWalletPassword, wasBiometricAuth]);

    useEffect(() => {
        // Auto-fill wallet's own address when using dust consolidation strategy
        const autoFillAddress = async () => {
            if (utxoOptions.strategy === CoinSelectionStrategy.CONSOLIDATE_DUST) {
                try {
                    const wallet = await StorageService.getActiveWallet()
                    if (wallet) {
                        setToAddress(wallet.address)
                    }
                } catch (error) {
                    console.error("Failed to auto-fill wallet address:", error)
                }
            }
        }

        autoFillAddress()
    }, [utxoOptions.strategy])

    return (
        <div className="p-3 sm:p-4 lg:p-6">
            <div className="mb-3 sm:mb-4 lg:mb-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-2 sm:mb-3 lg:mb-4">
                    <div className="flex items-center">
                        <Send className="w-5 h-5 mr-2 text-avian-600 flex-shrink-0" />
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                            Send AVN
                        </h3>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <button
                        onClick={() => setShowUTXOOverview(true)}
                        className="flex items-center px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700 transition-colors min-w-0 flex-shrink-0"
                        title="View Available UTXOs"
                    >
                        <Coins className="w-4 h-4 mr-1 sm:mr-1.5 flex-shrink-0" />
                        <span className="truncate">UTXOs</span>
                    </button>
                    <button
                        onClick={() => setShowUTXOSettings(true)}
                        className={`relative flex items-center px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg border transition-colors min-w-0 flex-shrink-0 ${utxoOptions.strategy !== CoinSelectionStrategy.BEST_FIT ||
                            utxoOptions.feeRate !== 10000 ||
                            utxoOptions.maxInputs !== 20 ||
                            utxoOptions.minConfirmations !== 0
                            ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700'
                            : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 border-gray-200 dark:border-gray-600'
                            }`}
                        title="Advanced Transaction Settings"
                    >
                        <Settings className="w-4 h-4 mr-1 sm:mr-1.5 flex-shrink-0" />
                        <span className="hidden sm:inline">Advanced</span>
                        <span className="sm:hidden truncate">Adv</span>
                        {(utxoOptions.strategy !== CoinSelectionStrategy.BEST_FIT ||
                            utxoOptions.feeRate !== 10000 ||
                            utxoOptions.maxInputs !== 20 ||
                            utxoOptions.minConfirmations !== 0) && (
                                <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full"></span>
                            )}
                    </button>
                    <button
                        onClick={() => setShowAddressBook(!showAddressBook)}
                        className={`flex items-center px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg border transition-colors min-w-0 flex-shrink-0 ${showAddressBook
                            ? 'bg-avian-100 dark:bg-avian-900/20 text-avian-700 dark:text-avian-300 border-avian-200 dark:border-avian-700'
                            : 'bg-avian-50 dark:bg-avian-900/10 text-avian-600 dark:text-avian-400 hover:bg-avian-100 dark:hover:bg-avian-900/20 border-avian-200 dark:border-avian-700'
                            }`}
                        title="Address Book"
                    >
                        <BookOpen className="w-4 h-4 mr-1 sm:mr-1.5 flex-shrink-0" />
                        <span className="hidden sm:inline">Address Book</span>
                        <span className="sm:hidden truncate">Book</span>
                    </button>
                </div>
            </div>

            {/* UTXO Selection Status */}
            {(utxoOptions.strategy !== CoinSelectionStrategy.BEST_FIT ||
                utxoOptions.feeRate !== 10000 ||
                utxoOptions.maxInputs !== 20 ||
                utxoOptions.minConfirmations !== 0) && (
                    <div className="mb-3 sm:mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center">
                                <Settings className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                                <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                                    Custom Settings Active
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
                <div className="mb-3 sm:mb-4 lg:mb-6 p-3 sm:p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700">
                    <AddressBook
                        onSelectAddress={handleSelectAddress}
                        currentAddress={toAddress}
                    />
                </div>
            )}

            {error && (
                <div className="mb-3 sm:mb-4 p-3 bg-red-100 border border-red-300 rounded-lg flex items-start text-red-700">
                    <AlertCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{error}</span>
                </div>
            )}

            {success && (
                <div className="mb-3 sm:mb-4 p-3 bg-green-100 border border-green-300 rounded-lg text-green-700 text-sm">
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

            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4" name="send-transaction-form" autoComplete="off">
                <div>
                    <label htmlFor="toAddress" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        To Address
                    </label>
                    <input
                        type="text"
                        id="toAddress"
                        name="toAddress"
                        value={toAddress}
                        onChange={(e) => setToAddress(e.target.value)}
                        placeholder="Enter Avian address (R...)"
                        className="input-field text-sm"
                        disabled={isSending}
                    />
                </div>

                <div>
                    <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Amount (AVN)
                    </label>
                    <div className="relative">
                        <input
                            type="number"
                            id="amount"
                            name="amount"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00000000"
                            step="0.00000001"
                            min="0"
                            className="input-field pr-12 text-sm"
                            disabled={isSending}
                        />
                        <button
                            type="button"
                            onClick={() => setAmount(maxAmount.toString())}
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-avian-600 hover:text-avian-700 disabled:text-gray-400 disabled:cursor-not-allowed px-1 py-0.5 rounded"
                            disabled={isSending || maxAmount <= 0}
                        >
                            MAX
                        </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                        Fee: 0.0001 AVN | Max sendable: {maxAmount.toFixed(8)} AVN
                        {maxAmount <= 0 && (
                            <span className="text-red-500 block sm:inline sm:ml-2">(Insufficient funds for fee)</span>
                        )}
                    </p>
                </div>

                {/* Display appropriate authentication UI based on wallet encryption and biometric settings */}
                {isEncrypted && (
                    <>
                        {!usingBiometricAuth ? (
                            <div>
                                <label htmlFor="walletPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    Wallet Password
                                </label>
                                <input
                                    type="password"
                                    id="walletPassword"
                                    name="walletPassword"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter wallet password"
                                    className="input-field text-sm"
                                    disabled={isSending}
                                    autoComplete="current-password"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    If biometrics are enabled, you&apos;ll be prompted during transaction
                                </p>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg mb-2">
                                <Lock className="w-5 h-5" />
                                <div>
                                    <span className="font-medium">Biometric Authentication</span>
                                    <p className="text-xs mt-1">You&apos;ll be prompted for biometric verification when sending</p>
                                </div>
                                {/* Hidden password field to satisfy browser requirements */}
                                <input
                                    type="password"
                                    name="hiddenPassword"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    style={{ display: 'none' }}
                                />
                            </div>
                        )}
                    </>
                )}

                <button
                    type="submit"
                    disabled={isSending || isLoading}
                    className="w-full button-primary disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base py-3 sm:py-2.5"
                >
                    {isSending ? 'Sending...' : 'Send Transaction'}
                </button>
            </form>

            {/* Save Address Prompt */}
            {askToSaveAddress && (
                <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-yellow-100 border border-yellow-300 rounded-lg text-yellow-700 text-sm">
                    <div className="font-medium mb-3">
                        Save this address to your address book?
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <button
                            onClick={() => handleSaveAddressFromTransaction('Untitled')}
                            className="px-3 py-2.5 sm:py-2 text-sm bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
                        >
                            Save Address
                        </button>
                        <button
                            onClick={() => setAskToSaveAddress(false)}
                            className="px-3 py-2.5 sm:py-2 text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
                        >
                            No, Thanks
                        </button>
                    </div>
                </div>
            )}

            {/* UTXO Selection Settings Modal */}
            <UTXOSelectionSettings
                isOpen={showUTXOSettings}
                onClose={() => setShowUTXOSettings(false)}
                onApply={handleUTXOSettingsApply}
                currentOptions={utxoOptions}
            />

            {/* UTXO Overview Modal */}
            <UTXOOverview
                isOpen={showUTXOOverview}
                onClose={() => setShowUTXOOverview(false)}
            />

            {/* Dust Consolidation Notice */}
            {isConsolidatingToSelf && (
                <div className="my-4 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg flex items-start ">
                    <Coins className="w-5 h-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                        <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                            Dust Consolidation Mode
                        </p>
                        <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                            You are consolidating small UTXOs (dust) back to your own wallet address. This helps clean up your wallet and may improve performance.
                        </p>
                    </div>
                </div>
            )}

            <div className="my-4 text-right">
                <button
                    type="button"
                    onClick={addWalletAddressToBook}
                    className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline flex items-center justify-end ml-auto"
                >
                    <Coins className="w-3 h-3 mr-1" />
                    Save my wallet address to address book
                </button>
            </div>

            {/* UTXO Selector - Manual Selection of UTXOs */}
            <UTXOSelector
                isOpen={showUTXOSelector}
                onClose={() => setShowUTXOSelector(false)}
                onSelect={(selectedUTXOs) => {
                    setManuallySelectedUTXOs(selectedUTXOs);
                    if (selectedUTXOs.length > 0) {
                        const totalSelected = selectedUTXOs.reduce((sum, utxo) => sum + utxo.value, 0);
                        // Calculate a suggested amount (leave some for fee)
                        const suggestedAmount = ((totalSelected - 10000) / 100000000).toFixed(8);
                        if (!amount) {
                            setAmount(suggestedAmount);
                        }
                    }
                }}
                targetAmount={parseFloat(amount || '0') * 100000000}
                initialSelection={manuallySelectedUTXOs}
                feeRate={utxoOptions.feeRate || 10000}
            />

            {/* Manual UTXO Selection Notice */}
            {utxoOptions.strategy === CoinSelectionStrategy.MANUAL && (
                <div className="mt-3 p-3 bg-yellow-100 border border-yellow-300 rounded-lg text-yellow-700 text-sm">
                    <div className="font-medium mb-2">
                        Manual UTXO Selection Active
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <div className="flex-1 text-sm">
                            {manuallySelectedUTXOs.length > 0
                                ? `${manuallySelectedUTXOs.length} UTXOs selected (${(manuallySelectedUTXOs.reduce((sum, utxo) => sum + utxo.value, 0) / 100000000).toFixed(8)} AVN)`
                                : 'No UTXOs selected'}
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowUTXOSelector(true)}
                            className="mt-2 sm:mt-0 text-xs flex items-center justify-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                        >
                            <UserCheck className="w-3 h-3 mr-1" />
                            {manuallySelectedUTXOs.length > 0 ? 'Modify Selection' : 'Select UTXOs'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
