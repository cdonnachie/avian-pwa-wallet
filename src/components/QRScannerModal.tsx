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
}

export default function QRScannerModal({ isOpen, onClose, onScan }: QRScannerModalProps) {
  const [hasCamera, setHasCamera] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDesktop = useMediaQuery('(min-width: 768px)');

  const handleScanResult = useCallback(
    (data: string) => {
      try {
        // Parse AVN address and payment request data
        if (data.startsWith('avian:') || data.match(/^[A-Za-z0-9]{26,35}$/)) {
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
        } else {
          setError('Invalid AVN address in QR code');
        }
      } catch (err) {
        setError('Failed to parse QR code');
      }
    },
    [onScan, onClose],
  );

  const startScanning = useCallback(async () => {
    if (!videoRef.current) return;

    try {
      setIsScanning(true);
      setError(null);

      qrScannerRef.current = new QrScanner(
        videoRef.current,
        (result) => {
          handleScanResult(result.data);
        },
        {
          preferredCamera: 'environment',
          highlightScanRegion: true,
          highlightCodeOutline: true,
        },
      );

      await qrScannerRef.current.start();
    } catch (err) {
      setError('Failed to start camera');
      setIsScanning(false);
    }
  }, [handleScanResult]);

  const checkCameraAvailability = useCallback(async () => {
    try {
      const hasCamera = await QrScanner.hasCamera();
      setHasCamera(hasCamera);
      if (hasCamera) {
        startScanning();
      }
    } catch (err) {
      setError('Failed to access camera');
      setHasCamera(false);
    }
  }, [startScanning]);

  useEffect(() => {
    if (isOpen) {
      checkCameraAvailability();
    }
    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.destroy();
        qrScannerRef.current = null;
      }
    };
  }, [isOpen, checkCameraAvailability]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setError(null);
      const result = await QrScanner.scanImage(file);
      handleScanResult(result);
    } catch (err) {
      setError('No QR code found in image');
    }
  };

  return (
    <>
      {isDesktop ? (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Scan QR Code</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {hasCamera ? (
                <div className="space-y-4">
                  <div className="relative">
                    <video ref={videoRef} className="w-full h-64 bg-black rounded-lg" playsInline />
                    {!isScanning && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
                        <Camera className="w-12 h-12 text-white" />
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <div className="text-muted-foreground">
                    Camera not available or permission denied
                  </div>
                  <div className="text-sm text-muted-foreground">
                    You can still upload an image with a QR code
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
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload QR Code Image
                </Button>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
          </DialogContent>
        </Dialog>
      ) : (
        <Drawer open={isOpen} onOpenChange={onClose}>
          <DrawerContent className="max-h-[95vh]">
            <DrawerHeader className="text-left">
              <DrawerTitle>Scan QR Code</DrawerTitle>
            </DrawerHeader>

            <div className="px-4 pb-4 space-y-4">
              {hasCamera ? (
                <div className="space-y-4">
                  <div className="relative">
                    <video ref={videoRef} className="w-full h-80 bg-black rounded-lg" playsInline />
                    {!isScanning && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
                        <Camera className="w-16 h-16 text-white" />
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-4 py-8">
                  <div className="text-muted-foreground">
                    Camera not available or permission denied
                  </div>
                  <div className="text-sm text-muted-foreground">
                    You can still upload an image with a QR code
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
                >
                  <Upload className="w-5 h-5 mr-2" />
                  Upload QR Code Image
                </Button>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </>
  );
}
