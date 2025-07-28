'use client';

import { useState, useRef, useEffect } from 'react';
import { QrCode, Camera, ArrowLeft, ArrowRight, X, AlertCircle, ChevronLeft } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import jsQR from 'jsqr';
import { toast } from 'sonner';
import { BackupService } from '@/services/core/BackupService';
import { Logger } from '@/lib/Logger';

// Import Shadcn UI components
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerDescription,
} from '@/components/ui/drawer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useMediaQuery } from '@/hooks/use-media-query';

interface BackupQRModalProps {
  open: boolean;
  onClose: () => void;
}

// Create a logger instance for QR backup/restore
const qrBackupLogger = Logger.getLogger('qr_backup');

export function BackupQRModal({ open, onClose }: BackupQRModalProps) {
  const [activeTab, setActiveTab] = useState<'backup' | 'restore'>('backup');
  const [backupType, setBackupType] = useState<'full' | 'wallets'>('full');
  const [backupPassword, setBackupPassword] = useState('');
  const [restorePassword, setRestorePassword] = useState('');
  const [backupChunks, setBackupChunks] = useState<string[]>([]);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scannedChunks, setScannedChunks] = useState<string[]>([]);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const isMobile = useMediaQuery('(max-width: 640px)');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | null>(null);

  // Generate QR code chunks for backup
  const generateBackupQR = async () => {
    try {
      setIsGenerating(true);

      // Create a backup using the BackupService based on selected type
      let backup;
      if (backupType === 'full') {
        backup = await BackupService.createFullBackup();
      } else {
        backup = await BackupService.createWalletsOnlyBackup();
      }

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

      toast.success(
        `${backupType === 'full' ? 'Full' : 'Wallets-only'} backup QR codes generated`,
        {
          description: `Created ${chunks.length} QR code${chunks.length > 1 ? 's' : ''} for your backup`,
        },
      );
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
      setRestoreError(null);

      // Access device camera
      const constraints = {
        video: { facingMode: 'environment' },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();

        // Start scanning loop
        scanQRCode();
      }
    } catch (error) {
      setIsCameraActive(false);
      setIsScanning(false);
      toast.error('Failed to access camera', {
        description: 'Please ensure you have granted camera permissions',
      });
    }
  };

  // Stop the camera scanning
  const stopScanner = () => {
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
      requestRef.current = null;
    }

    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }

    setIsCameraActive(false);
    setIsScanning(false);
  };

  // Process each video frame to scan for QR codes
  const scanQRCode = () => {
    if (!videoRef.current || !canvasRef.current || !isCameraActive) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context || video.videoWidth === 0) {
      // Video not ready yet, try again in the next frame
      requestRef.current = requestAnimationFrame(scanQRCode);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

    const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    });

    // If a QR code is found
    if (qrCode) {
      // Check if this chunk contains our backup header
      if (qrCode.data.includes('AVIAN_WALLET_BACKUP') || qrCode.data.includes('AVIAN_QR_CHUNK')) {
        // Check if we already have this chunk
        if (!scannedChunks.includes(qrCode.data)) {
          const updatedChunks = [...scannedChunks, qrCode.data];
          setScannedChunks(updatedChunks);

          // Attempt to determine total chunks and progress
          try {
            const chunkInfo = BackupService.getQRChunkInfo(qrCode.data);
            if (chunkInfo) {
              const progress = (updatedChunks.length / chunkInfo.totalChunks) * 100;
              setScanProgress(progress);

              // Check if we've completed scanning
              if (updatedChunks.length >= chunkInfo.totalChunks) {
                // We have all chunks, stop scanning
                handleCompleteRestore(updatedChunks);
                return;
              } else {
                // Show progress
                toast.info(`Scanned chunk ${updatedChunks.length} of ${chunkInfo.totalChunks}`, {
                  description: 'Please scan the next QR code',
                });
              }
            }
          } catch (error) {
            // If we can't parse chunk info, just continue scanning
            qrBackupLogger.error('Error parsing QR chunk info:', error);
          }
        }
      }
    }

    // Continue scanning in the next frame
    requestRef.current = requestAnimationFrame(scanQRCode);
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

      // Close modal
      onClose();
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

  const handleClose = () => {
    stopScanner();
    onClose();
  };

  const mainContent = (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'backup' | 'restore')}>
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="backup">Backup</TabsTrigger>
        <TabsTrigger value="restore">Restore</TabsTrigger>
      </TabsList>

      {/* Backup Tab */}
      <TabsContent value="backup" className="space-y-4">
        {backupChunks.length > 0 ? (
          <div className="space-y-4">
            <div className="flex flex-col items-center">
              <div className="bg-white p-4 rounded-lg">
                <QRCodeSVG
                  value={backupChunks[currentChunkIndex]}
                  size={isMobile ? 200 : 256}
                  level="M"
                  includeMargin
                />
              </div>

              {backupChunks.length > 1 && (
                <div className="mt-4 text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    QR Code {currentChunkIndex + 1} of {backupChunks.length}
                  </p>
                  <div className={`flex ${isMobile ? 'flex-col gap-2' : 'justify-center gap-2'}`}>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCurrentChunkIndex((idx) => Math.max(0, idx - 1))}
                      disabled={currentChunkIndex === 0}
                      className={isMobile ? 'w-full' : ''}
                    >
                      <ArrowLeft className="h-4 w-4 mr-1" /> Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setCurrentChunkIndex((idx) => Math.min(backupChunks.length - 1, idx + 1))
                      }
                      disabled={currentChunkIndex === backupChunks.length - 1}
                      className={isMobile ? 'w-full' : ''}
                    >
                      Next <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <Alert>
              <AlertDescription>
                Scan this QR code with your other device to transfer your wallet.
                {backupChunks.length > 1 && ' Navigate through all QR codes for complete backup.'}
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
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                This will generate QR codes containing your wallet backup. For security, consider
                adding a password.
              </AlertDescription>
            </Alert>

            {/* Backup Type Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Backup Type</Label>
              <RadioGroup
                value={backupType}
                onValueChange={(value) => setBackupType(value as 'full' | 'wallets')}
                className="space-y-3"
              >
                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="full" id="full" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="full" className="font-medium cursor-pointer">
                      Full Backup
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Wallets, address book, and settings
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="wallets" id="wallets" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="wallets" className="font-medium cursor-pointer">
                      Wallets Only
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Only wallet data (keys and addresses)
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="backupPassword">Backup Password (Optional)</Label>
                <Input
                  id="backupPassword"
                  type="password"
                  value={backupPassword}
                  onChange={(e) => setBackupPassword(e.target.value)}
                  placeholder="Enter a password to encrypt your backup"
                />
                <p className="text-xs text-muted-foreground">
                  {backupPassword.length > 0
                    ? "You'll need this password when restoring"
                    : 'Without a password, anyone who scans your QR code can access your wallet'}
                </p>
              </div>

              <Button onClick={generateBackupQR} disabled={isGenerating} className="w-full">
                {isGenerating
                  ? 'Generating...'
                  : `Generate ${backupType === 'full' ? 'Full' : 'Wallets-Only'} Backup QR Code`}
              </Button>
            </div>
          </div>
        )}
      </TabsContent>

      {/* Restore Tab */}
      <TabsContent value="restore" className="space-y-4">
        {isCameraActive ? (
          <div className="space-y-4">
            <div className="relative">
              <div
                className={`aspect-square w-full ${isMobile ? 'max-w-[250px]' : 'max-w-[300px]'} mx-auto overflow-hidden rounded-md border bg-muted`}
              >
                <video ref={videoRef} className="h-full w-full object-cover" playsInline />
              </div>
              <canvas ref={canvasRef} className="hidden" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>Scanning</span>
                <span>{Math.round(scanProgress)}%</span>
              </div>
              <Progress value={scanProgress} className="h-2" />
              <p className="text-xs text-center text-muted-foreground">
                {scannedChunks.length > 0
                  ? `Detected ${scannedChunks.length} QR code${scannedChunks.length !== 1 ? 's' : ''}`
                  : 'Position your camera over the QR code'}
              </p>
            </div>

            {restoreError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{restoreError}</AlertDescription>
              </Alert>
            )}

            {restoreError && restoreError.includes('password') && (
              <div className="space-y-2">
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
                >
                  {isRestoring ? 'Restoring...' : 'Try Again with Password'}
                </Button>
              </div>
            )}

            <div className={`flex ${isMobile ? 'flex-col gap-3' : 'justify-between'}`}>
              <Button variant="outline" onClick={stopScanner} className={isMobile ? 'w-full' : ''}>
                <X className="h-4 w-4 mr-2" /> Cancel
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  // Reset and restart the scanner
                  stopScanner();
                  setTimeout(startScanner, 500);
                }}
                className={isMobile ? 'w-full' : ''}
              >
                <ArrowLeft className="h-4 w-4 mr-2" /> Restart
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                To restore your wallet from a QR code backup, you&apos;ll need to scan the QR code
                from your other device.
              </AlertDescription>
            </Alert>

            {restoreError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{restoreError}</AlertDescription>
              </Alert>
            )}

            {!isScanning && (
              <div className="space-y-3">
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

                <Button onClick={startScanner} className="w-full">
                  <Camera className="h-4 w-4 mr-2" /> Start Camera Scan
                </Button>
              </div>
            )}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );

  return (
    <>
      {isMobile ? (
        <Drawer
          open={open}
          onOpenChange={(isOpen) => {
            if (!isOpen) handleClose();
          }}
        >
          <DrawerContent className="max-h-[95vh]">
            <DrawerHeader className="text-center">
              <DrawerTitle className="text-xl font-semibold flex items-center justify-center gap-2">
                <QrCode className="w-5 h-5 text-avian-500" />
                QR Code Backup & Restore
              </DrawerTitle>
              <DrawerDescription className="text-sm opacity-70 pt-1">
                Transfer your wallet between devices using QR codes
              </DrawerDescription>
            </DrawerHeader>

            <div className="px-4 overflow-y-auto">{mainContent}</div>

            <DrawerFooter className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <Button variant="outline" onClick={handleClose} className="w-full">
                Close
              </Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog
          open={open}
          onOpenChange={(isOpen) => {
            if (!isOpen) handleClose();
          }}
        >
          <DialogContent className="sm:max-w-md max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                QR Code Backup & Restore
              </DialogTitle>
              <DialogDescription>
                Transfer your wallet between devices using QR codes
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">{mainContent}</div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
