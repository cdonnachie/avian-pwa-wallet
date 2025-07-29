# Notifications System

This document provides comprehensive information about the client-side notification system in the Avian FlightDeck Wallet.

## Table of Contents

1. [Overview](#overview)
2. [Client-Side Architecture](#client-side-architecture)
3. [Wallet-Specific Settings](#wallet-specific-settings)
4. [Local Storage Structure](#local-storage-structure)
5. [Implementation Details](#implementation-details)
6. [Privacy Considerations](#privacy-considerations)
7. [Testing & Troubleshooting](#testing--troubleshooting)
8. [Recent Improvements](#recent-improvements)

## Overview

The Avian FlightDeck Wallet implements a robust client-side notification system that allows users to:

- Receive browser notifications about wallet transactions
- Get security alerts directly in the browser
- Stay updated on balance changes via local notifications
- Control which wallets trigger notifications
- Manage notification settings on a per-device basis

## Client-Side Architecture

The notification system uses a fully client-side architecture that relies on the browser's Web Notifications API. This approach:

1. Eliminates the need for server-side notification storage
2. Improves privacy by keeping all notification data local to the device
3. Uses service workers to handle background notification delivery
4. Stores notification preferences in IndexedDB for persistence

This approach provides several benefits:

- Enhanced privacy with no server-side data storage of notification preferences
- Simplified architecture with no dependencies on external push services
- Improved reliability without network connectivity requirements after initial setup
- Faster notification delivery for events detected by the wallet

## Wallet-Specific Settings

The wallet-specific notification feature allows users to enable or disable notifications for each wallet individually, providing granular control over which wallets trigger notifications.

Default behavior:

- New wallets have notifications enabled by default
- When enabling wallet notifications for the first time, global notifications are also enabled

## Local Storage Structure

The client-side notification system uses client-side storage for data persistence:

1. **Notification Preferences**
   - Stored in local device storage
   - Contains global notification settings and per-wallet preferences
   - Accessible via the StorageService API

2. **Watched Address Balances**
   - Tracks balance history for watched addresses
   - Stored in local device storage under 'watched_address_balances'
   - Used to determine when balance changes occur

3. **Service Worker Registration**
   - Browser's service worker registration for background notification support
   - Handles notification display even when the app is closed
   - Manages notification click events and actions

4. **Notification Permission**
   - Browser's notification permission status
   - Required to be "granted" for notifications to work
   - Stored by the browser, not by the application

## Implementation Details

### Browser Notification API

The system uses the standard Web Notifications API provided by browsers:

```typescript
// Request permission
const permission = await Notification.requestPermission();

// Create and show a notification
if (permission === 'granted') {
  new Notification('Title', {
    body: 'Notification message',
    icon: '/icons/icon-192x192.png',
  });
}
```

### Service Worker Integration

Service workers are used to handle notifications when the app is not active:

```typescript
// Register notification-capable service worker
navigator.serviceWorker.register('/sw.js', {
  scope: '/',
  updateViaCache: 'none',
});
```

### Registration Flow

1. User enables notifications in settings
2. Browser notification permission is requested
3. Service worker registration is confirmed
4. Notification preferences are stored in local storage
5. Wallet-specific notification settings are configured

### Notification Delivery

When sending a notification:

1. Check if notifications are globally enabled
2. If wallet-specific, check wallet notification preferences
3. Create appropriate notification content based on event type
4. Display notification using the browser's API or service worker

### Key Components

- **NotificationSettings.tsx**: UI for managing notification preferences
- **NotificationContext.tsx**: Context provider for notification state
- **ServiceWorkerRegistrar.tsx**: Registers service worker for notifications
- **WatchedAddressMonitor.tsx**: Monitors for address changes
- **ElectrumManager.tsx**: Detects blockchain events for notifications

## Privacy Considerations

The client-side notification system offers excellent privacy characteristics:

Key privacy features:

- All notification data is stored locally on the device
- No transmission of wallet addresses to external servers for notification purposes
- No tracking identifiers used for notification delivery
- Browser notification permissions can be revoked at any time
- Notifications are generated locally from blockchain data via Electrum servers

## Testing & Troubleshooting

To test the notification system:

1. Enable notifications in the app settings
2. Use the "Test Notification" button to send a test notification
3. Check browser console for debugging information

If notifications aren't working:

1. Check browser permission status (should be "granted")
2. Verify that the service worker is registered correctly
3. Check if local storage contains proper notification preferences
4. Verify that watched addresses are properly configured
5. Check browser compatibility (Web Notifications API support)

Common issues:

- Permissions denied in browser settings
- Service worker registration failure
- Browser restrictions on background notifications
- Private browsing mode limitations

## Recent Improvements

### Notification Storage Consolidation

Previously, watched address balance history was stored separately. This has now been consolidated:

- Watched address balances are now stored in the main wallet storage
- Migration code automatically transfers data from the old storage
- Improved performance by reducing storage operations
- Better data consistency with a single source of truth

### Multiple Browser Support

Notifications now work independently across different browsers:

- Each browser instance maintains its own notification settings
- Enabling or disabling notifications on one device doesn't affect others
- Better support for users who access their wallets from multiple browsers

### Improved Cleanup

When notifications are disabled:

- All notification-related data is properly cleaned up
- Service worker registration is maintained but notifications are suppressed
- Users can easily re-enable notifications without reconfiguration
- Application performance is not impacted by disabled notifications
