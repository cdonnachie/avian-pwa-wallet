import { SecurityAction, SecurityAuditEntry } from '@/types/security';
import { NotificationClientService } from './NotificationClientService';
import { notificationLogger } from '@/lib/Logger';

/**
 * Service to connect security events to notifications
 * This service listens for security events and decides which ones should
 * trigger user notifications based on their importance and criticality
 */
export class SecurityNotificationService {
  /**
   * Process a security event and potentially send a notification
   * @param entry Security audit entry to process
   */
  static async processSecurityEvent(entry: SecurityAuditEntry): Promise<void> {
    try {
      // Don't notify on successful events except for specific ones
      if (entry.success && !this.isNotifiableSuccessEvent(entry.action)) {
        return;
      }

      // Get notification data based on the event type
      const notification = this.getNotificationForEvent(entry);

      // If no notification data returned, don't notify
      if (!notification) {
        return;
      }

      // Send the security alert notification
      if (entry.walletAddress) {
        await NotificationClientService.createSecurityAlert(
          entry.walletAddress,
          notification.title,
          notification.body,
          {
            action: entry.action,
            timestamp: entry.timestamp,
            details: entry.details,
            success: entry.success,
          },
        );
      }
    } catch (error) {
      notificationLogger.error('Error processing security event for notification:', error);
    }
  }

  /**
   * Determine if a successful event should still trigger a notification
   * @param action Security action type
   */
  private static isNotifiableSuccessEvent(action: SecurityAction): boolean {
    // These successful events are important enough to notify the user
    const notifiableSuccessActions: SecurityAction[] = [
      'mnemonic_export',
      'private_key_export',
      'backup_create',
      'backup_restore',
      'wallet_import',
    ];

    return notifiableSuccessActions.includes(action);
  }

  /**
   * Get notification content based on the event type
   * @param entry Security audit entry
   */
  private static getNotificationForEvent(
    entry: SecurityAuditEntry,
  ): { title: string; body: string } | null {
    const { action, success, details } = entry;

    // Define notification content by action type and success status
    switch (action) {
      // Critical security events - always notify
      case 'mnemonic_export':
        return {
          title: 'Security Alert: Mnemonic Exported',
          body: success
            ? 'Your wallet recovery phrase was successfully exported.'
            : 'Failed attempt to export your wallet recovery phrase.',
        };

      case 'private_key_export':
        return {
          title: 'Security Alert: Private Key Exported',
          body: success
            ? 'Your wallet private key was successfully exported.'
            : 'Failed attempt to export your wallet private key.',
        };

      case 'backup_create':
        return {
          title: 'Wallet Backup Created',
          body: success
            ? 'Your wallet backup was successfully created.'
            : 'Failed to create wallet backup.',
        };

      case 'backup_restore':
        return {
          title: 'Wallet Backup Restored',
          body: success
            ? 'Your wallet was successfully restored from backup.'
            : 'Failed to restore wallet from backup.',
        };

      // Authentication failures - notify only on failures
      case 'password_auth':
        if (!success) {
          return {
            title: 'Failed Authentication Attempt',
            body: 'Someone attempted to unlock your wallet with an incorrect password.',
          };
        }
        return null;

      case 'biometric_auth':
        if (!success) {
          return {
            title: 'Failed Biometric Authentication',
            body: 'Failed biometric authentication attempt on your wallet.',
          };
        }
        return null;

      // Wallet operations - notify on imports, skip routine operations
      case 'wallet_import':
        return {
          title: 'Wallet Imported',
          body: success
            ? 'A new wallet was successfully imported.'
            : 'Failed attempt to import a wallet.',
        };

      // Skip notifications for routine events
      case 'wallet_lock':
      case 'wallet_unlock':
      case 'auto_lock_triggered':
      case 'biometric_setup':
      case 'wallet_create':
        return null;

      // Only notify about settings changes on failures
      case 'settings_change':
        if (!success) {
          return {
            title: 'Settings Change Failed',
            body: 'An attempt to change security settings failed.',
          };
        }
        return null;

      // Transaction signing - notify only on failures
      case 'transaction_sign':
        if (!success) {
          return {
            title: 'Transaction Signing Failed',
            body: 'Failed to sign a transaction. Your funds remain secure.',
          };
        }
        return null;

      // Unknown events - notify with generic message
      default:
        if (!success) {
          return {
            title: 'Security Alert',
            body: `Security event: ${details || action}`,
          };
        }
        return null;
    }
  }
}
