/**
 * TransactionClientService.ts
 *
 * Client-side service to handle transaction-related notifications
 *
 */

'use client';
import { NotificationType } from '../NotificationTypes';
import { notificationLogger } from '@/lib/Logger';

export interface TransactionNotification {
  type: NotificationType;
  title: string;
  body: string;
  icon?: string;
  data?: any;
}

interface TransactionData {
  txid: string;
  amount: number;
  type: 'incoming' | 'outgoing';
  confirmations: number;
}

// Using NotificationType string literals directly
export class TransactionClientService {
  // Keep track of seen transactions to avoid duplicate notifications
  private static seenTransactions = new Set<string>();

  /**
   * Format AVN amount for display
   */
  private static formatAmount(amount: number): string {
    return (amount / 100000000).toFixed(8) + ' AVN';
  }

  /**
   * Create a notification for a new incoming transaction
   */
  public static createIncomingTransactionNotification(
    tx: TransactionData,
  ): TransactionNotification {
    return {
      type: 'receive',
      title: 'New Incoming Transaction',
      body: `You received ${this.formatAmount(tx.amount)}`,
      icon: '/icons/icon-192x192.png',
      data: {
        txid: tx.txid,
        amount: tx.amount,
        type: 'incoming',
      },
    };
  }

  /**
   * Create a notification for a transaction confirmation
   */
  public static createConfirmationNotification(tx: TransactionData): TransactionNotification {
    return {
      type: tx.type === 'incoming' ? 'receive' : 'send',
      title: 'Transaction Confirmed',
      body: `Your ${tx.type === 'incoming' ? 'incoming' : 'outgoing'} transaction of ${this.formatAmount(tx.amount)} has been confirmed`,
      icon: '/icons/icon-192x192.png',
      data: {
        txid: tx.txid,
        amount: tx.amount,
        type: tx.type,
        confirmations: tx.confirmations,
      },
    };
  }

  /**
   * Create a notification for a balance update
   */
  public static createBalanceUpdateNotification(
    oldBalance: number,
    newBalance: number,
  ): TransactionNotification {
    const change = newBalance - oldBalance;
    const direction = change >= 0 ? 'increased' : 'decreased';

    return {
      type: 'balance_update',
      title: 'Wallet Balance Updated',
      body: `Your balance has ${direction} by ${this.formatAmount(Math.abs(change))}`,
      icon: '/icons/icon-192x192.png',
      data: {
        oldBalance,
        newBalance,
        change,
      },
    };
  }

  /**
   * Check for new transactions and prepare notifications
   */
  public static async checkForTransactions(
    transactions: TransactionData[],
    walletAddress?: string,
  ): Promise<TransactionNotification[]> {
    const notifications: TransactionNotification[] = [];

    // If wallet address is provided, check if notifications are enabled for this wallet
    if (walletAddress) {
      try {
        // Get notification preferences from local storage
        const { NotificationClientService } = await import('./NotificationClientService');
        const preferences =
          await NotificationClientService.getWalletNotificationPreferences(walletAddress);

        // Check if notifications are enabled for this wallet
        if (!preferences || !preferences.enabled || !preferences.receiveTransactions) {
          notificationLogger.debug(
            `Notifications disabled for wallet ${walletAddress} or transaction notifications disabled`,
          );
          return [];
        }
      } catch (error) {
        notificationLogger.error(
          'Error checking wallet notification settings from local storage:',
          error,
        );
        // Continue with notifications on error (default behavior)
      }
    }

    for (const tx of transactions) {
      // Skip if we've already seen this transaction
      if (this.seenTransactions.has(tx.txid)) {
        continue;
      }

      // Mark as seen for next time
      this.seenTransactions.add(tx.txid);

      // Create notification based on transaction type
      if (tx.type === 'incoming') {
        notifications.push(this.createIncomingTransactionNotification(tx));
      }
    }

    return notifications;
  }

  /**
   * Check for transaction confirmations
   */
  public static async checkForConfirmations(
    transactions: TransactionData[],
    walletAddress?: string,
  ): Promise<TransactionNotification[]> {
    const notifications: TransactionNotification[] = [];

    // If wallet address is provided, check if notifications are enabled for this wallet
    if (walletAddress) {
      try {
        // Get notification preferences from local storage
        const { NotificationClientService } = await import('./NotificationClientService');
        const preferences =
          await NotificationClientService.getWalletNotificationPreferences(walletAddress);

        // Check if notifications are enabled for this wallet
        if (!preferences || !preferences.enabled || !preferences.receiveTransactions) {
          notificationLogger.debug(
            `Notifications disabled for wallet ${walletAddress} or transaction notifications disabled`,
          );
          return [];
        }
      } catch (error) {
        notificationLogger.error(
          'Error checking wallet notification settings from local storage:',
          error,
        );
        // Continue with notifications on error (default behavior)
      }
    }

    for (const tx of transactions) {
      // Only notify for first confirmation (confirmations changed from 0 to 1)
      if (tx.confirmations === 1) {
        notifications.push(this.createConfirmationNotification(tx));
      }
    }

    return notifications;
  }

  /**
   * Store the last known balance to detect changes
   */
  public static saveLastKnownBalance(balance: number, walletAddress: string): void {
    try {
      // Store balances in a wallet-specific map
      const balances = JSON.parse(localStorage.getItem('lastKnownBalances') || '{}');

      balances[walletAddress] = {
        balance,
        timestamp: Date.now(),
      };

      localStorage.setItem('lastKnownBalances', JSON.stringify(balances));
    } catch (error) {
      notificationLogger.error('Error saving last known balance:', error);
    }
  }

  /**
   * Get the last known balance for a specific wallet
   */
  public static getLastKnownBalance(
    walletAddress?: string,
  ): { balance: number; timestamp: number } | null {
    try {
      // First check the new wallet-specific storage format
      const balancesStr = localStorage.getItem('lastKnownBalances');
      if (balancesStr && walletAddress) {
        const balances = JSON.parse(balancesStr);
        if (balances[walletAddress]) {
          return balances[walletAddress];
        }
      }

      // For backward compatibility, check the old global format
      const data = localStorage.getItem('lastKnownBalance');
      return data ? JSON.parse(data) : null;
    } catch (error) {
      notificationLogger.error('Error getting last known balance:', error);
      return null;
    }
  }

  /**
   * Display a transaction notification to the user
   * This integrates with the NotificationClientService to show actual notifications
   */
  public static async displayTransactionNotification(
    notification: TransactionNotification,
    walletAddress: string,
  ): Promise<boolean> {
    try {
      const { NotificationClientService } = await import('./NotificationClientService');

      // Create the notification using NotificationClientService
      const result = await NotificationClientService.createNotification(
        walletAddress,
        notification.type,
        notification.title,
        notification.body,
        notification.data,
      );

      return result.success;
    } catch (error) {
      notificationLogger.error('Error displaying transaction notification:', error);
      return false;
    }
  }
}
