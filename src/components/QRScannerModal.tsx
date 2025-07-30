'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Camera, Upload } from 'lucide-react';
import QrScanner from 'qr-scanner';
import { QRScanResult } from '@/types/addressBook';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useMediaQuery } from '@/hooks/use-media-query';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (result: QRScanResult) => void;
  // Add optional mode to handle different QR code types
  mode?: 'address' | 'any';
  title?: string;
}

export default function QRScannerModal({
  isOpen,
  onClose,
  onScan,
  mode = 'address',
  title = 'Scan QR Code'
}: QRScannerModalProps) {
  const [hasCamera, setHasCamera] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraChecked, setCameraChecked] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDesktop = useMediaQuery('(min-width: 768px)');

  const handleScanResult = useCallback(
    (data: string) => {
      // Prevent multiple rapid scans
      if (isProcessing) return;

      try {
        setIsProcessing(true);

        // Stop scanning immediately to prevent duplicate scans
        if (qrScannerRef.current) {
          qrScannerRef.current.stop();
          setIsScanning(false);
        }

        // Parse QR code data based on mode
        let isValidFormat = false;

        if (mode === 'any') {
          // Accept any QR code content for backup restore or other purposes
          isValidFormat = data.length > 0;
        } else {
          // Default 'address' mode - validate Avian addresses and payment requests
          // Check for avian: URI scheme
          if (data.startsWith('avian:')) {
            isValidFormat = true;
          }
          // Check for direct Avian address (starts with R and reasonable length)
          else if (data.startsWith('R') && data.length >= 26 && data.length <= 35) {
            isValidFormat = true;
          }
          // Check for longer format addresses or other valid patterns
          else if (data.match(/^[A-Za-z0-9]{25,50}$/) && data.startsWith('R')) {
            isValidFormat = true;
          }
        }

        if (isValidFormat) {
          if (mode === 'any') {
            // For 'any' mode, return the raw data as the address field
            onScan({ address: data, amount: undefined, label: undefined, message: undefined });
            onClose();
          } else {
            // Default address mode - parse as Avian address/payment request
            let address = data;
            let amount: number | undefined;
            let label: string | undefined;
            let message: string | undefined;

            // Handle avian: URI scheme (payment request)
            if (data.startsWith('avian:')) {
              const url = new URL(data);
              address = url.pathname;

              // Parse query parameters for payment request details
              if (url.searchParams.has('amount')) {
                amount = parseFloat(url.searchParams.get('amount')!);
              }
              if (url.searchParams.has('label')) {
                label = decodeURIComponent(url.searchParams.get('label')!);
              }
              if (url.searchParams.has('message')) {
                message = decodeURIComponent(url.searchParams.get('message')!);
              }
            }

            onScan({ address, amount, label, message });
            onClose();
          }
        } else {
          const errorMsg = mode === 'any'
            ? `Empty QR code content`
            : `Invalid Avian address format. Content: ${data.slice(0, 20)}${data.length > 20 ? '...' : ''}`;

          setError(errorMsg);
          setIsProcessing(false);
        }
      } catch (err) {
        console.error('QR scan error:', err);
        setError('Failed to parse QR code: ' + (err instanceof Error ? err.message : 'Unknown error'));
        setIsProcessing(false);
      }
    },
    [onScan, onClose, isProcessing, mode],
  );

  const startScanning = useCallback(async () => {
    if (!videoRef.current) {
      return;
    }

    try {
      setIsScanning(true);
      setError(null);

      // Ensure any existing scanner is cleaned up
      if (qrScannerRef.current) {
        qrScannerRef.current.destroy();
        qrScannerRef.current = null;
      }

      qrScannerRef.current = new QrScanner(
        videoRef.current,
        (result) => {
          handleScanResult(result.data);
        },
        {
          preferredCamera: 'environment',
          highlightScanRegion: true,
          highlightCodeOutline: true,
          returnDetailedScanResult: true,
        },
      );

      await qrScannerRef.current.start();
    } catch (err) {

      console.error('Failed to start camera:', err);

      // Handle specific QrScanner errors
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';

      if (errorMessage.includes('permission') || errorMessage.includes('Permission') ||
        errorMessage.includes('denied') || errorMessage.includes('NotAllowedError')) {
        setPermissionDenied(true);
        setError('Camera permission denied. Please allow camera access and try again.');
      } else if (errorMessage.includes('NotFoundError') || errorMessage.includes('not found')) {
        setError('No camera found on this device. You can upload an image instead.');
      } else {
        setError('Failed to start camera: ' + errorMessage);
      }

      setIsScanning(false);
    }
  }, [handleScanResult]);

  const stopScanning = useCallback(() => {
    if (qrScannerRef.current) {
      qrScannerRef.current.stop();
      qrScannerRef.current.destroy();
      qrScannerRef.current = null;
    }
    setIsScanning(false);
    setError(null);
  }, []);

  const requestCameraPermission = useCallback(async () => {
    try {
      setError(null);
      setPermissionDenied(false);

      // Reset camera check to allow retrying
      setCameraChecked(false);

      // Note: We don't test camera permission here anymore
      // Let the user try starting the camera directly, which will
      // trigger the browser's permission prompt if needed

    } catch (err) {
      console.error('Permission request failed:', err);
      setError('Please allow camera access in your browser settings and try again.');
      setPermissionDenied(true);
    }
  }, []);

  useEffect(() => {
    const checkCamera = async () => {
      if (cameraChecked) return; // Only check once per modal opening

      try {
        // Use the same method as backup page - try to enumerate devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        const hasCamera = videoDevices.length > 0;

        setHasCamera(hasCamera);
        setCameraChecked(true);

        // Don't automatically start scanning - let user decide
      } catch (err) {
        console.error('Failed to check camera:', err);

        // Fallback to qr-scanner library check
        try {
          const hasCamera = await QrScanner.hasCamera();
          setHasCamera(hasCamera);
        } catch (fallbackErr) {
          console.error('Fallback camera check failed:', fallbackErr);
          setHasCamera(false);
        }

        setCameraChecked(true);
        // Don't show error for camera check failure - user might just want to upload files
      }
    };

    if (isOpen) {
      setIsProcessing(false);
      setError(null);
      setCameraChecked(false);
      checkCamera();
    } else {
      // Reset state when modal closes
      setIsProcessing(false);
      setError(null);
      setCameraChecked(false);
      stopScanning();
    }
    return () => {
      stopScanning();
    };
  }, [isOpen, stopScanning]);

  const startCameraScanning = useCallback(async () => {
    if (!hasCamera) {
      setError('No camera available');
      return;
    }

    setError(null);
    setPermissionDenied(false);
    await startScanning();
  }, [hasCamera, startScanning]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || isProcessing) return;

    try {
      setIsProcessing(true);
      setError(null);

      // Stop camera scanning during file upload to avoid conflicts
      if (qrScannerRef.current && isScanning) {
        stopScanning();
      }

      const result = await QrScanner.scanImage(file);
      handleScanResult(result);
    } catch (err) {
      console.error('File scan error:', err);
      setError('No QR code found in image: ' + (err instanceof Error ? err.message : 'Unknown error'));
      setIsProcessing(false);

      // Don't automatically restart camera - let user decide
    }

    // Clear the file input so the same file can be selected again
    if (event.target) {
      event.target.value = '';
    }
  };

  return (
    <>
      {isDesktop ? (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {cameraChecked && hasCamera ? (
                <div className="space-y-4">
                  <div className="relative">
                    <video ref={videoRef} className="w-full h-64 bg-black rounded-lg" playsInline />
                    {(!isScanning || isProcessing) && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
                        {isProcessing ? (
                          <div className="text-center text-white">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-2"></div>
                            <div>Processing...</div>
                          </div>
                        ) : (
                          <Camera className="w-12 h-12 text-white" />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Camera Controls */}
                  <div className="flex gap-2">
                    {!isScanning ? (
                      <Button
                        onClick={startCameraScanning}
                        variant="default"
                        className="flex-1"
                        disabled={isProcessing}
                      >
                        <Camera className="w-4 h-4 mr-2" />
                        Start Camera
                      </Button>
                    ) : (
                      <Button
                        onClick={stopScanning}
                        variant="outline"
                        className="flex-1"
                        disabled={isProcessing}
                      >
                        Stop Camera
                      </Button>
                    )}
                  </div>
                </div>
              ) : cameraChecked && !hasCamera ? (
                <div className="text-center space-y-4">
                  <div className="text-muted-foreground">
                    No camera detected on this device
                  </div>
                  <div className="text-sm text-muted-foreground">
                    You can upload an image with a QR code instead
                  </div>
                  {permissionDenied && (
                    <Button
                      onClick={requestCameraPermission}
                      variant="outline"
                      className="mt-2"
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Grant Camera Permission
                    </Button>
                  )}
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <div className="text-muted-foreground">
                    Checking for camera...
                  </div>
                </div>
              )}

              <div className="pt-4 border-t">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="w-full"
                  disabled={isProcessing}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {isProcessing ? 'Processing...' : 'Upload QR Code Image'}
                </Button>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>
                    <div className="flex flex-col gap-2">
                      <span>{error}</span>
                      {hasCamera && !isScanning && (
                        <Button
                          onClick={startCameraScanning}
                          variant="outline"
                          size="sm"
                          className="self-start"
                        >
                          Try Camera Again
                        </Button>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </DialogContent>
        </Dialog>
      ) : (
        <Drawer open={isOpen} onOpenChange={onClose}>
          <DrawerContent className="max-h-[95vh]">
            <DrawerHeader className="text-left">
              <DrawerTitle>{title}</DrawerTitle>
            </DrawerHeader>

            <div className="px-4 pb-4 space-y-4">
              {cameraChecked && hasCamera ? (
                <div className="space-y-4">
                  <div className="relative">
                    <video ref={videoRef} className="w-full h-80 bg-black rounded-lg" playsInline />
                    {(!isScanning || isProcessing) && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
                        {isProcessing ? (
                          <div className="text-center text-white">
                            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-2"></div>
                            <div>Processing...</div>
                          </div>
                        ) : (
                          <Camera className="w-16 h-16 text-white" />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Camera Controls */}
                  <div className="flex gap-2">
                    {!isScanning ? (
                      <Button
                        onClick={startCameraScanning}
                        variant="default"
                        className="flex-1 h-12"
                        size="lg"
                        disabled={isProcessing}
                      >
                        <Camera className="w-5 h-5 mr-2" />
                        Start Camera
                      </Button>
                    ) : (
                      <Button
                        onClick={stopScanning}
                        variant="outline"
                        className="flex-1 h-12"
                        size="lg"
                        disabled={isProcessing}
                      >
                        Stop Camera
                      </Button>
                    )}
                  </div>
                </div>
              ) : cameraChecked && !hasCamera ? (
                <div className="text-center space-y-4 py-8">
                  <div className="text-muted-foreground">
                    No camera detected on this device
                  </div>
                  <div className="text-sm text-muted-foreground">
                    You can upload an image with a QR code instead
                  </div>
                  {permissionDenied && (
                    <Button
                      onClick={requestCameraPermission}
                      variant="outline"
                      className="mt-2"
                      size="lg"
                    >
                      <Camera className="w-5 h-5 mr-2" />
                      Grant Camera Permission
                    </Button>
                  )}
                </div>
              ) : (
                <div className="text-center space-y-4 py-8">
                  <div className="text-muted-foreground">
                    Checking for camera...
                  </div>
                </div>
              )}

              <div className="pt-4 border-t">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="w-full h-12"
                  size="lg"
                  disabled={isProcessing}
                >
                  <Upload className="w-5 h-5 mr-2" />
                  {isProcessing ? 'Processing...' : 'Upload QR Code Image'}
                </Button>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>
                    <div className="flex flex-col gap-2">
                      <span>{error}</span>
                      {hasCamera && !isScanning && (
                        <Button
                          onClick={startCameraScanning}
                          variant="outline"
                          size="sm"
                          className="self-start"
                        >
                          Try Camera Again
                        </Button>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </>
  );
}
