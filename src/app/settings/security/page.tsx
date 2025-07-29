'use client';

import React from 'react';
import { AppLayout } from '@/components/AppLayout';
import { HeaderActions } from '@/components/HeaderActions';
import SecuritySettingsPanel from '@/components/SecuritySettingsPanel';

export default function SecuritySettingsPage() {
    return (
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
    );
}
