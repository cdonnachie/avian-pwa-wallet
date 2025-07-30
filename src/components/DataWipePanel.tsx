'use client';

import React, { useState } from 'react';
import { DataWipeService } from '@/services/DataWipeService';
import { toast } from 'sonner';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Trash2, AlertTriangle } from 'lucide-react';

export const DataWipePanel: React.FC = () => {
    const [isWiping, setIsWiping] = useState(false);

    const handleWipeData = async () => {
        setIsWiping(true);

        try {
            const result = await DataWipeService.wipeAllData();

            if (result.success) {
                toast.success('All data wiped successfully!', {
                    description: 'The page will reload in a moment...',
                });

                // Reload after a short delay to show the success message
                setTimeout(() => {
                    DataWipeService.reloadApp();
                }, 1500);
            } else {
                toast.error('Data wipe completed with warnings', {
                    description: result.errors.join(', '),
                });

                // Still reload even if there were warnings
                setTimeout(() => {
                    DataWipeService.reloadApp();
                }, 2000);
            }
        } catch (error) {
            toast.error('Failed to wipe data', {
                description: error instanceof Error ? error.message : 'Unknown error occurred',
            });
            setIsWiping(false);
        }
    };

    return (
        <Card className="border-destructive/20">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                    Danger Zone
                </CardTitle>
                <CardDescription>
                    This action will permanently delete all wallet data, settings, and cached information.
                    This cannot be undone.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                        <p className="mb-2">This will clear:</p>
                        <ul className="list-disc list-inside space-y-1 ml-4">
                            <li>All wallet data and private keys</li>
                            <li>Transaction history and cache</li>
                            <li>Application settings and preferences</li>
                            <li>Service worker cache</li>
                            <li>All browser storage data</li>
                        </ul>
                    </div>

                    <div className="pt-4 border-t">
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button
                                    variant="destructive"
                                    disabled={isWiping}
                                    className="w-full"
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    {isWiping ? 'Wiping Data...' : 'Wipe All Data'}
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                                        <AlertTriangle className="h-5 w-5" />
                                        Are you absolutely sure?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This action cannot be undone. This will permanently delete all your
                                        wallet data, private keys, transaction history, and application settings.

                                        <br /><br />

                                        <strong>Make sure you have backed up your wallet before proceeding!</strong>
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={handleWipeData}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        disabled={isWiping}
                                    >
                                        {isWiping ? 'Wiping...' : 'Yes, wipe everything'}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default DataWipePanel;
