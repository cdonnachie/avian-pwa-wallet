export interface WalletBackup {
    version: string
    timestamp: number
    wallets: BackupWallet[]
    addressBook: BackupAddress[]
    settings: BackupSettings
    metadata: BackupMetadata
}

export interface BackupWallet {
    id: number
    name: string
    address: string
    privateKey: string
    mnemonic?: string
    isEncrypted: boolean
    isActive: boolean
    createdAt: number
}

export interface BackupAddress {
    id: string
    name: string
    address: string
    note?: string
    lastUsed?: number
    timesUsed: number
    createdAt: number
}

export interface BackupSettings {
    theme: string
    currency: string
    notifications: boolean
    autoLock: boolean
    lockTimeout: number
}

export interface BackupMetadata {
    appVersion: string
    platform: string
    deviceInfo: string
    backupType: 'full' | 'wallets-only' | 'settings-only'
}

export interface RestoreOptions {
    includeWallets: boolean
    includeAddressBook: boolean
    includeSettings: boolean
    overwriteExisting: boolean
    password?: string
}

export interface BackupValidationResult {
    isValid: boolean
    version: string
    walletsCount: number
    addressesCount: number
    hasEncryptedData: boolean
    errors: string[]
    warnings: string[]
}
