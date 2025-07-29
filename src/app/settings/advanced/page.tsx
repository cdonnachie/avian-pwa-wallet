'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bug, Code, Eye } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import MessageUtilities from '@/components/MessageUtilities';
import { InlineLogViewer } from '@/components/InlineLogViewer';
import { AppLayout } from '@/components/AppLayout';
import { HeaderActions } from '@/components/HeaderActions';
import GradientBackground from '@/components/GradientBackground';

export default function AdvancedSettingsPage() {
    const router = useRouter();
    const [activeSection, setActiveSection] = useState<'logs' | 'messages' | 'watched' | null>(null);

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
        <AppLayout
            headerProps={{
                title: activeSection === 'logs' ? 'Debug Logs' :
                    activeSection === 'messages' ? 'Message Utilities' :
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
    );
}
