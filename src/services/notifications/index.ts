/**
 * Notification Services
 * This file exports all notification-related services
 *
 * Client-side only implementation for maximum privacy
 */

// Client-side services
export { NotificationClientService } from './client/NotificationClientService';
export { TransactionClientService } from './client/TransactionClientService';
export { WatchedAddressHistoryService } from './client/WatchedAddressHistoryService';
export { WatchedAddressNotifier } from './client/WatchedAddressNotifier';
export { SecurityNotificationService } from './client/SecurityNotificationService';

// Export notification types
export type {
  WalletNotificationPreferences,
  NotificationRecord,
  TransactionMemory,
  BalanceRecord,
  NotificationServiceConfig,
  NotificationResult,
  NotificationType,
} from './NotificationTypes';
