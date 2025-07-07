'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { WalletService } from '@/services/WalletService'
import { ElectrumService } from '@/services/ElectrumService'
import { StorageService } from '@/services/StorageService'

import { CoinSelectionStrategy } from '@/services/UTXOSelectionService'

interface WalletContextType {
    wallet: WalletService | null
    electrum: ElectrumService | null
    balance: number
    address: string
    isEncrypted: boolean
    isLoading: boolean
    isConnected: boolean
    serverInfo: { url: string; servers: any[] }
    processingProgress: { isProcessing: boolean; processed: number; total: number; currentTx?: string }
    generateWallet: (password: string, useMnemonic?: boolean, passphrase?: string) => Promise<void>
    restoreWallet: (privateKey: string, password?: string) => Promise<void>
    restoreWalletFromMnemonic: (mnemonic: string, password: string, passphrase?: string) => Promise<void>
    sendTransaction: (
        toAddress: string,
        amount: number,
        password?: string,
        options?: {
            strategy?: CoinSelectionStrategy
            feeRate?: number
            maxInputs?: number
            minConfirmations?: number
        }
    ) => Promise<string>
    updateBalance: () => Promise<void>
    refreshTransactionHistory: () => Promise<void>
    cleanupMisclassifiedTransactions: () => Promise<number>
    reprocessTransactionHistory: () => Promise<number>
    reprocessTransactionHistoryProgressive: (onTransactionProcessed?: (transaction: any) => void) => Promise<number>
    encryptWallet: (password: string) => Promise<void>
    decryptWallet: (password: string) => Promise<void>
    exportPrivateKey: (password?: string) => Promise<string>
    exportMnemonic: (password?: string) => Promise<string | null>
    validateMnemonic: (mnemonic: string) => Promise<boolean>
    connectToElectrum: () => Promise<void>
    disconnectFromElectrum: () => Promise<void>
    selectElectrumServer: (index: number) => Promise<void>
    testConnection: () => Promise<boolean>
    reloadActiveWallet: () => Promise<void>
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

interface WalletProviderProps {
    children: ReactNode
}

export function WalletProvider({ children }: WalletProviderProps) {
    const [wallet, setWallet] = useState<WalletService | null>(null)
    const [electrum, setElectrum] = useState<ElectrumService | null>(null)
    const [balance, setBalance] = useState<number>(0)
    const [address, setAddress] = useState<string>('')
    const [isEncrypted, setIsEncrypted] = useState<boolean>(false)
    const [isLoading, setIsLoading] = useState<boolean>(true)
    const [isConnected, setIsConnected] = useState<boolean>(false)
    const [serverInfo, setServerInfo] = useState<{ url: string; servers: any[] }>({ url: '', servers: [] })
    const [processingProgress, setProcessingProgress] = useState<{
        isProcessing: boolean
        processed: number
        total: number
        currentTx?: string
    }>({ isProcessing: false, processed: 0, total: 0 })

    const initializeWallet = async () => {
        try {
            setIsLoading(true)

            // Create shared ElectrumService instance
            const electrumService = new ElectrumService()
            setElectrum(electrumService)

            // Create WalletService with shared ElectrumService
            const walletService = new WalletService(electrumService)
            setWallet(walletService)

            // Update server info
            setServerInfo(walletService.getElectrumServerInfo())

            // Try to connect to ElectrumX server
            try {
                await walletService.connectToElectrum()
                setIsConnected(true)
            } catch (error) {
                console.warn('Failed to connect to ElectrumX server on startup:', error)
                setIsConnected(false)
            }

            // Try to restore existing wallet from multi-wallet system
            const activeWallet = await StorageService.getActiveWallet()

            if (activeWallet) {
                setAddress(activeWallet.address)
                setIsEncrypted(activeWallet.isEncrypted)



                // Initialize wallet with subscription for real-time updates
                await walletService.initializeWallet(
                    activeWallet.address,
                    (data) => {

                        setBalance(data.balance)
                    },
                    (processed, total, currentTx) => {
                        // Set processing progress during initial transaction loading
                        setProcessingProgress({
                            isProcessing: total > 0,
                            processed,
                            total,
                            currentTx
                        })
                    }
                )

                // Clear processing progress when initialization is complete
                setProcessingProgress({ isProcessing: false, processed: 0, total: 0 })
            } else {

                // Clear any existing wallet state
                setAddress('')
                setIsEncrypted(false)
                setBalance(0)
            }

            // Run migration for existing transactions if needed
            try {
                await StorageService.migrateTransactionHistory()
            } catch (error) {
                console.warn('Failed to migrate transaction history:', error)
            }
        } catch (error) {
            console.error('Failed to initialize wallet:', error)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        initializeWallet()
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    const generateWallet = async (password: string, useMnemonic: boolean = true, passphrase?: string) => {
        if (!wallet) throw new Error('Wallet service not initialized')

        // Validate required password
        if (!password || password.length < 8) {
            throw new Error('Password is required and must be at least 8 characters long')
        }

        try {
            setIsLoading(true)
            const newWallet = await wallet.generateWallet(password, useMnemonic, passphrase)
            setAddress(newWallet.address)
            setIsEncrypted(true) // Always encrypted now
            setBalance(0)

            // Save to storage
            await StorageService.setAddress(newWallet.address)
            await StorageService.setPrivateKey(newWallet.privateKey)
            await StorageService.setIsEncrypted(!!password)

            // Initialize wallet with subscription for real-time updates
            await wallet.initializeWallet(
                newWallet.address,
                (data) => {

                    setBalance(data.balance)
                },
                (processed, total, currentTx) => {
                    // Set processing progress during initial transaction loading
                    setProcessingProgress({
                        isProcessing: total > 0,
                        processed,
                        total,
                        currentTx
                    })
                }
            )

            // Clear processing progress when initialization is complete
            setProcessingProgress({ isProcessing: false, processed: 0, total: 0 })
        } catch (error) {
            console.error('Failed to generate wallet:', error)
            throw error
        } finally {
            setIsLoading(false)
        }
    }

    const restoreWallet = async (privateKey: string, password?: string) => {
        if (!wallet) throw new Error('Wallet service not initialized')

        try {
            setIsLoading(true)
            const restoredWallet = await wallet.restoreWallet(privateKey, password)
            setAddress(restoredWallet.address)
            setIsEncrypted(!!password)

            // Save to storage
            await StorageService.setAddress(restoredWallet.address)
            await StorageService.setPrivateKey(restoredWallet.privateKey)
            await StorageService.setIsEncrypted(!!password)

            // Initialize wallet with subscription for real-time updates
            await wallet.initializeWallet(
                restoredWallet.address,
                (data) => {

                    setBalance(data.balance)
                },
                (processed, total, currentTx) => {
                    // Set processing progress during initial transaction loading
                    setProcessingProgress({
                        isProcessing: total > 0,
                        processed,
                        total,
                        currentTx
                    })
                }
            )

            // Clear processing progress when initialization is complete
            setProcessingProgress({ isProcessing: false, processed: 0, total: 0 })
        } catch (error) {
            console.error('Failed to restore wallet:', error)
            throw error
        } finally {
            setIsLoading(false)
        }
    }

    const restoreWalletFromMnemonic = async (mnemonic: string, password: string, passphrase?: string) => {
        if (!wallet) throw new Error('Wallet service not initialized')

        // Validate required password
        if (!password || password.length < 8) {
            throw new Error('Password is required and must be at least 8 characters long')
        }

        try {
            setIsLoading(true)
            const restoredWallet = await wallet.generateWalletFromMnemonic(mnemonic, password, passphrase)
            setAddress(restoredWallet.address)
            setIsEncrypted(true) // Always encrypted now

            // Save to storage
            await StorageService.setAddress(restoredWallet.address)
            await StorageService.setPrivateKey(restoredWallet.privateKey)
            await StorageService.setIsEncrypted(true) // Always encrypted now

            // Initialize wallet with subscription for real-time updates
            await wallet.initializeWallet(
                restoredWallet.address,
                (data) => {

                    setBalance(data.balance)
                },
                (processed, total, currentTx) => {
                    // Set processing progress during initial transaction loading
                    setProcessingProgress({
                        isProcessing: total > 0,
                        processed,
                        total,
                        currentTx
                    })
                }
            )

            // Clear processing progress when initialization is complete
            setProcessingProgress({ isProcessing: false, processed: 0, total: 0 })
        } catch (error) {
            console.error('Failed to restore wallet from mnemonic:', error)
            throw error
        } finally {
            setIsLoading(false)
        }
    }

    const sendTransaction = async (
        toAddress: string,
        amount: number,
        password?: string,
        options?: {
            strategy?: CoinSelectionStrategy
            feeRate?: number
            maxInputs?: number
            minConfirmations?: number
        }
    ): Promise<string> => {
        if (!wallet) throw new Error('Wallet service not initialized')

        try {
            setIsLoading(true)
            const txId = await wallet.sendTransaction(toAddress, amount, password, options)
            await updateBalance()
            return txId
        } catch (error) {
            console.error('Failed to send transaction:', error)
            throw error
        } finally {
            setIsLoading(false)
        }
    }

    const updateBalance = useCallback(async () => {
        if (!wallet || !address) return

        try {
            const newBalance = await wallet.getBalance(address)
            setBalance(newBalance)
        } catch (error) {
            console.error('Failed to update balance:', error)
        }
    }, [wallet, address])

    const encryptWallet = async (password: string) => {
        if (!wallet) throw new Error('Wallet service not initialized')

        try {
            await wallet.encryptWallet(password)
            setIsEncrypted(true)
            await StorageService.setIsEncrypted(true)
        } catch (error) {
            console.error('Failed to encrypt wallet:', error)
            throw error
        }
    }

    const decryptWallet = async (password: string) => {
        if (!wallet) throw new Error('Wallet service not initialized')

        try {
            await wallet.decryptWallet(password)
            setIsEncrypted(false)
            await StorageService.setIsEncrypted(false)
        } catch (error) {
            console.error('Failed to decrypt wallet:', error)
            throw error
        }
    }

    const exportPrivateKey = async (password?: string): Promise<string> => {
        if (!wallet) throw new Error('Wallet service not initialized')

        try {
            return await wallet.exportPrivateKey(password)
        } catch (error) {
            console.error('Failed to export private key:', error)
            throw error
        }
    }

    const exportMnemonic = async (password?: string): Promise<string | null> => {
        if (!wallet) throw new Error('Wallet service not initialized')

        try {
            return await wallet.exportMnemonic(password)
        } catch (error) {
            console.error('Failed to export mnemonic:', error)
            throw error
        }
    }

    const validateMnemonic = async (mnemonic: string): Promise<boolean> => {
        if (!wallet) throw new Error('Wallet service not initialized')

        try {
            return await wallet.validateMnemonic(mnemonic)
        } catch (error) {
            console.error('Failed to validate mnemonic:', error)
            return false
        }
    }

    const connectToElectrum = async () => {
        if (!wallet) throw new Error('Wallet service not initialized')

        try {
            setIsLoading(true)
            await wallet.connectToElectrum()
            setIsConnected(true)
            setServerInfo(wallet.getElectrumServerInfo())
        } catch (error) {
            console.error('Failed to connect to ElectrumX server:', error)
            setIsConnected(false)
            throw error
        } finally {
            setIsLoading(false)
        }
    }

    const disconnectFromElectrum = async () => {
        if (!wallet) throw new Error('Wallet service not initialized')

        try {
            await wallet.disconnectFromElectrum()
            setIsConnected(false)
        } catch (error) {
            console.error('Failed to disconnect from ElectrumX server:', error)
            throw error
        }
    }

    const selectElectrumServer = async (index: number) => {
        if (!wallet) throw new Error('Wallet service not initialized')

        try {
            setIsLoading(true)
            await wallet.selectElectrumServer(index)
            setIsConnected(wallet.isConnectedToElectrum())
            setServerInfo(wallet.getElectrumServerInfo())
        } catch (error) {
            console.error('Failed to select ElectrumX server:', error)
            throw error
        } finally {
            setIsLoading(false)
        }
    }

    const testConnection = async (): Promise<boolean> => {
        if (!wallet) throw new Error('Wallet service not initialized')

        try {
            const result = await wallet.testElectrumConnection()
            setIsConnected(result)
            return result
        } catch (error) {
            console.error('Connection test failed:', error)
            setIsConnected(false)
            return false
        }
    }

    const reloadActiveWallet = async () => {
        try {
            const activeWallet = await StorageService.getActiveWallet()

            if (activeWallet) {
                setAddress(activeWallet.address)
                setIsEncrypted(activeWallet.isEncrypted)



                // Update balance for new active wallet
                if (wallet) {
                    const newBalance = await wallet.getBalance(activeWallet.address)
                    setBalance(newBalance)
                }
            } else {

                setAddress('')
                setIsEncrypted(false)
                setBalance(0)
            }
        } catch (error) {
            console.error('Error reloading active wallet:', error)
        }
    }

    const refreshTransactionHistory = useCallback(async () => {
        if (!wallet || !address) return

        try {
            await wallet.refreshTransactionHistory(
                address,
                (processed, total, currentTx) => {
                    // Set processing progress during transaction refresh
                    setProcessingProgress({
                        isProcessing: total > 0,
                        processed,
                        total,
                        currentTx
                    })
                }
            )
            // Update balance after refreshing transaction history
            await updateBalance()
            // Clear processing progress when done
            setProcessingProgress({ isProcessing: false, processed: 0, total: 0 })
        } catch (error) {
            console.error('Failed to refresh transaction history:', error)
            setProcessingProgress({ isProcessing: false, processed: 0, total: 0 })
        }
    }, [wallet, address, updateBalance])

    const cleanupMisclassifiedTransactions = useCallback(async (): Promise<number> => {
        if (!wallet || !address) return 0

        try {
            const cleanedCount = await wallet.cleanupMisclassifiedTransactions(address)

            // Update balance after cleaning up transactions
            await updateBalance()
            return cleanedCount
        } catch (error) {
            console.error('Failed to cleanup misclassified transactions:', error)
            return 0
        }
    }, [wallet, address, updateBalance])

    const reprocessTransactionHistory = useCallback(async (): Promise<number> => {
        if (!wallet || !address) return 0

        try {
            setProcessingProgress({ isProcessing: true, processed: 0, total: 0 })

            // Run in background without blocking UI
            const processedCount = await wallet.reprocessTransactionHistory(
                address,
                (processed, total, currentTx) => {
                    setProcessingProgress({
                        isProcessing: true,
                        processed,
                        total,
                        currentTx
                    })
                },
                (newBalance) => {
                    // Update balance after processing
                    setBalance(newBalance)
                }
            )



            // Update balance after processing transactions
            await updateBalance()

            // Reset progress state
            setProcessingProgress({ isProcessing: false, processed: processedCount, total: processedCount })

            return processedCount
        } catch (error) {
            console.error('Failed to reprocess transaction history:', error)
            setProcessingProgress({ isProcessing: false, processed: 0, total: 0 })
            return 0
        }
    }, [wallet, address, updateBalance])

    const reprocessTransactionHistoryProgressive = useCallback(async (
        onTransactionProcessed?: (transaction: any) => void
    ): Promise<number> => {
        if (!wallet || !address) return 0

        try {
            setProcessingProgress({ isProcessing: true, processed: 0, total: 0 })

            // Use the progressive method that processes one transaction at a time
            const processedCount = await wallet.reprocessTransactionHistoryProgressive(
                address,
                (processed, total, currentTx, newTransaction) => {
                    // Update progress state
                    setProcessingProgress({
                        isProcessing: true,
                        processed,
                        total,
                        currentTx
                    })

                    // If a new transaction was processed, call the callback
                    if (newTransaction && onTransactionProcessed) {
                        onTransactionProcessed(newTransaction)
                    }
                },
                (newBalance) => {
                    // Update balance periodically during processing
                    setBalance(newBalance)
                }
            )



            // Update balance after processing transactions
            await updateBalance()

            // Reset progress state
            setProcessingProgress({ isProcessing: false, processed: processedCount, total: processedCount })

            return processedCount
        } catch (error) {
            console.error('Failed to progressively process transaction history:', error)
            setProcessingProgress({ isProcessing: false, processed: 0, total: 0 })
            return 0
        }
    }, [wallet, address, updateBalance])

    const contextValue: WalletContextType = {
        wallet,
        electrum,
        balance,
        address,
        isEncrypted,
        isLoading,
        isConnected,
        serverInfo,
        processingProgress,
        generateWallet,
        restoreWallet,
        sendTransaction,
        updateBalance,
        encryptWallet,
        decryptWallet,
        exportPrivateKey,
        exportMnemonic,
        connectToElectrum,
        disconnectFromElectrum,
        selectElectrumServer,
        testConnection,
        restoreWalletFromMnemonic,
        validateMnemonic,
        reloadActiveWallet,
        refreshTransactionHistory,
        cleanupMisclassifiedTransactions,
        reprocessTransactionHistory,
        reprocessTransactionHistoryProgressive,
    }

    return (
        <WalletContext.Provider value={contextValue}>
            {children}
        </WalletContext.Provider>
    )
}

export function useWallet(): WalletContextType {
    const context = useContext(WalletContext)
    if (context === undefined) {
        throw new Error('useWallet must be used within a WalletProvider')
    }
    return context
}
