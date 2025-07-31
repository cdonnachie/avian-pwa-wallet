'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bug, Code, Eye, Trash2 } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import MessageUtilities from '@/components/MessageUtilities';
import { InlineLogViewer } from '@/components/InlineLogViewer';
import { DataWipePanel } from '@/components/DataWipePanel';
import { AppLayout } from '@/components/AppLayout';
import { HeaderActions } from '@/components/HeaderActions';
import GradientBackground from '@/components/GradientBackground';
import RouteGuard from '@/components/RouteGuard';

export default function AdvancedSettingsPage() {
    const router = useRouter();
    const [activeSection, setActiveSection] = useState<'logs' | 'messages' | 'watched' | 'datawipe' | null>(null);

    const handleBack = () => {
        if (activeSection) {
            setActiveSection(null);
        } else {
            router.back();
        }
    };

    const sections = [
        {
            id: 'logs' as const,
            title: 'Debug Logs',
            description: 'View application logs and debugging information',
            icon: Bug,
            action: () => setActiveSection('logs'),
        },
        {
            id: 'messages' as const,
            title: 'Message Utilities',
            description: 'Sign and verify messages with your wallet',
            icon: Code,
            action: () => setActiveSection('messages'),
        },
        {
            id: 'watched' as const,
            title: 'Watched Addresses',
            description: 'Monitor addresses without importing private keys',
            icon: Eye,
            action: () => router.push('/settings/watched-addresses'),
        },
        {
            id: 'datawipe' as const,
            title: 'Reset Application',
            description: 'Wipe all data and start fresh (useful for mobile)',
            icon: Trash2,
            action: () => setActiveSection('datawipe'),
        },
    ];

    const renderContent = () => {
        if (activeSection === 'logs') {
            return (
                <div className="space-y-6">
                    <div>
                        <h2 className="text-lg font-semibold mb-2">Debug Logs</h2>
                        <p className="text-muted-foreground">
                            View application logs and debugging information with filtering, search, and export capabilities.
                        </p>
                    </div>
                    <InlineLogViewer />
                </div>
            );
        }

        if (activeSection === 'messages') {
            return <MessageUtilities />;
        }

        if (activeSection === 'datawipe') {
            return (
                <div className="space-y-6">
                    <div>
                        <h2 className="text-lg font-semibold mb-2">Reset Application</h2>
                        <p className="text-muted-foreground">
                            Completely wipe all application data and start fresh. This is particularly useful on mobile devices where dev tools are not accessible.
                        </p>
                    </div>
                    <DataWipePanel />
                </div>
            );
        }

        return (
            <div className="space-y-6">
                <div>
                    <h2 className="text-lg font-semibold mb-2">Developer Tools</h2>
                    <p className="text-muted-foreground">
                        Advanced features for developers and power users
                    </p>
                </div>

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
            </div>
        );
    };

    return (
        <RouteGuard requireTerms={true}>
            <AppLayout
                headerProps={{
                    title: activeSection === 'logs' ? 'Debug Logs' :
                        activeSection === 'messages' ? 'Message Utilities' :
                            activeSection === 'datawipe' ? 'Reset Application' :
                                'Advanced Settings',
                    showBackButton: true,
                    customBackAction: handleBack,
                    actions: <HeaderActions />
                }}
            >
                <div className="max-w-screen-2xl">
                    {renderContent()}
                </div>
            </AppLayout>
        </RouteGuard>
    );
}
