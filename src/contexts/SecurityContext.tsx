'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react';
import { securityService } from '@/services/core/SecurityService';
import { StorageService } from '@/services/core/StorageService';
import SecurityLockScreen from '@/components/SecurityLockScreen';
import AuthenticationDialog from '@/components/AuthenticationDialog';
import { useWallet } from './WalletContext';

interface SecurityContextType {
  isLocked: boolean;
  lockWallet: () => Promise<void>;
  unlockWallet: (password?: string, useBiometric?: boolean) => Promise<boolean>;
  requireAuth: (
    message?: string,
    autoLogin?: boolean,
  ) => Promise<{ success: boolean; password?: string }>;
  manualLock: () => Promise<void>;
  wasBiometricAuth: boolean;
  storedWalletPassword?: string;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

interface SecurityProviderProps {
  children: ReactNode;
}

export function SecurityProvider({ children }: SecurityProviderProps) {
  // Get the current wallet address from WalletContext - this might be undefined on initial render
  // We need to use a try-catch because this hook might fail during SSR
  let activeWalletAddress: string | undefined;
  try {
    const walletContext = useWallet();
    activeWalletAddress = walletContext?.address;
  } catch (error) {
    // This is fine, we'll handle the undefined case
  }

  const [isInitializing, setIsInitializing] = useState(true); // Add initializing state
  const [isLocked, setIsLocked] = useState(false);
  const [lockReason, setLockReason] = useState<'timeout' | 'manual' | 'failed_auth'>('manual');
  const [wasBiometricAuth, setWasBiometricAuth] = useState(false);
  const [storedWalletPassword, setStoredWalletPassword] = useState<string | undefined>();
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [authMessage, setAuthMessage] = useState<string>('Please authenticate to continue');
  const [currentWalletAddress, setCurrentWalletAddress] = useState<string | undefined>(
    activeWalletAddress,
  );
  const [authResolve, setAuthResolve] = useState<
    ((value: { success: boolean; password?: string }) => void) | null
  >(null);

  useEffect(() => {
    // Initialize security service and check if wallet should be locked
    const initSecurity = async () => {
      try {
        // Check if there are any wallets first
        const wallets = await StorageService.getAllWallets();

        // Only lock if there are wallets
        if (wallets.length > 0) {
          const isCurrentlyLocked = await securityService.isLocked();
          setIsLocked(isCurrentlyLocked);
        } else {
          // If no wallets, ensure we're unlocked
          setIsLocked(false);
        }
      } catch (error) {
        // Default to unlocked state if there's an error
        setIsLocked(false);
      } finally {
        // Mark initialization as complete
        setIsInitializing(false);
      }
    };

    initSecurity();

    // Listen for lock state changes
    const unsubscribe = securityService.onLockStateChange(
      (locked: boolean, reason?: 'timeout' | 'manual' | 'failed_auth') => {
        setIsLocked(locked);
        if (reason) {
          setLockReason(reason);
        }
      },
    );

    // Set up user activity tracking to prevent timeout when user is active
    const userActivityEvents = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
    ];

    const handleUserActivity = () => {
      // Only reset auto-lock if wallet is unlocked
      if (!isLocked) {
        securityService.resetAutoLock();
      }
    };

    // Add event listeners for all user activity events
    userActivityEvents.forEach((eventType) => {
      window.addEventListener(eventType, handleUserActivity, { passive: true });
    });

    // Clean up event listeners on unmount
    return () => {
      unsubscribe();
      userActivityEvents.forEach((eventType) => {
        window.removeEventListener(eventType, handleUserActivity);
      });
    };
  }, [isLocked]);

  const lockWallet = async () => {
    await securityService.lockWallet();
    setIsLocked(true);
    setLockReason('manual');
  };

  const unlockWallet = async (password?: string, useBiometric?: boolean) => {
    if (useBiometric) {
      // Get the biometric authentication result directly to access the wallet password
      const biometricAvailable = await securityService.isBiometricAuthAvailable();
      if (biometricAvailable) {
        const biometricResult = await securityService.authenticateWithBiometric();
        if (biometricResult.success) {
          setWasBiometricAuth(true);
          setStoredWalletPassword(biometricResult.walletPassword);
          setIsLocked(false);
          return true;
        }
        return false;
      }
      return false;
    } else {
      const success = await securityService.unlockWallet(password, false);
      if (success) {
        setIsLocked(false);
        setWasBiometricAuth(false);
        // Store the password if provided
        if (password) {
          setStoredWalletPassword(password);
        } else {
          setStoredWalletPassword(undefined);
        }
      }
      return success;
    }
  };

  const handleAuthentication = useCallback(
    (password: string) => {
      if (authResolve) {
        setWasBiometricAuth(false); // This was a manual password entry
        setStoredWalletPassword(password);
        authResolve({ success: true, password });
        setShowAuthDialog(false);
        setAuthResolve(null);
      }
    },
    [authResolve],
  );

  const handleAuthCancel = useCallback(() => {
    if (authResolve) {
      authResolve({ success: false });
      setShowAuthDialog(false);
      setAuthResolve(null);
    }
  }, [authResolve]);

  const requireAuth = async (
    message?: string,
    autoLogin: boolean = false,
  ): Promise<{ success: boolean; password?: string }> => {
    if (isLocked) {
      return { success: false };
    }

    try {
      // If password is already stored from previous authentication
      if (storedWalletPassword && autoLogin) {
        return {
          success: true,
          password: storedWalletPassword,
        };
      }

      // Check if biometrics are available, configured in settings, and enabled for this specific wallet
      const settings = await securityService.getSecuritySettings();
      const globalBiometricEnabled = settings.biometric.enabled;

      // Get the active wallet to check if biometrics are enabled for it
      const activeWallet = await StorageService.getActiveWallet();
      const walletBiometricEnabled = activeWallet?.biometricsEnabled === true;

      // Only proceed with biometric auth if both global setting AND wallet-specific setting are enabled
      const biometricAvailable =
        globalBiometricEnabled &&
        walletBiometricEnabled &&
        (await securityService.isBiometricAuthAvailable());

      if (biometricAvailable) {
        // Try biometric auth first
        const biometricResult = await securityService.authenticateWithBiometric();

        if (biometricResult.success && biometricResult.walletPassword) {
          setWasBiometricAuth(true);
          setStoredWalletPassword(biometricResult.walletPassword);
          return {
            success: true,
            password: biometricResult.walletPassword,
          };
        }
      }

      // If we get here, we need to show the auth dialog
      return new Promise((resolve) => {
        setCurrentWalletAddress(activeWallet?.address);
        setAuthMessage(message || 'Please authenticate to continue');
        setAuthResolve(() => resolve);
        setShowAuthDialog(true);
      });
    } catch (error) {
      return { success: false };
    }
  };

  const manualLock = async () => {
    await securityService.lockWallet('manual');
    setIsLocked(true);
    setLockReason('manual');
    setWasBiometricAuth(false);
    setStoredWalletPassword(undefined);
  };

  const handleUnlock = () => {
    setIsLocked(false);
  };

  // Show nothing while initializing to prevent flicker
  if (isInitializing) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="animate-pulse text-center">
          <div className="h-12 w-12 rounded-full border-4 border-avian-600 border-t-transparent animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Loading wallet...</p>
        </div>
      </div>
    );
  }

  if (isLocked) {
    return <SecurityLockScreen onUnlock={handleUnlock} lockReason={lockReason} />;
  }

  return (
    <SecurityContext.Provider
      value={{
        isLocked,
        lockWallet,
        unlockWallet,
        requireAuth,
        manualLock,
        wasBiometricAuth,
        storedWalletPassword,
      }}
    >
      {children}
      <AuthenticationDialog
        isOpen={showAuthDialog}
        onClose={handleAuthCancel}
        onAuthenticate={handleAuthentication}
        message={authMessage}
        walletAddress={currentWalletAddress}
      />
    </SecurityContext.Provider>
  );
}

export function useSecurity() {
  const context = useContext(SecurityContext);
  if (context === undefined) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
}
