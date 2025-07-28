import { watchAddressLogger } from '@/lib/Logger';
import { WatchAddress } from '@/services/wallet/WatchAddressService';

/**
 * WatchedAddressNotifier
 *
 * Utility to monitor watched addresses for balance changes and trigger notifications
 */
export class WatchedAddressNotifier {
  // Map to store the last known balances for each address
  private static balanceMap = new Map<string, number>();

  // Set to store timers for active monitoring
  private static timers = new Map<string, number>();

  // Default minimum balance change to trigger a notification (0.01 AVN)
  // The balances are stored in AVN, not satoshis
  private static readonly DEFAULT_MINIMUM_THRESHOLD = 0.01;

  // Get the current threshold from settings or use the default
  private static async getNotificationThreshold(): Promise<number> {
    try {
      // Import dynamically to avoid circular dependencies
      const { StorageService } = await import('@/services/core/StorageService');
      const settings = await StorageService.getSettings();

      // Check if user has set a custom threshold
      if (
        settings.watchedAddressThreshold !== undefined &&
        !isNaN(parseFloat(settings.watchedAddressThreshold))
      ) {
        return parseFloat(settings.watchedAddressThreshold);
      }

      // Return default if no valid setting found
      return this.DEFAULT_MINIMUM_THRESHOLD;
    } catch (error) {
      watchAddressLogger.error('Error getting notification threshold from settings:', error);
      // Fall back to default threshold in case of error
      return this.DEFAULT_MINIMUM_THRESHOLD;
    }
  }

  /**
   * Start monitoring watched addresses for a wallet
   */
  public static startMonitoring(
    walletAddress: string,
    watchedAddresses: WatchAddress[],
    notificationCallback: (title: string, body: string, walletAddress: string) => void,
    intervalMs: number = 60000, // Default to checking every minute
  ): void {
    watchAddressLogger.info(
      `Starting to monitor ${watchedAddresses.length} addresses for wallet ${walletAddress}`,
    );

    // Stop any existing monitoring for this wallet
    this.stopMonitoring(walletAddress);

    // Initialize balance map with current values and log them
    watchedAddresses.forEach((addr) => {
      const key = `${walletAddress}:${addr.watch_address}`;
      const balance = addr.balance || 0;
      this.balanceMap.set(key, balance);
      watchAddressLogger.debug(`Initial balance for ${addr.watch_address}: ${balance}`);
    });

    // Log the current state of the balance map for debugging
    watchAddressLogger.debug(`Balance map initialized with ${this.balanceMap.size} entries`);

    // Immediately check balances when monitoring starts
    setTimeout(() => {
      watchAddressLogger.debug('Running initial balance check');
      this.checkBalances(walletAddress, notificationCallback);
    }, 1000); // Small delay to ensure balance map is initialized

    // Create a timer to periodically check for balance changes
    const timerId = window.setInterval(() => {
      watchAddressLogger.debug('Running periodic balance check');
      this.checkBalances(walletAddress, notificationCallback);
    }, intervalMs);

    // Store the timer ID
    this.timers.set(walletAddress, timerId);
    watchAddressLogger.info(
      `Monitoring started for wallet ${walletAddress} with interval ${intervalMs}ms`,
    );
  }

  /**
   * Check balances for watched addresses and trigger notifications on changes
   */
  private static async checkBalances(
    walletAddress: string,
    notificationCallback: (title: string, body: string, walletAddress: string) => void,
  ): Promise<void> {
    try {
      // Dynamically import to avoid circular dependencies
      const { default: WatchAddressService } = await import(
        '@/services/wallet/WatchAddressService'
      );

      watchAddressLogger.debug(
        `Checking balances for watched addresses of wallet ${walletAddress}`,
      );

      // Log start of balance refresh
      watchAddressLogger.info(
        `Refreshing balances for watched addresses of wallet ${walletAddress}...`,
      );

      // Get fresh data - force a refresh of balances before checking
      const refreshResult = await WatchAddressService.refreshWatchAddressBalances(walletAddress);

      if (refreshResult) {
        watchAddressLogger.info(`Successfully refreshed balances for wallet ${walletAddress}`);
      } else {
        watchAddressLogger.warn(`Failed to refresh balances for wallet ${walletAddress}`);
      }

      const currentAddresses = await WatchAddressService.getWatchedAddresses(walletAddress);

      // Log the results for debugging with detailed information
      watchAddressLogger.info(
        `Found ${currentAddresses.length} watched addresses for ${walletAddress}`,
      );

      // Log detailed address information
      currentAddresses.forEach((addr) => {
        watchAddressLogger.info(
          `Address: ${addr.watch_address}, Label: ${addr.label || 'unlabeled'}, Balance: ${addr.balance || 0}, Script Hash: ${addr.script_hash || 'unknown'}`,
        );
      });

      if (currentAddresses.length === 0) {
        watchAddressLogger.debug('No watched addresses found, stopping monitor');
        this.stopMonitoring(walletAddress);
        return;
      }

      // Get the current notification threshold from settings
      const threshold = await this.getNotificationThreshold();

      // Check each address for changes with enhanced logging
      for (const addr of currentAddresses) {
        const key = `${walletAddress}:${addr.watch_address}`;
        const lastBalance = this.balanceMap.get(key) || 0;
        const currentBalance = addr.balance || 0;

        // If balance changed significantly
        const change = currentBalance - lastBalance;

        // Log the balance change details for debugging
        watchAddressLogger.debug(
          `Address ${addr.watch_address} balance check: last=${lastBalance}, current=${currentBalance}, change=${change}, threshold=${threshold}`,
        );

        // Enhanced logging for balance map
        if (lastBalance === 0 && this.balanceMap.has(key)) {
          watchAddressLogger.debug(
            `Address ${addr.watch_address} has entry in balanceMap but value is zero`,
          );
        }

        watchAddressLogger.info(
          `Checking balance change for ${addr.watch_address}: last=${lastBalance}, current=${currentBalance}, change=${change}, threshold=${threshold} AVN`,
        );

        // Check if this address has notifications enabled (defaults to true if not specified)
        const hasBalanceNotifications =
          !addr.notification_types || addr.notification_types.includes('balance');

        watchAddressLogger.debug(
          `Address ${addr.watch_address} has balance notifications ${hasBalanceNotifications ? 'ENABLED' : 'DISABLED'}`,
        );

        if (Math.abs(change) >= threshold && hasBalanceNotifications) {
          const direction = change > 0 ? 'increased' : 'decreased';
          // The change is already in AVN, so no need to divide by 100000000
          const formattedChange = Math.abs(change);

          // Create notification
          const title = 'Watched Address Balance Updated';
          const body = `${addr.label || addr.watch_address.substring(0, 8) + '...'} balance has ${direction} by ${formattedChange.toFixed(8)} AVN`;

          watchAddressLogger.info(
            `Detected balance change for watched address ${addr.watch_address}: ${direction} by ${formattedChange}`,
          );

          // Check if notifications should be enabled before attempting to show
          try {
            // Dynamically import to avoid circular dependencies
            const { NotificationClientService } = await import(
              '@/services/notifications/client/NotificationClientService'
            );

            // Check global notification setting
            const globalSettings = await NotificationClientService.getNotificationSettings();
            watchAddressLogger.debug(
              `Global notification settings: ${JSON.stringify(globalSettings)}`,
            );

            if (!globalSettings.enabled) {
              watchAddressLogger.info(
                `Global notifications are DISABLED (enabled=${globalSettings.enabled}), skipping notification for ${addr.watch_address}`,
              );
              return;
            }

            watchAddressLogger.debug(
              `Global notifications are ENABLED, continuing with notification for ${addr.watch_address}`,
            );

            // Check balance-specific notification setting
            if (!globalSettings.balance) {
              watchAddressLogger.info(
                `Balance notifications are DISABLED globally, skipping notification for ${addr.watch_address}`,
              );
              return;
            }

            // Log notification attempt
            watchAddressLogger.info(`Triggering notification callback for ${addr.watch_address}`);

            // Trigger notification through callback
            notificationCallback(title, body, walletAddress);
            watchAddressLogger.info(
              `Successfully triggered notification callback for ${addr.watch_address}`,
            );
          } catch (error) {
            watchAddressLogger.error(
              `Failed to trigger notification for ${addr.watch_address}:`,
              error,
            );
          }
        } // Update stored balance and log it
        this.balanceMap.set(key, currentBalance);
        watchAddressLogger.debug(
          `Updated stored balance for ${addr.watch_address} to ${currentBalance}`,
        );
      }
    } catch (error) {
      watchAddressLogger.error('Error checking watched address balances:', error);
    }
  }

  /**
   * Stop monitoring watched addresses for a wallet
   */
  public static stopMonitoring(walletAddress: string): void {
    const timerId = this.timers.get(walletAddress);

    if (timerId) {
      clearInterval(timerId);
      this.timers.delete(walletAddress);
      watchAddressLogger.info(`Stopped monitoring watched addresses for wallet ${walletAddress}`);

      // Clean up balance map entries for this wallet
      const keysToDelete: string[] = [];
      this.balanceMap.forEach((value, key) => {
        if (key.startsWith(`${walletAddress}:`)) {
          keysToDelete.push(key);
        }
      });

      keysToDelete.forEach((key) => {
        this.balanceMap.delete(key);
      });
    }
  }

  /**
   * Check if a wallet is being monitored
   */
  public static isMonitoring(walletAddress: string): boolean {
    return this.timers.has(walletAddress);
  }

  /**
   * Stop all monitoring (useful when component unmounts)
   */
  public static stopAllMonitoring(): void {
    // Clear all timers
    this.timers.forEach((timerId, walletAddress) => {
      clearInterval(timerId);
      watchAddressLogger.info(`Stopped monitoring watched addresses for wallet ${walletAddress}`);
    });

    this.timers.clear();
    this.balanceMap.clear();
  }

  /**
   * Test notification system for a specific wallet
   * Use this method to check if notifications are working properly
   */
  public static async testNotification(walletAddress: string): Promise<boolean> {
    try {
      watchAddressLogger.info(`Testing notification system for wallet ${walletAddress}`);

      // Check notification permission
      const permissionStatus = Notification.permission;
      watchAddressLogger.info(`Browser notification permission status: ${permissionStatus}`);

      if (permissionStatus !== 'granted') {
        watchAddressLogger.error(`Notification permission not granted: ${permissionStatus}`);
        return false;
      }

      // Check if notifications are enabled for this wallet
      const { NotificationClientService } = await import(
        '@/services/notifications/client/NotificationClientService'
      );
      const isEnabled = await NotificationClientService.isWalletNotificationEnabled(walletAddress);

      watchAddressLogger.info(
        `Wallet notification status: ${isEnabled ? 'ENABLED' : 'DISABLED'} for ${walletAddress}`,
      );

      if (!isEnabled) {
        watchAddressLogger.warn(`Notifications are disabled for wallet ${walletAddress}`);
        return false;
      }

      // Get global notification settings
      const settings = await NotificationClientService.getNotificationSettings();
      watchAddressLogger.info(`Global notification settings: ${JSON.stringify(settings)}`);

      if (!settings.enabled) {
        watchAddressLogger.warn('Global notifications are disabled');
        return false;
      }

      // Try showing a notification directly through service worker
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const registration = await navigator.serviceWorker.ready;

        await registration.showNotification('Test Notification', {
          body: `Testing notification system for wallet ${walletAddress}`,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-72x72.png',
          tag: 'avian-test-notification',
          // @ts-ignore - timestamp is standard in the spec but TypeScript doesn't recognize it
          timestamp: Date.now(),
          data: { walletAddress },
        });

        watchAddressLogger.info('Test notification sent successfully');
        return true;
      } else {
        watchAddressLogger.error('Service worker not available for notifications');
        return false;
      }
    } catch (error) {
      watchAddressLogger.error('Error testing notification system:', error);
      return false;
    }
  }
}

export default WatchedAddressNotifier;
