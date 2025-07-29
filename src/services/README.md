# Services Architecture

This directory contains all the service modules that provide core functionality to the Avian FlightDeck Wallet application. Services are organized by their functional domain to improve maintainability and scalability.

## Directory Structure

```
services/
├── core/             # Fundamental services used by other services
├── data/             # Data-related services (price, etc.)
├── notifications/    # Notification-related services
├── wallet/           # Wallet and transaction-related services
└── index.ts          # Main export file
```

## Service Dependencies

```
+----------------+      +------------------+
| WalletService  |----->| ElectrumService  |
+----------------+      +------------------+
       |                       |
       |                       |
       v                       v
+----------------+      +------------------+
| WatchAddress   |----->| StorageService   |
| Service        |      +------------------+
+----------------+            ^
       |                      |
       v                      |
+----------------+      +------------------+
| WatchedAddress |----->| Notification     |
| Notifier       |      | ClientService    |
+----------------+      +------------------+
       |                       ^
       v                       |
+----------------+      +------------------+
| Transaction    |----->| StorageService   |
| ClientService  |      +------------------+
+----------------+            ^
                              |
+----------------+            |
| PriceService   |------------+
+----------------+
```

## Service Categories

### Core Services

Foundation services that provide essential functionality:

- `StorageService` - Manages data persistence
- `ElectrumService` - Handles Electrum server communications
- `SecurityService` - Provides security features like encryption
- `BackupService` - Manages wallet backup functionality
- `TermsService` - Handles terms and conditions acceptance

### Notification Services

Services related to notifications and messaging:

- `NotificationClientService` - Main notification coordination service for client-side
- `TransactionClientService` - Transaction-specific notifications
- `WatchedAddressHistoryService` - Manages address history for notifications
- `WatchedAddressNotifier` - Monitors addresses for balance changes and notifies users

### Wallet Services

Services related to wallet functionality:

- `WalletService` - Main wallet management service
- `UTXOSelectionService` - Handles UTXO selection for transactions
- `WatchAddressService` - Manages watched addresses

### Data Services

Services that handle external data:

- `PriceService` - Manages cryptocurrency price information

## Usage

Import services using the categorized exports:

```typescript
// Import by category
import { StorageService, ElectrumService } from '@/services/core';
import { NotificationClientService, TransactionClientService } from '@/services/notifications';
import { WalletService, WatchAddressService } from '@/services/wallet';
import { PriceService } from '@/services/data';

// Or import from the main index
import { StorageService, NotificationClientService, WalletService } from '@/services';
```

## Type Definitions

Common types are exported from the services module to ensure consistency:

```typescript
// Import types directly from service categories
import type { WatchAddress } from '@/services/wallet';
import type { WalletNotificationPreferences, NotificationType } from '@/services/notifications';

// Or from the main index
import type { WatchAddress, WalletNotificationPreferences, NotificationType } from '@/services';
```

### Available Types

- `WatchAddress` - Interface for watched address data
- `WalletNotificationPreferences` - Per-wallet notification settings
- `NotificationType` - Types of notifications supported
- `NotificationRecord` - Record of a displayed notification
- `TransactionMemory` - Transaction history for notification tracking
- `BalanceRecord` - Wallet balance tracking information
- `NotificationServiceConfig` - Notification service configuration

## Implementation Patterns

The services follow consistent implementation patterns:

### Static Service Classes

Most services are implemented as static classes with class methods:

```typescript
export class StorageService {
  static async getSettings() {
    /* ... */
  }
  static async setSettings(settings) {
    /* ... */
  }
}
```

### Client-Side Services

Notification services are implemented as client-side only services for enhanced privacy:

```typescript
export class NotificationClientService {
  static async requestPermission() {
    /* ... */
  }

  static async sendNotification(title, options) {
    /* ... */
  }
}

export class WatchedAddressNotifier {
  constructor() {
    // Initialize monitoring
  }

  startMonitoring() {
    /* ... */
  }
}
```
