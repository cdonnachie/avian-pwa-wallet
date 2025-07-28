'use client';

/**
 * NotificationTypes.ts
 *
 * Core type definitions for the Avian wallet notification system
 * Client-side only implementation for maximum privacy
 */

/**
 * Notification preferences for a wallet
 */
export interface WalletNotificationPreferences {
  walletAddress: string; // The actual wallet address
  displayName?: string; // Optional user-friendly name for this wallet
  enabled: boolean; // Whether notifications are enabled at all
  receiveTransactions: boolean; // Notify on incoming transactions
  sendTransactions: boolean; // Notify on outgoing transactions
  minValue: number; // Minimum transaction value to notify about (in AVN)
  balanceUpdates: boolean; // Notify on significant balance changes
  securityAlerts: boolean; // Notify on security-related events
  lastUpdated: number; // Timestamp of last update
}

/**
 * Record of a notification that was displayed
 */
export interface NotificationRecord {
  id: string; // Unique ID for this notification (locally generated)
  walletAddress: string; // The wallet address this notification is for
  notificationType: NotificationType; // Type of notification
  title: string; // Notification title
  message: string; // Notification body
  data?: any; // Any additional data
  read: boolean; // Whether user has read/clicked this notification
  timestamp: number; // When the notification was created
}

/**
 * Types of notifications supported by the wallet
 */
export type NotificationType =
  | 'receive'
  | 'send'
  | 'balance_update'
  | 'price_alert'
  | 'security_alert'
  | 'system';

/**
 * Data structure for tracking transaction history to avoid duplicate notifications
 */
export interface TransactionMemory {
  txid: string; // Transaction ID
  walletAddress: string; // Related wallet address
  amount: number; // Transaction amount
  type: 'incoming' | 'outgoing'; // Transaction type
  notified: boolean; // Whether user was notified about this transaction
  timestamp: number; // When the transaction was first seen
}

/**
 * Balance tracking information
 */
export interface BalanceRecord {
  walletAddress: string; // Wallet address
  balance: number; // Current balance
  lastChecked: number; // Last time the balance was checked
}

/**
 * Configuration for the notification polling service
 */
export interface NotificationServiceConfig {
  enabled: boolean; // Whether the service is enabled globally
  pollingInterval: number; // How often to check for updates (in ms)
  retryInterval: number; // How long to wait after an error before retrying
  maxRetries: number; // Maximum number of connection retries
  showDebugNotifications: boolean; // Whether to show technical/debug notifications
}

/**
 * Result of a notification operation
 */
export interface NotificationResult {
  success: boolean;
  message?: string;
  error?: string;
}
