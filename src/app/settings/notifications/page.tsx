'use client';

import React from 'react';
import { AppLayout } from '@/components/AppLayout';
import NotificationSettings from '@/components/NotificationSettings';
import { HeaderActions } from '@/components/HeaderActions';
import RouteGuard from '@/components/RouteGuard';

export default function NotificationSettingsPage() {
    return (
        <RouteGuard requireTerms={true} requireWallet={true}>
            <AppLayout
                headerProps={{
                    title: 'Notification Settings',
                    showBackButton: true,
                    actions: <HeaderActions />
                }}
            >
                <div className='max-w-screen-2xl'>
                    <NotificationSettings />
                </div>
            </AppLayout>
        </RouteGuard>
    );
}
