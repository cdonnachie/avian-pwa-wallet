import React, { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { EnhancedUTXO, UTXOSelectionService } from '@/services/wallet/UTXOSelectionService';
import { StorageService } from '@/services/core/StorageService';
import AuthenticationDialog from '@/components/AuthenticationDialog';
import {
  Coins,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Clock,
  Check,
  X,
  RefreshCcw,
} from 'lucide-react';
import { useMediaQuery } from '@/hooks/use-media-query';

// Import Shadcn UI components
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

interface UTXOOverviewProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UTXOOverview({ isOpen, onClose }: UTXOOverviewProps) {
  const { wallet, electrum, address, balance, deriveCurrentWalletAddresses } = useWallet();
  const [utxos, setUtxos] = useState<EnhancedUTXO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isHdWallet, setIsHdWallet] = useState(false);
  const [loadingHdAddresses, setLoadingHdAddresses] = useState(false);
  const [allAddressesLoaded, setAllAddressesLoaded] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [totalHdBalance, setTotalHdBalance] = useState<number>(0);
  const isMobile = useMediaQuery('(max-width: 768px)');

  const loadUTXOs = useCallback(
    async (forceReload = false) => {
      try {
        setLoading(true);
        setError('');

        if (!electrum || !address) return;

        // If HD addresses are already loaded and this isn't a forced reload, skip
        if (allAddressesLoaded && !forceReload) {
          setLoading(false);
          return;
        }

        // Check if this is an HD wallet
        const storedMnemonic = await StorageService.getMnemonic();
        const hasHdCapabilities = !!storedMnemonic;
        setIsHdWallet(hasHdCapabilities);

        const currentBlockHeight = await electrum.getCurrentBlockHeight();
        let allUTXOs: any[] = [];

        if (hasHdCapabilities) {
          // For HD wallets, get UTXOs from all derived addresses with balances
          try {
            // Get change address count preference
            const changeAddressCount = await StorageService.getChangeAddressCount();

            // We'll need a password to derive addresses - for now, just show main wallet
            // In a future update, we could add an authentication dialog here

            // For now, just get UTXOs from the main address
            const mainUTXOs = await electrum.getUTXOs(address);
            allUTXOs = mainUTXOs.map((utxo: any) => ({ ...utxo, address: address }));
          } catch (hdError) {
            // Fallback to main address
            const mainUTXOs = await electrum.getUTXOs(address);
            allUTXOs = mainUTXOs.map((utxo: any) => ({ ...utxo, address: address }));
          }
        } else {
          // For regular wallets, just get UTXOs from the main address
          const mainUTXOs = await electrum.getUTXOs(address);
          allUTXOs = mainUTXOs.map((utxo: any) => ({ ...utxo, address: address }));
        }

        const enhancedUTXOs: EnhancedUTXO[] = allUTXOs.map((utxo: any) => ({
          ...utxo,
          confirmations: utxo.height ? Math.max(0, currentBlockHeight - utxo.height + 1) : 0,
          isConfirmed: utxo.height ? currentBlockHeight - utxo.height + 1 >= 1 : false,
          ageInBlocks: utxo.height ? currentBlockHeight - utxo.height + 1 : 0,
          isDust: utxo.value <= 1000, // 0.00001 AVN threshold
          address: utxo.address,
        }));

        setUtxos(enhancedUTXOs);
      } catch (err) {
        setError('Failed to load UTXOs');
      } finally {
        setLoading(false);
      }
    },
    [electrum, address, allAddressesLoaded],
  );

  const loadAllHDUTXOs = useCallback(async () => {
    if (!isHdWallet || !deriveCurrentWalletAddresses) return;

    // Show authentication dialog
    setShowAuthDialog(true);
  }, [isHdWallet, deriveCurrentWalletAddresses]);

  const handleAuthentication = useCallback(
    async (password: string) => {
      setShowAuthDialog(false);
      setLoadingHdAddresses(true);
      setError('');

      try {
        const changeAddressCount = await StorageService.getChangeAddressCount();
        const currentBlockHeight = await electrum!.getCurrentBlockHeight();

        // Get both receiving and change addresses
        const [receivingAddresses, changeAddresses] = await Promise.all([
          deriveCurrentWalletAddresses!(password, 0, changeAddressCount, 'p2pkh', 0, 921),
          deriveCurrentWalletAddresses!(password, 0, changeAddressCount, 'p2pkh', 1, 921),
        ]);

        const allAddresses = [...receivingAddresses, ...changeAddresses];
        let allUTXOs: any[] = [];

        // Get UTXOs from all addresses that have balances
        for (const addr of allAddresses) {
          if (addr.balance > 0) {
            try {
              const utxosForAddress = await electrum!.getUTXOs(addr.address);
              const labeledUTXOs = utxosForAddress.map((utxo: any) => ({
                ...utxo,
                address: addr.address,
                addressType: addr.path.includes('(receiving)') ? 'receiving' : 'change',
              }));
              allUTXOs.push(...labeledUTXOs);
            } catch (utxoError) {
              // Skip addresses that can't be queried
            }
          }
        }

        // Also include main wallet address UTXOs
        const mainUTXOs = await electrum!.getUTXOs(address!);
        const labeledMainUTXOs = mainUTXOs.map((utxo: any) => ({
          ...utxo,
          address: address,
          addressType: 'main',
        }));
        allUTXOs.push(...labeledMainUTXOs);

        // Remove duplicates based on txid and vout
        const uniqueUTXOs = allUTXOs.filter(
          (utxo, index, self) =>
            index === self.findIndex((u) => u.txid === utxo.txid && u.vout === utxo.vout),
        );

        const enhancedUTXOs: EnhancedUTXO[] = uniqueUTXOs.map((utxo: any) => ({
          ...utxo,
          confirmations: utxo.height ? Math.max(0, currentBlockHeight - utxo.height + 1) : 0,
          isConfirmed: utxo.height ? currentBlockHeight - utxo.height + 1 >= 1 : false,
          ageInBlocks: utxo.height ? currentBlockHeight - utxo.height + 1 : 0,
          isDust: utxo.value <= 1000,
          address: utxo.address,
        }));

        setUtxos(enhancedUTXOs);
        setAllAddressesLoaded(true);

        // Calculate total balance from all UTXOs
        const totalBalance = enhancedUTXOs.reduce((sum, utxo) => sum + utxo.value, 0);
        setTotalHdBalance(totalBalance);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load HD addresses');
      } finally {
        setLoadingHdAddresses(false);
      }
    },
    [deriveCurrentWalletAddresses, electrum, address],
  );

  const handleAuthCancel = useCallback(() => {
    setShowAuthDialog(false);
    setLoadingHdAddresses(false);
  }, []);

  useEffect(() => {
    if (isOpen && electrum && address) {
      loadUTXOs();
    }
  }, [isOpen, electrum, address, loadUTXOs]);

  if (!isOpen) return null;

  const totalUTXOs = utxos.length;
  const confirmedUTXOs = utxos.filter((u) => u.isConfirmed).length;
  const dustUTXOs = utxos.filter((u) => u.isDust).length;
  const largeUTXOs = utxos.filter((u) => u.value > 100000000).length; // > 1 AVN

  const formatAVN = (satoshis: number) => {
    return (satoshis / 100000000).toFixed(8);
  };

  const formatTxId = (txid: string) => {
    return `${txid.slice(0, 8)}...${txid.slice(-8)}`;
  };

  const getConfirmationIcon = (confirmations: number) => {
    if (confirmations === 0) return <Clock className="w-4 h-4 text-yellow-500" />;
    if (confirmations < 6) return <AlertCircle className="w-4 h-4 text-orange-500" />;
    return <Check className="w-4 h-4 text-green-500" />;
  };

  const renderContent = () => (
    <>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{totalUTXOs}</div>
            <div className="text-sm text-muted-foreground">Total UTXOs</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {confirmedUTXOs}
            </div>
            <div className="text-sm text-muted-foreground">Confirmed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {dustUTXOs}
            </div>
            <div className="text-sm text-muted-foreground">Dust UTXOs</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{largeUTXOs}</div>
            <div className="text-sm text-muted-foreground">Large UTXOs</div>
          </CardContent>
        </Card>
      </div>

      {/* Balance Information */}
      <div className="mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Main Wallet Balance:</span>
                <span className="font-mono font-semibold">{formatAVN(balance)} AVN</span>
              </div>
              {allAddressesLoaded && totalHdBalance !== balance && (
                <div className="flex justify-between items-center border-t pt-2">
                  <span className="text-sm text-muted-foreground">Total HD Balance:</span>
                  <span className="font-mono font-semibold text-primary">
                    {formatAVN(totalHdBalance)} AVN
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* HD Wallet Warning */}
      {isHdWallet && !allAddressesLoaded && (
        <Alert className="mb-4 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200">
          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertTitle>HD Wallet Detected</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>
              Currently showing UTXOs for your main wallet address only. Your funds may be
              distributed across multiple derived addresses (both receiving and change addresses).
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={loadAllHDUTXOs}
              disabled={loadingHdAddresses}
              className="bg-amber-100 dark:bg-amber-900/40 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 hover:bg-amber-200 dark:hover:bg-amber-900/60"
            >
              {loadingHdAddresses ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                  Loading All Addresses...
                </>
              ) : (
                <>
                  <Coins className="h-4 w-4 mr-2" />
                  Load UTXOs from All HD Addresses
                </>
              )}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {allAddressesLoaded && (
        <Alert className="mb-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200">
          <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertTitle>All HD Addresses Loaded</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>
              Showing UTXOs from all your HD wallet addresses (main, receiving, and change
              addresses).
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={loadAllHDUTXOs}
              disabled={loadingHdAddresses}
              className="bg-green-100 dark:bg-green-900/40 border-green-300 dark:border-green-700 text-green-800 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-900/60"
            >
              {loadingHdAddresses ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCcw className="h-4 w-4 mr-2" />
                  Refresh HD UTXOs
                </>
              )}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2 text-muted-foreground">Loading UTXOs...</span>
        </div>
      ) : error ? (
        <div className="text-center p-8">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <p className="text-destructive">{error}</p>
          <Button variant="outline" onClick={() => loadUTXOs(true)} className="mt-4">
            <RefreshCcw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      ) : utxos.length === 0 ? (
        <div className="text-center p-8">
          <Coins className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No UTXOs found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* UTXO List */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transaction</TableHead>
                  <TableHead>Output</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Confirmations</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {utxos.map((utxo, index) => (
                  <TableRow key={`${utxo.txid}-${utxo.vout}`}>
                    <TableCell>
                      <span className="font-mono text-xs text-muted-foreground">
                        {formatTxId(utxo.txid)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono">{utxo.vout}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-muted-foreground">
                        {utxo.address
                          ? `${utxo.address.substring(0, 8)}...${utxo.address.substring(utxo.address.length - 8)}`
                          : 'Unknown'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{formatAVN(utxo.value)} AVN</span>
                        {utxo.isDust && (
                          <Badge
                            variant="outline"
                            className="bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800"
                          >
                            Dust
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground">{utxo.confirmations || 0}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getConfirmationIcon(utxo.confirmations || 0)}
                        <span className="text-muted-foreground">
                          {utxo.confirmations === 0
                            ? 'Pending'
                            : utxo.confirmations! < 6
                              ? 'Confirming'
                              : 'Confirmed'}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Recommendations */}
          {dustUTXOs > 5 && (
            <Alert className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200">
              <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <AlertTitle>Dust Consolidation Recommended</AlertTitle>
              <AlertDescription>
                You have {dustUTXOs} dust UTXOs (very small amounts). Consider consolidating them in
                a low-priority transaction to reduce future transaction fees.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </>
  );

  if (!isOpen) return null;

  if (isMobile) {
    return (
      <>
        <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
          <DrawerContent className="flex flex-col max-h-[95vh]">
            <DrawerHeader className="flex-shrink-0">
              <DrawerTitle className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-primary" />
                UTXO Overview
              </DrawerTitle>
            </DrawerHeader>

            <div className="flex-1 overflow-y-auto px-4">{renderContent()}</div>

            <DrawerFooter className="flex-shrink-0">
              <Button variant="secondary" onClick={onClose}>
                Close
              </Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>

        {/* Authentication Dialog for HD Address Loading */}
        <AuthenticationDialog
          isOpen={showAuthDialog}
          onClose={handleAuthCancel}
          onAuthenticate={handleAuthentication}
          title="Load All HD Addresses"
          message="Enter your wallet password to load UTXOs from all derived addresses (receiving and change addresses)."
          walletAddress={address || undefined}
        />
      </>
    );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-primary" />
              UTXO Overview
            </DialogTitle>
          </DialogHeader>

          {renderContent()}

          <DialogFooter>
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Authentication Dialog for HD Address Loading */}
      <AuthenticationDialog
        isOpen={showAuthDialog}
        onClose={handleAuthCancel}
        onAuthenticate={handleAuthentication}
        title="Load All HD Addresses"
        message="Enter your wallet password to load UTXOs from all derived addresses (receiving and change addresses)."
        walletAddress={address || undefined}
      />
    </>
  );
}
