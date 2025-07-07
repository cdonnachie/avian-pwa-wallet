// Required imports
import * as CryptoJS from 'crypto-js';

interface WalletData {
    id?: number
    name: string
    address: string
    privateKey: string
    mnemonic?: string
    isEncrypted: boolean
    isActive: boolean
    createdAt: Date
    lastAccessed: Date
}

interface TransactionData {
    id?: number
    txid: string
    amount: number
    address: string // For 'send': recipient address, for 'receive': sender address
    fromAddress?: string // The wallet's own address (for filtering purposes)
    type: 'send' | 'receive'
    timestamp: Date
    confirmations: number
    blockHeight?: number
}

interface PreferenceData {
    id?: number
    key: string
    value: any
    updatedAt: Date
}

export class StorageService {
    private static dbName = 'AvianWalletDB'
    private static dbVersion = 2
    private static db: IDBDatabase | null = null

    // Initialize IndexedDB
    private static async initDB(): Promise<IDBDatabase> {
        if (this.db) {
            return this.db
        }

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion)

            request.onerror = () => {
                reject(new Error('Failed to open IndexedDB'))
            }

            request.onsuccess = () => {
                this.db = request.result
                resolve(this.db)
            }

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result
                const transaction = (event.target as IDBOpenDBRequest).transaction!

                // Wallet store
                if (!db.objectStoreNames.contains('wallets')) {
                    const walletStore = db.createObjectStore('wallets', { keyPath: 'id', autoIncrement: true })
                    walletStore.createIndex('address', 'address', { unique: true })
                    walletStore.createIndex('name', 'name', { unique: true })
                    walletStore.createIndex('isActive', 'isActive', { unique: false })
                }

                // Transactions store
                if (!db.objectStoreNames.contains('transactions')) {
                    const txStore = db.createObjectStore('transactions', { keyPath: 'id', autoIncrement: true })
                    txStore.createIndex('txid', 'txid', { unique: true })
                    txStore.createIndex('address', 'address', { unique: false })
                    txStore.createIndex('fromAddress', 'fromAddress', { unique: false })
                    txStore.createIndex('timestamp', 'timestamp', { unique: false })
                } else if (event.oldVersion < 2) {
                    // Add fromAddress index for existing transactions store
                    const txStore = transaction.objectStore('transactions')
                    if (!txStore.indexNames.contains('fromAddress')) {
                        txStore.createIndex('fromAddress', 'fromAddress', { unique: false })
                    }
                }

                // Preferences store
                if (!db.objectStoreNames.contains('preferences')) {
                    const prefStore = db.createObjectStore('preferences', { keyPath: 'id', autoIncrement: true })
                    prefStore.createIndex('key', 'key', { unique: true })
                }
            }
        })
    }

    // Generic database operations
    private static async performTransaction<T>(
        storeName: string,
        mode: IDBTransactionMode,
        operation: (store: IDBObjectStore) => IDBRequest<T>
    ): Promise<T> {
        const db = await this.initDB()
        const transaction = db.transaction([storeName], mode)
        const store = transaction.objectStore(storeName)
        const request = operation(store)

        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result)
            request.onerror = () => reject(new Error(`Database operation failed: ${request.error?.message}`))
        })
    }

    // Wallet data operations
    private static async getWalletData(): Promise<WalletData | null> {
        try {
            const wallets = await this.performTransaction('wallets', 'readonly', (store) =>
                store.getAll()
            )
            return wallets.length > 0 ? wallets[0] : null
        } catch (error) {
            console.error('Failed to get wallet data:', error)
            return null
        }
    }

    private static async saveWalletData(data: Partial<WalletData>): Promise<void> {
        try {
            const existing = await this.getWalletData()
            const walletData: WalletData = {
                ...existing,
                ...data,
                lastAccessed: new Date(),
                createdAt: existing?.createdAt || new Date()
            } as WalletData

            await this.performTransaction('wallets', 'readwrite', (store) =>
                store.put(walletData)
            )
        } catch (error) {
            console.error('Failed to save wallet data:', error)
            throw new Error('Storage operation failed')
        }
    }

    private static async clearWalletData(): Promise<void> {
        try {
            await this.performTransaction('wallets', 'readwrite', (store) =>
                store.clear()
            )
        } catch (error) {
            console.error('Failed to clear wallet data:', error)
        }
    }

    // Multi-wallet management methods
    static async createWallet(params: {
        name: string
        address: string
        privateKey: string
        mnemonic?: string
        isEncrypted?: boolean
        makeActive?: boolean
    }): Promise<WalletData> {
        try {


            // Check if wallet with same name already exists
            const existingWallets = await this.getAllWallets()
            const nameExists = existingWallets.some(w => w.name === params.name)
            if (nameExists) {
                throw new Error(`A wallet with the name "${params.name}" already exists`)
            }

            // Check if wallet with same address already exists
            if (await this.walletExists(params.address)) {
                throw new Error(`A wallet with this address already exists`)
            }

            // If making this wallet active, deactivate all others first
            if (params.makeActive !== false) {

                await this.deactivateAllWallets()
            }

            const walletData: WalletData = {
                name: params.name,
                address: params.address,
                privateKey: params.privateKey,
                mnemonic: params.mnemonic,
                isEncrypted: params.isEncrypted || false,
                isActive: params.makeActive !== false,
                createdAt: new Date(),
                lastAccessed: new Date()
            }

            const result = await this.performTransaction('wallets', 'readwrite', (store) =>
                store.add(walletData)
            )



            // Return the saved wallet with the ID
            return { ...walletData, id: result as number }
        } catch (error) {
            console.error('Failed to create wallet:', error)
            throw new Error(`Failed to create wallet: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    static async getAllWallets(): Promise<WalletData[]> {
        try {
            return await this.performTransaction('wallets', 'readonly', (store) =>
                store.getAll()
            )
        } catch (error) {
            console.error('Failed to get all wallets:', error)
            return []
        }
    }

    static async getWalletById(id: number): Promise<WalletData | null> {
        try {
            return await this.performTransaction('wallets', 'readonly', (store) =>
                store.get(id)
            ) || null
        } catch (error) {
            console.error('Failed to get wallet by id:', error)
            return null
        }
    }

    static async getWalletByName(name: string): Promise<WalletData | null> {
        try {
            return await this.performTransaction('wallets', 'readonly', (store) =>
                store.index('name').get(name)
            ) || null
        } catch (error) {
            console.error('Failed to get wallet by name:', error)
            return null
        }
    }

    static async getWalletByAddress(address: string): Promise<WalletData | null> {
        try {
            return await this.performTransaction('wallets', 'readonly', (store) =>
                store.index('address').get(address)
            ) || null
        } catch (error) {
            console.error('Failed to get wallet by address:', error)
            return null
        }
    }

    static async getActiveWallet(): Promise<WalletData | null> {
        try {
            const wallets = await this.getAllWallets()
            // Filter for active wallet since IndexedDB doesn't support boolean queries directly
            const activeWallet = wallets.find(w => w.isActive === true)
            return activeWallet || null
        } catch (error) {
            console.error('Failed to get active wallet:', error)
            return null
        }
    }

    static async switchToWallet(walletId: number): Promise<boolean> {
        try {
            const targetWallet = await this.getWalletById(walletId)
            if (!targetWallet) {
                return false
            }

            // Deactivate all wallets
            await this.deactivateAllWallets()

            // Activate the target wallet
            const updatedWallet = {
                ...targetWallet,
                isActive: true,
                lastAccessed: new Date()
            }

            await this.performTransaction('wallets', 'readwrite', (store) =>
                store.put(updatedWallet)
            )

            return true
        } catch (error) {
            console.error('Failed to switch wallet:', error)
            return false
        }
    }

    static async updateWalletName(walletId: number, newName: string): Promise<boolean> {
        try {
            const wallet = await this.getWalletById(walletId)
            if (!wallet) {
                return false
            }

            const updatedWallet = {
                ...wallet,
                name: newName,
                lastAccessed: new Date()
            }

            await this.performTransaction('wallets', 'readwrite', (store) =>
                store.put(updatedWallet)
            )

            return true
        } catch (error) {
            console.error('Failed to update wallet name:', error)
            return false
        }
    }

    static async deleteWallet(walletId: number): Promise<boolean> {
        try {
            const wallet = await this.getWalletById(walletId)
            if (!wallet) {
                return false
            }

            // Delete the wallet
            await this.performTransaction('wallets', 'readwrite', (store) =>
                store.delete(walletId)
            )

            // If this was the active wallet, activate another one if available
            if (wallet.isActive) {
                const remainingWallets = await this.getAllWallets()
                if (remainingWallets.length > 0) {
                    await this.switchToWallet(remainingWallets[0].id!)
                }
            }

            // Delete associated transaction history
            await this.clearTransactionHistoryForAddress(wallet.address)

            return true
        } catch (error) {
            console.error('Failed to delete wallet:', error)
            return false
        }
    }

    static async walletExists(address: string): Promise<boolean> {
        const wallet = await this.getWalletByAddress(address)
        return !!wallet
    }

    static async getWalletCount(): Promise<number> {
        try {
            const wallets = await this.getAllWallets()
            return wallets.length
        } catch (error) {
            console.error('Failed to get wallet count:', error)
            return 0
        }
    }

    private static async deactivateAllWallets(): Promise<void> {
        try {
            const wallets = await this.getAllWallets()
            const updatePromises = wallets.map(wallet => {
                const updatedWallet = { ...wallet, isActive: false }
                return this.performTransaction('wallets', 'readwrite', (store) =>
                    store.put(updatedWallet)
                )
            })
            await Promise.all(updatePromises)
        } catch (error) {
            console.error('Failed to deactivate all wallets:', error)
        }
    }

    static async clearTransactionHistoryForAddress(address: string): Promise<void> {
        try {
            const transactions = await this.performTransaction('transactions', 'readonly', (store) =>
                store.index('address').getAll(address)
            )

            const deletePromises = transactions.map(tx =>
                this.performTransaction('transactions', 'readwrite', (store) =>
                    store.delete(tx.id!)
                )
            )

            await Promise.all(deletePromises)
        } catch (error) {
            console.error('Failed to clear transaction history for address:', error)
        }
    }

    // Preference methods
    private static async getPreference(key: string): Promise<any> {
        try {
            const result = await this.performTransaction('preferences', 'readonly', (store) =>
                store.index('key').get(key)
            )
            return result?.value || null
        } catch (error) {
            console.error('Failed to get preference:', error)
            return null
        }
    }

    private static async setPreference(key: string, value: any): Promise<void> {
        try {
            const existing = await this.performTransaction('preferences', 'readonly', (store) =>
                store.index('key').get(key)
            )

            const prefData: PreferenceData = {
                key,
                value,
                updatedAt: new Date()
            }

            if (existing) {
                prefData.id = existing.id
            }

            await this.performTransaction('preferences', 'readwrite', (store) =>
                store.put(prefData)
            )
        } catch (error) {
            console.error('Failed to set preference:', error)
            throw new Error('Storage operation failed')
        }
    }

    // Script hash methods
    static async getScriptHash(): Promise<string> {
        return await this.getPreference('scripthash') || ''
    }

    static async setScriptHash(scriptHash: string): Promise<void> {
        await this.setPreference('scripthash', scriptHash)
    }

    // Balance methods
    static async getLastBalance(): Promise<number> {
        const balance = await this.getPreference('last_balance')
        return balance ? Number(balance) : 0
    }

    static async setLastBalance(balance: number): Promise<void> {
        await this.setPreference('last_balance', balance)
    }

    // Exchange rate methods
    static async getExchangeRate(): Promise<number> {
        const rate = await this.getPreference('exchange_rate')
        return rate ? Number(rate) : 0
    }

    static async setExchangeRate(rate: number): Promise<void> {
        await this.setPreference('exchange_rate', rate)
    }

    // Currency methods
    static async getCurrency(): Promise<string> {
        return await this.getPreference('currency') || 'USD'
    }

    static async setCurrency(currency: string): Promise<void> {
        await this.setPreference('currency', currency)
    }

    // AVN units methods
    static async getAVNUnits(): Promise<string> {
        return await this.getPreference('avn_units') || 'AVN'
    }

    static async setAVNUnits(units: string): Promise<void> {
        await this.setPreference('avn_units', units)
    }

    // Settings methods
    static async getSettings(): Promise<any> {
        const settings = await this.getPreference('settings')
        return settings ? (typeof settings === 'string' ? JSON.parse(settings) : settings) : {}
    }

    static async setSettings(settings: any): Promise<void> {
        await this.setPreference('settings', typeof settings === 'string' ? settings : JSON.stringify(settings))
    }

    // Transaction history methods
    static async saveTransaction(transaction: Omit<TransactionData, 'id'>): Promise<void> {
        try {
            // For self-transfers, we need to check if we already have a transaction with same txid AND type
            // This allows us to store both send and receive records for the same transaction
            let existingTx = null;

            // Get all transactions with this txid
            const allTransactions = await this.performTransaction('transactions', 'readonly', (store) =>
                store.index('txid').getAll(transaction.txid)
            );

            // Find one with matching type if it exists
            existingTx = allTransactions.find(tx => tx.type === transaction.type);

            if (existingTx) {
                // Update the existing transaction of this type
                const updatedTx = { ...existingTx, ...transaction }
                await this.performTransaction('transactions', 'readwrite', (store) =>
                    store.put(updatedTx)
                )
            } else {
                // Create new transaction
                await this.performTransaction('transactions', 'readwrite', (store) =>
                    store.put(transaction)
                )
            }
        } catch (error) {
            // Check if this is a uniqueness constraint error on txid
            if (error instanceof Error && error.message.includes('uniqueness requirements')) {
                console.warn('Transaction already exists with txid:', transaction.txid, '- attempting to update instead')
                try {
                    // Get all transactions with this txid
                    const allTransactions = await this.performTransaction('transactions', 'readonly', (store) =>
                        store.index('txid').getAll(transaction.txid)
                    );

                    // Find one with matching type if it exists
                    const existingTx = allTransactions.find(tx => tx.type === transaction.type);

                    if (existingTx) {
                        const updatedTx = { ...existingTx, ...transaction }
                        await this.performTransaction('transactions', 'readwrite', (store) =>
                            store.put(updatedTx)
                        )
                        return
                    } else {
                        // If no matching type exists, create a new record
                        await this.performTransaction('transactions', 'readwrite', (store) =>
                            store.put(transaction)
                        )
                        return
                    }
                } catch (updateError) {
                    console.error('Failed to update transaction after uniqueness error:', updateError)
                }
            }

            console.error('Failed to save transaction:', error)
            throw error
        }
    }

    static async getTransactionHistory(address?: string): Promise<TransactionData[]> {
        try {
            if (address) {
                // Get transactions where the address is either the recipient or sender
                const [sentTx, receivedTx] = await Promise.all([
                    this.performTransaction('transactions', 'readonly', (store) =>
                        store.index('fromAddress').getAll(address)
                    ),
                    this.performTransaction('transactions', 'readonly', (store) =>
                        store.index('address').getAll(address)
                    )
                ])

                // Combine without deduplicating by txid to preserve both send and receive records for self-transfers
                return [...sentTx, ...receivedTx]
            } else {
                return await this.performTransaction('transactions', 'readonly', (store) =>
                    store.getAll()
                )
            }
        } catch (error) {
            console.error('Failed to get transaction history:', error)
            return []
        }
    }

    static async getTransaction(txid: string, type?: 'send' | 'receive'): Promise<TransactionData | null> {
        try {
            // If type is provided, get all transactions with this txid and filter by type
            if (type) {
                const allTransactions = await this.performTransaction('transactions', 'readonly', (store) =>
                    store.index('txid').getAll(txid)
                );

                return allTransactions.find(tx => tx.type === type) || null;
            }

            // Otherwise, return the first transaction with this txid
            return await this.performTransaction('transactions', 'readonly', (store) =>
                store.index('txid').get(txid)
            ) || null
        } catch (error) {
            console.error('Failed to get transaction:', error)
            return null
        }
    }

    static async updateTransactionConfirmations(txid: string, confirmations: number): Promise<boolean> {
        try {
            // First get the transaction
            const transaction = await this.getTransaction(txid)
            if (!transaction) {
                console.warn('Transaction not found for confirmation update:', txid)
                return false
            }

            // Update the confirmations
            transaction.confirmations = confirmations

            // Save the updated transaction
            await this.performTransaction('transactions', 'readwrite', (store) =>
                store.put(transaction)
            )

            return true
        } catch (error) {
            console.error('Failed to update transaction confirmations:', error)
            return false
        }
    }

    static async clearTransactionHistory(): Promise<void> {
        try {
            await this.performTransaction('transactions', 'readwrite', (store) =>
                store.clear()
            )
        } catch (error) {
            console.error('Failed to clear transaction history:', error)
        }
    }

    // Clear all wallet data
    static async clearWallet(): Promise<void> {
        await this.clearWalletData()
        // Also clear transaction history when wallet is cleared
        try {
            await this.performTransaction('transactions', 'readwrite', (store) => store.clear())
        } catch (error) {
            console.error('Failed to clear transaction history:', error)
        }
    }

    // Backup/restore methods
    static async exportWalletData(): Promise<string> {
        const activeWallet = await this.getActiveWallet()
        const data = {
            address: activeWallet?.address || '',
            privateKey: activeWallet?.privateKey || '',
            mnemonic: activeWallet?.mnemonic || '',
            scriptHash: await this.getScriptHash(),
            isEncrypted: activeWallet?.isEncrypted || false,
            currency: await this.getCurrency(),
            avnUnits: await this.getAVNUnits(),
            settings: await this.getSettings(),
            createdAt: activeWallet?.createdAt,
            lastAccessed: activeWallet?.lastAccessed
        }

        return JSON.stringify(data)
    }

    static async importWalletData(jsonData: string): Promise<void> {
        try {
            const data = JSON.parse(jsonData)

            // Import wallet data
            const walletData: Partial<WalletData> = {}
            if (data.address) walletData.address = data.address
            if (data.privateKey) walletData.privateKey = data.privateKey
            if (data.mnemonic) walletData.mnemonic = data.mnemonic
            if (typeof data.isEncrypted === 'boolean') walletData.isEncrypted = data.isEncrypted

            if (Object.keys(walletData).length > 0) {
                // Create a new wallet from imported data
                const walletName = `Imported Wallet ${Date.now()}`
                await this.createWallet({
                    name: walletName,
                    address: data.address,
                    privateKey: data.privateKey,
                    mnemonic: data.mnemonic,
                    isEncrypted: data.isEncrypted || false,
                    makeActive: true
                })
            }

            // Import preferences
            if (data.scriptHash) await this.setScriptHash(data.scriptHash)
            if (data.currency) await this.setCurrency(data.currency)
            if (data.avnUnits) await this.setAVNUnits(data.avnUnits)
            if (data.settings) await this.setSettings(data.settings)
        } catch (error) {
            console.error('Failed to import wallet data:', error)
            throw new Error('Invalid wallet data format')
        }
    }

    // Check if wallet exists
    static async hasWallet(): Promise<boolean> {
        const activeWallet = await this.getActiveWallet()
        return !!(activeWallet?.address && activeWallet?.privateKey)
    }

    // Database maintenance
    static async getDatabaseInfo(): Promise<{ wallets: number, transactions: number, preferences: number }> {
        try {
            const walletCount = (await this.performTransaction('wallets', 'readonly', (store) =>
                store.getAll()
            )).length

            const transactionCount = (await this.performTransaction('transactions', 'readonly', (store) =>
                store.getAll()
            )).length

            const preferenceCount = (await this.performTransaction('preferences', 'readonly', (store) =>
                store.getAll()
            )).length

            return { wallets: walletCount, transactions: transactionCount, preferences: preferenceCount }
        } catch (error) {
            console.error('Failed to get database info:', error)
            return { wallets: 0, transactions: 0, preferences: 0 }
        }
    }

    // Legacy compatibility methods - work with active wallet
    static async getAddress(): Promise<string> {
        const activeWallet = await this.getActiveWallet()
        return activeWallet?.address || ''
    }

    static async setAddress(address: string): Promise<void> {
        const activeWallet = await this.getActiveWallet()
        if (activeWallet) {
            const updatedWallet = { ...activeWallet, address, lastAccessed: new Date() }
            await this.performTransaction('wallets', 'readwrite', (store) =>
                store.put(updatedWallet)
            )
        }
    }

    static async getPrivateKey(): Promise<string> {
        const activeWallet = await this.getActiveWallet()
        return activeWallet?.privateKey || ''
    }

    static async setPrivateKey(privateKey: string): Promise<void> {
        const activeWallet = await this.getActiveWallet()
        if (activeWallet) {
            const updatedWallet = { ...activeWallet, privateKey, lastAccessed: new Date() }
            await this.performTransaction('wallets', 'readwrite', (store) =>
                store.put(updatedWallet)
            )
        }
    }

    static async getMnemonic(): Promise<string> {
        const activeWallet = await this.getActiveWallet()
        return activeWallet?.mnemonic || ''
    }

    static async setMnemonic(mnemonic: string): Promise<void> {
        const activeWallet = await this.getActiveWallet()
        if (activeWallet) {
            const updatedWallet = { ...activeWallet, mnemonic, lastAccessed: new Date() }
            await this.performTransaction('wallets', 'readwrite', (store) =>
                store.put(updatedWallet)
            )
        }
    }

    static async hasMnemonic(): Promise<boolean> {
        const activeWallet = await this.getActiveWallet()
        return !!(activeWallet?.mnemonic)
    }

    static async getIsEncrypted(): Promise<boolean> {
        const activeWallet = await this.getActiveWallet()
        return activeWallet?.isEncrypted || false
    }

    static async setIsEncrypted(isEncrypted: boolean): Promise<void> {
        const activeWallet = await this.getActiveWallet()
        if (activeWallet) {
            const updatedWallet = { ...activeWallet, isEncrypted, lastAccessed: new Date() }
            await this.performTransaction('wallets', 'readwrite', (store) =>
                store.put(updatedWallet)
            )
        }
    }

    // Utility method to migrate existing transactions to include fromAddress
    static async migrateTransactionHistory(): Promise<void> {
        try {
            const db = await this.initDB()
            const transaction = db.transaction(['transactions'], 'readwrite')
            const store = transaction.objectStore('transactions')
            const request = store.getAll()

            request.onsuccess = () => {
                const transactions = request.result
                let updateCount = 0

                transactions.forEach(async (tx) => {
                    if (tx.type === 'send' && !tx.fromAddress) {
                        // For sent transactions without fromAddress, we need to find the active wallet
                        // This is a best-effort migration - in a real scenario, we'd need to store the wallet ID
                        const activeWallet = await this.getActiveWallet()
                        if (activeWallet) {
                            tx.fromAddress = activeWallet.address
                            await store.put(tx)
                            updateCount++
                        }
                    }
                })


            }
        } catch (error) {
            console.error('Failed to migrate transaction history:', error)
        }
    }

    static async removeTransaction(txid: string, address?: string): Promise<boolean> {
        try {
            // Find the transaction to delete
            const transactions = await this.performTransaction('transactions', 'readonly', (store) =>
                store.getAll()
            )

            let targetTransaction = null

            if (address) {
                // Find transaction by txid for specific address
                targetTransaction = transactions.find(tx =>
                    tx.txid === txid && (tx.address === address || tx.fromAddress === address)
                )
            } else {
                // Find transaction by txid only
                targetTransaction = transactions.find(tx => tx.txid === txid)
            }

            if (targetTransaction && targetTransaction.id) {
                await this.performTransaction('transactions', 'readwrite', (store) =>
                    store.delete(targetTransaction.id)
                )
                return true
            }

            return false
        } catch (error) {
            console.error('Failed to remove transaction:', error)
            return false
        }
    }

    // Address Book Methods
    static async getSavedAddresses(): Promise<import('../types/addressBook').SavedAddress[]> {
        try {
            const data = await this.getPreference('addressBook')
            return data?.addresses || []
        } catch (error) {
            console.error('Failed to get saved addresses:', error)
            return []
        }
    }

    static async saveAddress(address: import('../types/addressBook').SavedAddress): Promise<boolean> {
        try {
            const currentAddresses = await this.getSavedAddresses()

            // Check if address already exists
            const existingIndex = currentAddresses.findIndex(addr => addr.address === address.address)

            if (existingIndex >= 0) {
                // Update existing address
                currentAddresses[existingIndex] = { ...address, id: currentAddresses[existingIndex].id }
            } else {
                // Add new address with unique ID
                address.id = Date.now().toString() + Math.random().toString(36).substr(2, 9)
                currentAddresses.push(address)
            }

            await this.setPreference('addressBook', { addresses: currentAddresses })
            return true
        } catch (error) {
            console.error('Failed to save address:', error)
            return false
        }
    }

    static async deleteAddress(addressId: string): Promise<boolean> {
        try {
            const currentAddresses = await this.getSavedAddresses()
            const filteredAddresses = currentAddresses.filter(addr => addr.id !== addressId)

            await this.setPreference('addressBook', { addresses: filteredAddresses })
            return true
        } catch (error) {
            console.error('Failed to delete address:', error)
            return false
        }
    }

    static async updateAddressUsage(address: string): Promise<void> {
        try {
            const currentAddresses = await this.getSavedAddresses()
            const addressIndex = currentAddresses.findIndex(addr => addr.address === address)

            if (addressIndex >= 0) {
                currentAddresses[addressIndex].lastUsed = new Date()
                currentAddresses[addressIndex].useCount = (currentAddresses[addressIndex].useCount || 0) + 1
                await this.setPreference('addressBook', { addresses: currentAddresses })
            }
        } catch (error) {
            console.error('Failed to update address usage:', error)
        }
    }

    static async searchAddresses(query: string): Promise<import('../types/addressBook').SavedAddress[]> {
        try {
            const addresses = await this.getSavedAddresses()
            const lowercaseQuery = query.toLowerCase()

            return addresses.filter(addr =>
                addr.name.toLowerCase().includes(lowercaseQuery) ||
                addr.address.toLowerCase().includes(lowercaseQuery) ||
                (addr.description && addr.description.toLowerCase().includes(lowercaseQuery))
            )
        } catch (error) {
            console.error('Failed to search addresses:', error)
            return []
        }
    }

    // Biometric Authentication Storage
    static async setBiometricCredential(credentialId: number[], walletAddress?: string): Promise<void> {
        try {
            if (walletAddress) {
                // Store credential for a specific wallet
                let walletCredentials = await this.getPreference('biometricWalletCredentials') as Record<string, number[]> || {}
                walletCredentials[walletAddress] = credentialId
                await this.setPreference('biometricWalletCredentials', walletCredentials)
            }

            // Also store as the current default credential (for backwards compatibility and global usage)
            await this.setPreference('biometricCredentialId', credentialId)
        } catch (error) {
            console.error('Failed to store biometric credential:', error)
            throw error
        }
    }

    static async getBiometricCredential(walletAddress?: string): Promise<number[] | null> {
        try {
            if (walletAddress) {
                // Try to get wallet-specific credential first
                const walletCredentials = await this.getPreference('biometricWalletCredentials') as Record<string, number[]> || {}
                if (walletCredentials[walletAddress]) {
                    return walletCredentials[walletAddress]
                }
            }

            // Fall back to the default credential if no wallet-specific one found
            const result = await this.getPreference('biometricCredentialId')
            return result as number[] | null
        } catch (error) {
            console.error('Failed to retrieve biometric credential:', error)
            return null
        }
    }

    static async removeBiometricCredential(walletAddress?: string): Promise<void> {
        try {
            if (walletAddress) {
                // Remove credential for a specific wallet
                const walletCredentials = await this.getPreference('biometricWalletCredentials') as Record<string, number[]> || {}

                if (walletCredentials[walletAddress]) {
                    delete walletCredentials[walletAddress]
                    await this.setPreference('biometricWalletCredentials', walletCredentials)
                }

                // If this is the active wallet, also remove the default credential
                const activeWallet = await this.getActiveWallet()
                if (activeWallet && activeWallet.address === walletAddress) {
                    await this.removePreference('biometricCredentialId')
                }
            } else {
                // Remove all credentials
                await this.removePreference('biometricCredentialId')
                await this.removePreference('biometricWalletCredentials')
            }
        } catch (error) {
            console.error('Failed to remove biometric credential:', error)
            throw error
        }
    }

    static async setBiometricEnabled(enabled: boolean): Promise<void> {
        try {
            await this.setPreference('biometricEnabled', enabled)
        } catch (error) {
            console.error('Failed to set biometric enabled status:', error)
            throw error
        }
    }

    static async isBiometricEnabled(): Promise<boolean> {
        try {
            const result = await this.getPreference('biometricEnabled')
            return result === true
        } catch (error) {
            console.error('Failed to get biometric enabled status:', error)
            return false
        }
    }

    static async isBiometricEnabledForWallet(walletAddress: string): Promise<boolean> {
        try {
            // Check if biometrics are enabled at all
            const isEnabled = await this.isBiometricEnabled()
            if (!isEnabled) {
                return false
            }

            // Check for wallet-specific credential
            const walletCredentials = await this.getPreference('biometricWalletCredentials') as Record<string, number[]> || {}
            const hasCredential = !!walletCredentials[walletAddress]

            // Get the wallet password mappings
            const walletPasswords = await this.getPreference('biometricWalletPasswords') as Record<string, string> || {}
            const hasPassword = !!walletPasswords[walletAddress]

            // A wallet has biometrics enabled if it has both a credential and a stored password
            return hasCredential && hasPassword
        } catch (error) {
            console.error('Error checking if biometrics are enabled for wallet:', error)
            return false
        }
    }

    private static async removePreference(key: string): Promise<void> {
        try {
            const existing = await this.performTransaction('preferences', 'readonly', (store) =>
                store.index('key').get(key)
            )

            if (existing) {
                await this.performTransaction('preferences', 'readwrite', (store) =>
                    store.delete(existing.id)
                )
            }
        } catch (error) {
            console.error('Failed to remove preference:', error)
            throw error
        }
    }

    static async setEncryptedWalletPassword(secureKey: string, password: string, walletAddress: string): Promise<void> {
        try {
            // Use AES encryption to secure the password
            const encryptedPassword = CryptoJS.AES.encrypt(password, secureKey).toString()

            // Get existing wallet-password mappings or create a new one
            let walletPasswords = await this.getPreference('biometricWalletPasswords') as Record<string, string> || {}

            // Store this wallet's encrypted password
            walletPasswords[walletAddress] = encryptedPassword

            // Store the updated wallet password mappings
            await this.setPreference('biometricWalletPasswords', walletPasswords)

            // Also store the wallet address for which biometrics are set up
            await this.setPreference('biometricWalletAddress', walletAddress)
        } catch (error) {
            console.error('Failed to store encrypted wallet password:', error)
            throw error
        }
    }

    static async getEncryptedWalletPassword(secureKey: string, walletAddress: string): Promise<string | null> {
        try {
            // Get the wallet password mappings
            const walletPasswords = await this.getPreference('biometricWalletPasswords') as Record<string, string> || {}

            // Get the encrypted password for this specific wallet
            const encryptedPassword = walletPasswords[walletAddress]

            if (!encryptedPassword) {
                console.warn(`No biometric password found for wallet: ${walletAddress}`)
                return null
            }

            // Decrypt the password using the secure key
            const bytes = CryptoJS.AES.decrypt(encryptedPassword, secureKey)
            return bytes.toString(CryptoJS.enc.Utf8)
        } catch (error) {
            console.error('Failed to retrieve encrypted wallet password:', error)
            return null
        }
    }

    static async removeEncryptedWalletPassword(walletAddress?: string): Promise<void> {
        try {
            if (walletAddress) {
                // Remove password for a specific wallet
                const walletPasswords = await this.getPreference('biometricWalletPasswords') as Record<string, string> || {}

                if (walletPasswords[walletAddress]) {
                    delete walletPasswords[walletAddress]
                    await this.setPreference('biometricWalletPasswords', walletPasswords)
                }

                // If this was the current biometric wallet, remove that reference
                const currentBiometricWallet = await this.getPreference('biometricWalletAddress') as string
                if (currentBiometricWallet === walletAddress) {
                    await this.removePreference('biometricWalletAddress')
                }
            } else {
                // Remove all wallet passwords
                await this.removePreference('biometricWalletPasswords')
                await this.removePreference('biometricWalletAddress')
            }
        } catch (error) {
            console.error('Failed to remove encrypted wallet password:', error)
            throw error
        }
    }
}
