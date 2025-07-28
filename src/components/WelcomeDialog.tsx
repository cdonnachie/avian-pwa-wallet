'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { Wallet, Import, FileKey, ArrowLeft } from 'lucide-react';
import { StorageService } from '@/services/core/StorageService';
import WalletCreationForm, {
  WalletCreationMode,
  WalletCreationData,
} from '@/components/WalletCreationForm';
import { useMediaQuery } from '@/hooks/use-media-query';

// Import Shadcn UI components
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

interface WelcomeDialogProps {
  onClose: () => void;
}

export default function WelcomeDialog({ onClose }: WelcomeDialogProps) {
  const { reloadActiveWallet } = useWallet();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [view, setView] = useState<'welcome' | 'form'>('welcome');
  const [formMode, setFormMode] = useState<WalletCreationMode>('create');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasWallet, setHasWallet] = useState<boolean>(false);

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

  const renderContent = () => (
    <>
      {/* Show Back button if not in welcome screen */}
      {view === 'form' && (
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
            <Card className="border-0 shadow-none hover:bg-muted/50 cursor-pointer transition-colors md:row-span-2 md:h-[90%]">
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
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={true} onOpenChange={handleClose}>
        <DrawerContent className="h-[95vh] flex flex-col">
          <DrawerHeader className="flex-shrink-0">
            <DrawerTitle>
              {view === 'welcome' && 'Welcome to Avian FlightDeck'}
              {view === 'form' && formMode === 'create' && 'Create New Wallet'}
              {view === 'form' && formMode === 'importMnemonic' && 'Import from Recovery Phrase'}
              {view === 'form' && formMode === 'importWIF' && 'Import from Private Key (WIF)'}
            </DrawerTitle>
          </DrawerHeader>
          <div className="flex flex-col flex-1 overflow-y-auto">{renderContent()}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
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
          </DialogTitle>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
