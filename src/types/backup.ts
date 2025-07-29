export interface WalletBackup {
  version: string;
  timestamp: number;
  wallets: BackupWallet[];
  addressBook: BackupAddress[];
  settings: BackupSettings;
  metadata: BackupMetadata;
  transactions?: BackupTransaction[]; // Add transaction history
  auditLog?: BackupSecurityAudit[]; // Add security audit log
  watchedAddresses?: BackupWatchedAddress[]; // Add watched addresses
}

// Define transaction structure for backup
export interface BackupTransaction {
  txid: string;
  amount: number;
  address: string;
  fromAddress?: string;
  type: 'send' | 'receive';
  timestamp: number;
  confirmations: number;
  blockHeight?: number;
}

// Define security audit entry for backup
export interface BackupSecurityAudit {
  id: string;
  timestamp: number;
  action: string;
  details: string;
  success: boolean;
  walletAddress?: string;
}

export interface BackupWallet {
  id: number;
  name: string;
  address: string;
  privateKey: string;
  mnemonic?: string;
  isEncrypted: boolean;
  isActive: boolean;
  createdAt: number;
  lastAccessed?: number;
  biometricEnabled?: boolean; // Flag indicating if biometrics are enabled for this wallet
}

export interface BackupAddress {
  id: string;
  name: string;
  address: string;
  note?: string;
  lastUsed?: number;
  timesUsed: number;
  createdAt: number;
}

export interface BackupSettings {
  theme: string;
  currency: string;
  notifications: boolean;
  autoLock: boolean;
  lockTimeout: number;
  securitySettings?: {
    biometric: {
      enabled: boolean;
      requireForTransactions: boolean;
      requireForExports: boolean;
    };
    auditLog: {
      enabled: boolean;
      retentionDays: number;
      maxEntries: number;
    };
  };
  preferences?: Record<string, any>; // For other app preferences
}

export interface BackupMetadata {
  appVersion: string;
  platform: string;
  deviceInfo: string;
  backupType: 'full' | 'wallets-only' | 'settings-only';
}

// Define watched address structure for backup
export interface BackupWatchedAddress {
  id?: number;
  user_wallet_address: string;
  watch_address: string;
  label: string;
  notification_types?: string[];
  created_at?: number;
  balance?: number;
  script_hash?: string;
}

export interface QRChunkInfo {
  index: number;
  totalChunks: number;
  data: string;
}

export interface RestoreOptions {
  includeWallets: boolean;
  includeAddressBook: boolean;
  includeSettings: boolean;
  includeTransactions?: boolean;
  includeSecurityAudit?: boolean;
  includeWatchedAddresses?: boolean;
  overwriteExisting: boolean;
  password?: string;
}

export interface BackupValidationResult {
  isValid: boolean;
  version: string;
  walletsCount: number;
  addressesCount: number;
  hasEncryptedData: boolean;
  transactionsCount?: number;
  auditLogCount?: number;
  watchedAddressesCount?: number;
  errors: string[];
  warnings: string[];
}
