'use client';

import React, { useState } from 'react';
import { Lock, Unlock, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSecurity } from '@/contexts/SecurityContext';
import { useWallet } from '@/contexts/WalletContext';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import AboutModal from '@/components/AboutModal';

interface HeaderActionsProps {
    showLockButton?: boolean;
    showHelpButton?: boolean;
    showThemeSwitch?: boolean;
}

export function HeaderActions({
    showLockButton = true,
    showHelpButton = true,
    showThemeSwitch = true
}: HeaderActionsProps) {
    const { lockWallet, isLocked } = useSecurity();
    const { address } = useWallet();
    const [showAboutModal, setShowAboutModal] = useState(false);

    return (
        <>
            <div className="flex items-center space-x-2">
                {/* Lock Button */}
                {showLockButton && address && (
                    <Button
                        onClick={() => lockWallet()}
                        variant="ghost"
                        size="icon"
                        className="w-9 h-9"
                        aria-label="Lock wallet"
                        title="Lock wallet"
                    >
                        {isLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                    </Button>
                )}

                {/* Help Button */}
                {showHelpButton && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="w-9 h-9"
                        onClick={() => setShowAboutModal(true)}
                        title="About wallet & FAQ"
                    >
                        <HelpCircle className="h-4 w-4" />
                    </Button>
                )}

                {/* Theme Switcher */}
                {showThemeSwitch && <ThemeSwitcher />}
            </div>

            {/* About Modal */}
            {showAboutModal && (
                <AboutModal
                    isOpen={showAboutModal}
                    onClose={() => setShowAboutModal(false)}
                />
            )}
        </>
    );
}
