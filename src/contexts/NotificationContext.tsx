'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { NotificationClientService } from '@/services/notifications/client/NotificationClientService';
import { TransactionClientService } from '@/services/notifications/client/TransactionClientService';
import { NotificationType } from '@/services/notifications/NotificationTypes';
import { PriceService } from '@/services/data';
import { useWallet } from './WalletContext';
import { notificationLogger } from '@/lib/Logger';
import { NotificationAlert } from '@/components/NotificationAlert';
import { WatchAddress } from '@/services/wallet/WatchAddressService';

// Client-side notification preferences for application settings
export interface NotificationPreferences {
  enabled: boolean;
  transactions: boolean;
  balance: boolean;
  security: boolean;
  priceAlertThreshold: number;
  priceAlerts?: boolean;
  useFallback?: boolean;
}

export interface NotificationContextType {
  isSupported: boolean;
  isEnabled: boolean;
  permissionState: NotificationPermission;
  preferences: NotificationPreferences;
  currentAvnPrice: number | null;
  priceLastUpdated: Date | null;
  watchedAddresses: string[];
  enableNotifications: () => Promise<boolean>;
  disableNotifications: () => void;
  updatePreferences: (prefs: Partial<NotificationPreferences>) => Promise<boolean>;
  refreshPrice: () => Promise<number | null>;
  showNotification: (title: string, body: string, icon?: string, walletAddress?: string) => void;
  testNotification: () => void;
  loadWatchedAddresses: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
  isSupported: false,
  isEnabled: false,
  permissionState: 'default',
  preferences: {
    enabled: false,
    transactions: true,
    balance: true,
    security: true,
    priceAlerts: true,
    priceAlertThreshold: 5,
  },
  currentAvnPrice: null,
  priceLastUpdated: null,
  watchedAddresses: [],
  enableNotifications: async () => false,
  disableNotifications: () => {},
  updatePreferences: async () => false,
  refreshPrice: async () => null,
  showNotification: () => {},
  testNotification: () => {},
  loadWatchedAddresses: async () => {},
});

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider = ({ children }: NotificationProviderProps) => {
  const { balance, address } = useWallet(); // Get both balance and address from wallet context
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [isEnabled, setIsEnabled] = useState<boolean>(false);
  const [permissionState, setPermissionState] = useState<NotificationPermission>('default');
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    enabled: false,
    transactions: true,
    balance: true,
    security: true,
    priceAlertThreshold: 5,
  });
  const [currentAvnPrice, setCurrentAvnPrice] = useState<number | null>(null);
  const [priceLastUpdated, setPriceLastUpdated] = useState<Date | null>(null);
  const [watchedAddresses, setWatchedAddresses] = useState<string[]>([]);

  // State for alert dialogs
  const [alertDialogOpen, setAlertDialogOpen] = useState<boolean>(false);
  const [alertDialogTitle, setAlertDialogTitle] = useState<string>('');
  const [alertDialogMessage, setAlertDialogMessage] = useState<string>('');

  // Price update interval (15 minutes to respect CoinGecko rate limits)
  const PRICE_UPDATE_INTERVAL = 15 * 60 * 1000;

  // Helper function to show alert dialogs instead of using window.alert
  const showAlertDialog = useCallback((title: string, message: string) => {
    setAlertDialogTitle(title);
    setAlertDialogMessage(message);
    setAlertDialogOpen(true);
  }, []);

  // Show a notification
  const showNotification = useCallback(
    async (title: string, body: string, icon?: string, walletAddress?: string) => {
      if (!isSupported || !isEnabled) {
        notificationLogger.warn('Notifications not supported or not enabled in preferences');
        return;
      }

      if (Notification.permission !== 'granted') {
        notificationLogger.warn('Notification permission not granted:', Notification.permission);
        return;
      }

      // If a wallet address is provided, check if notifications are enabled for this specific wallet
      if (walletAddress) {
        try {
          const walletNotificationsEnabled =
            await NotificationClientService.isWalletNotificationEnabled(walletAddress);
          if (!walletNotificationsEnabled) {
            return;
          }
        } catch (error) {
          notificationLogger.error(
            `Error checking notification status for wallet ${walletAddress}:`,
            error,
          );
          // Continue with notification on error - default to enabled for best user experience
        }
      }

      // No specific wallet or notifications enabled, show the notification
      showNotificationImpl();

      // Implementation of showing the notification
      function showNotificationImpl() {
        try {
          // Try to show notification through the service worker first
          if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.ready
              .then((registration) => {
                registration
                  .showNotification(title, {
                    body,
                    icon: icon || '/icons/icon-192x192.png',
                    badge: '/icons/icon-72x72.png',
                    // @ts-ignore - vibrate is a standard option but TypeScript doesn't recognize it
                    vibrate: [200, 100, 200, 100, 200],
                    tag: 'avian-wallet-local',
                    // @ts-ignore - timestamp is a standard option but TypeScript doesn't recognize it
                    timestamp: Date.now(),
                    // @ts-ignore - priority is supported in some browsers but not in TypeScript
                    priority: 2, // Max priority (0 = default, 2 = max)
                    // @ts-ignore - silent option to ensure notification is not silent
                    silent: false,
                    // @ts-ignore - requireInteraction keeps the notification visible until user interacts
                    requireInteraction: true,
                    data: {
                      url: window.location.href,
                      importance: 'high',
                    },
                  })
                  .then(() => {})
                  .catch((error) => {
                    notificationLogger.error('Service worker notification failed:', error);
                    // Fall back to browser notification
                    showFallbackNotification();
                  });
              })
              .catch((error) => {
                notificationLogger.error('Service worker not ready:', error);
                // Fall back to browser notification
                showFallbackNotification();
              });
          } else {
            showFallbackNotification();
          }
        } catch (error) {
          notificationLogger.error('Failed to show notification:', error);
        }
      }

      // Fallback to standard browser notification API
      function showFallbackNotification() {
        try {
          const notification = new Notification(title, {
            body,
            icon: icon || '/icons/icon-192x192.png',
          });

          notification.onerror = (event) => {
            notificationLogger.error('Notification error event:', event);
          };

          notification.onshow = () => {};
        } catch (fallbackError) {
          notificationLogger.error('Failed to show fallback notification:', fallbackError);
        }
      }
    },
    [isSupported, isEnabled],
  );

  // Helper functions for global notification preferences
  // These are separate from wallet-specific preferences
  const getGlobalNotificationPreferences = (): NotificationPreferences => {
    try {
      const prefsString = localStorage.getItem('notification_settings');
      if (prefsString) {
        return JSON.parse(prefsString);
      }
    } catch (error) {
      notificationLogger.error('Error getting notification preferences:', error);
    }

    // Return default preferences
    return {
      enabled: false,
      transactions: true,
      balance: true,
      security: true,
      priceAlerts: true,
      priceAlertThreshold: 5,
    };
  };

  const saveGlobalNotificationPreferences = (prefs: NotificationPreferences): boolean => {
    try {
      localStorage.setItem('notification_settings', JSON.stringify(prefs));
      return true;
    } catch (error) {
      notificationLogger.error('Error saving notification preferences:', error);
      return false;
    }
  };

  // Check for notification support and permission
  useEffect(() => {
    const checkSupport = async () => {
      const supported = NotificationClientService.isNotificationSupported();
      setIsSupported(supported);

      if (supported) {
        // Check existing permission
        const permission = Notification.permission;
        setPermissionState(permission);

        // Load saved preferences
        const savedPrefs = getGlobalNotificationPreferences();
        notificationLogger.debug(
          `Loaded global notification preferences: ${JSON.stringify(savedPrefs)}`,
        );

        // Ensure we're setting the correct enabled state
        setPreferences(savedPrefs);
        const isEnabledState = savedPrefs.enabled && permission === 'granted';
        setIsEnabled(isEnabledState);
        notificationLogger.debug(
          `Setting isEnabled to ${isEnabledState} (preferences.enabled=${savedPrefs.enabled}, permission=${permission})`,
        );
      }
    };

    checkSupport();
  }, []);

  // Fetch price initially and on interval
  // Track if this is the first price fetch
  const isFirstPriceFetchRef = useRef<boolean>(true);

  // Use a ref to store the interval ID to prevent it from affecting dependencies
  const priceIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch price and update state
  const fetchPrice = useCallback(
    async (forceFresh = false) => {
      const priceData = await PriceService.getAvnPrice(forceFresh);

      if (priceData) {
        setCurrentAvnPrice(priceData.price);
        setPriceLastUpdated(priceData.lastUpdated);

        const lastKnownPrice = PriceService.getLastKnownPrice();

        // Check for significant price changes - but only after the first fetch
        if (
          lastKnownPrice &&
          preferences.enabled &&
          preferences.priceAlerts !== false && // Only show price alerts if not explicitly disabled
          !isFirstPriceFetchRef.current && // Skip notification on first fetch
          PriceService.shouldNotifyPriceChange(
            lastKnownPrice.price,
            priceData.price,
            preferences.priceAlertThreshold,
          ) // Use user's threshold
        ) {
          // Show price change notification
          const percentChange =
            ((priceData.price - lastKnownPrice.price) / lastKnownPrice.price) * 100;
          const direction = percentChange >= 0 ? 'up' : 'down';

          showNotification(
            `AVN Price ${direction === 'up' ? 'Up' : 'Down'} ${Math.abs(percentChange).toFixed(2)}%`,
            `AVN price is now $${priceData.price.toFixed(8)} (${direction === 'up' ? '+' : ''}${percentChange.toFixed(2)}%)`,
            '/icons/icon-192x192.png',
            address, // Use wallet address from context to check notification settings
          );
        }

        // Update stored price
        PriceService.saveLastKnownPrice(priceData.price);

        // After first fetch, set flag to false so notifications can be sent on subsequent fetches
        if (isFirstPriceFetchRef.current) {
          isFirstPriceFetchRef.current = false;
        }
      }
    },
    [
      preferences.enabled,
      preferences.priceAlerts,
      preferences.priceAlertThreshold,
      showNotification,
      address,
    ],
  );

  // Set up the price update interval
  useEffect(() => {
    // Initial fetch
    fetchPrice(false);

    // Clear any existing interval
    if (priceIntervalRef.current) {
      clearInterval(priceIntervalRef.current);
    }

    // Set up a new interval
    priceIntervalRef.current = setInterval(() => fetchPrice(false), PRICE_UPDATE_INTERVAL);

    // Cleanup on unmount
    return () => {
      if (priceIntervalRef.current) {
        clearInterval(priceIntervalRef.current);
        priceIntervalRef.current = null;
      }
    };
  }, [fetchPrice, PRICE_UPDATE_INTERVAL]);

  // Monitor for balance changes
  useEffect(() => {
    // Log entry to this effect to track execution

    // Only proceed if notifications are enabled, balance updates are enabled, and we have a balance
    if (!preferences.enabled) {
      return;
    }

    if (!preferences.balance) {
      return;
    }

    if (balance === undefined) {
      return;
    }

    // Get the current wallet address from the context
    // We need to ensure an address is available to track balances
    const currentWalletAddress = address;

    // Check if a wallet switch is in progress - if so, skip balance notifications entirely
    const isWalletSwitch = localStorage.getItem('wallet_switch_in_progress') === 'true';
    if (isWalletSwitch) {
      const fromAddress = localStorage.getItem('switching_from_address');
      const toAddress = localStorage.getItem('switching_to_address');
      notificationLogger.debug(
        `Wallet switch in progress from ${fromAddress || 'unknown'} to ${toAddress || 'unknown'}, skipping balance notification`,
      );
      return;
    }

    // Check if the wallet address has changed since last check (another form of wallet switch)
    const previousWalletAddress = localStorage.getItem('previous_wallet_address');
    if (previousWalletAddress && previousWalletAddress !== currentWalletAddress) {
      notificationLogger.debug(
        `Wallet address changed from ${previousWalletAddress} to ${currentWalletAddress}, skipping balance notification`,
      );
      return;
    }

    // Check if this address was involved in a recent wallet switch operation
    // We'll use localStorage checks directly since we're not in an async context
    const switchingFromAddress = localStorage.getItem('switching_from_address');
    const switchingToAddress = localStorage.getItem('switching_to_address');
    const switchTimestamp = parseInt(localStorage.getItem('wallet_switch_timestamp') || '0', 10);

    // Check if this address was part of a recent switch (within last 10 seconds)
    const isAddressInRecentSwitch =
      (switchingFromAddress === currentWalletAddress ||
        switchingToAddress === currentWalletAddress) &&
      Date.now() - switchTimestamp < 10000;

    if (isAddressInRecentSwitch) {
      notificationLogger.debug(
        `Address ${currentWalletAddress} was involved in a recent wallet switch, skipping balance notification`,
      );
      return;
    }

    // Check for wallet address before proceeding
    if (!currentWalletAddress) {
      // Try to get the active wallet from StorageService as a fallback
      import('@/services/core/StorageService')
        .then(({ StorageService }) => {
          StorageService.getActiveWallet()
            .then((activeWallet) => {
              if (activeWallet && activeWallet.address) {
                notificationLogger.debug(
                  'Retrieved active wallet address from storage:',
                  activeWallet.address,
                );
                // Store the balance for this address to avoid false notifications later
                if (balance > 0) {
                  TransactionClientService.saveLastKnownBalance(balance, activeWallet.address);
                }
              }
            })
            .catch((error: Error) => {
              notificationLogger.error('Failed to get active wallet from storage:', error);
            });
        })
        .catch((error: Error) => {
          notificationLogger.error('Failed to import StorageService:', error);
        });
      return;
    }

    // Get last known balance from the notification system's tracking
    const lastKnownBalance = TransactionClientService.getLastKnownBalance(currentWalletAddress);

    if (!lastKnownBalance && balance > 0) {
      TransactionClientService.saveLastKnownBalance(balance, currentWalletAddress);
      return;
    }

    // Also update the balance in StorageService (the new approach)
    // This will help consolidate balance tracking over time
    if (balance !== undefined && currentWalletAddress) {
      import('@/services/core/StorageService')
        .then(({ StorageService }) => {
          StorageService.setWalletBalance(currentWalletAddress, balance)
            .then(() => {})
            .catch((error) => {
              notificationLogger.error('Failed to update wallet balance in StorageService:', error);
            });
        })
        .catch((error) => {
          notificationLogger.error('Failed to import StorageService:', error);
        });
    }

    // Only notify if we have a previous balance and the balance changed
    if (lastKnownBalance && lastKnownBalance.balance !== balance) {
      const change = balance - lastKnownBalance.balance;

      // Double check that this isn't a wallet switch
      const previousWallet = localStorage.getItem('previous_wallet_address');
      const isWalletSwitchDetected = previousWallet && previousWallet !== currentWalletAddress;

      // Log balance change detection
      notificationLogger.debug(
        `Balance change detected - Current wallet: ${currentWalletAddress}, ` +
          `Previous wallet: ${previousWallet}, ` +
          `Is switch: ${isWalletSwitchDetected}, ` +
          `Change: ${change}`,
      );

      // Only notify if:
      // 1. The change is significant (more than dust)
      // 2. This is not a wallet switch
      const minimumNotificationThreshold = 1000000; // 0.01 AVN
      if (Math.abs(change) >= minimumNotificationThreshold && !isWalletSwitchDetected) {
        const direction = change > 0 ? 'increased' : 'decreased';
        const formattedChange = Math.abs(change) / 100000000;

        // Create notification title and body
        const title = 'Balance Updated';
        const body = `Your wallet balance has ${direction} by ${formattedChange.toFixed(8)} AVN`;

        notificationLogger.debug(
          `Sending balance notification - Wallet: ${currentWalletAddress}, ` +
            `Change: ${direction} by ${formattedChange.toFixed(8)} AVN`,
        );

        // Call showNotification with a slight delay to ensure UI has time to update
        setTimeout(() => {
          showNotification(
            title,
            body,
            '/icons/icon-192x192.png',
            currentWalletAddress, // Pass wallet address to check notification settings
          );
        }, 500);
      } else if (isWalletSwitchDetected) {
        notificationLogger.debug(
          `Suppressing balance notification due to wallet switch from ${previousWallet} to ${currentWalletAddress}`,
        );
      }
    }

    // Always update stored balance with the wallet address
    TransactionClientService.saveLastKnownBalance(balance, currentWalletAddress);

    // Check if notifications are actually permitted
    if (Notification.permission !== 'granted') {
      notificationLogger.warn(
        'Notifications are enabled in preferences but browser permission is:',
        Notification.permission,
      );
    }
  }, [balance, preferences, showNotification, address]);

  // Track previous address to detect wallet changes
  const previousAddressRef = useRef<string | null>(null);

  // Reset balance tracking when wallet changes
  useEffect(() => {
    // Handle wallet address changes carefully, taking into account null/undefined addresses
    const currentAddress = address || null;
    const previousAddress = previousAddressRef.current;

    // Log the current state for debugging
    notificationLogger.debug(
      `Address change check - Current: ${currentAddress}, Previous: ${previousAddress}`,
    );

    // Detect an actual wallet change (address has changed from one value to another)
    if (currentAddress && currentAddress !== previousAddress && previousAddress !== null) {
      notificationLogger.debug(`Wallet switched from ${previousAddress} to ${currentAddress}`);

      // Get last known balance for the new wallet
      const lastKnownBalance = TransactionClientService.getLastKnownBalance(currentAddress);

      // If no previous balance data for this wallet but balance is loaded,
      // store it silently to prevent false "increased" notification
      if (!lastKnownBalance && balance !== undefined && balance > 0) {
        notificationLogger.debug(
          `Storing initial balance ${balance} for new wallet ${currentAddress}`,
        );
        TransactionClientService.saveLastKnownBalance(balance, currentAddress);
      }
    } else if (currentAddress && !previousAddress) {
      // This is the initial wallet load
      notificationLogger.debug(`Initial wallet address set: ${currentAddress}`);

      // Store initial balance to prevent false notifications
      if (balance !== undefined && balance > 0) {
        TransactionClientService.saveLastKnownBalance(balance, currentAddress);
      }
    }

    // Update ref for next check
    previousAddressRef.current = currentAddress;
  }, [address, balance]);

  // Reference that stores the WatchedAddressNotifier monitoring identifier
  const watchedAddressMonitoringIdRef = useRef<string | null>(null);

  // Load watched addresses for the current wallet and monitor balance changes
  const loadWatchedAddresses = useCallback(async () => {
    // Ensure we have the current address from context or storage
    const currentWalletAddress = address;

    if (!currentWalletAddress || !preferences.enabled) {
      notificationLogger.debug(
        'No wallet address or notifications disabled, skipping watched address load',
      );
      return;
    }

    try {
      // Import services dynamically with safer HMR-compatible pattern
      let WatchAddressService;
      let WatchedAddressNotifier;

      try {
        const serviceModule = await import('@/services/wallet/WatchAddressService');
        WatchAddressService = serviceModule.default;

        const notifierModule = await import(
          '@/services/notifications/client/WatchedAddressNotifier'
        );
        WatchedAddressNotifier = notifierModule.default;
      } catch (importError) {
        notificationLogger.error(
          'Failed to import notification services, retrying once:',
          importError,
        );
        // Wait a moment and try again - this can help with HMR issues
        await new Promise((resolve) => setTimeout(resolve, 100));

        const serviceModule = await import('@/services/wallet/WatchAddressService');
        WatchAddressService = serviceModule.default;

        const notifierModule = await import(
          '@/services/notifications/client/WatchedAddressNotifier'
        );
        WatchedAddressNotifier = notifierModule.default;
      }

      const addresses = await WatchAddressService.getWatchedAddresses(currentWalletAddress);

      if (addresses && addresses.length > 0) {
        notificationLogger.debug(
          `Loaded ${addresses.length} watched addresses for wallet ${currentWalletAddress}`,
        );

        // Store addresses for reference
        setWatchedAddresses(addresses.map((a) => a.watch_address));

        // Start monitoring with the WatchedAddressNotifier class
        WatchedAddressNotifier.startMonitoring(
          currentWalletAddress,
          addresses,
          (title, body, walletAddress) => {
            // This callback is triggered when a balance changes
            showNotification(title, body, '/icons/icon-192x192.png', walletAddress);
          },
        );

        // Store the monitoring ID for cleanup
        watchedAddressMonitoringIdRef.current = currentWalletAddress;
      } else {
        notificationLogger.debug(`No watched addresses found for wallet ${currentWalletAddress}`);
      }
    } catch (error) {
      notificationLogger.error('Failed to load watched addresses:', error);
    }
  }, [address, preferences.enabled, setWatchedAddresses, showNotification]);

  // Clean up any monitoring when the component unmounts
  useEffect(() => {
    return () => {
      // Clean up the WatchedAddressNotifier if active
      const monitoringId = watchedAddressMonitoringIdRef.current;
      if (monitoringId) {
        // Use safer import with retry pattern
        const importWithRetry = async () => {
          try {
            const notifierModule = await import(
              '@/services/notifications/client/WatchedAddressNotifier'
            );
            const WatchedAddressNotifier = notifierModule.default;

            WatchedAddressNotifier.stopMonitoring(monitoringId);
            watchedAddressMonitoringIdRef.current = null;
            notificationLogger.debug(`Successfully stopped monitoring for ID: ${monitoringId}`);
          } catch (error) {
            notificationLogger.error(
              'Error importing WatchedAddressNotifier for cleanup, retrying once:',
              error,
            );

            // Wait and retry once
            try {
              await new Promise((resolve) => setTimeout(resolve, 100));
              const notifierModule = await import(
                '@/services/notifications/client/WatchedAddressNotifier'
              );
              const WatchedAddressNotifier = notifierModule.default;

              WatchedAddressNotifier.stopMonitoring(monitoringId);
              watchedAddressMonitoringIdRef.current = null;
              notificationLogger.debug(
                `Successfully stopped monitoring on retry for ID: ${monitoringId}`,
              );
            } catch (retryError) {
              notificationLogger.error(
                'Error cleaning up watched address monitoring after retry:',
                retryError,
              );
            }
          }
        };

        importWithRetry();
      }
    };
  }, []);

  // Load watched addresses when wallet changes or notifications are enabled
  useEffect(() => {
    // Skip if no address or notifications disabled
    if (!address || !preferences.enabled) return;

    // Load watched addresses and start monitoring
    const loadAndMonitorAddresses = async () => {
      try {
        // Import services dynamically with safer HMR-compatible pattern
        let WatchAddressService;
        let WatchedAddressNotifier;

        try {
          const serviceModule = await import('@/services/wallet/WatchAddressService');
          WatchAddressService = serviceModule.default;

          const notifierModule = await import(
            '@/services/notifications/client/WatchedAddressNotifier'
          );
          WatchedAddressNotifier = notifierModule.default;
        } catch (importError) {
          notificationLogger.error(
            'Failed to import notification services, retrying once:',
            importError,
          );
          // Wait a moment and try again - this can help with HMR issues
          await new Promise((resolve) => setTimeout(resolve, 100));

          const serviceModule = await import('@/services/wallet/WatchAddressService');
          WatchAddressService = serviceModule.default;

          const notifierModule = await import(
            '@/services/notifications/client/WatchedAddressNotifier'
          );
          WatchedAddressNotifier = notifierModule.default;
        }

        // Get all watched addresses
        const addresses = await WatchAddressService.getWatchedAddresses(address);

        if (addresses && addresses.length > 0) {
          notificationLogger.info(
            `Loaded ${addresses.length} watched addresses for wallet ${address}`,
          );

          // Store addresses for reference
          setWatchedAddresses(addresses.map((a) => a.watch_address));

          // Start monitoring with our utility class
          WatchedAddressNotifier.startMonitoring(
            address,
            addresses,
            (title, body, walletAddress) => {
              // This callback is triggered when a balance changes
              showNotification(title, body, '/icons/icon-192x192.png', walletAddress);
            },
          );
        } else {
          notificationLogger.debug(`No watched addresses found for wallet ${address}`);
        }
      } catch (error) {
        notificationLogger.error('Failed to load watched addresses:', error);
      }
    };

    loadAndMonitorAddresses();

    // Cleanup function - stop monitoring when component unmounts or address changes
    return () => {
      if (address) {
        // Use safer import with retry pattern
        const stopMonitoring = async () => {
          try {
            const notifierModule = await import(
              '@/services/notifications/client/WatchedAddressNotifier'
            );
            const WatchedAddressNotifier = notifierModule.default;

            WatchedAddressNotifier.stopMonitoring(address);
            notificationLogger.info(`Stopped monitoring for wallet: ${address}`);
          } catch (error) {
            notificationLogger.error(
              'Error importing WatchedAddressNotifier for cleanup, retrying once:',
              error,
            );

            // Wait and retry once
            try {
              await new Promise((resolve) => setTimeout(resolve, 100));
              const notifierModule = await import(
                '@/services/notifications/client/WatchedAddressNotifier'
              );
              const WatchedAddressNotifier = notifierModule.default;

              WatchedAddressNotifier.stopMonitoring(address);
              notificationLogger.info(`Stopped monitoring for wallet on retry: ${address}`);
            } catch (retryError) {
              notificationLogger.error('Failed to stop monitoring after retry:', retryError);
            }
          }
        };

        stopMonitoring();
      }
    };
  }, [address, preferences.enabled, setWatchedAddresses, showNotification]);

  // Request notification permission and enable
  const enableNotifications = async (): Promise<boolean> => {
    if (!isSupported) {
      notificationLogger.error('Notifications not supported in this browser');
      showAlertDialog(
        'Notifications Not Supported',
        'Your browser does not support the notification features required by this application.',
      );
      return false;
    }

    try {
      // Set up client-side notification system
      notificationLogger.info('Setting up client-side notification system...');

      // Initialize the client-side notification system
      NotificationClientService.setupLocalNotificationSystem();

      // Update preferences with appropriate flags
      const updatedPrefs = {
        ...preferences,
        enabled: true,
      };

      // Save preferences and update UI state
      const saved = saveGlobalNotificationPreferences(updatedPrefs);
      notificationLogger.debug(
        `Saved global notification preferences: ${JSON.stringify(updatedPrefs)}, success=${saved}`,
      );

      // Double check that localStorage was updated correctly
      const verifyStorage = localStorage.getItem('notification_settings');
      notificationLogger.debug(
        `Verification - localStorage['notification_settings'] = ${verifyStorage}`,
      );

      // Update React state
      setPreferences(updatedPrefs);
      setIsEnabled(true);

      // If the active wallet address exists, enable notifications for it too
      if (address) {
        try {
          notificationLogger.info(`Enabling notifications for active wallet: ${address}`);
          await NotificationClientService.saveWalletNotificationPreferences(address, {
            enabled: true,
          });
        } catch (walletError) {
          notificationLogger.error(
            `Failed to enable notifications for wallet ${address}:`,
            walletError,
          );
          // Non-fatal error, continue execution
        }
      }

      // Show confirmation
      showAlertDialog(
        'Notifications Enabled',
        "You've successfully enabled notifications. You'll receive notifications when the app is open and using your browser. " +
          'All notification data is stored locally on your device for privacy.',
      );

      return true;
    } catch (error) {
      notificationLogger.error('Failed to enable notifications:', error);

      // Show error dialog
      showAlertDialog(
        'Notification Setup Issue',
        "We couldn't enable notifications at this time. This could be due to browser settings or permission issues.",
      );

      return false;
    }
  };

  // Disable notifications - client-side only implementation
  const disableNotifications = useCallback(async () => {
    notificationLogger.debug('Disabling notifications for current browser');

    // Update local preferences first
    const updatedPrefs = { ...preferences, enabled: false };
    saveGlobalNotificationPreferences(updatedPrefs);
    setPreferences(updatedPrefs);
    setIsEnabled(false);

    try {
      // Clean up any local storage
      localStorage.removeItem('notificationPermission');

      // If there's an active wallet, disable its notifications too
      if (address) {
        await NotificationClientService.saveWalletNotificationPreferences(address, {
          enabled: false,
        });
      }

      notificationLogger.info('Successfully disabled notifications');
    } catch (error) {
      notificationLogger.error('Error during notification cleanup:', error);
    }
  }, [preferences, address]);

  // Update notification preferences
  const updatePreferences = async (prefs: Partial<NotificationPreferences>): Promise<boolean> => {
    try {
      const updatedPrefs = { ...preferences, ...prefs };
      notificationLogger.debug(
        `Updating notification preferences from ${JSON.stringify(preferences)} to ${JSON.stringify(updatedPrefs)}`,
      );

      // Save to localStorage
      const saved = saveGlobalNotificationPreferences(updatedPrefs);

      if (saved) {
        // Verify the save worked by reading from localStorage directly
        const verifyStorage = localStorage.getItem('notification_settings');
        notificationLogger.debug(
          `Verification - localStorage['notification_settings'] = ${verifyStorage}`,
        );

        // Update React state
        setPreferences(updatedPrefs);

        // If the enabled state changed, update the isEnabled state too
        if (prefs.enabled !== undefined && prefs.enabled !== preferences.enabled) {
          notificationLogger.debug(`Updating isEnabled state to ${prefs.enabled}`);
          setIsEnabled(prefs.enabled);
        }

        return true;
      } else {
        notificationLogger.error('Failed to save notification preferences to localStorage');
        return false;
      }
    } catch (error) {
      notificationLogger.error('Failed to update notification preferences:', error);
      return false;
    }
  };

  // Manually refresh price
  const refreshPrice = async (): Promise<number | null> => {
    try {
      const priceData = await PriceService.getAvnPrice(true); // Force fresh data

      if (priceData) {
        setCurrentAvnPrice(priceData.price);
        setPriceLastUpdated(priceData.lastUpdated);

        // Update stored price
        PriceService.saveLastKnownPrice(priceData.price);

        return priceData.price;
      }

      return null;
    } catch (error) {
      notificationLogger.error('Failed to refresh price:', error);
      return null;
    }
  };

  // Test notification - for manual triggering of notifications
  const testNotification = useCallback(async () => {
    // Check if browser supports notifications
    if (!isSupported) {
      notificationLogger.warn(
        'Cannot send test notification: Browser does not support notifications',
      );
      showAlertDialog(
        'Notifications Not Supported',
        'Your browser does not support notifications. Please use a modern browser that supports web notifications.',
      );
      return;
    }

    // Check if notifications are actually enabled
    if (!isEnabled) {
      notificationLogger.warn('Cannot send test notification: Global notifications are disabled');
      showAlertDialog(
        'Notifications Disabled',
        'Notifications are currently disabled. Please enable notifications first.',
      );
      return;
    }

    if (permissionState !== 'granted') {
      notificationLogger.warn(
        `Cannot send test notification: Permission is ${permissionState}, not granted`,
      );

      // Show appropriate dialog based on permission state
      if (permissionState === 'denied') {
        // For denied permissions, show instructions on how to enable in browser settings
        showAlertDialog(
          'Notifications Blocked',
          'Your browser is blocking notifications for this site. Please check your browser settings to allow notifications from this website. ' +
            'In most browsers, you can click the lock or info icon in the address bar to manage site permissions.',
        );
      } else {
        // For 'default' permission state, prompt to request permission
        showAlertDialog(
          'Permission Required',
          'You need to grant notification permission to receive notifications. Please enable notifications in your browser when prompted.',
        );

        // Attempt to request permission directly
        try {
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            // Permission was just granted, we can now proceed with the test notification
            notificationLogger.debug('Permission granted, proceeding with test notification');
            // Update the state to reflect the new permission
            setPermissionState('granted');
          } else {
            notificationLogger.warn(`Permission request resulted in: ${permission}`);
          }
        } catch (error) {
          notificationLogger.error('Error requesting notification permission:', error);
        }
      }
      return;
    }

    // Check wallet-specific notification setting
    if (address) {
      try {
        const walletEnabled = await NotificationClientService.isWalletNotificationEnabled(address);

        if (!walletEnabled) {
          notificationLogger.warn(
            `Notifications disabled for wallet ${address}. Please enable them in settings first.`,
          );
          showAlertDialog(
            'Wallet Notifications Disabled',
            'Notifications are disabled for this wallet. Please enable them in settings to receive notifications.',
          );
          return;
        }
      } catch (error) {
        notificationLogger.error(
          `Error checking notification status for wallet ${address}:`,
          error,
        );
        // Continue with test notification on error
      }

      // Alert user that wallet notifications may have been enabled for testing
      const testMessage = `This is a test notification sent at ${new Date().toLocaleTimeString()}`;

      // Check if wallet notifications were just enabled
      const walletEnabled = await NotificationClientService.isWalletNotificationEnabled(address);
      const finalMessage =
        testMessage +
        (walletEnabled
          ? '\n\nNote: Wallet notifications are now enabled for this wallet.'
          : '\n\nNote: Wallet notifications are currently disabled for this wallet.');

      // Use the local notification system
      try {
        // Try the client service method first (best option)
        const testNotificationSent = await NotificationClientService.displayTestNotification();
        if (!testNotificationSent) {
          // Fall back to our local notification handler
          showNotification(
            'Test Notification',
            finalMessage,
            '/icons/icon-192x192.png',
            address, // Pass wallet address to check notification settings
          );
        }
      } catch (error) {
        // Fallback to basic notification if there's an error
        showNotification(
          'Test Notification',
          finalMessage,
          '/icons/icon-192x192.png',
          address, // Pass wallet address to check notification settings
        );
      }
    } else {
      // No wallet address available

      // Use the local notification system
      try {
        // Try the client service method first (best option)
        const testNotificationSent = await NotificationClientService.displayTestNotification();
        if (!testNotificationSent) {
          // Fall back to our local notification handler
          showNotification(
            'Test Notification',
            `This is a test notification sent at ${new Date().toLocaleTimeString()}`,
            '/icons/icon-192x192.png',
          );
        }
      } catch (error) {
        // Fallback to basic notification if there's an error
        showNotification(
          'Test Notification',
          `This is a test notification sent at ${new Date().toLocaleTimeString()}`,
          '/icons/icon-192x192.png',
        );
      }
    }

    // This function has been replaced with direct calls to NotificationClientService.displayTestNotification
  }, [isSupported, isEnabled, permissionState, showNotification, address, showAlertDialog]);

  return (
    <NotificationContext.Provider
      value={{
        isSupported,
        isEnabled,
        permissionState,
        preferences,
        currentAvnPrice,
        priceLastUpdated,
        watchedAddresses,
        enableNotifications,
        disableNotifications,
        updatePreferences,
        refreshPrice,
        showNotification,
        testNotification, // Expose testNotification in context
        loadWatchedAddresses,
      }}
    >
      {/* Render the alert dialog */}
      <NotificationAlert
        open={alertDialogOpen}
        onClose={() => setAlertDialogOpen(false)}
        title={alertDialogTitle}
        message={alertDialogMessage}
      />
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
