'use client';

import { useState, useRef, useEffect } from 'react';
import { QrCode, Camera, ArrowLeft, ArrowRight, X, AlertCircle, ChevronLeft } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import jsQR from 'jsqr';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { BackupService } from '@/services/core/BackupService';
import { Logger } from '@/lib/Logger';

// Import Shadcn UI components
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMediaQuery } from '@/hooks/use-media-query';
import { AppLayout } from '@/components/AppLayout';
import { HeaderActions } from '@/components/HeaderActions';

// Create a logger instance for QR backup/restore
const qrBackupLogger = Logger.getLogger('qr_backup');

export default function BackupQRPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'backup' | 'restore'>('backup');
    const [backupPassword, setBackupPassword] = useState('');
    const [restorePassword, setRestorePassword] = useState('');
    const [backupChunks, setBackupChunks] = useState<string[]>([]);
    const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [scanProgress, setScanProgress] = useState(0);
    const [scannedChunks, setScannedChunks] = useState<string[]>([]);
    const [scannedChunkIndices, setScannedChunkIndices] = useState<Set<number>>(new Set());
    const [totalExpectedChunks, setTotalExpectedChunks] = useState<number | null>(null);
    const [isRestoring, setIsRestoring] = useState(false);
    const [restoreError, setRestoreError] = useState<string | null>(null);
    const [lastScannedChunk, setLastScannedChunk] = useState<string | null>(null);
    const [scanPaused, setScanPaused] = useState(false);
    const isMobile = useMediaQuery('(max-width: 640px)');

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number | null>(null);

    // Generate QR code chunks for backup
    const generateBackupQR = async () => {
        try {
            setIsGenerating(true);

            // For QR codes, always use wallets-only backup to keep size manageable
            const backup = await BackupService.createWalletsOnlyBackup();

            // Export backup with optional encryption
            const backupBlob = await BackupService.exportBackup(
                backup,
                backupPassword.length > 0 ? backupPassword : undefined,
            );

            // Convert to base64 string for QR code
            const backupBase64 = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(backupBlob);
            });

            // Split into chunks if needed (QR codes have limited capacity)
            const chunks = BackupService.splitBackupForQR(backupBase64);
            setBackupChunks(chunks);
            setCurrentChunkIndex(0);

            toast.success('Wallets backup QR codes generated', {
                description: `Created ${chunks.length} QR code${chunks.length > 1 ? 's' : ''} for your wallet backup`,
            });
        } catch (error) {
            toast.error('Failed to generate backup QR code', {
                description: error instanceof Error ? error.message : 'Unknown error',
            });
        } finally {
            setIsGenerating(false);
        }
    };

    // Handle camera scanning for restore
    const startScanner = async () => {
        try {
            setIsCameraActive(true);
            setIsScanning(true);
            setScanProgress(0);
            setScannedChunks([]);
            setScannedChunkIndices(new Set());
            setTotalExpectedChunks(null);
            setRestoreError(null);
            setScanPaused(false);
            setLastScannedChunk(null);

            qrBackupLogger.info('Starting QR scanner');

            // Access device camera with better constraints
            const constraints = {
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);

            if (videoRef.current) {
                videoRef.current.srcObject = stream;

                // Wait for video to be ready before starting scan loop
                videoRef.current.onloadedmetadata = () => {
                    qrBackupLogger.info('Video metadata loaded, starting scan loop');
                    if (videoRef.current) {
                        videoRef.current.play().then(() => {
                            qrBackupLogger.info('Video playing, scanner ready');
                            // Start scanning after a short delay to ensure video is fully ready
                            setTimeout(() => {
                                if (isCameraActive && videoRef.current) {
                                    qrBackupLogger.info(`Video ready state: ${videoRef.current.readyState}, dimensions: ${videoRef.current.videoWidth}x${videoRef.current.videoHeight}`);
                                    scanQRCode();
                                }
                            }, 500);
                        }).catch((error) => {
                            qrBackupLogger.error('Error playing video:', error);
                            toast.error('Failed to start video playback');
                            setIsCameraActive(false);
                            setIsScanning(false);
                        });
                    }
                };

                videoRef.current.onerror = (error) => {
                    qrBackupLogger.error('Video error:', error);
                    toast.error('Video playback error');
                };
            }
        } catch (error) {
            qrBackupLogger.error('Failed to access camera:', error);
            setIsCameraActive(false);
            setIsScanning(false);
            toast.error('Failed to access camera', {
                description: 'Please ensure you have granted camera permissions and try again',
            });
        }
    };

    // Stop the camera scanning
    const stopScanner = () => {
        qrBackupLogger.info('Stopping QR scanner');

        if (requestRef.current) {
            cancelAnimationFrame(requestRef.current);
            requestRef.current = null;
        }

        if (videoRef.current?.srcObject) {
            try {
                const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
                tracks.forEach((track) => {
                    track.stop();
                    qrBackupLogger.debug(`Stopped ${track.kind} track`);
                });
                videoRef.current.srcObject = null;
            } catch (error) {
                qrBackupLogger.error('Error stopping camera tracks:', error);
            }
        }

        setIsCameraActive(false);
        setIsScanning(false);
        setScanPaused(false);
    };

    // Process each video frame to scan for QR codes
    const scanQRCode = () => {
        if (!videoRef.current || !canvasRef.current || !isCameraActive || scanPaused) {
            qrBackupLogger.debug('Scanning stopped: missing refs, inactive camera, or paused');
            return;
        }

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        if (!context) {
            qrBackupLogger.error('Failed to get canvas context');
            requestRef.current = requestAnimationFrame(scanQRCode);
            return;
        }

        // Check if video is ready
        if (video.readyState !== video.HAVE_ENOUGH_DATA || video.videoWidth === 0 || video.videoHeight === 0) {
            // Video not ready yet, try again in the next frame
            requestRef.current = requestAnimationFrame(scanQRCode);
            return;
        }

        try {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            context.drawImage(video, 0, 0, canvas.width, canvas.height);

            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

            const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: 'attemptBoth',
            });

            // If a QR code is found
            if (qrCode && qrCode.data) {
                qrBackupLogger.debug('QR Code detected:', qrCode.data.substring(0, 100) + '...');

                // Check if this chunk contains our backup header
                if (qrCode.data.includes('AVIAN_QR_CHUNK') || qrCode.data.includes('AVIAN_WALLET_BACKUP')) {
                    // Get chunk information first
                    const chunkInfo = BackupService.getQRChunkInfo(qrCode.data);

                    // Check if we already have this chunk by index (not just content)
                    const isDuplicateByIndex = chunkInfo && scannedChunkIndices.has(chunkInfo.index);
                    const isDuplicateByContent = scannedChunks.includes(qrCode.data);

                    if (!isDuplicateByIndex && !isDuplicateByContent) {
                        const updatedChunks = [...scannedChunks, qrCode.data];
                        setScannedChunks(updatedChunks);
                        setLastScannedChunk(qrCode.data);

                        // Track which chunk index we've scanned
                        if (chunkInfo) {
                            const updatedIndices = new Set(scannedChunkIndices);
                            updatedIndices.add(chunkInfo.index);
                            setScannedChunkIndices(updatedIndices);

                            // Set total expected chunks if not already set
                            if (totalExpectedChunks === null) {
                                setTotalExpectedChunks(chunkInfo.totalChunks);
                            }

                            qrBackupLogger.debug(`Added chunk ${chunkInfo.index} of ${chunkInfo.totalChunks}`);
                        }

                        // Pause scanning after successful read
                        setScanPaused(true);

                        // Attempt to determine total chunks and progress
                        try {
                            if (chunkInfo) {
                                const progress = (updatedChunks.length / chunkInfo.totalChunks) * 100;
                                setScanProgress(progress);

                                qrBackupLogger.debug(`Progress: ${updatedChunks.length}/${chunkInfo.totalChunks} (${progress.toFixed(1)}%)`);

                                // Show progress with specific chunk information
                                toast.info(`Scanned QR code ${chunkInfo.index} of ${chunkInfo.totalChunks}`, {
                                    description: updatedChunks.length < chunkInfo.totalChunks ?
                                        'Click "Continue Scanning" to scan another QR code' :
                                        'All chunks collected! Processing backup...',
                                });

                                // Check if we've completed scanning
                                if (updatedChunks.length >= chunkInfo.totalChunks) {
                                    // We have all chunks, stop scanning and restore
                                    qrBackupLogger.info('All chunks collected, starting restore');
                                    handleCompleteRestore(updatedChunks);
                                    return;
                                }
                            } else {
                                qrBackupLogger.warn('Could not parse chunk info from QR data');
                                // This might be a single QR backup - try to process it immediately
                                toast.info('QR code scanned successfully', {
                                    description: 'Processing backup...',
                                });

                                // Try to restore immediately for single QR backups
                                setTimeout(() => {
                                    handleCompleteRestore(updatedChunks);
                                }, 100);
                            }
                        } catch (error) {
                            qrBackupLogger.error('Error parsing QR chunk info:', error);
                            // Fallback: try to process as single QR backup
                            toast.info('QR code scanned successfully', {
                                description: 'Processing backup...',
                            });

                            setTimeout(() => {
                                handleCompleteRestore(updatedChunks);
                            }, 100);
                        }
                    } else {
                        qrBackupLogger.debug(`Chunk already scanned: ${chunkInfo ? `index ${chunkInfo.index}` : 'duplicate content'}, skipping`);
                        // Show a helpful message that this chunk was already scanned
                        if (chunkInfo && isDuplicateByIndex) {
                            toast.info(`QR code ${chunkInfo.index} already scanned`, {
                                description: `You've already scanned this QR code. ${totalExpectedChunks ? `Still need ${totalExpectedChunks - scannedChunkIndices.size} more codes.` : 'Scan a different QR code.'}`,
                            });
                        }
                    }
                } else {
                    qrBackupLogger.debug('QR code detected but not an Avian backup chunk');
                }
            }
        } catch (error) {
            qrBackupLogger.error('Error during QR scanning:', error);
        }

        // Continue scanning only if not paused
        if (!scanPaused) {
            requestRef.current = requestAnimationFrame(scanQRCode);
        }
    };

    // Resume scanning after a pause
    const continueScanningAfterPause = () => {
        qrBackupLogger.info('Resuming QR scanner after pause');
        setScanPaused(false);
        if (isCameraActive && videoRef.current && canvasRef.current) {
            requestRef.current = requestAnimationFrame(scanQRCode);
        }
    };

    // Process all scanned chunks to restore the wallet
    const handleCompleteRestore = async (chunks: string[]) => {
        try {
            // Stop scanning
            stopScanner();
            setIsRestoring(true);

            // Attempt to combine and restore the backup
            const combinedBackup = await BackupService.combineQRChunks(chunks);

            // Parse the backup file
            const backupFile = BackupService.convertBase64ToFile(combinedBackup, 'restored-backup.json');

            // Try to parse the backup (with password if provided)
            const { backup, validation } = await BackupService.parseBackupFile(
                backupFile,
                restorePassword.length > 0 ? restorePassword : undefined,
            );

            // Check if backup is valid
            if (!validation.isValid) {
                setRestoreError('Invalid backup format: ' + validation.errors.join(', '));
                return;
            }

            // Restore the backup with default options
            await BackupService.restoreFromBackup(
                backup,
                {
                    includeWallets: true,
                    includeAddressBook: true,
                    includeSettings: true,
                    includeTransactions: true,
                    includeSecurityAudit: true,
                    includeWatchedAddresses: true,
                    overwriteExisting: false,
                },
                (step, progress) => {
                    setScanProgress(progress);
                },
            );

            // Success!
            toast.success('Wallet restored successfully', {
                description: `Restored ${validation.walletsCount} wallet(s) from QR backup`,
            });

            // Navigate back to main app
            router.push('/');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            // Check for password-related errors
            if (errorMessage.includes('password') || errorMessage.includes('decrypt')) {
                setRestoreError('Invalid password for encrypted backup');
            } else {
                setRestoreError(errorMessage);
            }

            toast.error('Failed to restore wallet', {
                description: errorMessage,
            });
        } finally {
            setIsRestoring(false);
        }
    };

    // Clean up resources when component unmounts
    useEffect(() => {
        return () => {
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
            }
            stopScanner();
        };
    }, []);

    const handleBack = () => {
        stopScanner();
        router.back();
    };

    return (
        <AppLayout
            headerProps={{
                title: 'QR Code Backup & Restore',
                showBackButton: true,
                customBackAction: handleBack,
                actions: <HeaderActions />
            }}
        >
            <div className="space-y-6 max-w-screen-2xl">
                <Card>
                    <CardHeader>
                        <CardTitle>Transfer Wallet with QR Codes</CardTitle>
                        <p className="text-muted-foreground">
                            Generate QR codes to backup your wallet or scan QR codes to restore from another device
                        </p>
                    </CardHeader>
                    <CardContent>
                        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'backup' | 'restore')}>
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="backup">Generate Backup</TabsTrigger>
                                <TabsTrigger value="restore">Restore from QR</TabsTrigger>
                            </TabsList>

                            {/* Backup Tab */}
                            <TabsContent value="backup" className="space-y-6 mt-6">
                                {backupChunks.length > 0 ? (
                                    <div className="space-y-6">
                                        <div className="flex flex-col items-center">
                                            <div className="bg-white p-6 rounded-lg shadow-sm border">
                                                <QRCodeSVG
                                                    value={backupChunks[currentChunkIndex]}
                                                    size={isMobile ? 280 : 320}
                                                    level="L"
                                                    includeMargin
                                                    bgColor="#FFFFFF"
                                                    fgColor="#000000"
                                                />
                                            </div>

                                            {backupChunks.length > 1 && (
                                                <div className="mt-6 text-center space-y-4 w-full max-w-md">
                                                    <div>
                                                        <p className="text-lg font-medium">
                                                            QR Code {currentChunkIndex + 1} of {backupChunks.length}
                                                        </p>
                                                        <p className="text-sm text-muted-foreground">
                                                            Make sure to scan all {backupChunks.length} QR codes for complete backup
                                                        </p>
                                                    </div>

                                                    <div className="flex justify-center">
                                                        <div className="grid grid-cols-5 gap-2 max-w-[250px]">
                                                            {backupChunks.map((_, index) => (
                                                                <div
                                                                    key={index}
                                                                    className={`w-10 h-10 rounded text-sm font-medium flex items-center justify-center border cursor-pointer transition-colors ${index === currentChunkIndex
                                                                        ? 'bg-primary text-primary-foreground border-primary'
                                                                        : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
                                                                        }`}
                                                                    onClick={() => setCurrentChunkIndex(index)}
                                                                    title={`View QR Code ${index + 1}`}
                                                                >
                                                                    {index + 1}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="flex gap-3">
                                                        <Button
                                                            variant="outline"
                                                            onClick={() => setCurrentChunkIndex((idx) => Math.max(0, idx - 1))}
                                                            disabled={currentChunkIndex === 0}
                                                            className="flex-1"
                                                        >
                                                            <ArrowLeft className="h-4 w-4 mr-2" /> Previous
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            onClick={() =>
                                                                setCurrentChunkIndex((idx) => Math.min(backupChunks.length - 1, idx + 1))
                                                            }
                                                            disabled={currentChunkIndex === backupChunks.length - 1}
                                                            className="flex-1"
                                                        >
                                                            Next <ArrowRight className="h-4 w-4 ml-2" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <Alert>
                                            <AlertDescription>
                                                Scan this QR code with your other device to transfer your wallet.
                                                {backupChunks.length > 1 && ' Navigate through all QR codes for complete backup.'}
                                                QR codes are optimized for mobile scanning with high contrast and low error correction.
                                            </AlertDescription>
                                        </Alert>

                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setBackupChunks([]);
                                                setCurrentChunkIndex(0);
                                            }}
                                            className="w-full"
                                        >
                                            <ChevronLeft className="h-4 w-4 mr-2" /> Generate New Backup
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        <Alert>
                                            <AlertDescription>
                                                This will generate QR codes containing your wallet keys and addresses. For security, consider
                                                adding a password. QR codes are optimized for mobile scanning and only include essential wallet data.
                                            </AlertDescription>
                                        </Alert>

                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="backupPassword">Backup Password (Optional)</Label>
                                                <Input
                                                    id="backupPassword"
                                                    type="password"
                                                    value={backupPassword}
                                                    onChange={(e) => setBackupPassword(e.target.value)}
                                                    placeholder="Enter a password to encrypt your backup"
                                                />
                                                <p className="text-sm text-muted-foreground">
                                                    {backupPassword.length > 0
                                                        ? "You'll need this password when restoring"
                                                        : 'Without a password, anyone who scans your QR code can access your wallet'}
                                                </p>
                                            </div>

                                            <Button onClick={generateBackupQR} disabled={isGenerating} className="w-full" size="lg">
                                                {isGenerating
                                                    ? 'Generating...'
                                                    : 'Generate Wallet Backup QR Codes'}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </TabsContent>

                            {/* Restore Tab */}
                            <TabsContent value="restore" className="space-y-6 mt-6">
                                {isCameraActive ? (
                                    <div className="space-y-6">
                                        <div className="relative">
                                            <div className="aspect-square w-full max-w-[400px] mx-auto overflow-hidden rounded-lg border bg-muted">
                                                <video
                                                    ref={videoRef}
                                                    className="h-full w-full object-cover"
                                                    playsInline
                                                    muted
                                                    autoPlay
                                                    webkit-playsinline="true"
                                                />
                                            </div>
                                            <canvas ref={canvasRef} className="hidden" />
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex justify-between text-sm">
                                                <span className="font-medium">{scanPaused ? 'Paused' : 'Scanning'}</span>
                                                <span className="font-medium">{Math.round(scanProgress)}%</span>
                                            </div>
                                            <Progress value={scanProgress} className="h-3" />

                                            {/* QR Code Status Grid */}
                                            {totalExpectedChunks && totalExpectedChunks > 1 && (
                                                <div className="p-4 bg-muted/50 rounded-lg">
                                                    <p className="text-sm font-medium mb-3 text-center">
                                                        QR Code Status ({scannedChunkIndices.size} of {totalExpectedChunks})
                                                    </p>
                                                    <div className="grid grid-cols-5 gap-2 max-w-[250px] mx-auto">
                                                        {Array.from({ length: totalExpectedChunks }, (_, index) => {
                                                            const chunkNumber = index + 1;
                                                            const isScanned = scannedChunkIndices.has(chunkNumber);
                                                            return (
                                                                <div
                                                                    key={chunkNumber}
                                                                    className={`w-10 h-10 rounded text-sm font-medium flex items-center justify-center border ${isScanned
                                                                        ? 'bg-green-500 text-white border-green-600'
                                                                        : 'bg-muted text-muted-foreground border-border'
                                                                        }`}
                                                                    title={`QR Code ${chunkNumber} - ${isScanned ? 'Scanned' : 'Not scanned'}`}
                                                                >
                                                                    {chunkNumber}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                    <p className="text-xs text-center mt-3 text-muted-foreground">
                                                        Green = Scanned, Gray = Still needed
                                                    </p>
                                                </div>
                                            )}

                                            <p className="text-sm text-center text-muted-foreground">
                                                {scannedChunks.length > 0
                                                    ? scanPaused
                                                        ? totalExpectedChunks && scannedChunkIndices.size < totalExpectedChunks
                                                            ? `Scanned ${scannedChunkIndices.size} of ${totalExpectedChunks} QR codes - ready for next`
                                                            : `Scanned ${scannedChunks.length} QR code${scannedChunks.length !== 1 ? 's' : ''} - ready for next`
                                                        : `Detected ${scannedChunks.length} QR code${scannedChunks.length !== 1 ? 's' : ''}`
                                                    : 'Position your camera over the QR code'}
                                            </p>
                                        </div>

                                        {scanPaused && scannedChunks.length > 0 && (
                                            <Alert>
                                                <AlertDescription>
                                                    {(() => {
                                                        const lastChunk = lastScannedChunk;
                                                        if (lastChunk) {
                                                            const chunkInfo = BackupService.getQRChunkInfo(lastChunk);
                                                            if (chunkInfo) {
                                                                if (scannedChunkIndices.size >= chunkInfo.totalChunks) {
                                                                    return 'All QR codes scanned! Processing backup...';
                                                                }

                                                                // Show which specific QR codes are still needed
                                                                const missingChunks = [];
                                                                for (let i = 1; i <= chunkInfo.totalChunks; i++) {
                                                                    if (!scannedChunkIndices.has(i)) {
                                                                        missingChunks.push(i);
                                                                    }
                                                                }

                                                                if (missingChunks.length > 0) {
                                                                    const missingText = missingChunks.length <= 3
                                                                        ? missingChunks.join(', ')
                                                                        : `${missingChunks.slice(0, 3).join(', ')} and ${missingChunks.length - 3} more`;
                                                                    return `Successfully scanned QR code ${chunkInfo.index}! Still need QR code${missingChunks.length > 1 ? 's' : ''}: ${missingText}. Click "Continue Scanning" to scan another code.`;
                                                                }
                                                            }
                                                        }
                                                        return 'Successfully scanned QR code. Click "Continue Scanning" to scan the next QR code.';
                                                    })()}
                                                </AlertDescription>
                                            </Alert>
                                        )}

                                        {restoreError && (
                                            <Alert variant="destructive">
                                                <AlertCircle className="h-4 w-4" />
                                                <AlertDescription>{restoreError}</AlertDescription>
                                            </Alert>
                                        )}

                                        {restoreError && restoreError.includes('password') && (
                                            <div className="space-y-3">
                                                <Label htmlFor="restorePassword">Backup Password</Label>
                                                <Input
                                                    id="restorePassword"
                                                    type="password"
                                                    value={restorePassword}
                                                    onChange={(e) => setRestorePassword(e.target.value)}
                                                    placeholder="Enter backup password"
                                                />
                                                <Button
                                                    className="w-full"
                                                    disabled={!restorePassword.trim() || isRestoring}
                                                    onClick={() => handleCompleteRestore(scannedChunks)}
                                                    size="lg"
                                                >
                                                    {isRestoring ? 'Restoring...' : 'Try Again with Password'}
                                                </Button>
                                            </div>
                                        )}

                                        <div className="space-y-3">
                                            {scanPaused && scannedChunks.length > 0 && (
                                                <Button
                                                    onClick={continueScanningAfterPause}
                                                    className="w-full"
                                                    size="lg"
                                                >
                                                    <Camera className="h-4 w-4 mr-2" /> Continue Scanning
                                                </Button>
                                            )}

                                            <div className="flex gap-3">
                                                <Button variant="outline" onClick={stopScanner} className="flex-1">
                                                    <X className="h-4 w-4 mr-2" /> Stop Scanner
                                                </Button>

                                                <Button
                                                    variant="outline"
                                                    onClick={() => {
                                                        // Reset and restart the scanner
                                                        stopScanner();
                                                        setTimeout(startScanner, 500);
                                                    }}
                                                    className="flex-1"
                                                >
                                                    <ArrowLeft className="h-4 w-4 mr-2" /> Restart
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        <Alert>
                                            <AlertDescription>
                                                To restore your wallet from a QR code backup, you'll need to scan the QR code
                                                from your other device. Hold your phone 8-12 inches away and ensure good lighting for best results.
                                            </AlertDescription>
                                        </Alert>

                                        {restoreError && (
                                            <Alert variant="destructive">
                                                <AlertCircle className="h-4 w-4" />
                                                <AlertDescription>{restoreError}</AlertDescription>
                                            </Alert>
                                        )}

                                        {!isScanning && (
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="restorePassword">Backup Password (if encrypted)</Label>
                                                    <Input
                                                        id="restorePassword"
                                                        type="password"
                                                        value={restorePassword}
                                                        onChange={(e) => setRestorePassword(e.target.value)}
                                                        placeholder="Enter backup password (if needed)"
                                                    />
                                                </div>

                                                <Button onClick={startScanner} className="w-full" size="lg">
                                                    <Camera className="h-4 w-4 mr-2" /> Start Camera Scan
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
