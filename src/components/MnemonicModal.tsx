'use client'

import { useState } from 'react'
import { Eye, EyeOff, Copy, RefreshCw, Key, AlertTriangle } from 'lucide-react'
import { useWallet } from '@/contexts/WalletContext'
import { useSecurity } from '@/contexts/SecurityContext'
import { useToast } from '@/components/Toast'

interface MnemonicModalProps {
    isOpen: boolean
    onClose: () => void
    mode: 'export' | 'import'
}

export default function MnemonicModal({ isOpen, onClose, mode }: MnemonicModalProps) {
    const {
        exportMnemonic,
        restoreWalletFromMnemonic,
        validateMnemonic,
        generateWallet,
        isEncrypted
    } = useWallet()

    const { showToast } = useToast()
    const { requireAuth } = useSecurity()

    const [password, setPassword] = useState('')
    const [mnemonic, setMnemonic] = useState('')
    const [importMnemonic, setImportMnemonic] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showMnemonic, setShowMnemonic] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [isValidMnemonic, setIsValidMnemonic] = useState<boolean | null>(null)

    const resetForm = () => {
        setPassword('')
        setMnemonic('')
        setImportMnemonic('')
        setNewPassword('')
        setConfirmPassword('')
        setShowMnemonic(false)
        setShowPassword(false)
        setError('')
        setIsValidMnemonic(null)
    }

    const handleClose = () => {
        resetForm()
        onClose()
    }

    // Export mnemonic functionality
    const handleExportMnemonic = async () => {
        // Require authentication for sensitive operation
        const authRequired = await requireAuth()
        if (!authRequired) {
            setError('Authentication required for this operation')
            return
        }

        if (isEncrypted && !password) {
            setError('Password required for encrypted wallet')
            return
        }

        try {
            setIsLoading(true)
            setError('')
            const exportedMnemonic = await exportMnemonic(isEncrypted ? password : undefined)

            if (!exportedMnemonic) {
                setError('No mnemonic found. This wallet was created without BIP39 support.')
                return
            }

            setMnemonic(exportedMnemonic)
            showToast({
                type: 'success',
                title: 'Mnemonic exported!',
                message: 'Your recovery phrase is now displayed'
            })
        } catch (error: any) {
            setError(error.message || 'Failed to export mnemonic')
        } finally {
            setIsLoading(false)
        }
    }

    // Import mnemonic functionality
    const handleValidateMnemonic = async (mnemonicToValidate: string) => {
        if (!mnemonicToValidate.trim()) {
            setIsValidMnemonic(null)
            return
        }

        try {
            const valid = await validateMnemonic(mnemonicToValidate.trim())
            setIsValidMnemonic(valid)
            if (!valid) {
                setError('Invalid BIP39 mnemonic phrase')
            } else {
                setError('')
            }
        } catch (error) {
            setIsValidMnemonic(false)
            setError('Error validating mnemonic')
        }
    }

    const handleImportMnemonic = async () => {
        if (!importMnemonic.trim()) {
            setError('Please enter a mnemonic phrase')
            return
        }

        if (isValidMnemonic === false) {
            setError('Please enter a valid BIP39 mnemonic phrase')
            return
        }

        // Password is now mandatory
        if (!newPassword || newPassword.length < 8) {
            setError('Password is required and must be at least 8 characters long')
            return
        }

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match')
            return
        }

        try {
            setIsLoading(true)
            setError('')
            await restoreWalletFromMnemonic(importMnemonic.trim(), newPassword)
            showToast({
                type: 'success',
                title: 'Wallet restored!',
                message: 'Your wallet has been restored from the mnemonic phrase'
            })

            // Close modal and reload page after short delay
            setTimeout(() => {
                handleClose()
                window.location.reload()
            }, 2000)
        } catch (error: any) {
            setError(error.message || 'Failed to restore wallet from mnemonic')
        } finally {
            setIsLoading(false)
        }
    }

    const handleGenerateNewWallet = async () => {
        // Password is now mandatory
        if (!newPassword || newPassword.length < 8) {
            setError('Password is required and must be at least 8 characters long')
            return
        }

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match')
            return
        }

        try {
            setIsLoading(true)
            setError('')
            await generateWallet(newPassword, true) // Generate with mnemonic (password now required)
            showToast({
                type: 'success',
                title: 'New wallet created!',
                message: 'A new wallet with mnemonic phrase has been generated'
            })

            // Close modal and reload page after short delay
            setTimeout(() => {
                handleClose()
                window.location.reload()
            }, 2000)
        } catch (error: any) {
            setError(error.message || 'Failed to generate new wallet')
        } finally {
            setIsLoading(false)
        }
    }

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text)
            showToast({
                type: 'success',
                title: 'Copied to clipboard!',
                message: 'Mnemonic phrase copied successfully'
            })
        } catch (error) {
            setError('Failed to copy to clipboard')
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                        <Key className="w-5 h-5 mr-2 text-avian-orange" />
                        {mode === 'export' ? 'Export' : 'Import'} Mnemonic Phrase
                    </h3>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100"
                    >
                        ×
                    </button>
                </div>

                {mode === 'export' ? (
                    // Export Mode
                    <div className="space-y-4">
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
                            <div className="flex items-start">
                                <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-2 mt-0.5 flex-shrink-0" />
                                <div className="text-sm text-yellow-800 dark:text-yellow-200">
                                    <p className="font-semibold mb-1">Security Warning</p>
                                    <p>Your mnemonic phrase provides complete access to your wallet. Never share it with anyone and store it securely offline.</p>
                                </div>
                            </div>
                        </div>

                        {isEncrypted && (
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Wallet Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-avian-orange focus:border-transparent pr-10 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        placeholder="Enter wallet password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-2 top-2 text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>
                        )}

                        {!mnemonic ? (
                            <button
                                onClick={handleExportMnemonic}
                                disabled={isLoading || (isEncrypted && !password)}
                                className="w-full px-4 py-2 bg-avian-orange text-white rounded-md hover:bg-avian-orange/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                            >
                                {isLoading ? (
                                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                                ) : (
                                    <Key className="w-4 h-4 mr-2" />
                                )}
                                Export Mnemonic
                            </button>
                        ) : (
                            <div className="space-y-4">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Your Mnemonic Phrase (12 words)
                                        </label>
                                        <button
                                            onClick={() => setShowMnemonic(!showMnemonic)}
                                            className="flex items-center text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                        >
                                            {showMnemonic ? (
                                                <>
                                                    <EyeOff className="w-4 h-4 mr-1" />
                                                    Hide
                                                </>
                                            ) : (
                                                <>
                                                    <Eye className="w-4 h-4 mr-1" />
                                                    Show
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    {/* Mnemonic Grid Display */}
                                    <div className={`grid grid-cols-3 gap-3 ${showMnemonic ? '' : 'filter blur-sm'}`}>
                                        {mnemonic.split(' ').map((word, index) => (
                                            <div
                                                key={index}
                                                className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3 text-center"
                                            >
                                                <div className="text-xs text-gray-400 dark:text-gray-500 mb-1">
                                                    {index + 1}
                                                </div>
                                                <div className="font-mono text-sm text-gray-900 dark:text-white font-medium">
                                                    {word}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {showMnemonic && (
                                    <button
                                        onClick={() => copyToClipboard(mnemonic)}
                                        className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-500 flex items-center justify-center"
                                    >
                                        <Copy className="w-4 h-4 mr-2" />
                                        Copy to Clipboard
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    // Import Mode
                    <div className="space-y-4">
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                            <div className="flex items-start">
                                <AlertTriangle className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
                                <div className="text-sm text-blue-800 dark:text-blue-200">
                                    <p className="font-semibold mb-1">Import Wallet</p>
                                    <p>Enter your 12-word BIP39 mnemonic phrase to restore your wallet. This will replace any existing wallet.</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Mnemonic Phrase
                            </label>
                            <textarea
                                value={importMnemonic}
                                onChange={(e) => {
                                    setImportMnemonic(e.target.value)
                                    handleValidateMnemonic(e.target.value)
                                }}
                                placeholder="Enter your 12-word mnemonic phrase..."
                                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-avian-orange focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${isValidMnemonic === false ? 'border-red-300 dark:border-red-600' :
                                    isValidMnemonic === true ? 'border-green-300 dark:border-green-600' :
                                        'border-gray-300 dark:border-gray-600'
                                    }`}
                                rows={3}
                            />
                            {isValidMnemonic === true && (
                                <p className="text-sm text-green-600 dark:text-green-400">✓ Valid mnemonic phrase</p>
                            )}
                            {isValidMnemonic === false && (
                                <p className="text-sm text-red-600 dark:text-red-400">✗ Invalid mnemonic phrase</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Password (Required for Security)
                            </label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-avian-orange focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="Enter password to encrypt wallet (min 8 characters)"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Confirm Password
                            </label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-avian-orange focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="Confirm password"
                                required
                            />
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={handleImportMnemonic}
                                disabled={isLoading || !importMnemonic.trim() || isValidMnemonic === false}
                                className="flex-1 px-4 py-2 bg-avian-orange text-white rounded-md hover:bg-avian-orange/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                            >
                                {isLoading ? (
                                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                                ) : (
                                    <Key className="w-4 h-4 mr-2" />
                                )}
                                Import Wallet
                            </button>

                            <button
                                onClick={handleGenerateNewWallet}
                                disabled={isLoading}
                                className="flex-1 px-4 py-2 bg-gray-600 dark:bg-gray-500 text-white rounded-md hover:bg-gray-700 dark:hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                            >
                                {isLoading ? (
                                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                                ) : (
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                )}
                                Generate New
                            </button>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-md">
                        <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
                    </div>
                )}
            </div>
        </div>
    )
}
