/**
 * NotificationClientService.ts
 *
 * Client-side operations for notifications
 * This file is responsible for browser-specific operations like:
 * - Requesting permission
 * - Registering service worker
 * - Managing local notifications
 * - Managing local storage of settings and notification history
 */
'use client';
import { StorageService } from '../../../services/core/StorageService';
import { notificationLogger } from '@/lib/Logger';
import {
  NotificationRecord,
  NotificationType,
  WalletNotificationPreferences,
  TransactionMemory,
  BalanceRecord,
  NotificationResult,
} from '../NotificationTypes';

export interface NotificationSettings {
  enabled: boolean;
  transactions: boolean;
  balance: boolean;
  security: boolean;
  priceAlerts?: boolean;
  lastChecked?: number;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: false,
  transactions: true,
  balance: true,
  security: true,
  priceAlerts: true,
  lastChecked: Date.now(),
};

export class NotificationClientService {
  /**
   * Check if notifications are supported in this browser
   */
  static isSupported(): boolean {
    return 'serviceWorker' in navigator && 'Notification' in window;
  }

  static isNotificationSupported(): boolean {
    return this.isSupported();
  }

  /**
   * Check if notifications are enabled for a specific wallet
   */
  static async isWalletNotificationEnabled(walletAddress: string): Promise<boolean> {
    try {
      // Get wallet preferences from local storage
      const preferences = await this.getWalletNotificationPreferences(walletAddress);
      return preferences ? preferences.enabled : false;
    } catch (error) {
      notificationLogger.error('Error checking wallet notification settings:', error);
    }

    // Default to false for privacy-focused approach (explicit opt-in required)
    return false;
  }

  /**
   * Get notification preferences for a specific wallet from local storage
   */
  static async getWalletNotificationPreferences(
    walletAddress: string,
  ): Promise<WalletNotificationPreferences | null> {
    try {
      // Use StorageService to get wallet-specific preferences
      const key = `wallet_notifications_${walletAddress}`;
      const prefsString = localStorage.getItem(key);

      if (prefsString) {
        return JSON.parse(prefsString);
      }
    } catch (error) {
      notificationLogger.error(
        `Error getting notification preferences for wallet ${walletAddress}:`,
        error,
      );
    }

    // Return null if no preferences found
    return null;
  }

  /**
   * Save notification preferences for a specific wallet to local storage
   */
  static async saveWalletNotificationPreferences(
    walletAddress: string,
    preferences: Partial<WalletNotificationPreferences>,
  ): Promise<boolean> {
    try {
      // Get existing preferences or create default
      const existing = (await this.getWalletNotificationPreferences(walletAddress)) || {
        walletAddress,
        enabled: false,
        receiveTransactions: true,
        sendTransactions: true,
        minValue: 0,
        balanceUpdates: true,
        securityAlerts: true,
        lastUpdated: Date.now(),
      };

      // Merge with new preferences
      const updated = {
        ...existing,
        ...preferences,
        lastUpdated: Date.now(),
      };

      // Save to local storage
      const key = `wallet_notifications_${walletAddress}`;
      localStorage.setItem(key, JSON.stringify(updated));

      return true;
    } catch (error) {
      notificationLogger.error(
        `Error saving notification preferences for wallet ${walletAddress}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Get global notification settings from local storage
   */
  static getNotificationSettings(): NotificationSettings {
    try {
      const settingsString = localStorage.getItem('notification_settings');
      if (settingsString) {
        return JSON.parse(settingsString);
      }
    } catch (error) {
      notificationLogger.error('Error getting notification settings:', error);
    }

    // Return default settings
    return DEFAULT_SETTINGS;
  }

  /**
   * Create a local notification for a specific wallet
   */
  static async createNotification(
    walletAddress: string,
    type: NotificationType,
    title: string,
    message: string,
    data?: any,
  ): Promise<NotificationResult> {
    try {
      // Check if notifications are supported and permission is granted
      if (!('Notification' in window) || Notification.permission !== 'granted') {
        return {
          success: false,
          error: 'Notifications not supported or permission not granted',
        };
      }

      // Check if this wallet has notifications enabled
      const walletPrefs = await this.getWalletNotificationPreferences(walletAddress);
      if (!walletPrefs || !walletPrefs.enabled) {
        return {
          success: false,
          error: 'Notifications not enabled for this wallet',
        };
      }

      // Check notification type against preferences
      if (
        (type === 'receive' && !walletPrefs.receiveTransactions) ||
        (type === 'send' && !walletPrefs.sendTransactions) ||
        (type === 'balance_update' && !walletPrefs.balanceUpdates) ||
        (type === 'security_alert' && !walletPrefs.securityAlerts)
      ) {
        return {
          success: false,
          error: `Notifications of type ${type} are disabled for this wallet`,
        };
      }

      // Create the notification record
      const notification: NotificationRecord = {
        id: crypto.randomUUID(), // Generate unique ID
        walletAddress,
        notificationType: type,
        title,
        message,
        data,
        read: false,
        timestamp: Date.now(),
      };

      // Save to history
      await this.saveNotificationToHistory(notification);

      // Show the actual browser notification
      new Notification(title, {
        body: message,
        icon: '/icons/icon-192x192.png',
        tag: notification.id,
        data: {
          walletAddress,
          notificationType: type,
          ...data,
        },
      });

      return {
        success: true,
        message: 'Notification created successfully',
      };
    } catch (error) {
      notificationLogger.error('Error creating notification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Save a notification to local history
   */
  private static async saveNotificationToHistory(notification: NotificationRecord): Promise<void> {
    try {
      // Get existing notifications
      const history = await this.getNotificationHistory();

      // Add new notification at the beginning
      history.unshift(notification);

      // Limit history to 100 items to prevent storage bloat
      if (history.length > 100) {
        history.length = 100;
      }

      // Save back to storage
      localStorage.setItem('notification_history', JSON.stringify(history));
    } catch (error) {
      notificationLogger.error('Error saving notification to history:', error);
    }
  }

  /**
   * Get notification history from local storage
   */
  static async getNotificationHistory(): Promise<NotificationRecord[]> {
    try {
      const historyString = localStorage.getItem('notification_history');
      return historyString ? JSON.parse(historyString) : [];
    } catch (error) {
      notificationLogger.error('Error getting notification history:', error);
      return [];
    }
  }

  /**
   * Set up the client-side notification system
   */
  static setupLocalNotificationSystem(): void {
    // Initialize storage if needed
    if (!localStorage.getItem('notification_history')) {
      localStorage.setItem('notification_history', JSON.stringify([]));
    }

    if (!localStorage.getItem('notification_settings')) {
      localStorage.setItem('notification_settings', JSON.stringify(DEFAULT_SETTINGS));
    }

    // Initialize the last active wallet tracking if needed
    if (!localStorage.getItem('last_active_wallet')) {
      // We'll initialize this with the current active wallet when it's loaded
      // For now, set to empty string to indicate it's not set yet
      localStorage.setItem('last_active_wallet', '');

      // Try to get the active wallet and set it
      import('@/services/core/StorageService')
        .then(({ StorageService }) => {
          StorageService.getActiveWallet().then((wallet) => {
            if (wallet && wallet.address) {
              localStorage.setItem('last_active_wallet', wallet.address);
              notificationLogger.debug(`Initialized last_active_wallet to ${wallet.address}`);
            }
          });
        })
        .catch((err) => {
          notificationLogger.error('Failed to initialize last_active_wallet:', err);
        });
    }

    // Clear any stale wallet switch flags (might happen on page reload)
    if (localStorage.getItem('wallet_switch_in_progress') === 'true') {
      notificationLogger.debug('Clearing stale wallet_switch_in_progress flag on startup');
      localStorage.removeItem('wallet_switch_in_progress');
      localStorage.removeItem('wallet_switch_timestamp');
    }

    // Initialize previous wallet tracking if needed
    if (!localStorage.getItem('previous_wallet_address')) {
      // We'll initialize this when the first wallet is loaded
      localStorage.setItem('previous_wallet_address', '');
      notificationLogger.debug('Initialized previous_wallet_address tracking');
    }

    // Log this setup
    notificationLogger.info('Setting up local notification system');
  }

  /**
   * Save global notification settings to local storage
   */
  static saveNotificationSettings(settings: Partial<NotificationSettings>): boolean {
    try {
      // Get existing settings
      const current = this.getNotificationSettings();

      // Merge with new settings
      const updated = {
        ...current,
        ...settings,
      };

      // Save to storage
      localStorage.setItem('notification_settings', JSON.stringify(updated));
      return true;
    } catch (error) {
      notificationLogger.error('Error saving notification settings:', error);
      return false;
    }
  }

  /**
   * Request notification permission from the user
   */
  static async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      notificationLogger.warn('Notifications not supported in this browser');
      return 'denied';
    }

    // Check if permission is already granted
    if (Notification.permission === 'granted') {
      return 'granted';
    }

    // Request permission
    try {
      const permission = await Notification.requestPermission();

      // Update global settings if permission was granted
      if (permission === 'granted') {
        this.saveNotificationSettings({ enabled: true });
      }

      return permission;
    } catch (error) {
      notificationLogger.error('Error requesting notification permission:', error);
      return 'denied';
    }
  }

  /**
   * Get the current service worker registration
   */
  static async getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) {
      notificationLogger.error('Service worker not supported in this browser');
      return null;
    }

    try {
      // Check for existing registration
      const registrations = await navigator.serviceWorker.getRegistrations();
      if (registrations.length > 0) {
        // Find a service worker that's active and controls this page
        const activeRegistration = registrations.find(
          (reg) =>
            reg.active &&
            navigator.serviceWorker.controller &&
            navigator.serviceWorker.controller.scriptURL === reg.active.scriptURL,
        );

        if (activeRegistration) {
          notificationLogger.debug('Found active service worker registration');
          return activeRegistration;
        }

        // If no active controller found but we have registrations, use the first one
        if (registrations[0].active) {
          notificationLogger.debug('Using existing service worker registration');
          return registrations[0];
        }
      }

      // Register our notification service worker if no suitable one found
      try {
        notificationLogger.debug('Registering notification service worker');
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });
        return registration;
      } catch (regError) {
        notificationLogger.error('Failed to register service worker:', regError);
        return null;
      }
    } catch (error) {
      notificationLogger.error('Error getting service worker registration:', error);
      return null;
    }
  }

  /**
   * Verify and diagnose service worker status
   * This helps identify issues with the service worker that might affect notifications
   */
  static async verifyServiceWorker(): Promise<boolean> {
    if (!('serviceWorker' in navigator)) {
      notificationLogger.error('Service Worker API not available in this browser');
      return false;
    }

    try {
      const registrations = await navigator.serviceWorker.getRegistrations();

      if (registrations.length === 0) {
        notificationLogger.debug('No service workers registered - registering new one');

        // Try to register our service worker
        try {
          await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
          });
          notificationLogger.debug('Service worker registered successfully');
          return true;
        } catch (regError) {
          notificationLogger.error('Failed to register service worker:', regError);
          return false;
        }
      }

      // Log all registered service workers
      registrations.forEach((registration, index) => {
        const scope = registration.scope;
        const state = registration.active
          ? 'active'
          : registration.installing
            ? 'installing'
            : registration.waiting
              ? 'waiting'
              : 'unknown';

        notificationLogger.debug(
          `Service Worker ${index + 1}/${registrations.length}: ${state} (scope: ${scope})`,
        );
      });

      return true;
    } catch (error) {
      notificationLogger.error('Error verifying service worker:', error);
      return false;
    }
  }

  /**
   * Enable notifications for a specific wallet
   * This is the main entry point for setting up notifications for a wallet
   */
  static async enableWalletNotifications(
    walletAddress: string,
    preferences?: Partial<WalletNotificationPreferences>,
  ): Promise<boolean> {
    try {
      // Request notification permission if needed
      const permission = await this.requestPermission();
      if (permission !== 'granted') {
        notificationLogger.warn('Notification permission not granted');
        return false;
      }

      // Verify service worker
      await this.verifyServiceWorker();

      // Create or update wallet notification preferences
      const basePrefs: WalletNotificationPreferences = {
        walletAddress,
        enabled: true,
        receiveTransactions: true,
        sendTransactions: true,
        minValue: 0,
        balanceUpdates: true,
        securityAlerts: true,
        lastUpdated: Date.now(),
      };

      // Save preferences with any overrides
      const saved = await this.saveWalletNotificationPreferences(walletAddress, {
        ...basePrefs,
        ...preferences,
      });

      if (!saved) {
        notificationLogger.error('Failed to save wallet notification preferences');
        return false;
      }

      // Enable global notifications if not already enabled
      const globalSettings = this.getNotificationSettings();
      if (!globalSettings.enabled) {
        this.saveNotificationSettings({ enabled: true });
      }

      // Send a test notification
      await this.createNotification(
        walletAddress,
        'system',
        'Notifications Enabled',
        'You will now receive notifications for this wallet',
      );

      return true;
    } catch (error) {
      notificationLogger.error('Error enabling wallet notifications:', error);
      return false;
    }
  }

  /**
   * Disable notifications for a specific wallet
   */
  static async disableWalletNotifications(walletAddress: string): Promise<boolean> {
    try {
      // Update wallet preferences to disable notifications
      const saved = await this.saveWalletNotificationPreferences(walletAddress, { enabled: false });

      return saved;
    } catch (error) {
      notificationLogger.error('Error disabling wallet notifications:', error);
      return false;
    }
  }

  /**
   * Get notification settings from local storage
   */
  static async getSettings(): Promise<NotificationSettings> {
    try {
      const settings = await StorageService.getSettings();
      if (!settings) return DEFAULT_SETTINGS;

      const parsedSettings = JSON.parse(settings);
      return {
        ...DEFAULT_SETTINGS,
        ...parsedSettings.notifications,
      };
    } catch (error) {
      notificationLogger.error('Failed to get notification settings', error);
      return DEFAULT_SETTINGS;
    }
  }

  /**
   * Save notification settings to local storage
   */
  static async saveSettings(settings: NotificationSettings): Promise<void> {
    try {
      const currentSettings = await StorageService.getSettings();
      const parsedSettings = currentSettings ? JSON.parse(currentSettings) : {};

      await StorageService.setSettings(
        JSON.stringify({
          ...parsedSettings,
          notifications: settings,
        }),
      );
    } catch (error) {
      notificationLogger.error('Failed to save notification settings', error);
      throw error;
    }
  }

  /**
   * Update specific notification settings
   */
  static async updateSettings(updates: Partial<NotificationSettings>): Promise<void> {
    const currentSettings = await this.getSettings();
    await this.saveSettings({
      ...currentSettings,
      ...updates,
    });
  }

  /**
   * Display a test notification
   */
  static async displayTestNotification(): Promise<boolean> {
    if (!this.isSupported() || Notification.permission !== 'granted') {
      return false;
    }

    try {
      const registration = await this.getServiceWorkerRegistration();
      if (!registration) return false;

      notificationLogger.debug('Sending high-priority test notification');

      await registration.showNotification('Avian FlightDeck Test', {
        body: 'Notifications are working correctly!',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        // @ts-ignore - vibrate is a standard option but TypeScript doesn't recognize it
        vibrate: [300, 200, 300, 200, 300],
        tag: 'avian-test-notification',
        // @ts-ignore - renotify forces notification even if tag exists
        renotify: true,
        // @ts-ignore - priority is supported in some browsers but not in TypeScript
        priority: 2, // Max priority (0 = default, 2 = max)
        // @ts-ignore - silent option to ensure notification is not silent
        silent: false,
        // @ts-ignore - requireInteraction keeps notification visible until user interacts
        requireInteraction: true,
        actions: [
          {
            action: 'view',
            title: 'View App',
          },
        ],
        data: {
          importance: 'critical',
          test: true,
          timestamp: Date.now(),
        },
      });

      return true;
    } catch (error) {
      notificationLogger.error('Error showing test notification:', error);
      return false;
    }
  }

  /**
   * Get notification settings for multiple wallets
   * Returns a map of wallet addresses to their notification enabled status
   * This implementation uses local storage instead of the server API
   */
  static async getMultipleWalletNotificationSettings(
    walletAddresses: string[],
  ): Promise<{ [address: string]: boolean }> {
    const result: { [address: string]: boolean } = {};

    if (!walletAddresses || walletAddresses.length === 0) {
      return result;
    }

    try {
      // Process wallets in parallel for better performance
      const settingsPromises = walletAddresses.map(async (address) => {
        try {
          // Get wallet preferences from local storage
          const preferences = await this.getWalletNotificationPreferences(address);

          // Explicitly convert to boolean to prevent truthy/falsy confusion
          const isEnabled = preferences?.enabled === true;

          notificationLogger.debug(
            `Notification settings for wallet ${address}: ${isEnabled ? 'enabled' : 'disabled'}`,
          );

          return { address, enabled: isEnabled };
        } catch (error) {
          notificationLogger.error(
            `Error getting notification preferences for wallet ${address}:`,
            error,
          );
          return { address, enabled: false }; // Default to false on error
        }
      });

      const settingsResults = await Promise.all(settingsPromises);

      // Convert array of results to map with strict boolean values
      settingsResults.forEach((item) => {
        result[item.address] = item.enabled === true;
      });
    } catch (error) {
      notificationLogger.error('Error getting multiple wallet notification settings:', error);
      // Set all wallets to disabled by default on error for privacy/security
      walletAddresses.forEach((address) => {
        result[address] = false;
      });
    }

    return result;
  }

  /**
   * Set whether notifications are enabled for a specific wallet
   * This method now uses local storage instead of server API
   */
  static async setWalletNotificationEnabled(
    walletAddress: string,
    enabled: boolean,
  ): Promise<boolean> {
    try {
      // Update preferences using the local storage method
      return this.saveWalletNotificationPreferences(walletAddress, { enabled });
    } catch (error) {
      notificationLogger.error('Error setting wallet notification settings:', error);
      return false;
    }
  }

  /**
   * Update all notification settings for a specific wallet
   * This method now uses local storage instead of server API
   */
  static async updateWalletNotificationSettings(
    walletAddress: string,
    settings: {
      enabled?: boolean;
      receiveTransactions?: boolean;
      sendTransactions?: boolean;
      balanceUpdates?: boolean;
      securityAlerts?: boolean;
      minValue?: number;
    },
  ): Promise<boolean> {
    try {
      // The settings format already matches our new WalletNotificationPreferences
      const mappedSettings: Partial<WalletNotificationPreferences> = {
        enabled: settings.enabled,
        receiveTransactions: settings.receiveTransactions,
        sendTransactions: settings.sendTransactions,
        balanceUpdates: settings.balanceUpdates,
        securityAlerts: settings.securityAlerts,
        minValue: settings.minValue,
      };

      // Update preferences using the local storage method
      return this.saveWalletNotificationPreferences(walletAddress, mappedSettings);
    } catch (error) {
      notificationLogger.error('Error updating wallet notification settings:', error);
      return false;
    }
  }

  /**
   * Check if transaction notifications should be sent
   * Used to determine whether to create a notification for a new transaction
   */
  static async shouldNotifyForTransaction(
    walletAddress: string,
    txid: string,
    amount: number,
    type: 'incoming' | 'outgoing',
  ): Promise<boolean> {
    try {
      // Get wallet notification preferences
      const prefs = await this.getWalletNotificationPreferences(walletAddress);
      if (!prefs || !prefs.enabled) {
        return false;
      }

      // Check transaction type against preferences
      if (
        (type === 'incoming' && !prefs.receiveTransactions) ||
        (type === 'outgoing' && !prefs.sendTransactions)
      ) {
        return false;
      }

      // Check transaction amount against minimum value
      if (Math.abs(amount) < prefs.minValue) {
        return false;
      }

      // Check if we've already notified about this transaction
      const seen = await this.getSeenTransactions();
      if (seen.some((tx) => tx.txid === txid && tx.notified)) {
        return false;
      }

      return true;
    } catch (error) {
      notificationLogger.error('Error checking if transaction notification should be sent:', error);
      return false;
    }
  }

  /**
   * Record a seen transaction to prevent duplicate notifications
   */
  static async recordSeenTransaction(
    txid: string,
    walletAddress: string,
    amount: number,
    type: 'incoming' | 'outgoing',
    notified: boolean = true,
  ): Promise<void> {
    try {
      // Get existing seen transactions
      const seen = await this.getSeenTransactions();

      // Add new transaction if not already present
      if (!seen.some((tx) => tx.txid === txid)) {
        seen.push({
          txid,
          walletAddress,
          amount,
          type,
          notified,
          timestamp: Date.now(),
        });

        // Limit to 100 transactions to prevent storage bloat
        if (seen.length > 100) {
          seen.shift();
        }

        // Save back to storage
        localStorage.setItem('seen_transactions', JSON.stringify(seen));
      }
    } catch (error) {
      notificationLogger.error('Error recording seen transaction:', error);
    }
  }

  /**
   * Get list of seen transactions
   */
  static async getSeenTransactions(): Promise<TransactionMemory[]> {
    try {
      const seenString = localStorage.getItem('seen_transactions');
      return seenString ? JSON.parse(seenString) : [];
    } catch (error) {
      notificationLogger.error('Error getting seen transactions:', error);
      return [];
    }
  }

  /**
   * Update and save balance records
   */
  static async updateBalanceRecord(walletAddress: string, balance: number): Promise<void> {
    try {
      // Get the stored previous wallet first
      const previousWallet = localStorage.getItem('previous_wallet_address');

      // If we're switching to a new wallet (address is different from previous wallet),
      // store the current wallet and skip notifications completely
      if (previousWallet && previousWallet !== walletAddress) {
        notificationLogger.debug(
          `Detected wallet switch from ${previousWallet} to ${walletAddress} - suppressing balance notifications`,
        );

        // Store the current wallet as previous for next time
        localStorage.setItem('previous_wallet_address', walletAddress);

        // Store the balance silently without any notifications
        this.updateBalanceRecordSilently(walletAddress, balance);
        return;
      }

      // If there was no previous wallet stored, this is the first run, so store it
      if (!previousWallet) {
        localStorage.setItem('previous_wallet_address', walletAddress);

        // Store the balance silently on first run
        this.updateBalanceRecordSilently(walletAddress, balance);
        return;
      }

      // Check if the wallet switch flag has been set for too long (> 30 seconds)
      // This prevents a "stuck" flag from permanently disabling notifications
      const switchFlag = localStorage.getItem('wallet_switch_in_progress');
      const switchTimestamp = localStorage.getItem('wallet_switch_timestamp');

      if (switchFlag === 'true' && switchTimestamp) {
        const switchTime = parseInt(switchTimestamp, 10);
        const currentTime = Date.now();

        // If the flag has been set for more than 30 seconds, clear it
        if (currentTime - switchTime > 30000) {
          notificationLogger.warn('Wallet switch flag has been set for too long, clearing it');
          localStorage.removeItem('wallet_switch_in_progress');
          localStorage.removeItem('wallet_switch_timestamp');
        }
      } else if (switchFlag === 'true') {
        // If there's no timestamp with the flag, add one
        localStorage.setItem('wallet_switch_timestamp', Date.now().toString());

        // Store the balance silently if wallet switch flag is set
        this.updateBalanceRecordSilently(walletAddress, balance);
        return;
      }

      // Get existing balance records
      const recordsString = localStorage.getItem('balance_records');
      const records: BalanceRecord[] = recordsString ? JSON.parse(recordsString) : [];

      // Get the last active wallet address
      const lastActiveWallet = localStorage.getItem('last_active_wallet');

      // Store that we've seen this wallet (for future wallet switch detection)
      localStorage.setItem('previous_wallet_address', walletAddress);

      // Find existing record or create new one
      const existingIndex = records.findIndex((r) => r.walletAddress === walletAddress);
      const now = Date.now();

      if (existingIndex >= 0) {
        const existing = records[existingIndex];

        // Get the wallet switch flag
        const isWalletSwitch = localStorage.getItem('wallet_switch_in_progress') === 'true';

        // Check if balance has changed significantly (more than 0.1%)
        const changePercent =
          existing.balance > 0
            ? Math.abs(((balance - existing.balance) / existing.balance) * 100)
            : balance > 0
              ? 100
              : 0; // Avoid division by zero

        // Check if this address was involved in a recent wallet switch
        // We'll import dynamically to avoid circular dependencies
        let isAddressInRecentSwitch = false;
        try {
          const StorageService = await import('../../core/StorageService').then(
            (module) => module.StorageService,
          );
          isAddressInRecentSwitch = StorageService.isAddressInRecentWalletSwitch(walletAddress);
        } catch (error) {
          notificationLogger.error('Error checking for recent wallet switch:', error);
        }

        // Log the status for debugging
        notificationLogger.debug(
          `Balance update check for ${walletAddress}: ` +
            `old=${existing.balance}, new=${balance}, ` +
            `changePercent=${changePercent}, ` +
            `isWalletSwitch=${isWalletSwitch}, ` +
            `isAddressInRecentSwitch=${isAddressInRecentSwitch}, ` +
            `lastActiveWallet=${lastActiveWallet}`,
        );

        // Only notify if:
        // 1. Balance changed significantly (> 0.1%)
        // 2. This is not part of a wallet switch operation
        // 3. This address wasn't involved in a recent switch
        if (changePercent > 0.1 && !isWalletSwitch && !isAddressInRecentSwitch) {
          // Should notify about significant balance change
          const prefs = await this.getWalletNotificationPreferences(walletAddress);
          if (prefs && prefs.enabled && prefs.balanceUpdates) {
            notificationLogger.debug(
              `Attempting to send balance update notification for ${walletAddress}`,
            );

            // Create balance update notification
            await this.createNotification(
              walletAddress,
              'balance_update',
              'Balance Updated',
              `Your balance has ${balance > existing.balance ? 'increased' : 'decreased'} by ${Math.abs(balance - existing.balance).toFixed(8)} AVN`,
            );

            notificationLogger.debug(
              `Sent balance update notification for ${walletAddress}: ${balance > existing.balance ? 'increase' : 'decrease'} by ${Math.abs(balance - existing.balance).toFixed(8)} AVN`,
            );
          }
        }

        // Update the record
        records[existingIndex] = {
          ...existing,
          balance,
          lastChecked: now,
        };
      } else {
        // Add new record - first time seeing this wallet's balance
        notificationLogger.debug(
          `Creating new balance record for previously unseen wallet ${walletAddress}`,
        );
        records.push({
          walletAddress,
          balance,
          lastChecked: now,
        });
      }

      // Save updated records
      localStorage.setItem('balance_records', JSON.stringify(records));

      // Update the last active wallet
      localStorage.setItem('last_active_wallet', walletAddress);
    } catch (error) {
      notificationLogger.error('Error updating balance record:', error);
    }
  }

  /**
   * Update balance record without triggering notifications
   * Used during wallet switching or initial setup to avoid false notifications
   */
  static async updateBalanceRecordSilently(walletAddress: string, balance: number): Promise<void> {
    try {
      // Get existing balance records
      const recordsString = localStorage.getItem('balance_records');
      const records: BalanceRecord[] = recordsString ? JSON.parse(recordsString) : [];
      const now = Date.now();

      // Find or create the record
      const existingIndex = records.findIndex((r) => r.walletAddress === walletAddress);
      if (existingIndex >= 0) {
        // Update existing record silently
        records[existingIndex] = {
          ...records[existingIndex],
          balance,
          lastChecked: now,
        };
        notificationLogger.debug(
          `Silently updated balance record for ${walletAddress}: ${balance}`,
        );
      } else {
        // Add new record silently
        records.push({
          walletAddress,
          balance,
          lastChecked: now,
        });
        notificationLogger.debug(
          `Silently created balance record for ${walletAddress}: ${balance}`,
        );
      }

      // Save updated records
      localStorage.setItem('balance_records', JSON.stringify(records));

      // Update the last active wallet
      localStorage.setItem('last_active_wallet', walletAddress);
    } catch (error) {
      notificationLogger.error('Error updating balance record silently:', error);
    }
  }

  /**
   * Get balance record for a wallet
   */
  static async getBalanceRecord(walletAddress: string): Promise<BalanceRecord | null> {
    try {
      const recordsString = localStorage.getItem('balance_records');
      const records: BalanceRecord[] = recordsString ? JSON.parse(recordsString) : [];

      return records.find((r) => r.walletAddress === walletAddress) || null;
    } catch (error) {
      notificationLogger.error('Error getting balance record:', error);
      return null;
    }
  }

  /**
   * Create a notification for a new transaction
   */
  static async createTransactionNotification(
    txid: string,
    walletAddress: string,
    amount: number,
    type: 'incoming' | 'outgoing',
  ): Promise<boolean> {
    try {
      // Check if we should create a notification
      const shouldNotify = await this.shouldNotifyForTransaction(walletAddress, txid, amount, type);
      if (!shouldNotify) {
        // Record as seen but not notified
        await this.recordSeenTransaction(txid, walletAddress, amount, type, false);
        return false;
      }

      // Create notification based on type
      const title = type === 'incoming' ? 'New Incoming Transaction' : 'Transaction Sent';
      const message =
        type === 'incoming'
          ? `You received ${Math.abs(amount).toFixed(8)} AVN`
          : `You sent ${Math.abs(amount).toFixed(8)} AVN`;

      // Create the notification
      const result = await this.createNotification(
        walletAddress,
        type === 'incoming' ? 'receive' : 'send',
        title,
        message,
        { txid, amount },
      );

      // Record the transaction as seen and notified
      await this.recordSeenTransaction(txid, walletAddress, amount, type, result.success);

      return result.success;
    } catch (error) {
      notificationLogger.error('Error creating transaction notification:', error);
      return false;
    }
  }

  /**
   * Create security alert notification
   */
  static async createSecurityAlert(
    walletAddress: string,
    title: string,
    message: string,
    data?: any,
  ): Promise<boolean> {
    try {
      // Check if security alerts are enabled for this wallet
      const prefs = await this.getWalletNotificationPreferences(walletAddress);
      if (!prefs || !prefs.enabled || !prefs.securityAlerts) {
        return false;
      }

      // Create the notification
      const result = await this.createNotification(
        walletAddress,
        'security_alert',
        title,
        message,
        data,
      );

      return result.success;
    } catch (error) {
      notificationLogger.error('Error creating security alert:', error);
      return false;
    }
  }

  /**
   * Mark a notification as read
   */
  static async markNotificationAsRead(notificationId: string): Promise<boolean> {
    try {
      const history = await this.getNotificationHistory();
      const index = history.findIndex((n) => n.id === notificationId);

      if (index >= 0) {
        history[index].read = true;
        localStorage.setItem('notification_history', JSON.stringify(history));
        return true;
      }

      return false;
    } catch (error) {
      notificationLogger.error('Error marking notification as read:', error);
      return false;
    }
  }

  /**
   * Clear notification history for a wallet
   */
  static async clearNotificationHistory(walletAddress: string): Promise<boolean> {
    try {
      const history = await this.getNotificationHistory();
      const filtered = history.filter((n) => n.walletAddress !== walletAddress);

      localStorage.setItem('notification_history', JSON.stringify(filtered));
      return true;
    } catch (error) {
      notificationLogger.error('Error clearing notification history:', error);
      return false;
    }
  }
}
