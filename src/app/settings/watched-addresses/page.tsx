'use client';

import React from 'react';
import { AppLayout } from '@/components/AppLayout';
import WatchAddressesPanel from '@/components/WatchAddressesPanel';

export default function WatchedAddressesPage() {
    return (
        <AppLayout
            headerProps={{
                title: 'Watched Addresses',
                showBackButton: true
            }}
        >
            <div className="max-w-screen-2xl">
                <WatchAddressesPanel />
            </div>
        </AppLayout>
    );
}
