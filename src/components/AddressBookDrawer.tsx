'use client';

import { X, ArrowLeft } from 'lucide-react';
import AddressBook from './AddressBook';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from '@/components/ui/drawer';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMediaQuery } from '@/hooks/use-media-query';

interface AddressBookDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAddress: (address: string) => void;
  currentAddress?: string;
  title?: string;
}

export default function AddressBookDrawer({
  isOpen,
  onClose,
  onSelectAddress,
  currentAddress,
  title = 'Select Address',
}: AddressBookDrawerProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)');

  const handleSelectAddress = (address: string) => {
    onSelectAddress(address);
    onClose(); // Close drawer after selection
  };

  return (
    <>
      {isDesktop ? (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">{title}</DialogTitle>
            </DialogHeader>

            <ScrollArea className="flex-1 pr-4">
              <AddressBook onSelectAddress={handleSelectAddress} currentAddress={currentAddress} />
            </ScrollArea>
          </DialogContent>
        </Dialog>
      ) : (
        <Drawer open={isOpen} onOpenChange={onClose}>
          <DrawerContent className="max-h-[95vh]">
            <DrawerHeader className="text-center border-b">
              <DrawerTitle className="text-xl font-semibold flex items-center justify-center gap-2">
                {title}
              </DrawerTitle>
              <DrawerClose asChild>
                <Button variant="ghost" size="icon" className="absolute right-4 top-4">
                  <X className="h-4 w-4" />
                </Button>
              </DrawerClose>
            </DrawerHeader>

            <ScrollArea className="px-4 pb-4 overflow-y-auto max-h-[calc(95vh-120px)]">
              <AddressBook onSelectAddress={handleSelectAddress} currentAddress={currentAddress} />
            </ScrollArea>
          </DrawerContent>
        </Drawer>
      )}
    </>
  );
}
