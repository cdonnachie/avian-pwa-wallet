'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Wallet, Plus, Settings, Eye, EyeOff, Lock, Unlock, Key, FileText, Hash, Copy, AlertTriangle, HardDrive } from 'lucide-react';
import { useWallet } from '@/contexts/WalletContext';
import { useSecurity } from '@/contexts/SecurityContext';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { WalletManager } from '@/components/WalletManager';
import DerivedAddressesPanel from '@/components/DerivedAddressesPanel';
import AuthenticationDialog from '@/components/AuthenticationDialog';
import { AppLayout } from '@/components/AppLayout';
import { HeaderActions } from '@/components/HeaderActions';
import { StorageService } from '@/services/core/StorageService';

export default function WalletSettingsPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { exportPrivateKey, isEncrypted, encryptWallet, decryptWallet, exportMnemonic, address: currentWalletAddress } = useWallet();
    const { requireAuth } = useSecurity();
    const [activeSection, setActiveSection] = useState<'wallets' | 'addresses' | 'recovery' | 'privatekey' | 'encryption' | 'hdconfig' | null>(null);
    const [showAuthDialog, setShowAuthDialog] = useState(false);
    const [exportedPrivateKey, setExportedPrivateKey] = useState<string>('');
    const [showPrivateKey, setShowPrivateKey] = useState(false);
    const [isExportingPrivateKey, setIsExportingPrivateKey] = useState(false);

    // Mnemonic export state
    const [exportedMnemonic, setExportedMnemonic] = useState<string>('');
    const [showMnemonic, setShowMnemonic] = useState(false);
    const [isExportingMnemonic, setIsExportingMnemonic] = useState(false);

    // BIP39 passphrase export state
    const [exportedPassphrase, setExportedPassphrase] = useState<string>('');
    const [showPassphrase, setShowPassphrase] = useState(false);
    const [isExportingPassphrase, setIsExportingPassphrase] = useState(false);
    const [hasBip39Passphrase, setHasBip39Passphrase] = useState(false);

    // HD wallet address count state
    const [addressCount, setAddressCount] = useState<number>(5);

    // Check for section parameter in URL
    useEffect(() => {
        const section = searchParams.get('section');
        if (section === 'wallets' || section === 'addresses' || section === 'recovery' ||
            section === 'privatekey' || section === 'encryption' || section === 'hdconfig') {
            setActiveSection(section as 'wallets' | 'addresses' | 'recovery' | 'privatekey' | 'encryption' | 'hdconfig');
        }
    }, [searchParams]);

    // Load address count preference for current wallet
    useEffect(() => {
        const loadAddressCountPreference = async () => {
            if (!currentWalletAddress) {
                // If no wallet is selected, use default
                setAddressCount(5);
                return;
            }

            try {
                const count = await StorageService.getChangeAddressCount();
                setAddressCount(count);
            } catch (error) {
                console.error('Failed to load address count preference:', error);
                // Set default on error
                setAddressCount(5);
            }
        };
        loadAddressCountPreference();
    }, [currentWalletAddress]); // Re-run when wallet changes

    // Reset exported data when wallet changes
    useEffect(() => {
        if (currentWalletAddress) {
            // Clear any previously exported sensitive data when switching wallets
            setExportedMnemonic('');
            setShowMnemonic(false);
            setExportedPrivateKey('');
            setShowPrivateKey(false);
            setExportedPassphrase('');
            setShowPassphrase(false);
            setHasBip39Passphrase(false);
        }
    }, [currentWalletAddress]);

    const handleBack = () => {
        if (activeSection) {
            setActiveSection(null);
        } else {
            router.back();
        }
    };

    const handleExportPrivateKey = async () => {
        try {
            setIsExportingPrivateKey(true);

            // Use the requireAuth function from SecurityContext
            const authResult = await requireAuth('Please authenticate to view private key');

            if (!authResult.success || !authResult.password) {
                toast.error('Authentication failed', {
                    description: 'You must authenticate to view the private key',
                });
                return;
            }

            // Use the password provided from the authentication
            const privateKey = await exportPrivateKey(isEncrypted ? authResult.password : undefined);

            if (!privateKey) {
                toast.error('Export failed', {
                    description: 'Could not export private key',
                });
                return;
            }

            setExportedPrivateKey(privateKey);
            toast.success('Private key exported', {
                description: 'Your private key has been successfully exported',
            });
        } catch (error: any) {
            toast.error('Export failed', {
                description: error.message || 'Failed to export private key',
            });
        } finally {
            setIsExportingPrivateKey(false);
        }
    };

    const handleCopyPrivateKey = async () => {
        try {
            await navigator.clipboard.writeText(exportedPrivateKey);
            toast.success('Copied to clipboard', {
                description: 'Private key copied successfully',
            });
        } catch (error) {
            toast.error('Copy failed', {
                description: 'Could not copy private key to clipboard',
            });
        }
    };

    const handleWalletAction = async (action: 'encrypt' | 'decrypt') => {
        try {
            const authResult = await requireAuth(
                action === 'encrypt'
                    ? 'Please set a password to encrypt your wallet'
                    : 'Please enter your current password to decrypt your wallet'
            );

            if (!authResult.success || !authResult.password) {
                toast.error('Authentication failed', {
                    description: 'You must provide a password to continue',
                });
                return;
            }

            if (action === 'encrypt') {
                await encryptWallet(authResult.password);
                toast.success('Wallet encrypted successfully', {
                    description: 'Your wallet is now protected with a password',
                });
            } else {
                await decryptWallet(authResult.password);
                toast.success('Wallet decrypted successfully', {
                    description: 'Your wallet no longer requires a password',
                });
            }
        } catch (error: any) {
            toast.error(`Failed to ${action} wallet`, {
                description: error.message || `An error occurred while ${action}ing your wallet`,
            });
        }
    };

    const handleExportMnemonic = async () => {
        try {
            setIsExportingMnemonic(true);

            const authResult = await requireAuth('Please authenticate to view recovery phrase');

            if (!authResult.success || !authResult.password) {
                toast.error('Authentication failed', {
                    description: 'You must authenticate to view the recovery phrase',
                });
                return;
            }

            // Check if wallet has BIP39 passphrase before exporting mnemonic
            try {
                const activeWallet = await StorageService.getActiveWallet();
                setHasBip39Passphrase(!!activeWallet?.bip39Passphrase);
            } catch (err) {
                // If we can't check, assume no passphrase
                setHasBip39Passphrase(false);
            }

            const mnemonic = await exportMnemonic(isEncrypted ? authResult.password : undefined);

            if (!mnemonic) {
                toast.error('Export failed', {
                    description: 'Could not export recovery phrase',
                });
                return;
            }

            setExportedMnemonic(mnemonic);
            toast.success('Recovery phrase exported', {
                description: 'Your recovery phrase has been successfully exported',
            });
        } catch (error: any) {
            toast.error('Export failed', {
                description: error.message || 'Failed to export recovery phrase',
            });
        } finally {
            setIsExportingMnemonic(false);
        }
    };

    const handleCopyMnemonic = async () => {
        try {
            await navigator.clipboard.writeText(exportedMnemonic);
            toast.success('Copied to clipboard', {
                description: 'Recovery phrase copied successfully',
            });
        } catch (error) {
            toast.error('Copy failed', {
                description: 'Could not copy recovery phrase to clipboard',
            });
        }
    };

    const handleExportPassphrase = async () => {
        try {
            setIsExportingPassphrase(true);

            const authResult = await requireAuth('Please authenticate to view your BIP39 passphrase (25th word)');

            if (!authResult.success || !authResult.password) {
                toast.error('Authentication failed', {
                    description: 'You must authenticate to view the BIP39 passphrase',
                });
                return;
            }

            // Get and decrypt the passphrase
            const activeWallet = await StorageService.getActiveWallet();

            if (!activeWallet?.bip39Passphrase) {
                toast.error('No BIP39 passphrase found', {
                    description: 'This wallet does not have a BIP39 passphrase',
                });
                return;
            }

            // Decrypt the passphrase
            const { decryptData } = await import('@/services/wallet/WalletService');
            const result = await decryptData(activeWallet.bip39Passphrase, authResult.password);
            const decrypted = result.decrypted;

            setExportedPassphrase(decrypted);
            toast.success('BIP39 passphrase exported', {
                description: 'Your BIP39 passphrase has been successfully exported',
            });
        } catch (error: any) {
            toast.error('Export failed', {
                description: error.message || 'Failed to export BIP39 passphrase',
            });
        } finally {
            setIsExportingPassphrase(false);
        }
    };

    const handleCopyPassphrase = async () => {
        try {
            await navigator.clipboard.writeText(exportedPassphrase);
            toast.success('Copied to clipboard', {
                description: 'BIP39 passphrase copied successfully',
            });
        } catch (error) {
            toast.error('Copy failed', {
                description: 'Could not copy BIP39 passphrase to clipboard',
            });
        }
    };

    const handleAddressCountChange = async (newCount: number) => {
        try {
            await StorageService.setChangeAddressCount(newCount);
            setAddressCount(newCount);
            toast.success(`Address count updated to ${newCount}`);
        } catch (error) {
            toast.error('Failed to save address count preference');
        }
    };

    const sections = [
        {
            id: 'wallets' as const,
            title: 'Wallet Manager',
            description: 'Create, import, and manage your wallets',
            icon: Wallet,
            action: () => setActiveSection('wallets'),
        },
        {
            id: 'addresses' as const,
            title: 'Derived Addresses',
            description: 'View and manage derived addresses',
            icon: Eye,
            action: () => setActiveSection('addresses'),
        },
        {
            id: 'recovery' as const,
            title: 'Export Recovery Phrase',
            description: 'Export your wallet\'s recovery phrase (mnemonic)',
            icon: FileText,
            action: () => setActiveSection('recovery'),
        },
        {
            id: 'privatekey' as const,
            title: 'Export Private Key',
            description: 'Export your wallet\'s private key',
            icon: Key,
            action: () => setActiveSection('privatekey'),
        },
        {
            id: 'encryption' as const,
            title: 'Wallet Encryption',
            description: 'Encrypt or decrypt your wallet',
            icon: Lock,
            action: () => setActiveSection('encryption'),
        },
        {
            id: 'hdconfig' as const,
            title: 'HD Wallet Configuration',
            description: 'Change address count for HD wallets',
            icon: Hash,
            action: () => setActiveSection('hdconfig'),
        },
    ];

    const renderContent = () => {
        if (activeSection === 'wallets') {
            return <WalletManager />;
        }

        if (activeSection === 'addresses') {
            return <DerivedAddressesPanel />;
        }

        if (activeSection === 'recovery') {
            return (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="w-5 h-5" />
                            Export Recovery Phrase
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <AlertTriangle className="w-3 h-3 text-white" />
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-1">
                                            Security Warning
                                        </h4>
                                        <p className="text-sm text-amber-700 dark:text-amber-300">
                                            Your recovery phrase grants full access to your wallet. Never share it with anyone and store it securely offline.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {!exportedMnemonic ? (
                                <div className="space-y-3">
                                    <p className="text-sm text-muted-foreground">
                                        Export your wallet's mnemonic recovery phrase. This 12 or 24-word phrase can be used to restore your wallet on any compatible device.
                                    </p>
                                    <Button
                                        onClick={handleExportMnemonic}
                                        disabled={isExportingMnemonic}
                                        className="w-full"
                                    >
                                        {isExportingMnemonic ? (
                                            <>
                                                <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                                Exporting...
                                            </>
                                        ) : (
                                            <>
                                                <FileText className="w-4 h-4 mr-2" />
                                                Export Recovery Phrase
                                            </>
                                        )}
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="block text-sm font-medium">
                                                Your Recovery Phrase
                                            </span>
                                            <Button
                                                onClick={() => setShowMnemonic(!showMnemonic)}
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 text-sm"
                                            >
                                                {showMnemonic ? (
                                                    <>
                                                        <Eye className="w-4 h-4 mr-1" />
                                                        Hide
                                                    </>
                                                ) : (
                                                    <>
                                                        <Eye className="w-4 h-4 mr-1" />
                                                        Show
                                                    </>
                                                )}
                                            </Button>
                                        </div>

                                        <div className={`bg-muted/50 border rounded-lg p-4 ${showMnemonic ? '' : 'filter blur-sm'}`}>
                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                                {exportedMnemonic.split(' ').map((word, index) => (
                                                    <div key={index} className="flex items-center gap-2 p-2 bg-background border rounded">
                                                        <span className="text-xs text-muted-foreground w-6">{index + 1}.</span>
                                                        <span className="font-mono text-sm">{word}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {showMnemonic && (
                                        <div className="flex gap-2">
                                            <Button
                                                onClick={handleCopyMnemonic}
                                                variant="secondary"
                                                className="flex-1"
                                            >
                                                <Copy className="w-4 h-4 mr-2" />
                                                Copy to Clipboard
                                            </Button>
                                            <Button
                                                onClick={() => {
                                                    setExportedMnemonic('');
                                                    setShowMnemonic(false);
                                                }}
                                                variant="outline"
                                                className="flex-1"
                                            >
                                                Clear
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* BIP39 Passphrase Section */}
                            {hasBip39Passphrase && (
                                <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                                        <div className="flex items-start gap-3">
                                            <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <Key className="w-3 h-3 text-white" />
                                            </div>
                                            <div>
                                                <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-1">
                                                    BIP39 Passphrase (25th Word) Available
                                                </h4>
                                                <p className="text-sm text-blue-700 dark:text-blue-300">
                                                    This wallet uses an additional BIP39 passphrase. You need BOTH the recovery phrase above AND the passphrase to fully restore this wallet.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {!exportedPassphrase ? (
                                        <Button
                                            onClick={handleExportPassphrase}
                                            disabled={isExportingPassphrase}
                                            variant="secondary"
                                            className="w-full"
                                        >
                                            {isExportingPassphrase ? (
                                                <>
                                                    <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                                    Exporting...
                                                </>
                                            ) : (
                                                <>
                                                    <Key className="w-4 h-4 mr-2" />
                                                    Export BIP39 Passphrase
                                                </>
                                            )}
                                        </Button>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <span className="block text-sm font-medium">
                                                        Your BIP39 Passphrase (25th Word)
                                                    </span>
                                                    <Button
                                                        onClick={() => setShowPassphrase(!showPassphrase)}
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 text-sm"
                                                    >
                                                        {showPassphrase ? (
                                                            <>
                                                                <EyeOff className="w-4 h-4 mr-1" />
                                                                Hide
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Eye className="w-4 h-4 mr-1" />
                                                                Show
                                                            </>
                                                        )}
                                                    </Button>
                                                </div>

                                                <div className={`bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 ${showPassphrase ? '' : 'filter blur-sm'}`}>
                                                    <div className="font-mono text-sm break-all">
                                                        {exportedPassphrase}
                                                    </div>
                                                </div>
                                            </div>

                                            {showPassphrase && (
                                                <div className="flex gap-2">
                                                    <Button
                                                        onClick={handleCopyPassphrase}
                                                        variant="secondary"
                                                        className="flex-1"
                                                    >
                                                        <Copy className="w-4 h-4 mr-2" />
                                                        Copy to Clipboard
                                                    </Button>
                                                    <Button
                                                        onClick={() => {
                                                            setExportedPassphrase('');
                                                            setShowPassphrase(false);
                                                        }}
                                                        variant="outline"
                                                        className="flex-1"
                                                    >
                                                        Clear
                                                    </Button>
                                                </div>
                                            )}

                                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-3">
                                                <p className="text-xs text-amber-700 dark:text-amber-300">
                                                    🔒 Store this passphrase separately from your recovery phrase for maximum security. You need both to restore your wallet.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            );
        }

        if (activeSection === 'privatekey') {
            return (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Key className="w-5 h-5" />
                            Export Private Key
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <AlertTriangle className="w-3 h-3 text-white" />
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-red-800 dark:text-red-200 mb-1">
                                            Critical Security Warning
                                        </h4>
                                        <p className="text-sm text-red-700 dark:text-red-300">
                                            Your private key provides complete control over your funds. Only export when absolutely necessary and keep it secure.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {!exportedPrivateKey ? (
                                <div className="space-y-3">
                                    <p className="text-sm text-muted-foreground">
                                        Export your wallet's private key in WIF (Wallet Import Format). This key can be used to import your wallet into any compatible application.
                                    </p>
                                    <Button
                                        onClick={handleExportPrivateKey}
                                        disabled={isExportingPrivateKey}
                                        className="w-full"
                                    >
                                        {isExportingPrivateKey ? (
                                            <>
                                                <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                                Exporting...
                                            </>
                                        ) : (
                                            <>
                                                <Key className="w-4 h-4 mr-2" />
                                                Export Private Key
                                            </>
                                        )}
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="block text-sm font-medium">
                                                Your Private Key (WIF Format)
                                            </span>
                                            <Button
                                                onClick={() => setShowPrivateKey(!showPrivateKey)}
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 text-sm"
                                            >
                                                {showPrivateKey ? (
                                                    <>
                                                        <Eye className="w-4 h-4 mr-1" />
                                                        Hide
                                                    </>
                                                ) : (
                                                    <>
                                                        <Eye className="w-4 h-4 mr-1" />
                                                        Show
                                                    </>
                                                )}
                                            </Button>
                                        </div>

                                        <div className={`bg-muted/50 border rounded-lg p-4 ${showPrivateKey ? '' : 'filter blur-sm'}`}>
                                            <div className="font-mono text-sm break-all">
                                                {exportedPrivateKey}
                                            </div>
                                        </div>
                                    </div>

                                    {showPrivateKey && (
                                        <div className="flex gap-2">
                                            <Button
                                                onClick={handleCopyPrivateKey}
                                                variant="secondary"
                                                className="flex-1"
                                            >
                                                <Copy className="w-4 h-4 mr-2" />
                                                Copy to Clipboard
                                            </Button>
                                            <Button
                                                onClick={() => {
                                                    setExportedPrivateKey('');
                                                    setShowPrivateKey(false);
                                                }}
                                                variant="outline"
                                                className="flex-1"
                                            >
                                                Clear
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            );
        }

        if (activeSection === 'encryption') {
            return (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            {isEncrypted ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
                            Wallet Encryption
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <Lock className="w-3 h-3 text-white" />
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-1">
                                            Wallet Encryption Status
                                        </h4>
                                        <p className="text-sm text-blue-700 dark:text-blue-300">
                                            {isEncrypted
                                                ? 'Your wallet is currently encrypted with a password. This provides additional security for your private keys.'
                                                : 'Your wallet is not encrypted. Consider encrypting it with a password for additional security.'
                                            }
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        {isEncrypted ? (
                                            <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                                <Lock className="w-4 h-4 text-green-600 dark:text-green-400" />
                                            </div>
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                                                <Unlock className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                                            </div>
                                        )}
                                        <div>
                                            <p className="font-medium text-sm">
                                                Encryption Status
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {isEncrypted ? 'Protected with password' : 'No password protection'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${isEncrypted
                                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                        : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                                        }`}>
                                        {isEncrypted ? 'Encrypted' : 'Not Encrypted'}
                                    </div>
                                </div>

                                {isEncrypted ? (
                                    <Button
                                        onClick={() => handleWalletAction('decrypt')}
                                        variant="destructive"
                                        className="w-full"
                                    >
                                        <Unlock className="w-4 h-4 mr-2" />
                                        Remove Encryption
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={() => handleWalletAction('encrypt')}
                                        className="w-full"
                                    >
                                        <Lock className="w-4 h-4 mr-2" />
                                        Encrypt Wallet
                                    </Button>
                                )}

                                <p className="text-xs text-muted-foreground text-center">
                                    {isEncrypted
                                        ? 'Removing encryption will store your private keys without password protection.'
                                        : 'Encrypting your wallet adds an extra layer of security by requiring a password to access your private keys.'
                                    }
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            );
        }

        if (activeSection === 'hdconfig') {
            return (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Hash className="w-5 h-5" />
                            HD Wallet Configuration
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            {currentWalletAddress && (
                                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                                    <div className="flex items-start gap-3">
                                        <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <Wallet className="w-3 h-3 text-white" />
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-1">
                                                Current Wallet
                                            </h4>
                                            <p className="text-sm text-blue-700 dark:text-blue-300 font-mono">
                                                {currentWalletAddress}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <Hash className="w-3 h-3 text-white" />
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-green-800 dark:text-green-200 mb-1">
                                            HD Wallet Settings
                                        </h4>
                                        <p className="text-sm text-green-700 dark:text-green-300">
                                            Configure how many addresses your HD wallet generates and manages. More addresses provide better privacy but use more resources.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <Label htmlFor="hdAddressCount"># of Addresses to Show</Label>
                                <div className="flex items-center space-x-4">
                                    <div className="flex-1">
                                        <Slider
                                            id="hdAddressCount"
                                            min={1}
                                            max={20}
                                            step={1}
                                            value={[addressCount]}
                                            onValueChange={(value) => handleAddressCountChange(value[0])}
                                            className="mt-2"
                                        />
                                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                            <span>1</span>
                                            <span className="font-medium text-primary">{addressCount}</span>
                                            <span>20</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center ml-3">
                                        <Badge className="mr-2 bg-amber-200 text-amber-900 dark:bg-amber-800 dark:text-amber-100">
                                            ×{addressCount}
                                        </Badge>
                                        <Badge className="bg-indigo-200 text-indigo-900 dark:bg-indigo-800 dark:text-indigo-100">
                                            ×{addressCount}
                                        </Badge>
                                    </div>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Shows both receiving and change addresses. Receiving addresses are used for incoming transactions, while change addresses handle leftover funds from outgoing transactions.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            );
        }

        return (
            <div className="grid gap-4">
                {sections.map((section) => {
                    const IconComponent = section.icon;
                    return (
                        <Card
                            key={section.id}
                            className="cursor-pointer hover:shadow-lg transition-all duration-200"
                            onClick={section.action}
                        >
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                        <IconComponent className="w-6 h-6 text-primary" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg">{section.title}</CardTitle>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {section.description}
                                        </p>
                                    </div>
                                </div>
                            </CardHeader>
                        </Card>
                    );
                })}
            </div>
        );
    };

    return (
        <AppLayout
            headerProps={{
                title: activeSection === 'wallets' ? 'Wallet Manager' :
                    activeSection === 'addresses' ? 'Derived Addresses' :
                        activeSection === 'recovery' ? 'Export Recovery Phrase' :
                            activeSection === 'privatekey' ? 'Export Private Key' :
                                activeSection === 'encryption' ? 'Wallet Encryption' :
                                    activeSection === 'hdconfig' ? 'HD Wallet Configuration' :
                                        'Wallet Management',
                showBackButton: true,
                customBackAction: handleBack,
                actions: <HeaderActions />
            }}
        >
            <div className="space-y-6 max-w-screen-2xl">
                {renderContent()}
            </div>

            {/* Authentication Dialog */}
            <AuthenticationDialog
                isOpen={showAuthDialog}
                onClose={() => setShowAuthDialog(false)}
                onAuthenticate={(password) => {
                    setShowAuthDialog(false);
                    // Handle wallet encryption/decryption with password
                }}
                title="Wallet Encryption"
                message="Authentication required to modify wallet encryption"
            />
        </AppLayout>
    );
}
