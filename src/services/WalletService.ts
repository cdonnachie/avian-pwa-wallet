/**
 * WalletService.ts
 * 
 * Avian cryptocurrency wallet service using bitcoinjs-lib with Avian network parameters.
 * 
 * FEATURES:
 * - Uses proper bitcoinjs-lib ECPair for cryptographic operations
 * - Implements Avian network parameters for address generation
 * - Supports WIF private key import/export
 * - Handles wallet encryption/decryption
 * - Connects to ElectrumX servers for blockchain data
 * - Supports private key import/export (WIF format)
 * 
 * PRODUCTION READY:
 * - Uses proper secp256k1 cryptography via tiny-secp256k1
 * - Implements secure random key generation
 * - Proper WIF encoding/decoding with network validation
 * - Real ElectrumX blockchain communication (no mocks)
 * - Comprehensive error handling and validation
 */

import * as bitcoin from 'bitcoinjs-lib'
import { ECPairFactory } from 'ecpair'
import * as ecc from 'tiny-secp256k1'
import * as bip39 from 'bip39'
import { BIP32Factory } from 'bip32'
import * as CryptoJS from 'crypto-js'
import bs58check from 'bs58check'
import { ElectrumService } from './ElectrumService'
import { StorageService } from './StorageService'

// Initialize ECPair and BIP32 with secp256k1
const ECPair = ECPairFactory(ecc)
const bip32 = BIP32Factory(ecc)

export interface WalletData {
    id?: number
    name: string
    address: string
    privateKey: string
    mnemonic?: string // BIP39 mnemonic phrase for backup/recovery
    isEncrypted: boolean
    isActive: boolean
    createdAt: Date
    lastAccessed: Date
}

// Legacy interface for backward compatibility
export interface LegacyWalletData {
    address: string
    privateKey: string
    mnemonic?: string
}

// Avian network configuration
const avianNetwork: bitcoin.Network = {
    messagePrefix: '\x19Avian Signed Message:\n',
    bech32: '', // Avian doesn't use bech32
    bip32: {
        public: 0x0488b21e,
        private: 0x0488ade4,
    },
    pubKeyHash: 0x3c, // Avian addresses start with 'R' (decimal 60)
    scriptHash: 0x7a, // Avian script addresses start with 'r' (decimal 122)
    wif: 0x80, // WIF version byte (decimal 128)
}

export class WalletService {
    private electrum: ElectrumService

    constructor(electrumService?: ElectrumService) {
        this.electrum = electrumService || new ElectrumService()
    }

    async generateWallet(password?: string, useMnemonic: boolean = true, passphrase?: string): Promise<LegacyWalletData> {
        try {

            let keyPair: any
            let mnemonic: string | undefined

            if (useMnemonic) {
                // Generate BIP39 mnemonic
                mnemonic = bip39.generateMnemonic(128) // 12 words

                // Derive seed from mnemonic with optional passphrase (BIP39 25th word)
                const seed = await bip39.mnemonicToSeed(mnemonic, passphrase || '')

                // Create HD wallet root
                const root = bip32.fromSeed(seed, avianNetwork)

                // Derive key at standard path m/44'/921'/0'/0/0 (921 is Avian's coin type)
                const path = "m/44'/921'/0'/0/0"
                const child = root.derivePath(path)

                if (!child.privateKey) {
                    throw new Error('Failed to derive private key from mnemonic')
                }

                // Create ECPair from derived private key
                keyPair = ECPair.fromPrivateKey(child.privateKey, { network: avianNetwork })
            } else {
                // Generate a random key pair directly (legacy method)
                keyPair = ECPair.makeRandom({ network: avianNetwork })
            }



            const privateKeyWIF = keyPair.toWIF()


            // Get the address
            const { address } = bitcoin.payments.p2pkh({
                pubkey: Buffer.from(keyPair.publicKey),
                network: avianNetwork
            })

            if (!address) {
                throw new Error('Failed to generate address')
            }

            // Encrypt private key if password provided
            const finalPrivateKey = password
                ? CryptoJS.AES.encrypt(privateKeyWIF, password).toString()
                : privateKeyWIF

            // Encrypt mnemonic if password provided and mnemonic exists
            const finalMnemonic = (mnemonic && password)
                ? CryptoJS.AES.encrypt(mnemonic, password).toString()
                : mnemonic

            // Store mnemonic if generated
            if (mnemonic) {
                await StorageService.setMnemonic(finalMnemonic!)
            }

            return {
                address,
                privateKey: finalPrivateKey,
                mnemonic: finalMnemonic
            }
        } catch (error) {
            console.error('Error generating wallet:', error)
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            throw new Error(`Failed to generate wallet: ${errorMessage}`)
        }
    }

    async restoreWallet(privateKey: string, password?: string): Promise<LegacyWalletData> {
        try {
            // Decrypt private key if password provided
            const decryptedKey = password
                ? CryptoJS.AES.decrypt(privateKey, password).toString(CryptoJS.enc.Utf8)
                : privateKey

            if (!decryptedKey) {
                throw new Error('Invalid password or corrupted private key')
            }

            // Create key pair from WIF using ECPair
            const keyPair = ECPair.fromWIF(decryptedKey, avianNetwork)

            // Get the address
            const { address } = bitcoin.payments.p2pkh({
                pubkey: Buffer.from(keyPair.publicKey),
                network: avianNetwork
            })

            if (!address) {
                throw new Error('Failed to restore address')
            }

            return {
                address,
                privateKey
            }
        } catch (error) {
            console.error('Error restoring wallet:', error)
            throw new Error('Failed to restore wallet')
        }
    }

    async getBalance(address: string): Promise<number> {
        try {
            return await this.electrum.getBalance(address)
        } catch (error) {
            console.error('Error getting balance:', error)
            return 0
        }
    }

    async subscribeToWalletUpdates(address: string, onUpdate?: (data: any) => void): Promise<void> {
        try {
            // Subscribe to address changes via ElectrumX
            await this.electrum.subscribeToAddress(address, async (data) => {

                // If the subscription data includes balance, update the real balance cache
                if (data.balance !== undefined) {
                    this.electrum.updateRealBalance(address, data.balance)
                }

                // Process transaction history to detect new received transactions
                try {
                    await this.processTransactionHistory(address)
                } catch (error) {
                    console.error('Error processing transaction history during subscription update:', error)
                }

                // Trigger balance update when status changes
                this.getBalance(address).then(newBalance => {

                    // Store updated balance
                    StorageService.setLastBalance(newBalance)

                    // Call the callback if provided
                    if (onUpdate) {
                        onUpdate({ address, balance: newBalance, status: data.status })
                    }
                }).catch(error => {
                    console.error('Error updating balance after subscription notification:', error)
                })
            })
        } catch (error) {
            console.error('Error subscribing to wallet updates:', error)
            throw error
        }
    }

    async initializeWallet(
        address: string,
        onUpdate?: (data: any) => void,
        onProgress?: (processed: number, total: number, currentTx?: string) => void
    ): Promise<void> {
        try {
            // Connect to Electrum server only if not already connected
            if (!this.electrum.isConnectedToServer()) {
                await this.electrum.connect()
            }

            // Get initial balance
            const balance = await this.getBalance(address)
            await StorageService.setLastBalance(balance)

            // Process initial transaction history to catch any missed transactions
            try {
                await this.processTransactionHistory(address, onProgress)
            } catch (error) {
                console.error('Error processing initial transaction history:', error)
            }

            // Subscribe to updates
            await this.subscribeToWalletUpdates(address, onUpdate)

        } catch (error) {
            console.error('Error initializing wallet:', error)
            throw error
        }
    }

    async sendTransaction(
        toAddress: string,
        amount: number,
        password?: string
    ): Promise<string> {
        try {
            // Get current wallet data
            const activeWallet = await StorageService.getActiveWallet()
            if (!activeWallet) {
                throw new Error('No active wallet found')
            }

            let privateKeyWIF = activeWallet.privateKey

            // Decrypt private key if encrypted
            if (activeWallet.isEncrypted) {
                if (!password) {
                    throw new Error('Password required for encrypted wallet')
                }
                try {
                    const decrypted = CryptoJS.AES.decrypt(privateKeyWIF, password).toString(CryptoJS.enc.Utf8)
                    if (!decrypted) {
                        throw new Error('Invalid password')
                    }
                    privateKeyWIF = decrypted
                } catch (error) {
                    throw new Error('Invalid password')
                }
            }

            // Create key pair from private key
            const keyPair = ECPair.fromWIF(privateKeyWIF, avianNetwork)
            const fromAddress = activeWallet.address

            // Get UTXOs for the address
            const utxos = await this.electrum.getUTXOs(fromAddress)
            if (utxos.length === 0) {
                throw new Error('No unspent transaction outputs found')
            }

            // Calculate total available amount
            const totalAvailable = utxos.reduce((sum, utxo) => sum + utxo.value, 0)

            // Define transaction fee (0.0001 AVN = 10000 satoshis)
            const fee = 10000
            const totalRequired = amount + fee

            if (totalAvailable < totalRequired) {
                throw new Error(`Insufficient funds. Required: ${totalRequired} satoshis, Available: ${totalAvailable} satoshis`)
            }

            // Build transaction using PSBT
            const psbt = new bitcoin.Psbt({ network: avianNetwork })

            // Add inputs
            let inputTotal = 0
            const usedUtxos = []

            for (const utxo of utxos) {
                if (inputTotal >= totalRequired) break

                // Get the raw transaction hex (non-verbose)
                const txHex = await this.electrum.getTransaction(utxo.txid, false)

                psbt.addInput({
                    hash: utxo.txid,
                    index: utxo.vout,
                    nonWitnessUtxo: Buffer.from(txHex, 'hex'),
                })

                inputTotal += utxo.value
                usedUtxos.push(utxo)
            }

            // Add output for recipient
            psbt.addOutput({
                address: toAddress,
                value: amount,
            })

            // Add change output if needed
            const change = inputTotal - totalRequired
            if (change > 0) {
                psbt.addOutput({
                    address: fromAddress,
                    value: change,
                })
            }

            // Create a compatible signer object with Avian fork ID support
            // Avian uses SIGHASH_FORKID (0x40) to prevent replay attacks from other Bitcoin forks
            const SIGHASH_ALL = 0x01
            const SIGHASH_FORKID = 0x40
            const hashType = SIGHASH_ALL | SIGHASH_FORKID // 0x41 - required for Avian transactions

            const signer = {
                publicKey: Buffer.from(keyPair.publicKey),
                sign: (hash: Buffer) => Buffer.from(keyPair.sign(hash))
            }

            // For Avian fork ID, we need to use a different approach since bitcoinjs-lib PSBT
            // doesn't natively support custom sighash types
            try {
                // First, try the standard approach with sighash type array
                for (let i = 0; i < usedUtxos.length; i++) {
                    // Pass the hashType in the sighashTypes array to whitelist it
                    psbt.signInput(i, signer, [hashType])
                }

            } catch (psbtError) {
                // Create transaction for signing
                const tx = new bitcoin.Transaction()
                tx.version = 2
                tx.locktime = 0

                // Add all inputs
                for (const u of usedUtxos) {
                    tx.addInput(Buffer.from(u.txid, 'hex').reverse(), u.vout)
                }

                // Add all outputs
                tx.addOutput(bitcoin.address.toOutputScript(toAddress, avianNetwork), amount)
                if (change > 0) {
                    tx.addOutput(bitcoin.address.toOutputScript(fromAddress, avianNetwork), change)
                }

                // Sign each input manually with fork ID
                for (let i = 0; i < usedUtxos.length; i++) {
                    const utxo = usedUtxos[i]
                    const prevTxHex = await this.electrum.getTransaction(utxo.txid, false)
                    const prevTx = bitcoin.Transaction.fromHex(prevTxHex)

                    // Get the previous output script (scriptPubKey)
                    const prevOutScript = prevTx.outs[utxo.vout].script

                    // Create the signature hash with fork ID
                    const signatureHash = tx.hashForSignature(i, prevOutScript, hashType)

                    // Sign the hash
                    const signature = keyPair.sign(signatureHash)
                    const derSignature = this.encodeDERWithCustomHashType(Buffer.from(signature), hashType)

                    // Build script sig (P2PKH: <signature> <publicKey>)
                    const scriptSig = bitcoin.script.compile([
                        derSignature,
                        Buffer.from(keyPair.publicKey)
                    ])

                    tx.ins[i].script = scriptSig
                }

                // Return the manually built transaction
                const txHex = tx.toHex()
                const txId = tx.getId()

                // Validate the transaction structure
                try {
                    const validateTx = bitcoin.Transaction.fromHex(txHex)

                    // Check each input has a valid script
                    for (let i = 0; i < validateTx.ins.length; i++) {
                        const script = validateTx.ins[i].script
                        if (script.length === 0) {
                            throw new Error(`Input ${i} has empty script`)
                        }
                    }
                } catch (validationError) {
                    console.error('Transaction validation failed:', validationError)
                    throw new Error(`Invalid transaction created: ${validationError}`)
                }

                // Broadcast the transaction
                const broadcastResult = await this.electrum.broadcastTransaction(txHex)


                // Save transaction to local history
                await StorageService.saveTransaction({
                    txid: txId,
                    amount: amount / 100000000, // Convert satoshis to AVN
                    address: toAddress,
                    fromAddress: fromAddress,
                    type: 'send',
                    timestamp: new Date(),
                    confirmations: 0
                })

                return txId
            }

            // If PSBT signing succeeded, finalize and extract the transaction
            psbt.finalizeAllInputs()

            // Extract the raw transaction hex
            const tx = psbt.extractTransaction()
            const txHex = tx.toHex()
            const txId = tx.getId()

            // Broadcast the transaction
            const broadcastResult = await this.electrum.broadcastTransaction(txHex)


            // Save transaction to local history
            await StorageService.saveTransaction({
                txid: txId,
                amount: amount / 100000000, // Convert satoshis to AVN
                address: toAddress,
                fromAddress: fromAddress,
                type: 'send',
                timestamp: new Date(),
                confirmations: 0
            })

            return txId
        } catch (error) {
            console.error('Error sending transaction:', error)
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            throw new Error(`Transaction failed: ${errorMessage}`)
        }
    }

    async encryptWallet(password: string): Promise<void> {
        try {
            const privateKey = await StorageService.getPrivateKey()
            if (!privateKey) {
                throw new Error('No private key to encrypt')
            }

            // If already encrypted, throw error
            const isEncrypted = await StorageService.getIsEncrypted()
            if (isEncrypted) {
                throw new Error('Wallet is already encrypted')
            }

            // Encrypt private key
            const encryptedKey = CryptoJS.AES.encrypt(privateKey, password).toString()
            await StorageService.setPrivateKey(encryptedKey)

            // Encrypt mnemonic if it exists
            const mnemonic = await StorageService.getMnemonic()
            if (mnemonic) {
                const encryptedMnemonic = CryptoJS.AES.encrypt(mnemonic, password).toString()
                await StorageService.setMnemonic(encryptedMnemonic)
            }

            await StorageService.setIsEncrypted(true)
        } catch (error) {
            console.error('Error encrypting wallet:', error)
            throw error
        }
    }

    async decryptWallet(password: string): Promise<void> {
        try {
            const encryptedKey = await StorageService.getPrivateKey()
            if (!encryptedKey) {
                throw new Error('No private key found')
            }

            const isEncrypted = await StorageService.getIsEncrypted()
            if (!isEncrypted) {
                throw new Error('Wallet is not encrypted')
            }

            // Decrypt private key
            const decryptedKey = CryptoJS.AES.decrypt(encryptedKey, password).toString(CryptoJS.enc.Utf8)
            if (!decryptedKey) {
                throw new Error('Invalid password')
            }

            await StorageService.setPrivateKey(decryptedKey)

            // Decrypt mnemonic if it exists
            const encryptedMnemonic = await StorageService.getMnemonic()
            if (encryptedMnemonic) {
                try {
                    const decryptedMnemonic = CryptoJS.AES.decrypt(encryptedMnemonic, password).toString(CryptoJS.enc.Utf8)
                    if (decryptedMnemonic) {
                        await StorageService.setMnemonic(decryptedMnemonic)
                    }
                } catch (mnemonicError) {
                    console.warn('Failed to decrypt mnemonic, but private key was decrypted successfully')
                }
            }

            await StorageService.setIsEncrypted(false)
        } catch (error) {
            console.error('Error decrypting wallet:', error)
            throw error
        }
    }

    async exportPrivateKey(password?: string): Promise<string> {
        try {
            const storedPrivateKey = await StorageService.getPrivateKey()
            if (!storedPrivateKey) {
                throw new Error('No private key found. Private keys cannot be recreated - you must restore from a backup or generate a new wallet.')
            }

            const isEncrypted = await StorageService.getIsEncrypted()

            if (isEncrypted && !password) {
                throw new Error('Password required for encrypted wallet')
            }

            let exportedKey: string

            if (isEncrypted) {
                // Decrypt private key
                exportedKey = CryptoJS.AES.decrypt(storedPrivateKey, password!).toString(CryptoJS.enc.Utf8)
            } else {
                exportedKey = storedPrivateKey
            }

            // Validate the decrypted key
            if (!exportedKey) {
                throw new Error('Failed to decrypt private key. Please check your password.')
            }

            // Validate WIF format
            try {
                ECPair.fromWIF(exportedKey, avianNetwork)
            } catch (wifError) {
                // If it's not WIF, try to convert it
                if (exportedKey.length === 64 && /^[0-9a-fA-F]+$/.test(exportedKey)) {
                    // It's a hex private key, convert to WIF
                    const privateKeyBuffer = Buffer.from(exportedKey, 'hex')
                    const keyPair = ECPair.fromPrivateKey(privateKeyBuffer, { network: avianNetwork })
                    exportedKey = keyPair.toWIF()
                } else {
                    throw new Error('Corrupted private key detected. The stored key is not in a valid format.')
                }
            }

            return exportedKey
        } catch (error) {
            console.error('Error exporting private key:', error)
            throw error
        }
    }

    async checkWalletRecoveryOptions(): Promise<{
        hasWallet: boolean
        isEncrypted: boolean
        hasMnemonic: boolean
        recoveryOptions: string[]
    }> {
        try {
            const storedPrivateKey = await StorageService.getPrivateKey()
            const storedAddress = await StorageService.getAddress()
            const storedMnemonic = await StorageService.getMnemonic()
            const isEncrypted = await StorageService.getIsEncrypted()

            const hasWallet = !!(storedPrivateKey && storedAddress)
            const hasMnemonic = !!storedMnemonic
            const recoveryOptions: string[] = []

            if (!hasWallet) {
                recoveryOptions.push('Generate a new wallet (creates new private key, address, and mnemonic)')
                recoveryOptions.push('Import existing private key (WIF format)')
                recoveryOptions.push('Restore from BIP39 mnemonic phrase (12 words)')
                recoveryOptions.push('Restore from backup if available')
            } else {
                if (isEncrypted) {
                    recoveryOptions.push('Decrypt wallet with password')
                }
                recoveryOptions.push('Export private key for backup')
                if (hasMnemonic) {
                    recoveryOptions.push('Export BIP39 mnemonic phrase for backup')
                }
                recoveryOptions.push('Generate new wallet (will replace current one)')
            }

            return {
                hasWallet,
                isEncrypted,
                hasMnemonic,
                recoveryOptions
            }
        } catch (error) {
            console.error('Error checking wallet recovery options:', error)
            return {
                hasWallet: false,
                isEncrypted: false,
                hasMnemonic: false,
                recoveryOptions: [
                    'Generate a new wallet',
                    'Import existing private key',
                    'Restore from BIP39 mnemonic',
                    'Check browser storage permissions'
                ]
            }
        }
    }

    async validatePrivateKey(privateKey: string): Promise<boolean> {
        try {
            // Try to create an ECPair from the private key
            ECPair.fromWIF(privateKey, avianNetwork)
            return true
        } catch (error) {
            console.error('Private key validation failed:', error)
            return false
        }
    }

    // Connection management methods
    async connectToElectrum(): Promise<void> {
        try {
            if (!this.electrum.isConnectedToServer()) {
                await this.electrum.connect()
            }
        } catch (error) {
            console.error('Failed to connect to ElectrumX server:', error)
            throw error
        }
    }

    async disconnectFromElectrum(): Promise<void> {
        try {
            await this.electrum.disconnect()
        } catch (error) {
            console.error('Error disconnecting from ElectrumX server:', error)
            throw error
        }
    }

    isConnectedToElectrum(): boolean {
        return this.electrum.isConnectedToServer()
    }

    getElectrumServerInfo(): { url: string; servers: any[] } {
        return {
            url: this.electrum.getServerUrl(),
            servers: this.electrum.getAvailableServers()
        }
    }

    async selectElectrumServer(index: number): Promise<void> {
        try {
            this.electrum.selectServer(index)
            // Reconnect to the new server
            if (this.isConnectedToElectrum()) {
                await this.connectToElectrum()
            }
        } catch (error) {
            console.error('Error selecting ElectrumX server:', error)
            throw error
        }
    }

    async testElectrumConnection(): Promise<boolean> {
        try {
            // First check if we're connected
            if (!this.electrum.isConnectedToServer()) {
                return false
            }

            // If connected, try to ping
            await this.electrum.ping()
            return true
        } catch (error) {
            console.error('ElectrumX connection test failed:', error)
            return false
        }
    }

    async getElectrumServerVersion(): Promise<{ server: string; protocol: string }> {
        try {
            return await this.electrum.getServerVersion()
        } catch (error) {
            console.error('Failed to get server version:', error)
            throw error
        }
    }

    async generateWalletFromMnemonic(mnemonic: string, password?: string, passphrase?: string): Promise<LegacyWalletData> {
        try {
            // Validate mnemonic
            if (!bip39.validateMnemonic(mnemonic)) {
                throw new Error('Invalid BIP39 mnemonic phrase')
            }

            // Derive seed from mnemonic with optional passphrase (BIP39 25th word)
            const seed = await bip39.mnemonicToSeed(mnemonic, passphrase || '')

            // Create HD wallet root
            const root = bip32.fromSeed(seed, avianNetwork)

            // Derive key at standard path m/44'/921'/0'/0/0 (921 is Avian's coin type)
            const path = "m/44'/921'/0'/0/0"
            const child = root.derivePath(path)

            if (!child.privateKey) {
                throw new Error('Failed to derive private key from mnemonic')
            }

            // Create ECPair from derived private key
            const keyPair = ECPair.fromPrivateKey(child.privateKey, { network: avianNetwork })

            const privateKeyWIF = keyPair.toWIF()

            // Get the address
            const { address } = bitcoin.payments.p2pkh({
                pubkey: Buffer.from(keyPair.publicKey),
                network: avianNetwork
            })

            if (!address) {
                throw new Error('Failed to generate address from mnemonic')
            }

            // Encrypt private key if password provided
            const finalPrivateKey = password
                ? CryptoJS.AES.encrypt(privateKeyWIF, password).toString()
                : privateKeyWIF

            // Encrypt mnemonic if password provided
            const finalMnemonic = password
                ? CryptoJS.AES.encrypt(mnemonic, password).toString()
                : mnemonic

            // Store mnemonic
            await StorageService.setMnemonic(finalMnemonic)

            return {
                address,
                privateKey: finalPrivateKey,
                mnemonic: finalMnemonic
            }
        } catch (error) {
            console.error('Error generating wallet from mnemonic:', error)
            throw new Error('Failed to generate wallet from mnemonic')
        }
    }

    async validateMnemonic(mnemonic: string): Promise<boolean> {
        try {
            return bip39.validateMnemonic(mnemonic)
        } catch (error) {
            console.error('Mnemonic validation failed:', error)
            return false
        }
    }

    async exportMnemonic(password?: string): Promise<string | null> {
        try {
            const storedMnemonic = await StorageService.getMnemonic()
            if (!storedMnemonic) {
                return null // No mnemonic stored (wallet created without BIP39)
            }

            const isEncrypted = await StorageService.getIsEncrypted()

            if (isEncrypted && password) {
                try {
                    const decryptedMnemonic = CryptoJS.AES.decrypt(storedMnemonic, password).toString(CryptoJS.enc.Utf8)
                    if (!decryptedMnemonic) {
                        throw new Error('Failed to decrypt mnemonic')
                    }
                    return decryptedMnemonic
                } catch (error) {
                    throw new Error('Invalid password or corrupted mnemonic')
                }
            } else if (!isEncrypted) {
                return storedMnemonic
            } else {
                throw new Error('Password required for encrypted wallet')
            }
        } catch (error) {
            console.error('Error exporting mnemonic:', error)
            throw error
        }
    }

    // Utility method to open transaction in block explorer
    static openTransactionInExplorer(txid: string): void {
        const explorerUrl = `https://explorer.avn.network/tx/?txid=${txid}`
        window.open(explorerUrl, '_blank', 'noopener,noreferrer')
    }

    // Utility method to get explorer URL for a transaction
    static getExplorerUrl(txid: string): string {
        return `https://explorer.avn.network/tx/?txid=${txid}`
    }

    // Utility method for testing WIF compatibility
    static testWIFCompatibility(testWIF?: string): { success: boolean; address: string; error?: string } {
        try {
            // If no test WIF provided, generate one
            const keyPair = testWIF ? ECPair.fromWIF(testWIF, avianNetwork) : ECPair.makeRandom({ network: avianNetwork })

            // Get the WIF
            const wif = keyPair.toWIF()

            // Decode it back
            const decodedKeyPair = ECPair.fromWIF(wif, avianNetwork)

            // Generate address
            const { address } = bitcoin.payments.p2pkh({
                pubkey: Buffer.from(decodedKeyPair.publicKey),
                network: avianNetwork
            })

            if (!address) {
                throw new Error('Failed to generate address from WIF')
            }

            return {
                success: true,
                address: address
            }
        } catch (error) {
            console.error('WIF compatibility test failed:', error)
            return {
                success: false,
                address: '',
                error: error instanceof Error ? error.message : 'Unknown error'
            }
        }
    }

    // Utility method for testing BIP39 mnemonic compatibility
    static async testMnemonicCompatibility(testMnemonic?: string): Promise<{ success: boolean; address: string; mnemonic: string; error?: string }> {
        try {
            // If no test mnemonic provided, generate one
            const mnemonic = testMnemonic || bip39.generateMnemonic(128)

            // Validate mnemonic
            if (!bip39.validateMnemonic(mnemonic)) {
                throw new Error('Invalid BIP39 mnemonic')
            }

            // Derive seed from mnemonic
            const seed = await bip39.mnemonicToSeed(mnemonic)

            // Create HD wallet root
            const root = bip32.fromSeed(seed, avianNetwork)

            // Derive key at standard path m/44'/921'/0'/0/0
            const path = "m/44'/921'/0'/0/0"
            const child = root.derivePath(path)

            if (!child.privateKey) {
                throw new Error('Failed to derive private key from mnemonic')
            }

            // Create ECPair from derived private key
            const keyPair = ECPair.fromPrivateKey(child.privateKey, { network: avianNetwork })

            // Generate address
            const { address } = bitcoin.payments.p2pkh({
                pubkey: Buffer.from(keyPair.publicKey),
                network: avianNetwork
            })

            if (!address) {
                throw new Error('Failed to generate address from mnemonic')
            }

            return {
                success: true,
                address: address,
                mnemonic: mnemonic
            }
        } catch (error) {
            console.error('Mnemonic compatibility test failed:', error)
            return {
                success: false,
                address: '',
                mnemonic: '',
                error: error instanceof Error ? error.message : 'Unknown error'
            }
        }
    }

    // Multi-wallet support methods
    async createNewWallet(params: {
        name: string
        password?: string
        useMnemonic?: boolean
        makeActive?: boolean
    }): Promise<WalletData> {
        try {
            let keyPair: any
            let mnemonic: string | undefined

            if (params.useMnemonic !== false) {
                // Generate BIP39 mnemonic
                mnemonic = bip39.generateMnemonic(128) // 12 words

                // Derive seed from mnemonic
                const seed = await bip39.mnemonicToSeed(mnemonic)

                // Create HD wallet root
                const root = bip32.fromSeed(seed, avianNetwork)

                // Derive key at standard path m/44'/921'/0'/0/0
                const path = "m/44'/921'/0'/0/0"
                const child = root.derivePath(path)

                if (!child.privateKey) {
                    throw new Error('Failed to derive private key from mnemonic')
                }

                // Create ECPair from derived private key
                keyPair = ECPair.fromPrivateKey(child.privateKey, { network: avianNetwork })
            } else {
                // Generate a random key pair directly
                keyPair = ECPair.makeRandom({ network: avianNetwork })
            }

            const privateKeyWIF = keyPair.toWIF()

            // Get the address
            const { address } = bitcoin.payments.p2pkh({
                pubkey: Buffer.from(keyPair.publicKey),
                network: avianNetwork
            })

            if (!address) {
                throw new Error('Failed to generate address')
            }

            // Encrypt private key if password provided
            const finalPrivateKey = params.password
                ? CryptoJS.AES.encrypt(privateKeyWIF, params.password).toString()
                : privateKeyWIF

            // Encrypt mnemonic if password provided and mnemonic exists
            const finalMnemonic = (mnemonic && params.password)
                ? CryptoJS.AES.encrypt(mnemonic, params.password).toString()
                : mnemonic

            // Create wallet in storage
            const walletData = await StorageService.createWallet({
                name: params.name,
                address,
                privateKey: finalPrivateKey,
                mnemonic: finalMnemonic,
                isEncrypted: !!params.password,
                makeActive: params.makeActive
            })

            return walletData
        } catch (error) {
            console.error('Error creating wallet:', error)
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            throw new Error(`Failed to create wallet: ${errorMessage}`)
        }
    }

    async importWalletFromMnemonic(params: {
        name: string
        mnemonic: string
        password?: string
        makeActive?: boolean
    }): Promise<WalletData> {
        try {
            // Validate mnemonic
            if (!bip39.validateMnemonic(params.mnemonic)) {
                throw new Error('Invalid mnemonic phrase')
            }

            // Derive seed from mnemonic
            const seed = await bip39.mnemonicToSeed(params.mnemonic)

            // Create HD wallet root
            const root = bip32.fromSeed(seed, avianNetwork)

            // Derive key at standard path m/44'/921'/0'/0/0
            const path = "m/44'/921'/0'/0/0"
            const child = root.derivePath(path)

            if (!child.privateKey) {
                throw new Error('Failed to derive private key from mnemonic')
            }

            // Create ECPair from derived private key
            const keyPair = ECPair.fromPrivateKey(child.privateKey, { network: avianNetwork })
            const privateKeyWIF = keyPair.toWIF()

            // Get the address
            const { address } = bitcoin.payments.p2pkh({
                pubkey: Buffer.from(keyPair.publicKey),
                network: avianNetwork
            })

            if (!address) {
                throw new Error('Failed to generate address from mnemonic')
            }

            // Check if wallet already exists
            if (await StorageService.walletExists(address)) {
                throw new Error('Wallet with this address already exists')
            }

            // Encrypt private key if password provided
            const finalPrivateKey = params.password
                ? CryptoJS.AES.encrypt(privateKeyWIF, params.password).toString()
                : privateKeyWIF

            // Encrypt mnemonic if password provided
            const finalMnemonic = params.password
                ? CryptoJS.AES.encrypt(params.mnemonic, params.password).toString()
                : params.mnemonic

            // Create wallet in storage
            const walletData = await StorageService.createWallet({
                name: params.name,
                address,
                privateKey: finalPrivateKey,
                mnemonic: finalMnemonic,
                isEncrypted: !!params.password,
                makeActive: params.makeActive
            })

            return walletData
        } catch (error) {
            console.error('Error importing wallet from mnemonic:', error)
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            throw new Error(`Failed to import wallet: ${errorMessage}`)
        }
    }

    async importWalletFromPrivateKey(params: {
        name: string
        privateKey: string
        password?: string
        makeActive?: boolean
    }): Promise<WalletData> {
        try {

            let keyPair: any
            let decryptedKey = params.privateKey

            // Try to decrypt if it looks encrypted
            if (params.password && params.privateKey.includes('=')) {
                try {
                    decryptedKey = CryptoJS.AES.decrypt(params.privateKey, params.password).toString(CryptoJS.enc.Utf8)
                } catch (e) {
                    // If decryption fails, assume it's not encrypted
                    decryptedKey = params.privateKey
                }
            }

            if (!decryptedKey) {
                throw new Error('Invalid private key or password')
            }

            // Import the private key
            try {
                keyPair = ECPair.fromWIF(decryptedKey, avianNetwork)
            } catch (error) {
                throw new Error('Invalid private key format')
            }

            // Get the address
            const { address } = bitcoin.payments.p2pkh({
                pubkey: Buffer.from(keyPair.publicKey),
                network: avianNetwork
            })

            if (!address) {
                throw new Error('Failed to generate address from private key')
            }

            // Check if wallet already exists
            if (await StorageService.walletExists(address)) {
                throw new Error('Wallet with this address already exists')
            }

            // Encrypt private key if password provided
            const finalPrivateKey = params.password
                ? CryptoJS.AES.encrypt(decryptedKey, params.password).toString()
                : decryptedKey

            // Create wallet in storage
            const walletData = await StorageService.createWallet({
                name: params.name,
                address,
                privateKey: finalPrivateKey,
                isEncrypted: !!params.password,
                makeActive: params.makeActive
            })

            return walletData
        } catch (error) {
            console.error('Error importing wallet from private key:', error)
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            throw new Error(`Failed to import wallet: ${errorMessage}`)
        }
    }

    async getAllWallets(): Promise<WalletData[]> {
        return await StorageService.getAllWallets()
    }

    async getActiveWallet(): Promise<WalletData | null> {
        return await StorageService.getActiveWallet()
    }

    async switchWallet(walletId: number): Promise<boolean> {
        return await StorageService.switchToWallet(walletId)
    }

    async updateWalletName(walletId: number, newName: string): Promise<boolean> {
        return await StorageService.updateWalletName(walletId, newName)
    }

    async deleteWallet(walletId: number): Promise<boolean> {
        return await StorageService.deleteWallet(walletId)
    }

    async getWalletCount(): Promise<number> {
        return await StorageService.getWalletCount()
    }

    // Export mnemonic for active wallet
    async exportActiveWalletMnemonic(password?: string): Promise<string> {
        const wallet = await this.getActiveWallet()
        if (!wallet || !wallet.mnemonic) {
            throw new Error('No mnemonic available for current wallet')
        }

        if (wallet.isEncrypted && !password) {
            throw new Error('Password required to decrypt mnemonic')
        }

        if (wallet.isEncrypted && password) {
            try {
                const decrypted = CryptoJS.AES.decrypt(wallet.mnemonic, password).toString(CryptoJS.enc.Utf8)
                if (!decrypted) {
                    throw new Error('Invalid password')
                }
                return decrypted
            } catch (error) {
                throw new Error('Invalid password')
            }
        }

        return wallet.mnemonic
    }

    // Export private key for active wallet
    async exportActiveWalletPrivateKey(password?: string): Promise<string> {
        const wallet = await this.getActiveWallet()
        if (!wallet) {
            throw new Error('No active wallet')
        }

        if (wallet.isEncrypted && !password) {
            throw new Error('Password required to decrypt private key')
        }

        if (wallet.isEncrypted && password) {
            try {
                const decrypted = CryptoJS.AES.decrypt(wallet.privateKey, password).toString(CryptoJS.enc.Utf8)
                if (!decrypted) {
                    throw new Error('Invalid password')
                }
                return decrypted
            } catch (error) {
                throw new Error('Invalid password')
            }
        }

        return wallet.privateKey
    }

    async getTransactionHistory(address?: string): Promise<any[]> {
        try {
            // If no address provided, use the active wallet's address
            if (!address) {
                const activeWallet = await this.getActiveWallet()
                if (activeWallet) {
                    address = activeWallet.address
                }
            }

            return await StorageService.getTransactionHistory(address)
        } catch (error) {
            console.error('Error getting transaction history:', error)
            return []
        }
    }

    private async calculateConfirmations(blockHeight?: number): Promise<number> {
        if (!blockHeight) {
            return 0 // Unconfirmed transaction
        }

        try {
            const currentHeight = await this.electrum.getCurrentBlockHeight()
            if (currentHeight === 0) {
                // If we can't get current height, assume 1 confirmation for confirmed transactions
                return 1
            }

            const confirmations = Math.max(0, currentHeight - blockHeight + 1)
            return confirmations
        } catch (error) {
            console.error('Error calculating confirmations:', error)
            // Fallback: return 1 for confirmed transactions, 0 for unconfirmed
            return blockHeight ? 1 : 0
        }
    }

    async processTransactionHistory(
        address: string,
        onProgress?: (processed: number, total: number, currentTx?: string) => void
    ): Promise<void> {
        try {
            // Get transaction history from ElectrumX
            const txHistory = await this.electrum.getTransactionHistory(address)

            if (!txHistory || txHistory.length === 0) {
                return
            }

            // Get existing transactions from local storage
            const existingTxs = await StorageService.getTransactionHistory(address)
            const existingTxIds = new Set(existingTxs.map(tx => tx.txid))

            // Filter out transactions we already have
            const newTransactions = txHistory.filter(tx => !existingTxIds.has(tx.tx_hash))
            const total = newTransactions.length
            let processedCount = 0

            // Report initial progress if we have new transactions to process
            if (total > 0) {
                onProgress?.(0, total)
            }

            // Process each new transaction from history
            for (const historyTx of newTransactions) {

                try {
                    // Get detailed transaction information
                    const txDetails = await this.electrum.getTransaction(historyTx.tx_hash, true)

                    // Classify transaction as sent or received
                    const classification = await this.classifyTransaction(txDetails, address)

                    if (classification) {
                        // Calculate proper confirmations
                        const confirmations = await this.calculateConfirmations(historyTx.height)

                        // Save transaction to database
                        await StorageService.saveTransaction({
                            txid: historyTx.tx_hash,
                            amount: classification.amount / 100000000, // Convert satoshis to AVN
                            address: classification.type === 'send' ? classification.toAddress : classification.toAddress,
                            fromAddress: classification.fromAddress,
                            type: classification.type,
                            timestamp: new Date(txDetails.time ? txDetails.time * 1000 : Date.now()),
                            confirmations: confirmations,
                            blockHeight: historyTx.height || undefined
                        })

                        processedCount++
                    }

                    // Report progress for each transaction processed
                    onProgress?.(processedCount, total, historyTx.tx_hash)
                } catch (error) {
                    console.error('Error processing transaction', historyTx.tx_hash, ':', error)
                    // Still report progress even on error
                    onProgress?.(processedCount, total, historyTx.tx_hash)
                }
            }

            // Report final progress
            if (total > 0) {
                onProgress?.(processedCount, total)
            }
        } catch (error) {
            console.error('Error processing transaction history:', error)
        }
    }

    async refreshTransactionHistory(
        address?: string,
        onProgress?: (processed: number, total: number, currentTx?: string) => void
    ): Promise<void> {
        try {
            // If no address provided, use the active wallet's address
            if (!address) {
                const activeWallet = await this.getActiveWallet()
                if (activeWallet) {
                    address = activeWallet.address
                }
            }

            if (address) {
                await this.processTransactionHistory(address, onProgress)
            } else {
                console.warn('No address available to refresh transaction history')
            }
        } catch (error) {
            console.error('Error refreshing transaction history:', error)
            throw error
        }
    }

    private async isTransactionReceived(txDetails: any, address: string): Promise<boolean> {
        // First check if this transaction is already stored as a sent transaction
        const existingTxs = await StorageService.getTransactionHistory(address)
        const existingSentTx = existingTxs.find(tx => tx.txid === txDetails.txid && tx.type === 'send')

        if (existingSentTx) {
            return false
        }

        // Check if any output is directed to our address
        let hasOutputToUs = false
        if (txDetails.vout) {
            for (const output of txDetails.vout) {
                if (output.scriptPubKey && output.scriptPubKey.addresses) {
                    if (output.scriptPubKey.addresses.includes(address)) {
                        hasOutputToUs = true
                        break
                    }
                }
            }
        }

        if (!hasOutputToUs) {
            return false
        }

        // Check if any inputs belong to us (any of our wallets)
        if (txDetails.vin) {
            for (const input of txDetails.vin) {
                if (input.scriptSig && input.scriptSig.addresses) {
                    for (const inputAddress of input.scriptSig.addresses) {
                        if (await this.isOurAddress(inputAddress)) {
                            return false
                        }
                    }
                }
            }
        }

        // If we reach here, there's an output to us but no inputs from us
        return true
    }

    private calculateReceivedAmount(txDetails: any, address: string): number {
        let totalReceived = 0

        if (txDetails.vout) {
            for (const output of txDetails.vout) {
                if (output.scriptPubKey && output.scriptPubKey.addresses) {
                    if (output.scriptPubKey.addresses.includes(address)) {
                        totalReceived += Math.round(output.value * 100000000) // Convert to satoshis
                    }
                }
            }
        }

        return totalReceived
    }

    private getSenderAddress(txDetails: any): string {
        // Try to get the first input address as sender
        if (txDetails.vin && txDetails.vin.length > 0) {
            const firstInput = txDetails.vin[0]

            // Check for direct address field first (more common in modern ElectrumX)
            if (firstInput.address) {
                return firstInput.address
            }

            // Fallback to scriptSig.addresses for legacy format
            if (firstInput.scriptSig && firstInput.scriptSig.addresses && firstInput.scriptSig.addresses.length > 0) {
                return firstInput.scriptSig.addresses[0]
            }
        }
        return 'External' // Use a more descriptive placeholder
    }

    /**
     * Classify a transaction as sent, received, or neither (not related to our address)
     */
    private async classifyTransaction(txDetails: any, address: string): Promise<{
        type: 'send' | 'receive',
        amount: number,
        fromAddress: string,
        toAddress: string
    } | null> {
        // Check if we have inputs (spending from our address)
        let hasInputFromUs = false

        if (txDetails.vin) {
            for (const input of txDetails.vin) {
                // Check if input has an address field directly
                if (input.address && (input.address === address || await this.isOurAddress(input.address))) {
                    hasInputFromUs = true
                    break
                }
                // Also check scriptSig.addresses for legacy format
                if (input.scriptSig && input.scriptSig.addresses) {
                    for (const inputAddress of input.scriptSig.addresses) {
                        if (inputAddress === address || await this.isOurAddress(inputAddress)) {
                            hasInputFromUs = true
                            break
                        }
                    }
                }
                if (hasInputFromUs) break
            }
        }

        // Check if we have outputs (receiving to our address)
        let hasOutputToUs = false
        let totalOutputToUs = 0
        let totalOutputToOthers = 0
        let firstOutputToOthers = ''

        if (txDetails.vout) {
            for (let i = 0; i < txDetails.vout.length; i++) {
                const output = txDetails.vout[i]
                if (output.scriptPubKey && output.scriptPubKey.addresses) {
                    const outputValue = Math.round(output.value * 100000000) // Convert to satoshis
                    const outputAddresses = output.scriptPubKey.addresses

                    // Check if this output goes to our address or any of our addresses
                    let isOurOutput = false
                    for (const outputAddr of outputAddresses) {
                        if (outputAddr === address || await this.isOurAddress(outputAddr)) {
                            isOurOutput = true
                            break
                        }
                    }

                    if (isOurOutput) {
                        hasOutputToUs = true
                        totalOutputToUs += outputValue
                    } else {
                        totalOutputToOthers += outputValue
                        if (!firstOutputToOthers && outputAddresses.length > 0) {
                            firstOutputToOthers = outputAddresses[0]
                        }
                    }
                }
            }
        }

        // Classify the transaction
        if (hasInputFromUs && hasOutputToUs) {
            // This is our own transaction (we spent and got change back)
            // The amount we "sent" is the total that went to others
            if (totalOutputToOthers > 0) {
                return {
                    type: 'send',
                    amount: totalOutputToOthers,
                    fromAddress: address,
                    toAddress: firstOutputToOthers || 'Unknown'
                }
            }
        } else if (hasInputFromUs && !hasOutputToUs) {
            // This is a send transaction with no change
            return {
                type: 'send',
                amount: totalOutputToOthers,
                fromAddress: address,
                toAddress: firstOutputToOthers || 'Unknown'
            }
        } else if (!hasInputFromUs && hasOutputToUs) {
            // This is a true received transaction
            const senderAddress = this.getSenderAddress(txDetails)
            return {
                type: 'receive',
                amount: totalOutputToUs,
                fromAddress: senderAddress,
                toAddress: address
            }
        }

        // Transaction doesn't involve our address meaningfully
        return null
    }

    // Utility method to ensure signature is canonical (low-S value)
    // This is kept for reference but bitcoinjs-lib should handle this automatically
    private ensureCanonicalSignature(signature: Uint8Array): Buffer {
        // Convert to Buffer if needed
        const sigBuffer = Buffer.from(signature)

        // bitcoinjs-lib ECPair.sign should already produce canonical signatures
        // but we keep this method for additional safety
        if (sigBuffer.length !== 64) {
            return sigBuffer
        }

        const r = sigBuffer.slice(0, 32)
        const s = sigBuffer.slice(32, 64)

        // Convert s to BigInt for comparison
        const sBigInt = BigInt('0x' + s.toString('hex'))

        // The secp256k1 curve order (n)
        const n = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141')

        // If s > n/2, then s = n - s (make it canonical/low-S)
        const halfN = n / BigInt(2)

        if (sBigInt > halfN) {
            const canonicalS = n - sBigInt
            const canonicalSBuffer = Buffer.from(canonicalS.toString(16).padStart(64, '0'), 'hex')
            return Buffer.concat([r, canonicalSBuffer])
        }

        // Signature is already canonical
        return sigBuffer
    }

    // Custom DER encoding method that supports Avian's fork ID
    private encodeDERWithCustomHashType(signature: Buffer, hashType: number): Buffer {
        // If signature is 64 bytes (r + s), convert to DER format
        if (signature.length === 64) {
            const r = signature.slice(0, 32)
            const s = signature.slice(32, 64)

            // Create DER encoded signature
            const derSig = this.toDERFormat(r, s)

            // Append hash type (this bypasses bitcoinjs-lib validation)
            const result = Buffer.concat([derSig, Buffer.from([hashType])])

            return result
        } else {
            // If it's already DER encoded, just append hash type
            return Buffer.concat([signature, Buffer.from([hashType])])
        }
    }

    // Helper method to encode signature in DER format
    private toDERFormat(r: Buffer, s: Buffer): Buffer {
        // Remove leading zeros from r and s, but keep at least one byte
        const rClean = this.removeLeadingZeros(r)
        const sClean = this.removeLeadingZeros(s)

        // If first byte is >= 0x80, prepend 0x00 to indicate positive number
        const rWithPadding = rClean[0] >= 0x80 ? Buffer.concat([Buffer.from([0x00]), rClean]) : rClean
        const sWithPadding = sClean[0] >= 0x80 ? Buffer.concat([Buffer.from([0x00]), sClean]) : sClean

        // Build DER structure: 0x30 [total-length] 0x02 [r-length] [r] 0x02 [s-length] [s]
        const rPart = Buffer.concat([Buffer.from([0x02, rWithPadding.length]), rWithPadding])
        const sPart = Buffer.concat([Buffer.from([0x02, sWithPadding.length]), sWithPadding])

        const content = Buffer.concat([rPart, sPart])
        return Buffer.concat([Buffer.from([0x30, content.length]), content])
    }

    // Helper method to remove leading zeros from buffer
    private removeLeadingZeros(buffer: Buffer): Buffer {
        let start = 0
        while (start < buffer.length - 1 && buffer[start] === 0) {
            start++
        }
        return buffer.slice(start)
    }

    private async isOurAddress(address: string): Promise<boolean> {
        try {
            const wallets = await StorageService.getAllWallets()
            return wallets.some((wallet: WalletData) => wallet.address === address)
        } catch (error) {
            console.error('Error checking if address belongs to our wallets:', error)
            return false
        }
    }

    /**
     * Clean up misclassified transactions in the database.
     * This removes "receive" transactions that are actually change outputs from our own sent transactions.
     */
    async cleanupMisclassifiedTransactions(address?: string): Promise<number> {
        try {
            let targetAddress = address
            if (!targetAddress) {
                const activeWallet = await this.getActiveWallet()
                if (!activeWallet) {
                    console.warn('No active wallet found for cleanup')
                    return 0
                }
                targetAddress = activeWallet.address
            }

            const existingTxs = await StorageService.getTransactionHistory(targetAddress)
            const sentTxIds = new Set(existingTxs.filter(tx => tx.type === 'send').map(tx => tx.txid))

            // Find received transactions that are actually change from sent transactions
            const misclassifiedTxs = existingTxs.filter(tx =>
                tx.type === 'receive' && sentTxIds.has(tx.txid)
            )

            // Remove misclassified transactions
            for (const tx of misclassifiedTxs) {
                await StorageService.removeTransaction(tx.txid, targetAddress)
            }

            return misclassifiedTxs.length
        } catch (error) {
            console.error('Error cleaning up misclassified transactions:', error)
            return 0
        }
    }

    /**
     * Reprocess all existing transactions with updated classification logic
     * Now supports progress callbacks for better UX
     */
    async reprocessTransactionHistory(
        address?: string,
        onProgress?: (processed: number, total: number, currentTx?: string) => void,
        onBalanceUpdate?: (newBalance: number) => void
    ): Promise<number> {
        try {
            let targetAddress = address
            if (!targetAddress) {
                const activeWallet = await this.getActiveWallet()
                if (!activeWallet) {
                    console.warn('No active wallet found for reprocessing')
                    return 0
                }
                targetAddress = activeWallet.address
            }

            // Clear all existing transactions for this address
            await StorageService.clearTransactionHistoryForAddress(targetAddress)

            // Get transaction history from ElectrumX
            const txHistory = await this.electrum.getTransactionHistory(targetAddress)

            let processedCount = 0
            const processedTxids = new Set<string>() // Track processed transactions
            const total = txHistory.length

            // Report initial progress
            onProgress?.(0, total)

            // Process transactions in chunks to avoid blocking the main thread
            const chunkSize = 5 // Process 5 transactions at a time

            for (let i = 0; i < txHistory.length; i += chunkSize) {
                const chunk = txHistory.slice(i, i + chunkSize)

                // Process chunk
                for (const historyTx of chunk) {
                    try {
                        // Skip if we've already processed this transaction in this session
                        if (processedTxids.has(historyTx.tx_hash)) {
                            continue
                        }

                        // Check if transaction already exists in database
                        const existingTx = await StorageService.getTransaction(historyTx.tx_hash)
                        if (existingTx) {
                            processedTxids.add(historyTx.tx_hash)
                            continue
                        }

                        // Report progress with current transaction
                        onProgress?.(processedCount, total, historyTx.tx_hash)

                        // Get detailed transaction information
                        const txDetails = await this.electrum.getTransaction(historyTx.tx_hash, true)

                        // Classify transaction as sent or received
                        const classification = await this.classifyTransaction(txDetails, targetAddress)

                        if (classification) {
                            // Calculate proper confirmations
                            const confirmations = await this.calculateConfirmations(historyTx.height)

                            // Save transaction to database
                            const transactionData = {
                                txid: historyTx.tx_hash,
                                amount: classification.amount / 100000000, // Convert satoshis to AVN
                                address: classification.type === 'send' ? classification.toAddress : classification.toAddress, // Always use toAddress as the main address
                                fromAddress: classification.fromAddress,
                                type: classification.type,
                                timestamp: new Date(txDetails.time ? txDetails.time * 1000 : Date.now()),
                                confirmations: confirmations,
                                blockHeight: historyTx.height || undefined
                            }

                            await StorageService.saveTransaction(transactionData)

                            processedCount++
                            processedTxids.add(historyTx.tx_hash)
                        }
                    } catch (error) {
                        console.error('Error reprocessing transaction', historyTx.tx_hash, ':', error)
                        // Don't mark as processed if there was an error
                    }
                }

                // Yield control back to the event loop after each chunk
                if (i + chunkSize < txHistory.length) {
                    await new Promise(resolve => setTimeout(resolve, 10))
                }
            }

            // Report final progress
            onProgress?.(processedCount, total)

            // Final balance update after all transactions are processed
            if (onBalanceUpdate) {
                try {
                    const finalBalance = await this.getBalance(targetAddress)
                    onBalanceUpdate(finalBalance)
                } catch (error) {
                    console.error('Error updating final balance:', error)
                }
            }

            return processedCount
        } catch (error) {
            console.error('Error reprocessing transaction history:', error)
            return 0
        }
    }

    /**
     * Update confirmations for all existing transactions
     * This can be called periodically to keep confirmation counts current
     */
    async updateTransactionConfirmations(address?: string): Promise<number> {
        try {
            let targetAddress = address
            if (!targetAddress) {
                const activeWallet = await this.getActiveWallet()
                if (!activeWallet) {
                    console.warn('No active wallet found for updating confirmations')
                    return 0
                }
                targetAddress = activeWallet.address
            }

            // Get all existing transactions
            const existingTxs = await StorageService.getTransactionHistory(targetAddress)
            let updatedCount = 0

            for (const tx of existingTxs) {
                if (tx.blockHeight) {
                    // Calculate new confirmation count
                    const newConfirmations = await this.calculateConfirmations(tx.blockHeight)

                    // Only update if confirmations changed
                    if (newConfirmations !== tx.confirmations) {
                        await StorageService.updateTransactionConfirmations(tx.txid, newConfirmations)
                        updatedCount++
                    }
                }
            }

            return updatedCount
        } catch (error) {
            console.error('Error updating transaction confirmations:', error)
            return 0
        }
    }

    /**
     * Progressive transaction processing that updates UI in real-time
     * Processes transactions one by one and calls back with new transaction data
     */
    async reprocessTransactionHistoryProgressive(
        address?: string,
        onProgress?: (processed: number, total: number, currentTx?: string, newTransaction?: any) => void,
        onBalanceUpdate?: (newBalance: number) => void
    ): Promise<number> {
        try {
            let targetAddress = address
            if (!targetAddress) {
                const activeWallet = await this.getActiveWallet()
                if (!activeWallet) {
                    console.warn('No active wallet found for reprocessing')
                    return 0
                }
                targetAddress = activeWallet.address
            }

            // Clear all existing transactions for this address
            await StorageService.clearTransactionHistoryForAddress(targetAddress)

            // Get transaction history from ElectrumX
            const txHistory = await this.electrum.getTransactionHistory(targetAddress)

            let processedCount = 0
            const total = txHistory.length

            // Report initial progress
            onProgress?.(0, total)            // Process transactions one by one for real-time UI updates
            for (let i = 0; i < txHistory.length; i++) {
                const historyTx = txHistory[i]

                try {
                    // Get detailed transaction information
                    const txDetails = await this.electrum.getTransaction(historyTx.tx_hash, true)

                    // Classify transaction as sent or received
                    const classification = await this.classifyTransaction(txDetails, targetAddress)

                    if (classification) {
                        // Calculate proper confirmations
                        const confirmations = await this.calculateConfirmations(historyTx.height)

                        // Save transaction to database
                        const transactionData = {
                            txid: historyTx.tx_hash,
                            amount: classification.amount / 100000000, // Convert satoshis to AVN
                            address: classification.type === 'send' ? classification.toAddress : classification.toAddress,
                            fromAddress: classification.fromAddress,
                            type: classification.type,
                            timestamp: new Date(txDetails.time ? txDetails.time * 1000 : Date.now()),
                            confirmations: confirmations,
                            blockHeight: historyTx.height || undefined
                        }

                        await StorageService.saveTransaction(transactionData)
                        processedCount++

                        // Report progress after successfully processing the transaction
                        onProgress?.(processedCount, total, historyTx.tx_hash, transactionData)

                        // Update balance periodically (every 10 transactions) for large wallets
                        if (onBalanceUpdate && processedCount % 10 === 0) {
                            try {
                                const currentBalance = await this.getBalance(targetAddress)
                                onBalanceUpdate(currentBalance)
                            } catch (error) {
                                console.error('Error updating balance during processing:', error)
                            }
                        }
                    } else {
                        // Still report progress even if transaction wasn't classified
                        onProgress?.(processedCount, total, historyTx.tx_hash)
                    }
                } catch (error) {
                    console.error('Error processing transaction', historyTx.tx_hash, ':', error)
                    // Still report progress even on error to keep UI consistent
                    onProgress?.(processedCount, total, historyTx.tx_hash)
                }

                // Yield control to allow UI updates (process one transaction every 50ms)
                await new Promise(resolve => setTimeout(resolve, 50))
            }

            // Report final progress
            onProgress?.(processedCount, total)

            // Final balance update after all transactions are processed
            if (onBalanceUpdate) {
                try {
                    const finalBalance = await this.getBalance(targetAddress)
                    onBalanceUpdate(finalBalance)
                } catch (error) {
                    console.error('Error updating final balance:', error)
                }
            }

            return processedCount
        } catch (error) {
            console.error('Error in progressive transaction processing:', error)
            return 0
        }
    }
}
