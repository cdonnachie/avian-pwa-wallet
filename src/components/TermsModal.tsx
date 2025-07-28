'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Shield, AlertTriangle, Check, X } from 'lucide-react';
import { useMediaQuery } from '@/hooks/use-media-query';

// Import Shadcn UI components
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from '@/components/ui/drawer';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface TermsModalProps {
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export default function TermsModal({ isOpen, onAccept, onDecline }: TermsModalProps) {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [acceptanceChoice, setAcceptanceChoice] = useState<'accept' | 'decline' | null>(null);
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');

  // Reference to scroll content to check initial scroll position
  const scrollContentRef = useRef<HTMLDivElement>(null);
  // Reference to the ScrollArea's viewport element
  const scrollViewportRef = useRef<HTMLElement | null>(null);

  // Check initial scroll position when content loads
  useEffect(() => {
    // Use a short timeout to ensure the DOM is fully rendered
    const checkScrollPosition = () => {
      if (isOpen && scrollContentRef.current) {
        // Find the actual scrollable viewport in the Shadcn ScrollArea
        const viewport = document.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;

        if (viewport) {
          const { scrollTop, scrollHeight, clientHeight } = viewport;

          // Calculate if we're at the bottom with a small buffer
          const isAtBottom =
            scrollHeight <= clientHeight || scrollTop + clientHeight >= scrollHeight - 20;

          // Only set to true if content is shorter than viewport or user has scrolled to bottom
          if (isAtBottom) {
            setHasScrolledToBottom(true);
          } else {
            // Reset if not at bottom - ensures the state is accurate
            setHasScrolledToBottom(false);
          }
        }
      }
    };

    // Check after content has had time to render
    const timer = setTimeout(checkScrollPosition, 500);

    return () => clearTimeout(timer);
  }, [isOpen]);

  // This is updated to work with ScrollArea's viewport
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    // Skip scroll handling if we've already scrolled to the bottom once
    if (hasScrolledToBottom) return;

    // Get the viewportNode - this is where scrolling happens in the ScrollArea component
    const viewportNode = e.currentTarget.querySelector('[data-radix-scroll-area-viewport]');
    const target = viewportNode || e.currentTarget;

    // Adding a buffer (20px) to account for rounding and different browser calculations
    const isScrolledToBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 20;

    // For debugging uncomment the following:
    /*
        if (process.env.NODE_ENV === 'development') {
            // Debug output to help troubleshoot scrolling issues
            const debugInfo = {
                scrollTop: target.scrollTop,
                clientHeight: target.clientHeight,
                scrollHeight: target.scrollHeight,
                sum: target.scrollTop + target.clientHeight,
                threshold: target.scrollHeight - 20,
                isScrolledToBottom
            };
        }
        */

    // Only update state if we've reached the bottom
    // Once set to true, this will never go back to false
    if (isScrolledToBottom) {
      setHasScrolledToBottom(true);
    }
  };

  const handleAccept = () => {
    if (acceptanceChoice === 'accept' && hasScrolledToBottom) {
      onAccept();
    } else if (acceptanceChoice === 'decline') {
      // Show the AlertDialog for declining terms
      setShowDeclineDialog(true);
    }
  };

  const handleDecline = () => {
    // Show the AlertDialog for a better UX
    setShowDeclineDialog(true);
    // Don't call onDecline() to avoid browser alert
  };

  // Check if the content requires scrolling when the modal is opened
  useEffect(() => {
    if (isOpen) {
      // Reset scroll state when modal opens
      setHasScrolledToBottom(false);

      // Add a slightly longer delay to ensure content is fully rendered
      const checkIfScrollNeeded = setTimeout(() => {
        const viewport = document.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
        if (viewport) {
          // If content is shorter than the viewport or already scrolled to bottom, no need to scroll
          if (viewport.scrollHeight <= viewport.clientHeight) {
            setHasScrolledToBottom(true);
          } else {
            // Check if already at bottom (with buffer)
            const isAtBottom =
              viewport.scrollTop + viewport.clientHeight >= viewport.scrollHeight - 20;
            if (isAtBottom) {
              setHasScrolledToBottom(true);
            }
          }
        }
      }, 1000);

      return () => clearTimeout(checkIfScrollNeeded);
    }
  }, [isOpen]);

  const renderContent = () => (
    <>
      {/* Notice - Condensed */}
      <Alert className="m-0 rounded-none border-y border-avian-100 dark:border-gray-700 bg-avian-50 dark:bg-gray-900/80 flex-shrink-0 text-avian-800 dark:text-gray-100">
        <AlertTriangle className="h-5 w-5" />
        <AlertTitle className="font-medium">Important Notice</AlertTitle>
        <AlertDescription className="text-avian-700 dark:text-gray-300">
          MIT License. Please read and accept the terms below to continue.
        </AlertDescription>
      </Alert>

      {/* License Content - Flexible height */}
      <div className="p-4 sm:p-6 flex-1 overflow-hidden min-h-0">
        <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-3 sm:mb-4">
          License Agreement
        </h3>

        <Card className="shadow-sm border border-gray-200 dark:border-gray-800">
          <ScrollArea
            className="h-56 sm:h-64 md:h-72 rounded-lg bg-white dark:bg-gray-900"
            onScrollCapture={handleScroll}
            onLoadCapture={() => {
              // Capture the viewport element once it's loaded
              scrollViewportRef.current = document.querySelector(
                '[data-radix-scroll-area-viewport]',
              );
            }}
          >
            <CardContent
              ref={scrollContentRef}
              className="p-5 space-y-4 sm:space-y-5 text-sm text-gray-700 dark:text-gray-300 leading-relaxed"
            >
              <div>
                <h4 className="font-medium text-gray-900 dark:text-gray-100 text-base">
                  MIT License
                </h4>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  Copyright (c) 2024 The Avian Developers
                </p>
              </div>

              <p>
                Permission is hereby granted, free of charge, to any person obtaining a copy of this
                software and associated documentation files (the &quot;Software&quot;), to deal in
                the Software without restriction, including without limitation the rights to use,
                copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
                Software, and to permit persons to whom the Software is furnished to do so, subject
                to the following conditions:
              </p>

              <p>
                The above copyright notice and this permission notice shall be included in all
                copies or substantial portions of the Software.
              </p>

              <p className="uppercase font-medium text-gray-900 dark:text-gray-100">
                The Software is provided &quot;as is&quot;, without warranty of any kind, express or
                implied, including but not limited to the warranties of merchantability, fitness for
                a particular purpose and noninfringement. In no event shall the authors or copyright
                holders be liable for any claim, damages or other liability, whether in an action of
                contract, tort or otherwise, arising from, out of or in connection with the software
                or the use or other dealings in the software.
              </p>

              <Separator className="my-5" />

              <div className="space-y-4">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 text-base">
                  Important Disclaimer
                </h4>
                <p>
                  This software is provided for educational and informational purposes. Users are
                  responsible for ensuring compliance with applicable laws and regulations in their
                  jurisdiction.
                </p>
                <p>
                  The authors and contributors of this software do not provide financial, legal, or
                  investment advice. Any use of this software is at your own risk.
                </p>
              </div>

              <Separator className="my-5" />

              <div className="space-y-4">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 text-base">
                  Privacy Notice
                </h4>
                <p>
                  This application operates entirely on your device. No personal data, wallet
                  information, or transaction details are transmitted to external servers without
                  your explicit consent.
                </p>
                <p>
                  All wallet data is stored locally on your device and is encrypted when a password
                  is set. You are responsible for backing up your wallet information.
                </p>
              </div>
            </CardContent>
          </ScrollArea>
        </Card>

        {/* Scroll indicator */}
        {!hasScrolledToBottom && (
          <div className="mt-3 flex items-center justify-center">
            <div className="bg-avian-100 dark:bg-gray-800 text-avian-600 dark:text-gray-300 px-3 py-1 rounded-full text-xs font-medium animate-pulse">
              Scroll down to continue
            </div>
          </div>
        )}

        {/* Agreement Section */}
        <div className="mt-4 sm:mt-6 space-y-4">
          <h4 className="text-base font-medium text-gray-900 dark:text-white">
            Please make your selection:
          </h4>

          <RadioGroup
            value={acceptanceChoice || ''}
            onValueChange={(value) => setAcceptanceChoice(value as 'accept' | 'decline')}
          >
            <div className="flex items-center space-x-3 p-3 rounded-md border border-avian-200 dark:border-blue-700 bg-avian-50 dark:bg-blue-900/20 hover:bg-avian-100 dark:hover:bg-blue-900/30 transition-colors">
              <RadioGroupItem
                value="accept"
                id="accept-terms"
                disabled={!hasScrolledToBottom}
                className="text-avian-600 dark:text-blue-400"
              />
              <Label
                htmlFor="accept-terms"
                className={`text-sm font-medium cursor-pointer ${
                  hasScrolledToBottom
                    ? 'text-avian-700 dark:text-blue-400'
                    : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                I accept the terms of the License Agreement
              </Label>
            </div>

            <div className="flex items-center space-x-3 p-3 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/70 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <RadioGroupItem
                value="decline"
                id="decline-terms"
                className="text-gray-600 dark:text-gray-400"
              />
              <Label
                htmlFor="decline-terms"
                className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
              >
                I do not accept the terms of the License Agreement
              </Label>
            </div>
          </RadioGroup>

          {/* Action Buttons */}
          <div className="flex gap-3 w-full justify-end mt-2">
            <Button
              variant="outline"
              onClick={() => setShowDeclineDialog(true)}
              className="border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X className="w-4 h-4 mr-2 opacity-70" />
              Exit
            </Button>

            <Button
              onClick={handleAccept}
              disabled={
                !acceptanceChoice || (acceptanceChoice === 'accept' && !hasScrolledToBottom)
              }
              className="bg-avian-600 hover:bg-avian-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white transition-colors disabled:bg-avian-600/50 dark:disabled:bg-blue-600/50 disabled:text-white/70"
            >
              <Check className="w-4 h-4 mr-2" />
              Continue
            </Button>
          </div>
        </div>
      </div>
    </>
  );

  if (!isOpen) return null;

  if (isMobile) {
    return (
      <>
        <Drawer open={isOpen}>
          <DrawerContent className="h-[90vh] flex flex-col">
            <DrawerHeader className="flex-shrink-0">
              <DrawerTitle>Terms and License Agreement</DrawerTitle>
            </DrawerHeader>
            <div className="flex flex-col flex-1 overflow-hidden">{renderContent()}</div>
          </DrawerContent>
        </Drawer>

        {/* Decline Confirmation Dialog */}
        <AlertDialog open={showDeclineDialog} onOpenChange={setShowDeclineDialog}>
          <AlertDialogContent className="max-w-md dark:bg-gray-800 border dark:border-gray-700">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-red-600 dark:text-red-400">
                Exit Application
              </AlertDialogTitle>
              <AlertDialogDescription>
                You have chosen to decline the license agreement. The application will close.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => setShowDeclineDialog(false)}
                className="border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDecline}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Exit Application
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={() => onDecline()}>
        <DialogContent
          className="w-full max-w-md h-[90vh] flex flex-col p-0"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader className="p-4 pb-0 flex-shrink-0">
            <DialogTitle>Terms and License Agreement</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col flex-1 overflow-hidden">{renderContent()}</div>
        </DialogContent>
      </Dialog>

      {/* Decline Confirmation Dialog */}
      <AlertDialog open={showDeclineDialog} onOpenChange={setShowDeclineDialog}>
        <AlertDialogContent className="dark:bg-gray-800 border dark:border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-avian-700 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" />
              Terms Agreement Required
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-700 dark:text-gray-300">
              <p className="mb-2">You must accept the terms to use Avian FlightDeck.</p>
              <p className="mb-2">
                By declining the terms, you cannot continue using the application.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setShowDeclineDialog(false)}
              className="border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            >
              Return to Terms
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={onDecline}
              className="text-white bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
            >
              Exit Application
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
