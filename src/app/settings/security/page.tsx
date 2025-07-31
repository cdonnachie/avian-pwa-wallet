'use client';

import React from 'react';
import { AppLayout } from '@/components/AppLayout';
import { HeaderActions } from '@/components/HeaderActions';
import SecuritySettingsPanel from '@/components/SecuritySettingsPanel';
import RouteGuard from '@/components/RouteGuard';

export default function SecuritySettingsPage() {
    return (
        <RouteGuard requireTerms={true} requireWallet={true}>
            <AppLayout
                headerProps={{
                    title: 'Security Settings',
                    showBackButton: true,
                    actions: <HeaderActions />
                }}
            >
                <div className="max-w-screen-2xl">
                    <SecuritySettingsPanel />
                </div>
            </AppLayout>
        </RouteGuard>
    );
}
