import * as CryptoJS from 'crypto-js'
import { StorageService } from './StorageService'
import { WalletBackup, BackupWallet, BackupAddress, BackupSettings, BackupMetadata, RestoreOptions, BackupValidationResult } from '@/types/backup'

export class BackupService {
    private static readonly CURRENT_VERSION = '1.0.0'
    private static readonly BACKUP_MAGIC_HEADER = 'AVIAN_WALLET_BACKUP'

    /**
     * Create a full backup of all wallet data
     * 
     * Note about biometric data:
     * - Actual biometric credentials (biometricWalletPasswords, biometricCredentialId, 
     *   biometricWalletCredentials) are NOT included in backups as they are device-specific
     * - Only information about WHICH wallets had biometrics enabled is backed up
     * - Users will need to set up biometrics again after restoring on a new device
     */
    static async createFullBackup(password?: string): Promise<WalletBackup> {
        try {
            // Get all wallets
            const wallets = await StorageService.getAllWallets()
            // Note: The actual biometric credentials cannot be transferred between devices
            const backupWallets: BackupWallet[] = []
            for (const wallet of wallets) {
                let biometricEnabled = false;
                try {
                    if (wallet.address) {
                        biometricEnabled = await StorageService.isBiometricEnabledForWallet(wallet.address);
                    }
                } catch (biometricError) {
                    console.warn('Could not determine biometric status for wallet:', biometricError);
                }

                backupWallets.push({
                    id: wallet.id || 0,
                    name: wallet.name,
                    address: wallet.address,
                    privateKey: wallet.privateKey,
                    mnemonic: wallet.mnemonic,
                    isEncrypted: wallet.isEncrypted,
                    isActive: wallet.isActive,
                    createdAt: wallet.createdAt ? new Date(wallet.createdAt).getTime() : Date.now(),
                    biometricEnabled // Only used for informational purposes about which wallets had biometrics
                })
            }

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

            // Get security settings
            const allSettings = await StorageService.getSettings() || {}
            const securitySettings = allSettings.security_settings || {}

            // Get settings
            const settings: BackupSettings = {
                theme: localStorage.getItem('theme') || 'system',
                currency: localStorage.getItem('currency') || 'USD',
                notifications: localStorage.getItem('notifications') !== 'false',
                autoLock: localStorage.getItem('autoLock') === 'true',
                lockTimeout: parseInt(localStorage.getItem('lockTimeout') || '300000'),
                securitySettings: {
                    biometric: {
                        enabled: securitySettings?.biometric?.enabled || false,
                        requireForTransactions: securitySettings?.biometric?.requireForTransactions || false,
                        requireForExports: securitySettings?.biometric?.requireForExports || true
                    },
                    auditLog: {
                        enabled: securitySettings?.auditLog?.enabled || true,
                        retentionDays: securitySettings?.auditLog?.retentionDays || 30,
                        maxEntries: securitySettings?.auditLog?.maxEntries || 1000
                    }
                },
                preferences: allSettings.preferences || {}
            }

            // Get transaction history
            const transactions = await StorageService.getTransactionHistory()
            const backupTransactions = transactions.map(tx => {
                // Handle timestamp conversions safely
                let timestamp: number;
                if (tx.timestamp instanceof Date) {
                    timestamp = tx.timestamp.getTime();
                } else if (typeof tx.timestamp === 'number') {
                    timestamp = tx.timestamp;
                } else {
                    timestamp = Date.now(); // Fallback
                }

                return {
                    txid: tx.txid,
                    amount: tx.amount,
                    address: tx.address,
                    fromAddress: tx.fromAddress,
                    type: tx.type as 'send' | 'receive',
                    timestamp,
                    confirmations: tx.confirmations || 0,
                    blockHeight: tx.blockHeight
                };
            })

            // Get security audit log
            const auditLog = allSettings.security_audit_log || []
            const backupAuditLog = auditLog.map((entry: any) => {
                // Ensure each field has a fallback value if missing
                return {
                    id: entry.id || `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    timestamp: entry.timestamp || Date.now(),
                    action: entry.action || 'unknown',
                    details: entry.details || '',
                    success: typeof entry.success === 'boolean' ? entry.success : true,
                    walletAddress: entry.walletAddress || ''
                };
            })

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
                metadata,
                transactions: backupTransactions,
                auditLog: backupAuditLog
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

        // Validate transaction history
        let transactionsCount = 0
        if (Array.isArray(backup.transactions)) {
            transactionsCount = backup.transactions.length
        }

        // Validate security audit log
        let auditLogCount = 0
        if (Array.isArray(backup.auditLog)) {
            auditLogCount = backup.auditLog.length
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
            warnings,
            transactionsCount,
            auditLogCount
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
            if (options.includeTransactions && backup.transactions && backup.transactions.length > 0) totalSteps++
            if (options.includeSecurityAudit && backup.auditLog && backup.auditLog.length > 0) totalSteps++

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
                    await StorageService.createWallet({
                        name: wallet.name,
                        address: wallet.address,
                        privateKey: wallet.privateKey,
                        mnemonic: wallet.mnemonic,
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

                // Restore security settings if available
                if (backup.settings.securitySettings) {
                    const allSettings = await StorageService.getSettings() || {}
                    allSettings.security_settings = {
                        biometric: backup.settings.securitySettings.biometric,
                        auditLog: backup.settings.securitySettings.auditLog,
                        autoLock: {
                            enabled: backup.settings.autoLock,
                            timeout: backup.settings.lockTimeout,
                            biometricUnlock: backup.settings.securitySettings.biometric.enabled,
                            requirePasswordAfterTimeout: true
                        }
                    }
                    await StorageService.setSettings(allSettings)
                }

                // We can't directly restore preferences as the method is private
                // The important preferences are already handled via specific settings
                currentStep++
            }

            // Restore transaction history
            if (options.includeTransactions && backup.transactions && backup.transactions.length > 0) {
                onProgress?.('Restoring transaction history...', (currentStep / totalSteps) * 100)

                // Clear existing transactions if overwriteExisting is true
                if (options.overwriteExisting) {
                    await StorageService.clearTransactionHistory()
                }

                for (const tx of backup.transactions) {
                    await StorageService.saveTransaction({
                        txid: tx.txid,
                        amount: tx.amount,
                        address: tx.address,
                        fromAddress: tx.fromAddress,
                        type: tx.type,
                        timestamp: new Date(tx.timestamp),
                        confirmations: tx.confirmations,
                        blockHeight: tx.blockHeight
                    })
                }
                currentStep++
            }

            // Restore security audit log
            if (options.includeSecurityAudit && backup.auditLog && backup.auditLog.length > 0) {
                onProgress?.('Restoring security audit log...', (currentStep / totalSteps) * 100)

                const settings = await StorageService.getSettings() || {}
                settings.security_audit_log = backup.auditLog.map(entry => ({
                    id: entry.id,
                    timestamp: entry.timestamp,
                    action: entry.action,
                    details: entry.details,
                    success: entry.success,
                    walletAddress: entry.walletAddress
                }))
                await StorageService.setSettings(settings)
                currentStep++
            }

            // Handle biometric information
            if (options.includeWallets && backup.wallets.length > 0) {
                // Create an array of wallets that had biometrics enabled in the backup
                const walletsWithBiometrics = backup.wallets
                    .filter(wallet => wallet.biometricEnabled)
                    .map(wallet => wallet.name);

                // Store this information in settings for possible notification to the user
                if (walletsWithBiometrics.length > 0) {
                    const allSettings = await StorageService.getSettings() || {}
                    allSettings.wallets_needing_biometric_setup = walletsWithBiometrics
                    await StorageService.setSettings(allSettings)

                    console.info(
                        `The following wallets had biometrics enabled in the backup ` +
                        `and need to be set up again: ${walletsWithBiometrics.join(', ')}`
                    )
                }

                // IMPORTANT: We deliberately do NOT restore any of these biometric-specific items:
                // - biometricWalletPasswords (contains encrypted passwords unlocked by biometrics)
                // - biometricWalletCredentials (contains device-specific credential IDs)
                // - biometricCredentialId (legacy device-specific identifier)
                // - biometricWalletAddress (references specific wallet with biometrics)
                //
                // These are all device-specific and won't function correctly on a different device.
                // Users will need to set up biometrics again on the new device.
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
                lockTimeout: 300000,
                securitySettings: fullBackup.settings.securitySettings // Preserve security settings
            },
            transactions: [], // No transaction history for security
            auditLog: [], // No audit log for security
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
        transactionsCount: number
        hasAuditLog: boolean
        hasBiometricData: boolean
        backupType: string
    } {
        const encryptedWallets = backup.wallets.filter(w => w.isEncrypted)
        const walletsWithBiometrics = backup.wallets.filter(w => w.biometricEnabled)

        // Get names of wallets that had biometrics for display purposes
        let biometricInfo = '';
        if (walletsWithBiometrics.length > 0) {
            const walletNames = walletsWithBiometrics.map(w => w.name).join(', ');
            biometricInfo = `Wallets with biometrics: ${walletNames} (requires setup after restore)`;
        }

        return {
            version: backup.version,
            date: new Date(backup.timestamp).toLocaleDateString(),
            walletsCount: backup.wallets.length,
            addressesCount: backup.addressBook.length,
            hasEncryptedWallets: encryptedWallets.length > 0,
            transactionsCount: backup.transactions?.length || 0,
            hasAuditLog: (backup.auditLog?.length || 0) > 0,
            hasBiometricData: walletsWithBiometrics.length > 0, // Keep original property name
            backupType: backup.metadata.backupType
        }
    }

    /**
     * Get wallets that need biometric setup after restore
     * This helps the UI inform users which wallets previously had biometrics enabled
     * in the backup but need to be set up again on the new device
     */
    static async getWalletsNeedingBiometricSetup(): Promise<string[]> {
        try {
            const settings = await StorageService.getSettings() || {}
            return settings.wallets_needing_biometric_setup || []
        } catch (error) {
            console.error('Failed to get wallets needing biometric setup:', error)
            return []
        }
    }

    /**
     * Clear the list of wallets needing biometric setup
     * Call this after a wallet has had its biometrics set up again
     */
    static async clearWalletNeedingBiometricSetup(walletName: string): Promise<void> {
        try {
            const settings = await StorageService.getSettings() || {}
            const walletsList = settings.wallets_needing_biometric_setup || []

            if (walletsList.includes(walletName)) {
                settings.wallets_needing_biometric_setup = walletsList.filter((name: string) => name !== walletName)
                await StorageService.setSettings(settings)
            }
        } catch (error) {
            console.error('Failed to clear wallet from biometric setup list:', error)
        }
    }
}
