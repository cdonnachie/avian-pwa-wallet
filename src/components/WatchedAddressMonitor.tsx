import React, { useEffect } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { watchAddressLogger } from '@/lib/Logger';

/**
 * WatchedAddressMonitor
 *
 * This component demonstrates how to use the WatchedAddressNotifier utility
 * to monitor watched addresses for balance changes and trigger notifications.
 *
 * Include this component in your app to enable watched address notifications.
 */
export const WatchedAddressMonitor: React.FC = () => {
  // No need to get the current wallet address since watched addresses are global
  const { isEnabled, showNotification } = useNotifications();

  useEffect(() => {
    // Only check if notifications are enabled
    if (!isEnabled) {
      watchAddressLogger.debug('Notifications not enabled, skipping watched address monitoring');
      return;
    }

    const setupMonitoring = async () => {
      try {
        // Import services dynamically
        const { default: WatchAddressService } = await import(
          '@/services/wallet/WatchAddressService'
        );
        const { default: WatchedAddressNotifier } = await import(
          '@/services/notifications/client/WatchedAddressNotifier'
        );

        // Get all watched addresses globally
        watchAddressLogger.debug('Fetching all watched addresses across all wallets...');
        const allWatchedAddresses = await WatchAddressService.getAllWatchedAddresses();

        if (allWatchedAddresses.length === 0) {
          watchAddressLogger.debug('No watched addresses to monitor');
          return;
        }

        watchAddressLogger.info(
          `Setting up monitoring for ${allWatchedAddresses.length} global watched addresses`,
        );

        // Log the addresses we'll be monitoring
        allWatchedAddresses.forEach((addr) => {
          watchAddressLogger.debug(
            `Will monitor: ${addr.watch_address} (${addr.label || 'unlabeled'}) with balance ${addr.balance || 0}`,
          );
        });

        // Group addresses by their wallet for individual monitoring
        const addressesByWallet = allWatchedAddresses.reduce(
          (acc, addr) => {
            const walletAddress = addr.user_wallet_address;
            if (!acc[walletAddress]) {
              acc[walletAddress] = [];
            }
            acc[walletAddress].push(addr);
            return acc;
          },
          {} as Record<string, typeof allWatchedAddresses>,
        );

        // Set up monitoring for each wallet's watched addresses
        Object.entries(addressesByWallet).forEach(([walletAddress, addresses]) => {
          watchAddressLogger.info(
            `Setting up monitoring for ${addresses.length} addresses from wallet ${walletAddress}`,
          );

          // Start monitoring with our utility class - using the actual wallet address
          WatchedAddressNotifier.startMonitoring(
            walletAddress,
            addresses,
            async (title, body, addrWalletAddress) => {
              // This callback is triggered when a balance changes
              watchAddressLogger.info(
                `Showing notification: ${title} - ${body} for wallet ${addrWalletAddress}`,
              );

              try {
                // Check notification permission
                watchAddressLogger.info(
                  `Browser notification permission status: ${Notification.permission}`,
                );

                // Call showNotification with extra debugging
                showNotification(title, body, '/icons/icon-192x192.png', addrWalletAddress);
                watchAddressLogger.info(
                  'Notification showNotification function called successfully',
                );
              } catch (error) {
                watchAddressLogger.error('Error in notification callback:', error);
              }
            },
            30000, // Check every 30 seconds
          );
        });

        watchAddressLogger.info('Global watched address monitoring setup complete');
      } catch (error) {
        watchAddressLogger.error('Failed to setup global watched address monitoring:', error);
      }
    };

    watchAddressLogger.info('Setting up global watched address monitoring');
    setupMonitoring();

    // Cleanup function
    return () => {
      watchAddressLogger.info('Cleaning up global watched address monitoring');
      Promise.all([
        import('@/services/notifications/client/WatchedAddressNotifier'),
        import('@/services/core/StorageService'),
      ])
        .then(([notifierModule, storageModule]) => {
          const { default: WatchedAddressNotifier } = notifierModule;
          const { StorageService } = storageModule;

          // Get all wallets and stop monitoring for each one
          StorageService.getAllWallets().then((wallets) => {
            wallets.forEach((wallet) => {
              if (wallet.address) {
                WatchedAddressNotifier.stopMonitoring(wallet.address);
                watchAddressLogger.debug(`Stopped monitoring for wallet ${wallet.address}`);
              }
            });
            watchAddressLogger.info('Successfully stopped all watched address monitoring');
          });
        })
        .catch((error) => {
          watchAddressLogger.error('Error cleaning up global watched address monitoring:', error);
        });
    };
  }, [isEnabled, showNotification]);

  // This is a non-visual component, so return null
  return null;
};

export default WatchedAddressMonitor;
