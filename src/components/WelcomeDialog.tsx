'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { Wallet, Import, FileKey, ArrowLeft, Upload, QrCode, AlertTriangle } from 'lucide-react';
import { StorageService } from '@/services/core/StorageService';
import WalletCreationForm, {
  WalletCreationMode,
  WalletCreationData,
} from '@/components/WalletCreationForm';
import { useMediaQuery } from '@/hooks/use-media-query';
import { BackupService } from '@/services/core/BackupService';
import { BackupQRModal } from '@/components/BackupQRModal';

// Import Shadcn UI components
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

interface WelcomeDialogProps {
  onClose: () => void;
}

export default function WelcomeDialog({ onClose }: WelcomeDialogProps) {
  const { reloadActiveWallet } = useWallet();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [view, setView] = useState<'welcome' | 'form' | 'backup-file' | 'backup-qr'>('welcome');
  const [formMode, setFormMode] = useState<WalletCreationMode>('create');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasWallet, setHasWallet] = useState<boolean>(false);
  const [showBackupQRModal, setShowBackupQRModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [backupPassword, setBackupPassword] = useState('');
  const [needsPassword, setNeedsPassword] = useState(false);

  // Check if wallet exists
  useEffect(() => {
    const checkWallet = async () => {
      const walletExists = await StorageService.hasWallet();
      setHasWallet(walletExists);
    };

    checkWallet();
  }, []);

  // Only allow closing the dialog if a wallet exists
  const handleClose = () => {
    if (hasWallet) {
      onClose();
    } else {
      toast.warning('Please create a new wallet or import an existing one to continue.', {
        description: 'This dialog cannot be closed until you have a wallet.',
      });
    }
  };

  // Handle wallet creation/import form submission
  const handleFormSubmit = async (data: WalletCreationData) => {
    try {
      setIsSubmitting(true);

      // Create a new wallet directly using WalletService for more control over the process
      const { WalletService } = await import('@/services/wallet/WalletService');
      const walletService = new WalletService();

      let newWallet;

      // Call appropriate method based on form mode
      if (formMode === 'create') {
        // Create the wallet with the generated mnemonic and optional passphrase
        newWallet = await walletService.createNewWallet({
          name: data.name.trim(),
          password: data.password,
          useMnemonic: true,
          makeActive: true,
        });
      } else if (formMode === 'importMnemonic') {
        // Import from mnemonic
        newWallet = await walletService.importWalletFromMnemonic({
          name: data.name.trim(),
          mnemonic: data.mnemonic!.trim(),
          password: data.password,
          makeActive: true,
        });
      } else if (formMode === 'importWIF') {
        // Import from private key (WIF)
        newWallet = await walletService.importWalletFromPrivateKey({
          name: data.name.trim(),
          privateKey: data.privateKey!.trim(),
          password: data.password,
          makeActive: true,
        });
      }

      // Force reload the active wallet to ensure proper state updates
      await reloadActiveWallet();

      // Force a page refresh to ensure all components load the new wallet
      window.location.reload();

      // Wallet was created successfully, so we can close the dialog
      setHasWallet(true);
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to complete wallet operation');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show form with specified mode
  const showForm = (mode: WalletCreationMode) => {
    setFormMode(mode);
    setView('form');
  };

  // Handle backup file import
  const handleBackupFileImport = () => {
    setView('backup-file');
  };

  // Handle QR code import
  const handleQRCodeImport = () => {
    setShowBackupQRModal(true);
  };

  // Handle backup file selection
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setNeedsPassword(false);
    setBackupPassword('');

    try {
      setIsSubmitting(true);

      // Try to parse without password first
      const { backup, validation } = await BackupService.parseBackupFile(file);

      if (!validation.isValid) {
        toast.error('Invalid backup file', {
          description: validation.errors.join(', ')
        });
        return;
      }

      // If we get here, the file is valid and not encrypted
      await restoreBackup(backup);

    } catch (error: any) {
      if (error.message.includes('encrypted') || error.message.includes('password')) {
        // File is encrypted, show password input
        setNeedsPassword(true);
        setIsSubmitting(false);
      } else {
        toast.error('Failed to read backup file', {
          description: error.message || 'Unknown error occurred'
        });
        setIsSubmitting(false);
      }
    }
  };

  // Handle password verification and restore
  const handlePasswordRestore = async () => {
    if (!selectedFile || !backupPassword) return;

    try {
      setIsSubmitting(true);

      // Parse with password
      const { backup, validation } = await BackupService.parseBackupFile(selectedFile, backupPassword);

      if (!validation.isValid) {
        toast.error('Invalid backup file', {
          description: validation.errors.join(', ')
        });
        return;
      }

      await restoreBackup(backup);

    } catch (error: any) {
      toast.error('Failed to restore backup', {
        description: error.message || 'Invalid password or corrupted backup'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Common restore function
  const restoreBackup = async (backup: any) => {
    // Restore from backup with all options enabled
    await BackupService.restoreFromBackup(backup, {
      includeWallets: true,
      includeAddressBook: true,
      includeSettings: true,
      includeTransactions: true,
      includeSecurityAudit: true,
      includeWatchedAddresses: true,
      overwriteExisting: false,
    });

    // Force reload the active wallet
    await reloadActiveWallet();

    toast.success('Backup restored successfully!', {
      description: 'Your wallets and data have been restored. Redirecting...'
    });

    // Force a page refresh to ensure all components load the restored data
    setTimeout(() => {
      window.location.reload();
    }, 1000);

    setHasWallet(true);
    onClose();
  };

  const renderContent = () => (
    <>
      {/* Show Back button if not in welcome screen */}
      {(view === 'form' || view === 'backup-file') && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setView('welcome')}
          className="absolute right-4 top-4"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
      )}

      {/* Welcome View */}
      {view === 'welcome' && (
        <div className="space-y-6 p-4">
          <div className="flex justify-center py-4">
            <Wallet className="w-20 h-20 text-avian-600" />
          </div>

          <p className="text-gray-700 dark:text-gray-300 text-center">
            It looks like you don&apos;t have a wallet yet. You must create a new wallet or import
            an existing one to continue. This dialog cannot be closed until you have a wallet.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-0 shadow-none hover:bg-muted/50 cursor-pointer transition-colors md:row-span-3 md:h-[90%]">
              <CardContent className="p-0 md:mb-0 md:h-full">
                <Button
                  onClick={() => showForm('create')}
                  variant="default"
                  className="w-full h-full py-6 bg-avian-600 hover:bg-avian-700"
                >
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <Wallet className="w-6 h-6" />
                    <span className="text-center">Create New Wallet</span>
                  </div>
                </Button>
              </CardContent>
            </Card>

            <div className="flex flex-col space-y-4">
              <Card className="border-0 shadow-none hover:bg-muted/50 cursor-pointer transition-colors">
                <CardContent className="p-0">
                  <Button
                    onClick={() => showForm('importMnemonic')}
                    variant="outline"
                    className="w-full h-full py-6"
                  >
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Import className="w-6 h-6" />
                      <span>Import from Recovery Phrase</span>
                    </div>
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-none hover:bg-muted/50 cursor-pointer transition-colors">
                <CardContent className="p-0">
                  <Button
                    onClick={() => showForm('importWIF')}
                    variant="outline"
                    className="w-full h-full py-6"
                  >
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <FileKey className="w-6 h-6" />
                      <span>Import from Private Key (WIF)</span>
                    </div>
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-none hover:bg-muted/50 cursor-pointer transition-colors">
                <CardContent className="p-0">
                  <Button
                    onClick={handleBackupFileImport}
                    variant="outline"
                    className="w-full h-full py-6"
                  >
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Upload className="w-6 h-6" />
                      <span>Import from Backup File</span>
                    </div>
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-none hover:bg-muted/50 cursor-pointer transition-colors">
                <CardContent className="p-0">
                  <Button
                    onClick={handleQRCodeImport}
                    variant="outline"
                    className="w-full h-full py-6"
                  >
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <QrCode className="w-6 h-6" />
                      <span>Import from QR Code</span>
                    </div>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Wallet Creation Form */}
      {view === 'form' && (
        <div className="p-4">
          <WalletCreationForm
            mode={formMode}
            onSubmit={handleFormSubmit}
            onCancel={() => setView('welcome')}
            isSubmitting={isSubmitting}
          />
        </div>
      )}

      {/* Backup File Import View */}
      {view === 'backup-file' && (
        <div className="p-4 space-y-6">
          <div className="flex justify-center py-4">
            <Upload className="w-20 h-20 text-avian-600" />
          </div>

          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold">Import from Backup File</h3>
            <p className="text-gray-700 dark:text-gray-300">
              Select a backup file (.json) to restore your wallets, settings, and data.
            </p>
          </div>

          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="backup-file-input" className="block mb-2">
                    Select Backup File
                  </Label>
                  <input
                    id="backup-file-input"
                    type="file"
                    accept=".json"
                    onChange={handleFileSelect}
                    disabled={isSubmitting}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded-l-lg file:border-0 file:text-sm file:font-semibold file:bg-avian-50 file:text-avian-700 hover:file:bg-avian-100"
                  />
                </div>

                {/* Password input for encrypted backups */}
                {needsPassword && (
                  <div className="space-y-3 pt-4 border-t">
                    <div>
                      <Label htmlFor="backup-password" className="block mb-2">
                        Backup Password
                      </Label>
                      <Input
                        id="backup-password"
                        type="password"
                        placeholder="Enter backup password"
                        value={backupPassword}
                        onChange={(e) => setBackupPassword(e.target.value)}
                        disabled={isSubmitting}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        This backup file is encrypted. Please enter the password used when creating the backup.
                      </p>
                    </div>

                    <Button
                      onClick={handlePasswordRestore}
                      disabled={isSubmitting || !backupPassword}
                      className="w-full"
                    >
                      {isSubmitting ? 'Restoring...' : 'Restore Backup'}
                    </Button>
                  </div>
                )}

                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Important Notes</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside space-y-1 mt-2">
                      <li>Backup files may be encrypted - you'll need the backup password if one was set</li>
                      <li>This will restore wallets, address book, settings, and transaction history</li>
                      <li>Biometric authentication will need to be set up again on this device</li>
                      <li>Existing data will not be overwritten unless wallets have the same address</li>
                    </ul>
                  </AlertDescription>
                </Alert>

                {isSubmitting && !needsPassword && (
                  <div className="text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedFile ? 'Processing backup file...' : 'Importing backup... Please wait.'}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );

  if (isMobile) {
    return (
      <>
        <Drawer open={true} onOpenChange={handleClose}>
          <DrawerContent className="h-[95vh] flex flex-col">
            <DrawerHeader className="flex-shrink-0">
              <DrawerTitle>
                {view === 'welcome' && 'Welcome to Avian FlightDeck'}
                {view === 'form' && formMode === 'create' && 'Create New Wallet'}
                {view === 'form' && formMode === 'importMnemonic' && 'Import from Recovery Phrase'}
                {view === 'form' && formMode === 'importWIF' && 'Import from Private Key (WIF)'}
                {view === 'backup-file' && 'Import from Backup File'}
              </DrawerTitle>
            </DrawerHeader>
            <div className="flex flex-col flex-1 overflow-y-auto">{renderContent()}</div>
          </DrawerContent>
        </Drawer>

        {/* QR Code Backup Modal */}
        {showBackupQRModal && (
          <BackupQRModal
            open={showBackupQRModal}
            mode="restore-only"
            onClose={() => {
              setShowBackupQRModal(false);
              // Check if a wallet was restored
              setTimeout(async () => {
                const walletExists = await StorageService.hasWallet();
                if (walletExists) {
                  await reloadActiveWallet();
                  window.location.reload();
                  setHasWallet(true);
                  onClose();
                }
              }, 500);
            }}
          />
        )}
      </>
    );
  }

  return (
    <>
      <Dialog open={true} onOpenChange={handleClose}>
        <DialogContent
          className="max-w-md max-h-[90vh] overflow-y-auto sm:max-w-xl"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>
              {view === 'welcome' && 'Welcome to Avian FlightDeck'}
              {view === 'form' && formMode === 'create' && 'Create New Wallet'}
              {view === 'form' && formMode === 'importMnemonic' && 'Import from Recovery Phrase'}
              {view === 'form' && formMode === 'importWIF' && 'Import from Private Key (WIF)'}
              {view === 'backup-file' && 'Import from Backup File'}
            </DialogTitle>
          </DialogHeader>
          {renderContent()}
        </DialogContent>
      </Dialog>

      {/* QR Code Backup Modal */}
      {showBackupQRModal && (
        <BackupQRModal
          open={showBackupQRModal}
          mode="restore-only"
          onClose={() => {
            setShowBackupQRModal(false);
            // Check if a wallet was restored
            setTimeout(async () => {
              const walletExists = await StorageService.hasWallet();
              if (walletExists) {
                await reloadActiveWallet();
                window.location.reload();
                setHasWallet(true);
                onClose();
              }
            }, 500);
          }}
        />
      )}
    </>
  );
}
