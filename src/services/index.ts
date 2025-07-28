/**
 * Avian Wallet Services
 *
 * This file provides a centralized export for all services in the application.
 * Services are organized into logical categories for better maintainability.
 *
 * Recommended import pattern:
 *
 * ```
 * // Import by category (recommended)
 * import { StorageService } from '@/services/core';
 * import { NotificationService } from '@/services/notifications';
 *
 * // Or import from main services index (convenient but less explicit)
 * import { StorageService, NotificationService } from '@/services';
 * ```
 *
 * @see /services/README.md for full documentation
 */

// ============================================================
// Export services by category
// ============================================================

// Core services - fundamental functionality used by other services
export * from './core';

// Notification services - related to user notifications
export * from './notifications';

// Wallet services - related to wallet management and transactions
export * from './wallet';

// Data services - handling external data like prices
export * from './data';

// ============================================================
// Export individual services for backward compatibility
// ============================================================
// These direct exports allow existing code to work without immediate changes
// Future code should use the categorized imports above

// Core Services
export { StorageService } from './core/StorageService';
export { ElectrumService } from './core/ElectrumService';
export { SecurityService } from './core/SecurityService';
export { BackupService } from './core/BackupService';
export { TermsService } from './core/TermsService';

// Notification Services
export { NotificationClientService } from './notifications/client/NotificationClientService';
export { TransactionClientService } from './notifications/client/TransactionClientService';
export { WatchedAddressHistoryService } from './notifications/client/WatchedAddressHistoryService';
export { WatchedAddressNotifier } from './notifications/client/WatchedAddressNotifier';

// Wallet Services
export { WalletService } from './wallet/WalletService';
export { UTXOSelectionService } from './wallet/UTXOSelectionService';
export { WatchAddressService } from './wallet/WatchAddressService';

// Data Services
export { PriceService } from './data/PriceService';

// ============================================================
// Types
// ============================================================
// Export common types used across services
export type { WatchAddress } from './wallet/WatchAddressService';
export type {
  WalletNotificationPreferences,
  NotificationRecord,
  TransactionMemory,
  BalanceRecord,
  NotificationServiceConfig,
  NotificationResult,
} from './notifications/NotificationTypes';
export type { NotificationType } from './notifications/NotificationTypes';
