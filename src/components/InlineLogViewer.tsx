'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Search,
    Trash2,
    Download,
    RefreshCw,
    AlertCircle,
    Info,
    AlertTriangle,
    RotateCcw,
    Bug,
} from 'lucide-react';
import {
    Logger,
    LogEntry,
    walletLogger,
    notificationLogger,
    securityLogger,
    storageLogger,
    electrumLogger,
    priceLogger,
    watchAddressLogger,
} from '@/lib/Logger';
import { errorReporting, ErrorReport } from '@/services/ErrorReportingService';
import { securityService } from '@/services/core/SecurityService';
import { useMediaQuery } from '@/hooks/use-media-query';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
} from '@/components/ui/drawer';

import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface InlineLogViewerProps {
    className?: string;
}

// Map of logger names to their instances
const loggerMap: Record<string, Logger | null> = {
    all: null, // Special case for all loggers combined
    wallet: walletLogger,
    notification: notificationLogger,
    security: securityLogger,
    storage: storageLogger,
    electrum: electrumLogger,
    price: priceLogger,
    watch_address: watchAddressLogger,
    backup_service: Logger.getLogger('backup_service'),
    qr_backup: Logger.getLogger('qr_backup'),
    error_reporting: Logger.getLogger('error_reporting'),
    error_boundaries: null, // Special case for error boundary reports
    security_audit: null, // Special case for security audit log (read-only)
};

// Convert error reports to log entry format for consistent display
const convertErrorReportsToLogEntries = (reports: ErrorReport[]): LogEntry[] => {
    return reports.map((report) => ({
        timestamp: report.timestamp,
        level: 'ERROR' as const,
        message: `${report.error.name}: ${report.error.message}`,
        args: [
            {
                errorId: report.id,
                component: report.context.component,
                retryCount: report.context.retryCount,
                stack: report.error.stack,
                componentStack: report.errorInfo?.componentStack,
                userAgent: report.context.userAgent,
                url: report.context.url,
                userId: report.context.userId,
                sessionId: report.context.sessionId,
                metadata: report.metadata,
            },
        ],
    }));
};

// Convert security audit entries to log entry format for consistent display
const convertSecurityAuditToLogEntries = (auditEntries: any[]): LogEntry[] => {
    return auditEntries.map((entry) => ({
        timestamp: entry.timestamp,
        level: entry.success ? ('INFO' as const) : ('ERROR' as const),
        message: `Security Event: ${entry.action.replace('_', ' ')}`,
        args: [
            {
                auditId: entry.id,
                action: entry.action,
                success: entry.success,
                details: entry.details,
                userAgent: entry.userAgent,
                ipAddress: entry.ipAddress,
            },
        ],
    }));
};


export function InlineLogViewer({ className = "" }: InlineLogViewerProps = {}) {
    const [selectedLoggerName, setSelectedLoggerName] = useState<string>('all');
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
    const [filter, setFilter] = useState('');
    const [levelFilters, setLevelFilters] = useState({
        INFO: true,
        DEBUG: true,
        WARN: true,
        ERROR: true,
    });
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [isDebugEnabled, setIsDebugEnabled] = useState<boolean>(
        loggerMap[selectedLoggerName]?.isDebugEnabled() || false,
    );
    const [clearDialogOpen, setClearDialogOpen] = useState(false);
    const isMobile = useMediaQuery('(max-width: 640px)');

    const applyFilters = useCallback(
        (logEntries: LogEntry[], searchText: string, levels: typeof levelFilters) => {
            // Create a copy of the logs and ensure they're sorted by timestamp (newest first)
            let filtered = [...logEntries].sort((a, b) => b.timestamp - a.timestamp);

            // Apply level filters
            filtered = filtered.filter((log) => levels[log.level as keyof typeof levels]);

            if (searchText.trim()) {
                const searchLower = searchText.toLowerCase();
                filtered = filtered.filter((log) => {
                    const messageMatch = log.message.toLowerCase().includes(searchLower);
                    const argsMatch = JSON.stringify(log.args).toLowerCase().includes(searchLower);
                    const loggerMatch =
                        'loggerName' in log
                            ? (log as any).loggerName.toLowerCase().includes(searchLower)
                            : false;

                    return messageMatch || argsMatch || loggerMatch;
                });
            }

            setFilteredLogs(filtered);
        },
        [],
    );

    const fetchLogs = useCallback(async () => {
        if (selectedLoggerName === 'all') {
            let allLogs: LogEntry[] = [];

            Object.entries(loggerMap).forEach(([name, logger]) => {
                if (name !== 'all' && name !== 'error_boundaries' && name !== 'security_audit' && logger) {
                    const loggerEntries = logger.getLogs().map((log) => ({
                        ...log,
                        loggerName: name,
                    }));
                    allLogs = [...allLogs, ...loggerEntries];
                }
            });

            const errorReports = errorReporting.getRecentErrors(50);
            const errorLogEntries = convertErrorReportsToLogEntries(errorReports).map((log) => ({
                ...log,
                loggerName: 'error_boundaries',
            }));
            allLogs = [...allLogs, ...errorLogEntries];

            try {
                const securityAuditEntries = await securityService.getSecurityAuditLog();
                const auditLogEntries = convertSecurityAuditToLogEntries(securityAuditEntries).map(
                    (log) => ({
                        ...log,
                        loggerName: 'security_audit',
                    }),
                );
                allLogs = [...allLogs, ...auditLogEntries];
            } catch (error) {
                // Note: Using Logger here would create circular dependency, so we silently fail
            }

            allLogs.sort((a, b) => b.timestamp - a.timestamp);

            setLogs(allLogs);
        } else if (selectedLoggerName === 'error_boundaries') {
            const errorReports = errorReporting.getRecentErrors(50);
            const logEntries = convertErrorReportsToLogEntries(errorReports).sort(
                (a, b) => b.timestamp - a.timestamp,
            );

            setLogs(logEntries);
        } else if (selectedLoggerName === 'security_audit') {
            try {
                const securityAuditEntries = await securityService.getSecurityAuditLog();
                const logEntries = convertSecurityAuditToLogEntries(securityAuditEntries).sort(
                    (a, b) => b.timestamp - a.timestamp,
                );

                setLogs(logEntries);
            } catch (error) {
                // Note: Using Logger here would create circular dependency, so we silently fail
                setLogs([]);
            }
        } else {
            const logger = loggerMap[selectedLoggerName];
            if (logger) {
                const logEntries = logger.getLogs().sort((a, b) => b.timestamp - a.timestamp);

                setLogs(logEntries);
            }
        }
    }, [selectedLoggerName]);

    useEffect(() => {
        applyFilters(logs, filter, levelFilters);
    }, [filter, levelFilters, logs, applyFilters]);

    useEffect(() => {
        setFilter('');

        if (
            selectedLoggerName !== 'all' &&
            selectedLoggerName !== 'error_boundaries' &&
            selectedLoggerName !== 'security_audit' &&
            loggerMap[selectedLoggerName]
        ) {
            setIsDebugEnabled(loggerMap[selectedLoggerName]?.isDebugEnabled() || false);
        } else {
            setIsDebugEnabled(false);
        }

        fetchLogs();
    }, [selectedLoggerName, fetchLogs]);

    useEffect(() => {
        let intervalId: NodeJS.Timeout | null = null;

        if (autoRefresh) {
            intervalId = setInterval(fetchLogs, 2000);
        }

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [autoRefresh, selectedLoggerName, fetchLogs]);

    const handleClearLogs = () => {
        setClearDialogOpen(true);
    };

    const confirmClearLogs = () => {
        if (selectedLoggerName === 'all') {
            Object.entries(loggerMap).forEach(([name, logger]) => {
                if (name !== 'all' && name !== 'error_boundaries' && name !== 'security_audit' && logger) {
                    logger.clearLogs();
                }
            });
            errorReporting.clearErrorReports();
            // Note: Security audit log cannot be cleared from here - must be done from Security Settings
        } else if (selectedLoggerName === 'error_boundaries') {
            errorReporting.clearErrorReports();
        } else if (selectedLoggerName === 'security_audit') {
            // Security audit log cannot be cleared from LogViewer
            // This should not happen as the clear button should be disabled
            return;
        } else {
            // Clear logs from the selected logger
            const logger = loggerMap[selectedLoggerName];
            if (logger) {
                logger.clearLogs();
            }
        }

        // Reset the displayed logs
        setLogs([]);
        setFilteredLogs([]);

        // Close the dialog
        setClearDialogOpen(false);
    };

    // Download logs as JSON file
    const handleDownloadLogs = () => {
        try {
            const logData = JSON.stringify(logs, null, 2);
            const blob = new Blob([logData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${selectedLoggerName}-logs-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            // Can't use logger here to avoid circular dependency
            alert('Failed to download logs');
        }
    };

    // Toggle debug mode for the selected logger
    const handleToggleDebugMode = () => {
        const logger = loggerMap[selectedLoggerName];
        if (logger && selectedLoggerName !== 'all' && selectedLoggerName !== 'error_boundaries') {
            const newDebugState = !isDebugEnabled;
            logger.setDebugEnabled(newDebugState);
            setIsDebugEnabled(newDebugState);
            fetchLogs(); // Refresh logs
        }
    };

    // Format timestamp to readable format
    const formatTimestamp = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleString();
    };

    const getLevelColorClass = (level: string) => {
        switch (level) {
            case 'ERROR':
                return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
            case 'WARN':
                return 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400';
            case 'INFO':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
            case 'DEBUG':
                return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
        }
    };

    const getLevelIcon = (level: string) => {
        switch (level) {
            case 'ERROR':
                return <AlertCircle className="h-4 w-4" />;
            case 'WARN':
                return <AlertTriangle className="h-4 w-4" />;
            case 'INFO':
                return <Info className="h-4 w-4" />;
            case 'DEBUG':
                return <RotateCcw className="h-4 w-4" />;
            default:
                return null;
        }
    };

    return (
        <div className={`w-full max-w-full flex flex-col border rounded-lg shadow bg-background ${className}`}>
            {/* Clear Logs Confirmation Dialog/Drawer */}
            {isMobile ? (
                <Drawer open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
                    <DrawerContent>
                        <DrawerHeader>
                            <DrawerTitle>Clear Logs</DrawerTitle>
                            <DrawerDescription>
                                Are you sure you want to clear{' '}
                                {selectedLoggerName === 'all'
                                    ? 'ALL logs from EVERY logger'
                                    : `all logs for the ${selectedLoggerName === 'error_boundaries'
                                        ? 'Error Boundaries'
                                        : selectedLoggerName === 'security_audit'
                                            ? 'Security Audit'
                                            : selectedLoggerName.charAt(0).toUpperCase() + selectedLoggerName.slice(1).replace('_', ' ')} logger`}
                                ? This action cannot be undone.
                            </DrawerDescription>
                        </DrawerHeader>
                        <DrawerFooter>
                            <Button
                                onClick={confirmClearLogs}
                                className={
                                    selectedLoggerName === 'all'
                                        ? 'bg-red-500 hover:bg-red-600 text-white'
                                        : ''
                                }
                            >
                                {selectedLoggerName === 'all' ? 'Clear All Loggers' : 'Clear Logs'}
                            </Button>
                            <Button variant="outline" onClick={() => setClearDialogOpen(false)}>
                                Cancel
                            </Button>
                        </DrawerFooter>
                    </DrawerContent>
                </Drawer>
            ) : (
                <Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Clear Logs</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to clear{' '}
                                {selectedLoggerName === 'all'
                                    ? 'ALL logs from EVERY logger'
                                    : `all logs for the ${selectedLoggerName === 'error_boundaries'
                                        ? 'Error Boundaries'
                                        : selectedLoggerName === 'security_audit'
                                            ? 'Security Audit'
                                            : selectedLoggerName.charAt(0).toUpperCase() + selectedLoggerName.slice(1).replace('_', ' ')} logger`}
                                ? This action cannot be undone.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setClearDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button
                                onClick={confirmClearLogs}
                                className={
                                    selectedLoggerName === 'all'
                                        ? 'bg-red-500 hover:bg-red-600 text-white'
                                        : ''
                                }
                            >
                                {selectedLoggerName === 'all' ? 'Clear All Loggers' : 'Clear Logs'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}

            {/* Header */}
            <div className="p-4 border-b flex items-center gap-2">
                <Bug className="h-5 w-5 text-amber-500" />
                <h2 className="text-lg font-semibold">Log Viewer</h2>
                <span className="ml-auto text-sm text-muted-foreground">
                    View and manage application logs
                </span>
            </div>

            {/* Controls */}
            <div className="p-4 flex flex-col gap-4">
                {/* Top control row */}
                <div className="flex flex-col sm:flex-row gap-4 justify-between">
                    <div className="flex flex-col sm:flex-row gap-2">
                        <Select value={selectedLoggerName} onValueChange={setSelectedLoggerName}>
                            <SelectTrigger className="w-full sm:w-[240px]">
                                <SelectValue placeholder="Select logger">
                                    {selectedLoggerName &&
                                        (() => {
                                            const logger = loggerMap[selectedLoggerName];
                                            const hasDebugEnabled =
                                                logger &&
                                                selectedLoggerName !== 'all' &&
                                                selectedLoggerName !== 'error_boundaries' &&
                                                selectedLoggerName !== 'security_audit' &&
                                                logger.isDebugEnabled();
                                            const displayName =
                                                selectedLoggerName === 'all'
                                                    ? 'All Logs'
                                                    : selectedLoggerName === 'error_boundaries'
                                                        ? 'Error Boundaries'
                                                        : selectedLoggerName === 'security_audit'
                                                            ? 'Security Audit (Read-Only)'
                                                            : selectedLoggerName.charAt(0).toUpperCase() +
                                                            selectedLoggerName.slice(1).replace('_', ' ');

                                            return (
                                                <div className="flex items-center justify-between w-full">
                                                    <span>{displayName}</span>
                                                    {hasDebugEnabled && (
                                                        <span className="ml-2 px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-xs rounded font-medium">
                                                            DEBUG
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                {Object.keys(loggerMap).map((name) => {
                                    const logger = loggerMap[name];
                                    const hasDebugEnabled =
                                        logger &&
                                        name !== 'all' &&
                                        name !== 'error_boundaries' &&
                                        name !== 'security_audit' &&
                                        logger.isDebugEnabled();
                                    const displayName =
                                        name === 'all'
                                            ? 'All Logs'
                                            : name === 'error_boundaries'
                                                ? 'Error Boundaries'
                                                : name === 'security_audit'
                                                    ? 'Security Audit (Read-Only)'
                                                    : name.charAt(0).toUpperCase() + name.slice(1).replace('_', ' ');

                                    return (
                                        <SelectItem key={name} value={name}>
                                            <div className="flex items-center justify-between w-full">
                                                <span>{displayName}</span>
                                                {hasDebugEnabled && (
                                                    <span className="ml-2 px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-xs rounded font-medium">
                                                        DEBUG
                                                    </span>
                                                )}
                                            </div>
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={fetchLogs}>
                                <RefreshCw className="h-4 w-4 mr-1" />
                                Refresh
                            </Button>
                            <div className="flex items-center space-x-2">
                                <Switch id="auto-refresh" checked={autoRefresh} onCheckedChange={setAutoRefresh} />
                                <Label htmlFor="auto-refresh" className="text-sm">Auto</Label>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleDownloadLogs} disabled={!logs.length}>
                            <Download className="h-4 w-4 mr-1" />
                            <span className="hidden sm:inline">Export</span>
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setClearDialogOpen(true)}
                            disabled={!logs.length || selectedLoggerName === 'security_audit'}
                        >
                            <Trash2 className="h-4 w-4 mr-1" />
                            <span className="hidden sm:inline">Clear</span>
                        </Button>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-2 items-center">
                    {Object.entries(levelFilters).map(([level, isEnabled]) => (
                        <Badge
                            key={level}
                            variant="outline"
                            className={`cursor-pointer ${isEnabled ? getLevelColorClass(level) : ''}`}
                            onClick={() =>
                                setLevelFilters({ ...levelFilters, [level]: !isEnabled })
                            }
                        >
                            {getLevelIcon(level)}
                            <span className="ml-1">{level}</span>
                        </Badge>
                    ))}
                    <div className="flex-1 min-w-[200px] mt-2 sm:mt-0">
                        <div className="relative w-full">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search logs..."
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                className="pl-8 pr-2 h-9 w-full"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Log list */}
            <div className="flex-1 overflow-hidden border-t">
                <ScrollArea className="h-[60vh] p-4">
                    {filteredLogs.length > 0 ? (
                        <div className="space-y-1">
                            {filteredLogs.map((log, index) => (
                                <div key={index} className="p-2 rounded-md text-sm hover:bg-muted">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Badge variant="outline" className={getLevelColorClass(log.level)}>
                                            {getLevelIcon(log.level)}
                                            <span className="ml-1">{log.level}</span>
                                        </Badge>
                                        <span className="text-xs text-muted-foreground">
                                            {formatTimestamp(log.timestamp)}
                                        </span>
                                    </div>
                                    <div className="font-medium">{log.message}</div>
                                    {log.args?.length > 0 && (
                                        <pre className="mt-1 text-xs bg-muted p-2 rounded-md overflow-x-auto">
                                            {log.args.map((arg, i) =>
                                                typeof arg === 'object'
                                                    ? JSON.stringify(arg, null, 2)
                                                    : String(arg)
                                            )}
                                        </pre>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-8 text-center text-muted-foreground">
                            {logs.length === 0
                                ? 'No logs available'
                                : 'No logs match the current filters'}
                        </div>
                    )}
                </ScrollArea>
            </div>

            {/* Footer */}
            <div className="p-4 border-t flex justify-between text-sm text-muted-foreground">
                <span>{filteredLogs.length} of {logs.length} log entries</span>
            </div>
        </div>
    );
}
