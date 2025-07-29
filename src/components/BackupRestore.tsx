'use client';

import React, { useState } from 'react';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BackupService } from '@/services/core/BackupService';
import { WalletBackup, RestoreOptions } from '@/types/backup';
import { toast } from 'sonner';

export function BackupRestore() {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [restorePassword, setRestorePassword] = useState('');
    const [isImporting, setIsImporting] = useState(false);
    const [backupPreview, setBackupPreview] = useState<WalletBackup | null>(null);
    const [restoreOptions, setRestoreOptions] = useState<RestoreOptions>({
        includeWallets: true,
        includeAddressBook: true,
        includeSettings: true,
        overwriteExisting: false,
    });

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setSelectedFile(file);

        try {
            setIsImporting(true);

            // First, try to parse without password to check if it's encrypted
            const result = await BackupService.parseBackupFile(file);

            // Validate the backup
            if (!result.validation.isValid) {
                toast.error(`Invalid backup file: ${result.validation.errors.join(', ')}`);
                setSelectedFile(null);
                return;
            }

            setBackupPreview(result.backup);
        } catch (error: any) {
            // If parsing fails, it might be encrypted - we'll need password input
            if (
                error.message.includes('encrypted') ||
                error.message.includes('password') ||
                error.message.includes('decrypt')
            ) {
                // File is encrypted, show password field
                setBackupPreview(null);
            } else {
                toast.error(error.message || 'Failed to read backup file');
                setSelectedFile(null);
            }
        } finally {
            setIsImporting(false);
        }
    };

    const handlePasswordVerify = async () => {
        if (!selectedFile || !restorePassword) return;

        try {
            setIsImporting(true);
            const result = await BackupService.parseBackupFile(selectedFile, restorePassword);

            if (!result.validation.isValid) {
                toast.error(`Invalid backup file: ${result.validation.errors.join(', ')}`);
                return;
            }

            setBackupPreview(result.backup);
        } catch (error: any) {
            toast.error(error.message || 'Failed to decrypt backup file');
        } finally {
            setIsImporting(false);
        }
    };

    const handleRestore = async () => {
        if (!selectedFile || !backupPreview) {
            toast.error('Please select a valid backup file');
            return;
        }

        try {
            setIsImporting(true);

            await BackupService.restoreFromBackup(backupPreview, restoreOptions);

            toast.success('Backup restored successfully!');

            // Reset form
            setSelectedFile(null);
            setBackupPreview(null);
            setRestorePassword('');

            // Suggest page reload
            if (
                confirm(
                    'Backup restored successfully! Would you like to reload the page to see the changes?',
                )
            ) {
                window.location.reload();
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to restore backup');
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Upload className="w-5 h-5 text-primary" />
                    Import Backup
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* File Selection */}
                <div>
                    <Label htmlFor="backupFile" className="block mb-2">
                        Select Backup File
                    </Label>
                    <Input
                        id="backupFile"
                        type="file"
                        accept=".json"
                        onChange={handleFileSelect}
                        className="cursor-pointer"
                    />
                </div>

                {/* Backup Preview */}
                {backupPreview && (
                    <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700">
                        <CardContent className="pt-6">
                            <div className="flex items-center mb-2">
                                <FileText className="w-4 h-4 mr-2 text-blue-600" />
                                <span className="font-medium text-blue-900 dark:text-blue-200">
                                    Backup Preview
                                </span>
                            </div>
                            <div className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                                <p>• Created: {new Date(backupPreview.timestamp).toLocaleDateString()}</p>
                                <p>• Version: {backupPreview.version}</p>
                                <p>• Wallets: {backupPreview.wallets.length}</p>
                                <p>• Address Book entries: {backupPreview.addressBook.length}</p>
                                <p>• Type: {backupPreview.metadata.backupType}</p>
                                {backupPreview.wallets.some((w) => w.isEncrypted) && (
                                    <Alert className="mt-2 bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-600">
                                        <AlertDescription className="text-yellow-800 dark:text-yellow-200 text-xs">
                                            ⚠️ This backup contains encrypted wallets. You'll need the individual
                                            wallet passwords when accessing them.
                                        </AlertDescription>
                                    </Alert>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Restore Password */}
                {selectedFile && !backupPreview && (
                    <div>
                        <Label htmlFor="restorePassword" className="block mb-2">
                            Backup Password
                        </Label>
                        <div className="flex space-x-2">
                            <Input
                                id="restorePassword"
                                type="password"
                                placeholder="Enter backup encryption password"
                                value={restorePassword}
                                onChange={(e) => setRestorePassword(e.target.value)}
                                className="flex-1"
                            />
                            <Button onClick={handlePasswordVerify} disabled={isImporting || !restorePassword}>
                                {isImporting ? 'Verifying...' : 'Verify'}
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            This backup file appears to be encrypted. Please enter the password to decrypt it.
                        </p>
                    </div>
                )}

                {/* Restore Options */}
                {backupPreview && (
                    <div>
                        <Label className="block mb-3">Restore Options</Label>
                        <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="includeWallets"
                                    checked={restoreOptions.includeWallets}
                                    onCheckedChange={(checked) =>
                                        setRestoreOptions((prev) => ({
                                            ...prev,
                                            includeWallets: checked as boolean,
                                        }))
                                    }
                                />
                                <Label htmlFor="includeWallets" className="cursor-pointer">
                                    Restore wallets ({backupPreview.wallets.length})
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="includeAddressBook"
                                    checked={restoreOptions.includeAddressBook}
                                    onCheckedChange={(checked) =>
                                        setRestoreOptions((prev) => ({
                                            ...prev,
                                            includeAddressBook: checked as boolean,
                                        }))
                                    }
                                />
                                <Label htmlFor="includeAddressBook" className="cursor-pointer">
                                    Restore address book ({backupPreview.addressBook.length})
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="includeSettings"
                                    checked={restoreOptions.includeSettings}
                                    onCheckedChange={(checked) =>
                                        setRestoreOptions((prev) => ({
                                            ...prev,
                                            includeSettings: checked as boolean,
                                        }))
                                    }
                                />
                                <Label htmlFor="includeSettings" className="cursor-pointer">
                                    Restore settings
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="overwriteExisting"
                                    checked={restoreOptions.overwriteExisting}
                                    onCheckedChange={(checked) =>
                                        setRestoreOptions((prev) => ({
                                            ...prev,
                                            overwriteExisting: checked as boolean,
                                        }))
                                    }
                                />
                                <Label htmlFor="overwriteExisting" className="cursor-pointer">
                                    Overwrite existing data
                                </Label>
                            </div>
                        </div>
                        <Alert className="mt-2 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700">
                            <div className="flex items-start">
                                <AlertCircle className="w-4 h-4 mr-2 text-amber-600 mt-0.5" />
                                <AlertDescription className="text-xs text-amber-800 dark:text-amber-200">
                                    <p className="font-medium">Warning:</p>
                                    <p>
                                        If "Overwrite existing" is checked, this will replace your current
                                        data. Otherwise, it will be merged with existing data.
                                    </p>
                                </AlertDescription>
                            </div>
                        </Alert>
                    </div>
                )}

                {/* Restore Button */}
                <Button onClick={handleRestore} disabled={!backupPreview || isImporting} className="w-full">
                    {isImporting ? 'Restoring...' : 'Restore from Backup'}
                </Button>
            </CardContent>
        </Card>
    );
}
