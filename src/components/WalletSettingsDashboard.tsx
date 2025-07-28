'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  ChevronRight,
  Download,
  Copy,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Lock,
  Unlock,
  Eye,
  QrCode,
  Bug,
  Wallet,
  Info,
} from 'lucide-react';
import { useWallet } from '@/contexts/WalletContext';

// Import existing components
import MnemonicModal from './MnemonicModal';
import { WalletManager } from './WalletManager';
import BackupDrawer from './BackupDrawer';
import { BackupQRModal } from './BackupQRModal';
import SecuritySettingsPanel from './SecuritySettingsPanel';
import NotificationSettings from './NotificationSettings';
import WatchAddressesPanel from './WatchAddressesPanel';
import MessageUtilities from './MessageUtilities';
import DerivedAddressesPanel from './DerivedAddressesPanel';
import AuthenticationDialog from './AuthenticationDialog';
import { LogViewer } from './LogViewer';
import AboutModal from './AboutModal';
import { StorageService } from '@/services/core/StorageService';
import { toast } from 'sonner';

// Import Shadcn UI components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { useMediaQuery } from '@/hooks/use-media-query';

type CategoryType = 'wallet' | 'security' | 'backup' | 'notifications' | 'advanced' | 'help';

const CATEGORIES: Record<string, CategoryType> = {
  WALLET: 'wallet',
  SECURITY: 'security',
  BACKUP: 'backup',
  NOTIFICATIONS: 'notifications',
  ADVANCED: 'advanced',
  HELP: 'help',
};

// Shared content components for both Dialog and Drawer
interface EncryptionDialogContentProps {
  isEncrypted: boolean;
  isLoading: boolean;
  password: string;
  setPassword: React.Dispatch<React.SetStateAction<string>>;
  newPassword: string;
  setNewPassword: React.Dispatch<React.SetStateAction<string>>;
  confirmPassword: string;
  setConfirmPassword: React.Dispatch<React.SetStateAction<string>>;
  error: string;
  setError: React.Dispatch<React.SetStateAction<string>>;
  setShowWalletEncryption: React.Dispatch<React.SetStateAction<boolean>>;
  handleDecryptWallet: () => Promise<void>;
  handleEncryptWallet: () => Promise<void>;
  isDrawer?: boolean;
}

// Interface for the shared Repair Transaction History content component
interface RepairTransactionHistoryContentProps {
  repairStatus: 'idle' | 'scanning' | 'repairing' | 'completed' | 'failed';
  repairProgress: number;
  repairDetails: string;
  foundIssues: number;
  fixedIssues: number;
  handleRepairTransactionHistory: () => void;
  setShowRepairHistory: React.Dispatch<React.SetStateAction<boolean>>;
  setRepairStatus: React.Dispatch<
    React.SetStateAction<'idle' | 'scanning' | 'repairing' | 'completed' | 'failed'>
  >;
  setRepairProgress: React.Dispatch<React.SetStateAction<number>>;
  isDrawer?: boolean;
}

function RepairTransactionHistoryContent({
  repairStatus,
  repairProgress,
  repairDetails,
  foundIssues,
  fixedIssues,
  handleRepairTransactionHistory,
  setShowRepairHistory,
  setRepairStatus,
  setRepairProgress,
  isDrawer = false,
}: RepairTransactionHistoryContentProps) {
  return (
    <div className="space-y-4">
      {repairStatus === 'idle' && (
        <>
          <Alert className="bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800">
            <AlertTitle>Note</AlertTitle>
            <AlertDescription className="text-amber-800 dark:text-amber-300">
              This tool attempts to fix issues with your transaction history, such as missing or
              misclassified transactions. It may take some time to complete.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <p>The repair process will:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Fix misclassified transactions</li>
              <li>Reprocess the entire transaction history</li>
              <li>Synchronize with the blockchain</li>
              <li>Recalculate your wallet balance</li>
            </ul>

            {isDrawer ? (
              <div className="flex flex-col gap-4 mt-8">
                <Button
                  onClick={handleRepairTransactionHistory}
                  className="bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-400 py-6"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Start Repair
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowRepairHistory(false)}
                  className="py-6"
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowRepairHistory(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleRepairTransactionHistory}
                  className="bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-400"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Start Repair
                </Button>
              </DialogFooter>
            )}
          </div>
        </>
      )}

      {(repairStatus === 'scanning' || repairStatus === 'repairing') && (
        <div className="space-y-4">
          <p className="mb-2">
            {repairStatus === 'scanning'
              ? 'Scanning for issues...'
              : 'Repairing transaction history...'}
          </p>

          <Progress value={repairProgress} className="h-2" />

          <p className="text-sm text-muted-foreground">{repairDetails}</p>

          <div className="flex justify-center">
            <RefreshCw className="w-8 h-8 text-amber-600 dark:text-amber-400 animate-spin" />
          </div>
        </div>
      )}

      {repairStatus === 'completed' && (
        <div className="space-y-4">
          <div className="flex items-center justify-center text-green-500 mb-4">
            <CheckCircle className="w-16 h-16" />
          </div>

          <h3 className="text-lg font-medium text-center">Repair Completed</h3>

          <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-2 text-center">
              <div>
                <p className="text-sm text-muted-foreground">Issues Found</p>
                <p className="text-xl font-bold">{foundIssues}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Issues Fixed</p>
                <p className="text-xl font-bold">{fixedIssues}</p>
              </div>
            </div>
          </div>

          <p className="text-sm">{repairDetails}</p>

          <Button
            onClick={() => {
              setShowRepairHistory(false);
              setRepairStatus('idle');
              setRepairProgress(0);
            }}
            className={`w-full ${isDrawer ? 'py-6' : ''}`}
            variant="secondary"
          >
            Close
          </Button>
        </div>
      )}

      {repairStatus === 'failed' && (
        <div className="space-y-4">
          <div className="flex items-center justify-center text-red-500 mb-4">
            <AlertTriangle className="w-16 h-16" />
          </div>

          <h3 className="text-lg font-medium text-center">Repair Failed</h3>

          <Alert variant="destructive">
            <AlertDescription>{repairDetails}</AlertDescription>
          </Alert>

          {isDrawer ? (
            <div className="flex flex-col gap-4">
              <Button
                onClick={handleRepairTransactionHistory}
                className="bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-400 py-6"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
              <Button
                onClick={() => {
                  setShowRepairHistory(false);
                  setRepairStatus('idle');
                  setRepairProgress(0);
                }}
                variant="outline"
                className="py-6"
              >
                Close
              </Button>
            </div>
          ) : (
            <div className="flex space-x-2">
              <Button
                onClick={() => {
                  setShowRepairHistory(false);
                  setRepairStatus('idle');
                  setRepairProgress(0);
                }}
                variant="outline"
                className="flex-1"
              >
                Close
              </Button>
              <Button
                onClick={handleRepairTransactionHistory}
                className="flex-1 bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-400"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Interface for the shared Private Key Export content component
interface PrivateKeyExportContentProps {
  exportedKey: string;
  isLoading: boolean;
  handleExportPrivateKey: () => void;
  copyToClipboard: (text: string) => void;
  setExportedKey: React.Dispatch<React.SetStateAction<string>>;
  setPassword: React.Dispatch<React.SetStateAction<string>>;
  isDrawer?: boolean;
}

function PrivateKeyExportContent({
  exportedKey,
  isLoading,
  handleExportPrivateKey,
  copyToClipboard,
  setExportedKey,
  setPassword,
  isDrawer = false,
}: PrivateKeyExportContentProps) {
  return (
    <div className="space-y-4 py-2">
      <Alert className="bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800">
        <AlertTitle>Warning</AlertTitle>
        <AlertDescription className="text-yellow-800 dark:text-yellow-300">
          Your private key gives full access to your funds. Never share it with anyone and store it
          securely.
        </AlertDescription>
      </Alert>

      {!exportedKey ? (
        <Button
          onClick={handleExportPrivateKey}
          disabled={isLoading}
          className={`bg-avian-600 hover:bg-avian-700 w-full ${isDrawer ? 'py-6' : ''}`}
        >
          {isLoading ? 'Authenticating...' : 'Reveal Private Key'}
        </Button>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Your Private Key:</label>
            <div className="relative">
              <Textarea
                readOnly
                value={exportedKey}
                className="font-mono text-xs h-24 resize-none pr-10"
              />
              <Button
                onClick={() => copyToClipboard(exportedKey)}
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8"
                title="Copy to clipboard"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Button
            onClick={() => {
              setExportedKey('');
              setPassword('');
            }}
            variant="secondary"
            className={`w-full ${isDrawer ? 'py-6' : ''}`}
          >
            Clear and Close
          </Button>
        </div>
      )}
    </div>
  );
}

function EncryptionDialogContent({
  isEncrypted,
  isLoading,
  password,
  setPassword,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  error,
  setError,
  setShowWalletEncryption,
  handleDecryptWallet,
  handleEncryptWallet,
  isDrawer = false,
}: EncryptionDialogContentProps) {
  return (
    <>
      <Alert className="bg-avian-50 dark:bg-avian-900/30 border-avian-200 dark:border-avian-800">
        <AlertDescription className="text-avian-800 dark:text-avian-300">
          {isEncrypted ? (
            <strong>Decrypting your wallet will remove the password protection.</strong>
          ) : (
            <strong>Encrypting your wallet adds password protection for better security.</strong>
          )}
        </AlertDescription>
      </Alert>

      <div className="py-5">
        {isEncrypted ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your wallet password"
                autoComplete="current-password"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="new-password" className="block text-sm font-medium">
                New Password
              </label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter a strong password"
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="confirm-password" className="block text-sm font-medium">
                Confirm Password
              </label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                autoComplete="new-password"
              />
            </div>
          </div>
        )}

        {isDrawer ? (
          <div className="flex flex-col gap-4 mt-8">
            <Button
              onClick={isEncrypted ? handleDecryptWallet : handleEncryptWallet}
              className="bg-avian-600 hover:bg-avian-700 dark:bg-avian-500 dark:hover:bg-avian-400 py-6"
              disabled={
                isLoading ||
                (!isEncrypted && (!newPassword || newPassword !== confirmPassword)) ||
                (isEncrypted && !password)
              }
            >
              {isLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : isEncrypted ? (
                <>
                  <Unlock className="mr-2 h-4 w-4" />
                  Decrypt Wallet
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  Encrypt Wallet
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowWalletEncryption(false);
                setPassword('');
                setNewPassword('');
                setConfirmPassword('');
                setError('');
              }}
              className="py-6"
            >
              Cancel
            </Button>
          </div>
        ) : (
          <DialogFooter className="gap-4 mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setShowWalletEncryption(false);
                setPassword('');
                setNewPassword('');
                setConfirmPassword('');
                setError('');
              }}
              className="min-w-[100px]"
            >
              Cancel
            </Button>
            <Button
              onClick={isEncrypted ? handleDecryptWallet : handleEncryptWallet}
              className="bg-avian-600 hover:bg-avian-700 dark:bg-avian-500 dark:hover:bg-avian-400 min-w-[140px]"
              disabled={
                isLoading ||
                (!isEncrypted && (!newPassword || newPassword !== confirmPassword)) ||
                (isEncrypted && !password)
              }
            >
              {isLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : isEncrypted ? (
                <>
                  <Unlock className="mr-2 h-4 w-4" />
                  Decrypt Wallet
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  Encrypt Wallet
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </div>
    </>
  );
}

export default function WalletSettingsDashboard() {
  const {
    address,
    reloadActiveWallet,
    exportPrivateKey,
    refreshTransactionHistory,
    cleanupMisclassifiedTransactions,
    reprocessTransactionHistory,
    updateBalance,
    encryptWallet,
    decryptWallet,
    isEncrypted,
  } = useWallet();

  // State variables for repair transaction history
  const [repairStatus, setRepairStatus] = useState<
    'idle' | 'scanning' | 'repairing' | 'completed' | 'failed'
  >('idle');
  const [repairProgress, setRepairProgress] = useState(0);
  const [repairDetails, setRepairDetails] = useState('');
  const [foundIssues, setFoundIssues] = useState(0);
  const [fixedIssues, setFixedIssues] = useState(0);

  // State variables for private key export
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [exportedKey, setExportedKey] = useState('');

  // State variables for wallet encryption/decryption
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showWalletEncryption, setShowWalletEncryption] = useState(false);

  // QR code backup/restore state
  const [showQRBackup, setShowQRBackup] = useState(false);

  // Use media query to determine if we're on mobile
  const isMobile = useMediaQuery('(max-width: 640px)');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal states
  const [showMnemonicModal, setShowMnemonicModal] = useState(false);
  const [showWalletManager, setShowWalletManager] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showSecuritySettings, setShowSecuritySettings] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [showWatchAddresses, setShowWatchAddresses] = useState(false);
  const [showMessageUtilities, setShowMessageUtilities] = useState(false);
  const [showDerivedAddresses, setShowDerivedAddresses] = useState(false);
  const [showPrivateKeyExport, setShowPrivateKeyExport] = useState(false);
  const [showRepairHistory, setShowRepairHistory] = useState(false);
  const [showLogViewer, setShowLogViewer] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [mnemonicModalMode, setMnemonicModalMode] = useState<'export' | 'import'>('export');

  // Change address count setting state
  const [changeAddressCount, setChangeAddressCount] = useState(5);
  const [showChangeAddressSettings, setShowChangeAddressSettings] = useState(false);

  // Load change address count preference on component mount
  useEffect(() => {
    const loadChangeAddressCount = async () => {
      try {
        const count = await StorageService.getChangeAddressCount();
        setChangeAddressCount(count);
      } catch (error) {
        // Silently fail and use default value
      }
    };
    loadChangeAddressCount();
  }, []);

  // Handle change address count setting change
  const handleChangeAddressCountChange = async (newCount: number) => {
    try {
      await StorageService.setChangeAddressCount(newCount);
      setChangeAddressCount(newCount);

      // Clear any cached change addresses in localStorage to force reload
      // This ensures the SendForm will load the new count of addresses
      localStorage.removeItem('avian_wallet_change_addresses_cache');

      toast.success(`Change address count updated to ${newCount}`, {
        description: 'Change addresses will be reloaded with the new count when needed',
      });
    } catch (error) {
      toast.error('Failed to update change address count setting');
    }
  };

  const handleExportPrivateKey = () => {
    // Show authentication dialog instead of directly requesting the password
    setShowAuthDialog(true);
  };

  // This will be called when authentication is successful
  const handleAuthenticationComplete = async (password: string) => {
    try {
      setShowAuthDialog(false); // Hide authentication dialog
      setIsLoading(true);
      setError('');
      const key = await exportPrivateKey(password || undefined);
      setExportedKey(key);
      setSuccess('Private key exported successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      setError(error.message || 'Failed to export private key');
      setTimeout(() => setError(''), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copied to clipboard!');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleRepairTransactionHistory = async () => {
    if (!address) return;

    try {
      setRepairStatus('scanning');
      setRepairProgress(10);
      setRepairDetails('Scanning for issues in transaction history...');

      // Small delay to show progress UI
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Step 1: Cleanup misclassified transactions
      setRepairProgress(30);
      setRepairDetails('Cleaning up misclassified transactions...');
      const fixedMisclassified = await cleanupMisclassifiedTransactions();

      // Step 2: Reprocess transaction history
      setRepairStatus('repairing');
      setRepairProgress(50);
      setRepairDetails('Reprocessing transaction history...');
      const fixedTransactions = await reprocessTransactionHistory();

      // Step 3: Refresh transaction history to get latest data
      setRepairProgress(80);
      setRepairDetails('Refreshing transaction data...');
      await refreshTransactionHistory();

      // Step 4: Update balance
      setRepairProgress(90);
      setRepairDetails('Updating wallet balance...');
      await updateBalance();

      // Complete
      setRepairProgress(100);
      setRepairStatus('completed');
      setFoundIssues(fixedMisclassified + fixedTransactions);
      setFixedIssues(fixedMisclassified + fixedTransactions);
      setRepairDetails(`Repair completed. Fixed ${fixedMisclassified + fixedTransactions} issues.`);

      setSuccess(
        `Transaction history repaired successfully! Fixed ${fixedMisclassified + fixedTransactions} issues.`,
      );
      setTimeout(() => setSuccess(''), 5000);
    } catch (error: any) {
      setRepairStatus('failed');
      setError(`Failed to repair transaction history: ${error.message || 'Unknown error'}`);
      setRepairDetails('Repair process failed. Please try again later.');
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleEncryptWallet = async () => {
    if (!newPassword || newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setTimeout(() => setError(''), 5000);
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      await encryptWallet(newPassword);
      setSuccess('Wallet encrypted successfully!');
      setTimeout(() => setSuccess(''), 3000);

      // Reset form and close modal
      setNewPassword('');
      setConfirmPassword('');
      setShowWalletEncryption(false);
    } catch (error: any) {
      setError(error.message || 'Failed to encrypt wallet');
      setTimeout(() => setError(''), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecryptWallet = async () => {
    if (!password) {
      setError('Please enter your password');
      setTimeout(() => setError(''), 5000);
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      await decryptWallet(password);
      setSuccess('Wallet decrypted successfully!');
      setTimeout(() => setSuccess(''), 3000);

      // Reset form and close modal
      setPassword('');
      setShowWalletEncryption(false);
    } catch (error: any) {
      setError(error.message || 'Failed to decrypt wallet');
      setTimeout(() => setError(''), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center">
        <Settings className="w-6 h-6 mr-2 text-avian-600" />
        <h1 className="text-xl font-medium">Settings</h1>
      </div>

      {/* Status Messages */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Settings Dashboard */}
      <Accordion type="single" collapsible className="w-full space-y-4">
        {/* Wallet Management */}
        <AccordionItem value="wallet" className="border rounded-lg shadow-sm bg-card">
          <AccordionTrigger className="px-4 py-3 hover:no-underline bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-200 font-medium">
            Wallet
          </AccordionTrigger>
          <AccordionContent className="p-4 space-y-3">
            <Button
              onClick={() => setShowWalletManager(true)}
              variant="outline"
              className="w-full justify-start bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-100 dark:hover:bg-blue-900/20 border-blue-100 dark:border-blue-900/20"
            >
              <span className="flex-1 text-left">Manage Wallets</span>
              <ChevronRight className="h-4 w-4" />
            </Button>

            <Button
              onClick={() => setShowDerivedAddresses(true)}
              variant="outline"
              className="w-full justify-start bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-100 dark:hover:bg-blue-900/20 border-blue-100 dark:border-blue-900/20"
              disabled={!address}
            >
              <span className="flex-1 text-left">Derived Addresses</span>
              <ChevronRight className="h-4 w-4" />
            </Button>

            <Button
              onClick={() => {
                setMnemonicModalMode('export');
                setShowMnemonicModal(true);
              }}
              variant="outline"
              className="w-full justify-start bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-100 dark:hover:bg-blue-900/20 border-blue-100 dark:border-blue-900/20"
              disabled={!address}
            >
              <span className="flex-1 text-left">Export Recovery Phrase</span>
              <ChevronRight className="h-4 w-4" />
            </Button>

            <Button
              onClick={() => setShowWalletEncryption(true)}
              variant="outline"
              className="w-full justify-start bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-100 dark:hover:bg-blue-900/20 border-blue-100 dark:border-blue-900/20"
              disabled={!address}
            >
              <span className="flex-1 text-left">
                {isEncrypted ? 'Decrypt Wallet' : 'Encrypt Wallet'}
              </span>
              <ChevronRight className="h-4 w-4" />
            </Button>

            <Button
              onClick={() => setShowPrivateKeyExport(true)}
              variant="outline"
              className="w-full justify-start bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-100 dark:hover:bg-blue-900/20 border-blue-100 dark:border-blue-900/20"
              disabled={!address}
            >
              <span className="flex-1 text-left">Export Private Key</span>
              <ChevronRight className="h-4 w-4" />
            </Button>

            {/* HD Wallet Settings Section */}
            <div className="pt-3 border-t border-blue-100 dark:border-blue-900/20">
              <div className="space-y-4">
                <div className="text-sm font-medium text-blue-900 dark:text-blue-200">
                  HD Wallet Settings
                </div>

                {/* Change Address Count Setting */}
                <div className="space-y-3 p-3 bg-blue-50/30 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/20">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="change-address-count" className="text-sm font-medium">
                      Change Address Count
                    </Label>
                    <span className="text-sm text-muted-foreground">{changeAddressCount}</span>
                  </div>
                  <div className="space-y-2">
                    <Slider
                      id="change-address-count"
                      min={1}
                      max={20}
                      step={1}
                      value={[changeAddressCount]}
                      onValueChange={(value) => handleChangeAddressCountChange(value[0])}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      Number of change addresses to show when sending transactions from HD wallets.
                      Change addresses are used to receive leftover funds from transactions.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Security */}
        <AccordionItem value="security" className="border rounded-lg shadow-sm bg-card">
          <AccordionTrigger className="px-4 py-3 hover:no-underline bg-avian-50 dark:bg-avian-900/30 text-avian-900 dark:text-avian-200 font-medium">
            Security
          </AccordionTrigger>
          <AccordionContent className="p-4 space-y-3">
            <Button
              onClick={() => setShowSecuritySettings(true)}
              variant="outline"
              className="w-full justify-start bg-avian-50/50 dark:bg-avian-900/10 hover:bg-avian-100 dark:hover:bg-avian-900/20 border-avian-100 dark:border-avian-900/20"
            >
              <span className="flex-1 text-left">Security Settings</span>
              <ChevronRight className="h-4 w-4" />
            </Button>

            <Button
              onClick={() => setShowMessageUtilities(true)}
              variant="outline"
              className="w-full justify-start bg-avian-50/50 dark:bg-avian-900/10 hover:bg-avian-100 dark:hover:bg-avian-900/20 border-avian-100 dark:border-avian-900/20"
              disabled={!address}
            >
              <span className="flex-1 text-left">Message Utilities</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </AccordionContent>
        </AccordionItem>

        {/* Backup & Restore */}
        <AccordionItem value="backup" className="border rounded-lg shadow-sm bg-card">
          <AccordionTrigger className="px-4 py-3 hover:no-underline bg-green-50 dark:bg-green-900/30 text-green-900 dark:text-green-200 font-medium">
            Backup & Restore
          </AccordionTrigger>
          <AccordionContent className="p-4 space-y-3">
            <Button
              onClick={() => setShowBackupModal(true)}
              variant="outline"
              className="w-full justify-start bg-green-50/50 dark:bg-green-900/10 hover:bg-green-100 dark:hover:bg-green-900/20 border-green-100 dark:border-green-900/20"
            >
              <span className="flex-1 text-left">Backup & Restore Options</span>
              <ChevronRight className="h-4 w-4" />
            </Button>

            <Button
              onClick={() => setShowQRBackup(true)}
              variant="outline"
              className="w-full justify-start bg-green-50/50 dark:bg-green-900/10 hover:bg-green-100 dark:hover:bg-green-900/20 border-green-100 dark:border-green-900/20"
            >
              <QrCode className="h-4 w-4 mr-2" />
              <span className="flex-1 text-left">QR Code Backup & Restore</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </AccordionContent>
        </AccordionItem>

        {/* Notifications */}
        <AccordionItem value="notifications" className="border rounded-lg shadow-sm bg-card">
          <AccordionTrigger className="px-4 py-3 hover:no-underline bg-indigo-50 dark:bg-indigo-900/30 text-indigo-900 dark:text-indigo-200 font-medium">
            Notifications
          </AccordionTrigger>
          <AccordionContent className="p-4 space-y-3">
            <Button
              onClick={() => setShowNotificationSettings(true)}
              variant="outline"
              className="w-full justify-start bg-indigo-50/50 dark:bg-indigo-900/10 hover:bg-indigo-100 dark:hover:bg-indigo-900/20 border-indigo-100 dark:border-indigo-900/20"
              disabled={!address}
            >
              <span className="flex-1 text-left">Notification Settings</span>
              <ChevronRight className="h-4 w-4" />
            </Button>

            <Button
              onClick={() => setShowWatchAddresses(true)}
              variant="outline"
              className="w-full justify-start bg-indigo-50/50 dark:bg-indigo-900/10 hover:bg-indigo-100 dark:hover:bg-indigo-900/20 border-indigo-100 dark:border-indigo-900/20"
              disabled={!address}
            >
              <span className="flex-1 text-left">Watch Addresses</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </AccordionContent>
        </AccordionItem>

        {/* Advanced */}
        <AccordionItem value="advanced" className="border rounded-lg shadow-sm bg-card">
          <AccordionTrigger className="px-4 py-3 hover:no-underline bg-amber-50 dark:bg-amber-900/30 text-amber-900 dark:text-amber-200 font-medium">
            Advanced
          </AccordionTrigger>
          <AccordionContent className="p-4 space-y-3">
            <Button
              onClick={() => setShowRepairHistory(true)}
              variant="outline"
              className="w-full justify-start bg-amber-50/50 dark:bg-amber-900/10 hover:bg-amber-100 dark:hover:bg-amber-900/20 border-amber-100 dark:border-amber-900/20"
              disabled={!address}
            >
              <span className="flex-1 text-left">Repair Transaction History</span>
              <ChevronRight className="h-4 w-4" />
            </Button>

            <Button
              onClick={() => setShowLogViewer(true)}
              variant="outline"
              className="w-full justify-start bg-amber-50/50 dark:bg-amber-900/10 hover:bg-amber-100 dark:hover:bg-amber-900/20 border-amber-100 dark:border-amber-900/20"
            >
              <Bug className="mr-2 h-4 w-4 text-amber-500" />
              <span className="flex-1 text-left">View Application Logs</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </AccordionContent>
        </AccordionItem>

        {/* Help & Information */}
        <AccordionItem value="help" className="border rounded-lg shadow-sm bg-card">
          <AccordionTrigger className="px-4 py-3 hover:no-underline bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-200 font-medium">
            Help & Information
          </AccordionTrigger>
          <AccordionContent className="p-4 space-y-3">
            <Button
              onClick={() => setShowAboutModal(true)}
              variant="outline"
              className="w-full justify-start bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-100 dark:hover:bg-blue-900/20 border-blue-100 dark:border-blue-900/20"
            >
              <Info className="mr-2 h-4 w-4 text-blue-500" />
              <span className="flex-1 text-left">About FlightDeck & FAQ</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Modals - Convert with Shadcn UI */}
      {showMnemonicModal && (
        <MnemonicModal
          isOpen={showMnemonicModal}
          mode={mnemonicModalMode}
          onClose={() => setShowMnemonicModal(false)}
        />
      )}

      {/* WalletManager Sheet */}
      <Sheet open={showWalletManager} onOpenChange={(open) => !open && setShowWalletManager(false)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-2">
            <SheetTitle>Wallet Manager</SheetTitle>
            <SheetDescription>Manage your wallets</SheetDescription>
          </SheetHeader>
          <WalletManager
            onClose={async () => {
              setShowWalletManager(false);
              await reloadActiveWallet();
            }}
            onWalletSelect={async (wallet) => {
              setShowWalletManager(false);
              await reloadActiveWallet();
              setSuccess(`Switched to wallet: ${wallet.name}`);
            }}
          />
        </SheetContent>
      </Sheet>

      {/* BackupModal */}
      {showBackupModal && (
        <BackupDrawer
          isOpen={showBackupModal}
          onClose={() => setShowBackupModal(false)}
          onSuccess={(message) => {
            setSuccess(message);
            setTimeout(() => setSuccess(''), 3000);
          }}
          onError={(message) => {
            setError(message);
            setTimeout(() => setError(''), 5000);
          }}
        />
      )}

      {/* SecuritySettingsPanel - Now uses responsive drawer */}
      <SecuritySettingsPanel
        isOpen={showSecuritySettings}
        onClose={() => setShowSecuritySettings(false)}
      />

      {/* NotificationSettings - Now uses responsive drawer */}
      <NotificationSettings
        isOpen={showNotificationSettings}
        onClose={() => setShowNotificationSettings(false)}
      />

      {/* WatchAddressesPanel - Drawer on mobile, Dialog on desktop */}
      {showWatchAddresses && (
        <>
          {!isMobile ? (
            <Dialog
              open={showWatchAddresses}
              onOpenChange={(open) => !open && setShowWatchAddresses(false)}
            >
              <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-xl">Watch Addresses</DialogTitle>
                </DialogHeader>
                <WatchAddressesPanel />
              </DialogContent>
            </Dialog>
          ) : (
            <Drawer
              open={showWatchAddresses}
              onOpenChange={(open) => !open && setShowWatchAddresses(false)}
            >
              <DrawerContent className="max-h-[90vh]">
                <DrawerHeader className="border-b">
                  <DrawerTitle className="flex items-center gap-2 text-xl">
                    <Eye className="w-5 h-5 text-avian-600 dark:text-avian-400" />
                    Watch Addresses
                  </DrawerTitle>
                </DrawerHeader>
                <div className="p-4 pb-8 overflow-y-auto">
                  <WatchAddressesPanel />
                </div>
              </DrawerContent>
            </Drawer>
          )}
        </>
      )}

      {/* MessageUtilities - Drawer on mobile, Dialog on desktop */}
      {showMessageUtilities && (
        <>
          {!isMobile ? (
            <Dialog
              open={showMessageUtilities}
              onOpenChange={(open) => !open && setShowMessageUtilities(false)}
            >
              <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-xl">Message Utilities</DialogTitle>
                </DialogHeader>
                <MessageUtilities />
              </DialogContent>
            </Dialog>
          ) : (
            <Drawer
              open={showMessageUtilities}
              onOpenChange={(open) => !open && setShowMessageUtilities(false)}
            >
              <DrawerContent className="max-h-[90vh]">
                <DrawerHeader className="border-b">
                  <DrawerTitle className="flex items-center gap-2 text-xl">
                    <Settings className="w-5 h-5 text-avian-600 dark:text-avian-400" />
                    Message Utilities
                  </DrawerTitle>
                </DrawerHeader>
                <div className="p-4 pb-8 overflow-y-auto">
                  <MessageUtilities />
                </div>
              </DrawerContent>
            </Drawer>
          )}
        </>
      )}

      {/* DerivedAddressesPanel - Drawer on mobile, Dialog on desktop */}
      {showDerivedAddresses && (
        <>
          {!isMobile ? (
            <Dialog
              open={showDerivedAddresses}
              onOpenChange={(open) => !open && setShowDerivedAddresses(false)}
            >
              <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-xl">Derived Addresses</DialogTitle>
                </DialogHeader>
                <DerivedAddressesPanel />
              </DialogContent>
            </Dialog>
          ) : (
            <Drawer
              open={showDerivedAddresses}
              onOpenChange={(open) => !open && setShowDerivedAddresses(false)}
            >
              <DrawerContent className="max-h-[95vh]">
                <DrawerHeader className="border-b">
                  <DrawerTitle className="flex items-center gap-2 text-xl">
                    <Wallet className="w-5 h-5 text-avian-600 dark:text-avian-400" />
                    Derived Addresses
                  </DrawerTitle>
                </DrawerHeader>
                <div className="p-4 pb-8 overflow-y-auto">
                  <DerivedAddressesPanel />
                </div>
              </DrawerContent>
            </Drawer>
          )}
        </>
      )}

      {/* Authentication Dialog */}
      <AuthenticationDialog
        isOpen={showAuthDialog}
        onClose={() => setShowAuthDialog(false)}
        onAuthenticate={handleAuthenticationComplete}
        title="Authentication Required"
        message="Please authenticate to export your private key"
        walletAddress={address}
      />

      {/* PrivateKeyExport - Drawer on mobile, Dialog on desktop */}
      {showPrivateKeyExport && (
        <>
          {/* Conditionally render Dialog or Drawer based on screen size */}
          {!isMobile ? (
            <Dialog
              open={showPrivateKeyExport}
              onOpenChange={(open) => {
                if (!open) {
                  setShowPrivateKeyExport(false);
                  setExportedKey('');
                  setPassword('');
                }
              }}
            >
              <DialogContent className="sm:max-w-md p-6">
                <DialogHeader className="pb-2">
                  <DialogTitle className="flex items-center gap-2 text-xl">
                    <Download className="w-5 h-5 text-avian-600 dark:text-avian-400" />
                    Export Private Key
                  </DialogTitle>
                </DialogHeader>

                <PrivateKeyExportContent
                  exportedKey={exportedKey}
                  isLoading={isLoading}
                  handleExportPrivateKey={handleExportPrivateKey}
                  copyToClipboard={copyToClipboard}
                  setExportedKey={setExportedKey}
                  setPassword={setPassword}
                  isDrawer={false}
                />
              </DialogContent>
            </Dialog>
          ) : (
            <Drawer
              open={showPrivateKeyExport}
              onOpenChange={(open) => {
                if (!open) {
                  setShowPrivateKeyExport(false);
                  setExportedKey('');
                  setPassword('');
                }
              }}
            >
              <DrawerContent>
                <DrawerHeader className="border-b">
                  <DrawerTitle className="flex items-center gap-2 text-xl">
                    <Download className="w-5 h-5 text-avian-600 dark:text-avian-400" />
                    Export Private Key
                  </DrawerTitle>
                </DrawerHeader>

                <div className="p-6">
                  <PrivateKeyExportContent
                    exportedKey={exportedKey}
                    isLoading={isLoading}
                    handleExportPrivateKey={handleExportPrivateKey}
                    copyToClipboard={copyToClipboard}
                    setExportedKey={setExportedKey}
                    setPassword={setPassword}
                    isDrawer={true}
                  />
                </div>
              </DrawerContent>
            </Drawer>
          )}
        </>
      )}

      {/* WalletEncryption - Drawer on mobile, Dialog on desktop */}
      {showWalletEncryption && (
        <>
          {/* Conditionally render Dialog or Drawer based on screen size */}
          {!isMobile ? (
            <Dialog
              open={showWalletEncryption}
              onOpenChange={(open) => {
                if (!open) {
                  setShowWalletEncryption(false);
                  setPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setError('');
                }
              }}
            >
              <DialogContent className="sm:max-w-md p-6">
                <DialogHeader className="pb-2">
                  <DialogTitle className="flex items-center gap-2 text-xl">
                    {isEncrypted ? (
                      <>
                        <Unlock className="h-5 w-5 text-avian-600 dark:text-avian-400" />
                        Decrypt Wallet
                      </>
                    ) : (
                      <>
                        <Lock className="h-5 w-5 text-avian-600 dark:text-avian-400" />
                        Encrypt Wallet
                      </>
                    )}
                  </DialogTitle>
                </DialogHeader>

                {/* Content shared between Dialog and Drawer */}
                <EncryptionDialogContent
                  isEncrypted={isEncrypted}
                  isLoading={isLoading}
                  password={password}
                  setPassword={setPassword}
                  newPassword={newPassword}
                  setNewPassword={setNewPassword}
                  confirmPassword={confirmPassword}
                  setConfirmPassword={setConfirmPassword}
                  error={error}
                  setError={setError}
                  setShowWalletEncryption={setShowWalletEncryption}
                  handleDecryptWallet={handleDecryptWallet}
                  handleEncryptWallet={handleEncryptWallet}
                  isDrawer={false}
                />
              </DialogContent>
            </Dialog>
          ) : (
            <Drawer
              open={showWalletEncryption}
              onOpenChange={(open) => {
                if (!open) {
                  setShowWalletEncryption(false);
                  setPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setError('');
                }
              }}
            >
              <DrawerContent>
                <DrawerHeader className="border-b">
                  <DrawerTitle className="flex items-center gap-2 text-xl">
                    {isEncrypted ? (
                      <>
                        <Unlock className="h-5 w-5 text-avian-600 dark:text-avian-400" />
                        Decrypt Wallet
                      </>
                    ) : (
                      <>
                        <Lock className="h-5 w-5 text-avian-600 dark:text-avian-400" />
                        Encrypt Wallet
                      </>
                    )}
                  </DrawerTitle>
                </DrawerHeader>

                <div className="p-6">
                  {/* Content shared between Dialog and Drawer */}
                  <EncryptionDialogContent
                    isEncrypted={isEncrypted}
                    isLoading={isLoading}
                    password={password}
                    setPassword={setPassword}
                    newPassword={newPassword}
                    setNewPassword={setNewPassword}
                    confirmPassword={confirmPassword}
                    setConfirmPassword={setConfirmPassword}
                    error={error}
                    setError={setError}
                    setShowWalletEncryption={setShowWalletEncryption}
                    handleDecryptWallet={handleDecryptWallet}
                    handleEncryptWallet={handleEncryptWallet}
                    isDrawer={true}
                  />
                </div>
              </DrawerContent>
            </Drawer>
          )}
        </>
      )}

      {/* Repair Transaction History - Drawer on mobile, Dialog on desktop */}
      {showRepairHistory && (
        <>
          {!isMobile ? (
            <Dialog
              open={showRepairHistory}
              onOpenChange={(open) => {
                if (!open && repairStatus !== 'scanning' && repairStatus !== 'repairing') {
                  setShowRepairHistory(false);
                  setRepairStatus('idle');
                  setRepairProgress(0);
                  setRepairDetails('');
                }
              }}
            >
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-xl">
                    <RefreshCw className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    Repair Transaction History
                  </DialogTitle>
                </DialogHeader>

                <RepairTransactionHistoryContent
                  repairStatus={repairStatus}
                  repairProgress={repairProgress}
                  repairDetails={repairDetails}
                  foundIssues={foundIssues}
                  fixedIssues={fixedIssues}
                  handleRepairTransactionHistory={handleRepairTransactionHistory}
                  setShowRepairHistory={setShowRepairHistory}
                  setRepairStatus={setRepairStatus}
                  setRepairProgress={setRepairProgress}
                  isDrawer={false}
                />
              </DialogContent>
            </Dialog>
          ) : (
            <Drawer
              open={showRepairHistory}
              onOpenChange={(open) => {
                if (!open && repairStatus !== 'scanning' && repairStatus !== 'repairing') {
                  setShowRepairHistory(false);
                  setRepairStatus('idle');
                  setRepairProgress(0);
                  setRepairDetails('');
                }
              }}
            >
              <DrawerContent className="max-h-[90vh]">
                <DrawerHeader className="border-b">
                  <DrawerTitle className="flex items-center gap-2 text-xl">
                    <RefreshCw className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    Repair Transaction History
                  </DrawerTitle>
                </DrawerHeader>
                <div className="p-6 overflow-y-auto">
                  <RepairTransactionHistoryContent
                    repairStatus={repairStatus}
                    repairProgress={repairProgress}
                    repairDetails={repairDetails}
                    foundIssues={foundIssues}
                    fixedIssues={fixedIssues}
                    handleRepairTransactionHistory={handleRepairTransactionHistory}
                    setShowRepairHistory={setShowRepairHistory}
                    setRepairStatus={setRepairStatus}
                    setRepairProgress={setRepairProgress}
                    isDrawer={true}
                  />
                </div>
              </DrawerContent>
            </Drawer>
          )}
        </>
      )}

      {/* QR Code Backup & Restore */}
      <BackupQRModal open={showQRBackup} onClose={() => setShowQRBackup(false)} />

      {/* Log Viewer Dialog */}
      <LogViewer isOpen={showLogViewer} onClose={() => setShowLogViewer(false)} />

      {/* About Modal */}
      <AboutModal isOpen={showAboutModal} onClose={() => setShowAboutModal(false)} />
    </div>
  );
}
