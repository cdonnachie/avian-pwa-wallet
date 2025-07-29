'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, QrCode, Upload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AppLayout } from '@/components/AppLayout';
import { HeaderActions } from '@/components/HeaderActions';
import { BackupExport } from '@/components/BackupExport';
import { BackupRestore } from '@/components/BackupRestore';

type ViewType = 'overview' | 'export' | 'restore';

export default function BackupSettingsPage() {
    const router = useRouter();
    const [currentView, setCurrentView] = useState<ViewType>('overview');

    const backupOptions = [
        {
            id: 'export',
            title: 'Export Backup',
            description: 'Create and download wallet backup files',
            icon: Download,
            action: () => setCurrentView('export'),
        },
        {
            id: 'restore',
            title: 'Import Backup',
            description: 'Restore wallet data from backup files',
            icon: Upload,
            action: () => setCurrentView('restore'),
        },
        {
            id: 'qr',
            title: 'QR Code Backup',
            description: 'Generate QR codes for wallet transfer',
            icon: QrCode,
            action: () => router.push('/backup/qr'),
        },
    ];

    const renderContent = () => {
        if (currentView === 'export') {
            return <BackupExport />;
        }

        if (currentView === 'restore') {
            return <BackupRestore />;
        }

        return (
            <div className="grid gap-4">
                {backupOptions.map((option) => {
                    const IconComponent = option.icon;
                    return (
                        <Card
                            key={option.id}
                            className="cursor-pointer hover:shadow-lg transition-all duration-200"
                            onClick={option.action}
                        >
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                        <IconComponent className="w-6 h-6 text-primary" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg">{option.title}</CardTitle>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {option.description}
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

    const getPageTitle = () => {
        switch (currentView) {
            case 'export':
                return 'Export Backup';
            case 'restore':
                return 'Import Backup';
            default:
                return 'Backup & Recovery';
        }
    };

    const handleBack = () => {
        if (currentView !== 'overview') {
            setCurrentView('overview');
        } else {
            router.back();
        }
    };

    return (
        <AppLayout
            headerProps={{
                title: getPageTitle(),
                showBackButton: true,
                customBackAction: handleBack,
                actions: <HeaderActions />
            }}
        >
            <div className="space-y-6 max-w-screen-2xl">
                <div>
                    <h2 className="text-lg font-semibold mb-2">Protect Your Wallet</h2>
                    <p className="text-muted-foreground">
                        Create backups to keep your wallet safe and accessible
                    </p>
                </div>

                {renderContent()}
            </div>
        </AppLayout>
    );
}
