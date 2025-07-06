import * as CryptoJS from 'crypto-js'
import { StorageService } from './StorageService'
import { WalletBackup, BackupWallet, BackupAddress, BackupSettings, BackupMetadata, RestoreOptions, BackupValidationResult } from '@/types/backup'

export class BackupService {
    private static readonly CURRENT_VERSION = '1.0.0'
    private static readonly BACKUP_MAGIC_HEADER = 'AVIAN_WALLET_BACKUP'

    /**
     * Create a full backup of all wallet data
     */
    static async createFullBackup(password?: string): Promise<WalletBackup> {
        try {
            // Get all wallets
            const wallets = await StorageService.getAllWallets()
            const backupWallets: BackupWallet[] = wallets.map(wallet => ({
                id: wallet.id || 0,
                name: wallet.name,
                address: wallet.address,
                privateKey: wallet.privateKey,
                mnemonic: wallet.mnemonic,
                isEncrypted: wallet.isEncrypted,
                isActive: wallet.isActive,
                createdAt: wallet.createdAt ? new Date(wallet.createdAt).getTime() : Date.now()
            }))

            // Get address book
            const addressBook = await StorageService.getSavedAddresses()
            const backupAddresses: BackupAddress[] = addressBook.map((addr: any) => ({
                id: addr.id,
                name: addr.name,
                address: addr.address,
                note: addr.description,
                lastUsed: addr.lastUsed ? new Date(addr.lastUsed).getTime() : undefined,
                timesUsed: addr.useCount || 0,
                createdAt: addr.dateAdded ? new Date(addr.dateAdded).getTime() : Date.now()
            }))

            // Get settings
            const settings: BackupSettings = {
                theme: localStorage.getItem('theme') || 'system',
                currency: localStorage.getItem('currency') || 'USD',
                notifications: localStorage.getItem('notifications') !== 'false',
                autoLock: localStorage.getItem('autoLock') === 'true',
                lockTimeout: parseInt(localStorage.getItem('lockTimeout') || '300000')
            }

            // Create metadata
            const metadata: BackupMetadata = {
                appVersion: '1.0.0', // Should come from package.json
                platform: typeof window !== 'undefined' ? window.navigator.platform : 'unknown',
                deviceInfo: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
                backupType: 'full'
            }

            const backup: WalletBackup = {
                version: this.CURRENT_VERSION,
                timestamp: Date.now(),
                wallets: backupWallets,
                addressBook: backupAddresses,
                settings,
                metadata
            }

            return backup
        } catch (error) {
            console.error('Error creating backup:', error)
            throw new Error('Failed to create backup')
        }
    }

    /**
     * Export backup as encrypted JSON file
     */
    static async exportBackup(backup: WalletBackup, password?: string): Promise<Blob> {
        try {
            let backupData = JSON.stringify(backup, null, 2)

            if (password) {
                // Encrypt the backup data
                backupData = CryptoJS.AES.encrypt(backupData, password).toString()
            }

            // Add magic header for file identification
            const fileContent = `${this.BACKUP_MAGIC_HEADER}\n${backupData}`

            return new Blob([fileContent], { type: 'application/json' })
        } catch (error) {
            console.error('Error exporting backup:', error)
            throw new Error('Failed to export backup')
        }
    }

    /**
     * Download backup file
     */
    static downloadBackup(blob: Blob, filename?: string): void {
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = filename || `avian-wallet-backup-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
    }

    /**
     * Parse and validate backup file
     */
    static async parseBackupFile(file: File, password?: string): Promise<{ backup: WalletBackup; validation: BackupValidationResult }> {
        try {
            const fileContent = await file.text()

            // Check for magic header
            if (!fileContent.startsWith(this.BACKUP_MAGIC_HEADER)) {
                throw new Error('Invalid backup file format')
            }

            // Remove magic header
            let backupData = fileContent.replace(`${this.BACKUP_MAGIC_HEADER}\n`, '')

            // Check if the data appears to be encrypted (if it doesn't start with '{' it's likely encrypted)
            const isEncrypted = !backupData.trim().startsWith('{')

            if (isEncrypted && !password) {
                throw new Error('ENCRYPTED_BACKUP_NO_PASSWORD')
            }

            // Try to decrypt if password provided or if data appears encrypted
            if (password || isEncrypted) {
                try {
                    const decrypted = CryptoJS.AES.decrypt(backupData, password || '').toString(CryptoJS.enc.Utf8)
                    if (!decrypted) {
                        throw new Error('Invalid password')
                    }
                    backupData = decrypted
                } catch (decryptError) {
                    throw new Error('Failed to decrypt backup - invalid password')
                }
            }

            // Parse JSON
            const backup: WalletBackup = JSON.parse(backupData)

            // Validate backup
            const validation = this.validateBackup(backup)

            return { backup, validation }
        } catch (error) {
            console.error('Error parsing backup file:', error)

            // Re-throw specific encryption errors
            if (error instanceof Error && error.message === 'ENCRYPTED_BACKUP_NO_PASSWORD') {
                throw new Error('This backup file is encrypted. Please provide a password to decrypt it.')
            }

            throw new Error(`Failed to parse backup file: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    /**
     * Validate backup structure and data
     */
    static validateBackup(backup: any): BackupValidationResult {
        const errors: string[] = []
        const warnings: string[] = []

        // Check required fields
        if (!backup.version) errors.push('Missing backup version')
        if (!backup.timestamp) errors.push('Missing backup timestamp')
        if (!backup.wallets) errors.push('Missing wallets data')
        if (!backup.metadata) errors.push('Missing metadata')

        // Check version compatibility
        if (backup.version !== this.CURRENT_VERSION) {
            warnings.push(`Backup version ${backup.version} may not be fully compatible with current version ${this.CURRENT_VERSION}`)
        }

        // Validate wallets
        let walletsCount = 0
        let hasEncryptedData = false

        if (Array.isArray(backup.wallets)) {
            walletsCount = backup.wallets.length

            backup.wallets.forEach((wallet: any, index: number) => {
                if (!wallet.address) errors.push(`Wallet ${index + 1}: Missing address`)
                if (!wallet.privateKey) errors.push(`Wallet ${index + 1}: Missing private key`)
                if (wallet.isEncrypted) hasEncryptedData = true
            })
        }

        // Validate address book
        let addressesCount = 0
        if (Array.isArray(backup.addressBook)) {
            addressesCount = backup.addressBook.length
        }

        // Check timestamp validity
        if (backup.timestamp && backup.timestamp > Date.now()) {
            warnings.push('Backup timestamp is in the future')
        }

        return {
            isValid: errors.length === 0,
            version: backup.version || 'unknown',
            walletsCount,
            addressesCount,
            hasEncryptedData,
            errors,
            warnings
        }
    }

    /**
     * Restore from backup
     */
    static async restoreFromBackup(
        backup: WalletBackup,
        options: RestoreOptions,
        onProgress?: (step: string, progress: number) => void
    ): Promise<void> {
        try {
            let totalSteps = 0
            let currentStep = 0

            // Count total steps
            if (options.includeWallets && backup.wallets.length > 0) totalSteps++
            if (options.includeAddressBook && backup.addressBook.length > 0) totalSteps++
            if (options.includeSettings) totalSteps++

            // Restore wallets
            if (options.includeWallets && backup.wallets.length > 0) {
                onProgress?.('Restoring wallets...', (currentStep / totalSteps) * 100)

                for (const wallet of backup.wallets) {
                    // Check if wallet already exists
                    if (!options.overwriteExisting && await StorageService.walletExists(wallet.address)) {
                        console.warn(`Wallet ${wallet.name} already exists, skipping`)
                        continue
                    }

                    // Create or update wallet
                    // Note: For encrypted wallets, privateKey and mnemonic are already encrypted
                    // and should be stored as-is. The user will decrypt them when accessing the wallet.
                    await StorageService.createWallet({
                        name: wallet.name,
                        address: wallet.address,
                        privateKey: wallet.privateKey, // Already encrypted if wallet.isEncrypted is true
                        mnemonic: wallet.mnemonic, // Already encrypted if wallet.isEncrypted is true
                        isEncrypted: wallet.isEncrypted,
                        makeActive: wallet.isActive
                    })
                }
                currentStep++
            }

            // Restore address book
            if (options.includeAddressBook && backup.addressBook.length > 0) {
                onProgress?.('Restoring address book...', (currentStep / totalSteps) * 100)

                for (const address of backup.addressBook) {
                    await StorageService.saveAddress({
                        id: address.id,
                        name: address.name,
                        address: address.address,
                        description: address.note,
                        dateAdded: new Date(address.createdAt),
                        lastUsed: address.lastUsed ? new Date(address.lastUsed) : undefined,
                        useCount: address.timesUsed
                    })
                }
                currentStep++
            }

            // Restore settings
            if (options.includeSettings) {
                onProgress?.('Restoring settings...', (currentStep / totalSteps) * 100)

                if (backup.settings.theme) {
                    localStorage.setItem('theme', backup.settings.theme)
                }
                if (backup.settings.currency) {
                    localStorage.setItem('currency', backup.settings.currency)
                }
                localStorage.setItem('notifications', backup.settings.notifications.toString())
                localStorage.setItem('autoLock', backup.settings.autoLock.toString())
                localStorage.setItem('lockTimeout', backup.settings.lockTimeout.toString())
                currentStep++
            }

            onProgress?.('Restore completed!', 100)
        } catch (error) {
            console.error('Error restoring backup:', error)
            throw new Error(`Failed to restore backup: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    /**
     * Create wallets-only backup (for security-focused users)
     */
    static async createWalletsOnlyBackup(password?: string): Promise<WalletBackup> {
        const fullBackup = await this.createFullBackup(password)

        return {
            ...fullBackup,
            addressBook: [], // Empty address book for security
            settings: {
                theme: 'system',
                currency: 'USD',
                notifications: true,
                autoLock: false,
                lockTimeout: 300000
            },
            metadata: {
                ...fullBackup.metadata,
                backupType: 'wallets-only'
            }
        }
    }

    /**
     * Verify backup integrity
     */
    static async verifyBackupIntegrity(backup: WalletBackup): Promise<boolean> {
        try {
            // Check if all wallets have valid addresses and private keys
            for (const wallet of backup.wallets) {
                if (!wallet.address || !wallet.privateKey) {
                    return false
                }

                // Additional validation could include:
                // - Verify private key format
                // - Verify address derives from private key
                // - Check mnemonic validity if present
            }

            return true
        } catch (error) {
            console.error('Error verifying backup integrity:', error)
            return false
        }
    }

    /**
     * Get backup summary for display
     */
    static getBackupSummary(backup: WalletBackup): {
        version: string
        date: string
        walletsCount: number
        addressesCount: number
        hasEncryptedWallets: boolean
        backupType: string
    } {
        const encryptedWallets = backup.wallets.filter(w => w.isEncrypted)

        return {
            version: backup.version,
            date: new Date(backup.timestamp).toLocaleDateString(),
            walletsCount: backup.wallets.length,
            addressesCount: backup.addressBook.length,
            hasEncryptedWallets: encryptedWallets.length > 0,
            backupType: backup.metadata.backupType
        }
    }
}
