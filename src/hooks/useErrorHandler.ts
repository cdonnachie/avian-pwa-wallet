'use client';

import { useCallback } from 'react';
import { errorReporting } from '@/services/ErrorReportingService';
import { toast } from 'sonner';

export interface UseErrorHandlerOptions {
  component?: string;
  showToast?: boolean;
  onError?: (error: Error) => void;
}

/**
 * Hook for handling errors consistently across the application
 */
export function useErrorHandler(options: UseErrorHandlerOptions = {}) {
  const { component, showToast = true, onError } = options;

  const handleError = useCallback(
    async (error: Error, context?: Record<string, any>) => {
      try {
        // Report the error
        const errorId = await errorReporting.reportError(error, {
          component,
          metadata: context,
        });

        // Show user-friendly toast notification
        if (showToast) {
          if (errorReporting.isRecoverableError(error)) {
            const actions = errorReporting.getRecoveryActions(error);
            toast.error('Something went wrong', {
              description: `${error.message}. ${actions[0] || 'Please try again.'}`,
              action: {
                label: 'Retry',
                onClick: () => {
                  // Trigger a page refresh for simple recovery
                  window.location.reload();
                },
              },
            });
          } else {
            toast.error('Unexpected Error', {
              description: `An unexpected error occurred. Error ID: ${errorId.slice(0, 8)}`,
            });
          }
        }

        // Call custom error handler if provided
        if (onError) {
          onError(error);
        }

        return errorId;
      } catch (handlerError) {
        // Fallback for when error handling itself fails
        if (showToast) {
          toast.error('System Error', {
            description: 'Unable to handle error properly. Please refresh the page.',
          });
        }
        throw handlerError;
      }
    },
    [component, showToast, onError],
  );

  const handleAsyncError = useCallback(
    (asyncFn: () => Promise<any>, context?: Record<string, any>) => {
      return async (...args: any[]) => {
        try {
          return await asyncFn();
        } catch (error) {
          await handleError(error instanceof Error ? error : new Error(String(error)), context);
          throw error; // Re-throw so the caller can handle it if needed
        }
      };
    },
    [handleError],
  );

  const wrapAsyncFunction = useCallback(
    <T extends (...args: any[]) => Promise<any>>(asyncFn: T, context?: Record<string, any>): T => {
      return (async (...args: any[]) => {
        try {
          return await asyncFn(...args);
        } catch (error) {
          await handleError(error instanceof Error ? error : new Error(String(error)), context);
          throw error;
        }
      }) as T;
    },
    [handleError],
  );

  return {
    handleError,
    handleAsyncError,
    wrapAsyncFunction,
  };
}

/**
 * Hook for getting error statistics and management
 */
export function useErrorReporting() {
  const getStats = useCallback(() => {
    return errorReporting.getErrorStats();
  }, []);

  const getRecentErrors = useCallback((count?: number) => {
    return errorReporting.getRecentErrors(count);
  }, []);

  const clearErrors = useCallback(() => {
    errorReporting.clearErrorReports();
    toast.success('Error reports cleared');
  }, []);

  const isRecoverable = useCallback((error: Error) => {
    return errorReporting.isRecoverableError(error);
  }, []);

  const getRecoveryActions = useCallback((error: Error) => {
    return errorReporting.getRecoveryActions(error);
  }, []);

  return {
    getStats,
    getRecentErrors,
    clearErrors,
    isRecoverable,
    getRecoveryActions,
  };
}

export default useErrorHandler;
