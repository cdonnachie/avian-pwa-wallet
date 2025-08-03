'use client';

import React from 'react';
import { AppLayout } from '@/components/AppLayout';
import WatchAddressesPanel from '@/components/WatchAddressesPanel';
import RouteGuard from '@/components/RouteGuard';

export default function WatchedAddressesPage() {
    return (
        <RouteGuard requireTerms={true}>
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
        </RouteGuard>
    );
}
