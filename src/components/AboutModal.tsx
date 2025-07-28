'use client';

import { useState } from 'react';
import {
  Info,
  ExternalLink,
  Shield,
  Smartphone,
  Zap,
  Lock,
  Database,
  Bug,
  HelpCircle,
  X,
} from 'lucide-react';
import { useMediaQuery } from '@/hooks/use-media-query';
import packageJson from '../../package.json';

// Shadcn UI components
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AboutModal({ isOpen, onClose }: AboutModalProps) {
  const isMobile = useMediaQuery('(max-width: 640px)');
  const [activeTab, setActiveTab] = useState<'features' | 'faq' | 'info'>('features');

  const features = [
    {
      icon: <Shield className="h-5 w-5" />,
      title: 'Bank-Level Security',
      description:
        'Hardware-backed biometric authentication, client-side encryption, and secure key storage',
      highlights: ['Face ID & Touch ID', 'Password encryption', 'Local storage only'],
    },
    {
      icon: <Smartphone className="h-5 w-5" />,
      title: 'Progressive Web App',
      description:
        'Installable PWA with offline capabilities, service worker support, and cross-platform compatibility',
      highlights: ['Installable app', 'Offline mode', 'Push notifications', 'Service worker'],
    },
    {
      icon: <Zap className="h-5 w-5" />,
      title: 'Advanced Wallet Features',
      description:
        'HD wallet support, multiple wallet management, BIP39 passphrases, coin control, change address selection, and comprehensive backup options',
      highlights: [
        'HD wallets',
        '24-word phrases',
        'BIP39 passphrase',
        'UTXO coin control',
        'Change address selection',
        'Watch addresses',
        'Legacy compatibility',
      ],
    },
    {
      icon: <Database className="h-5 w-5" />,
      title: 'Advanced Transaction Control',
      description:
        'Professional-grade UTXO management with coin control, multiple selection strategies, and transaction optimization',
      highlights: ['UTXO selection', 'Coin control', 'Selection strategies', 'Dust consolidation'],
    },
    {
      icon: <Lock className="h-5 w-5" />,
      title: 'Comprehensive Backup & Security',
      description:
        'Full wallet backups with encryption, cross-device sync, and comprehensive security monitoring',
      highlights: [
        'Encrypted backups',
        'QR code export',
        'Security audit log',
        'Cross-device sync',
      ],
    },
  ];

  const faqItems = [
    {
      question: 'How do I create my first wallet?',
      answer:
        "Click 'Create New Wallet' from the welcome screen or wallet manager. You can choose between 12-word (standard) or 24-word (enhanced security) recovery phrases. Write down your recovery phrase and store it safely offline. This phrase is the only way to recover your wallet if you lose access to your device.",
    },
    {
      question: 'What is biometric authentication and should I enable it?',
      answer:
        "Biometric authentication uses your device's Face ID, Touch ID, or Windows Hello for secure access. It's recommended for convenience and security, but remember that biometric credentials are device-specific and must be set up again when restoring on a new device.",
    },
    {
      question: 'How do backups work?',
      answer:
        "The wallet offers two backup types: 'Full Backup' includes everything (wallets, address book, settings), while 'Wallets Only' just backs up your wallet keys. Backups can be encrypted and restored on any device. Use QR codes for air-gapped transfers.",
    },
    {
      question: 'Is my data safe? Where is it stored?',
      answer:
        'All data is stored locally on your device using encrypted IndexedDB. Private keys never leave your device and are encrypted with your password. The wallet uses client-side security with no server-side data storage.',
    },
    {
      question: 'Can I use this wallet on multiple devices?',
      answer:
        "Yes! Create a backup on your first device and restore it on your other devices. Note that biometric authentication must be set up separately on each device, and you'll need your wallet passwords for encrypted wallets.",
    },
    {
      question: 'What is the difference between wallet encryption and backup encryption?',
      answer:
        'Wallet encryption protects individual wallets with passwords. Backup encryption protects your entire backup file. You can have unencrypted wallets in an encrypted backup, or encrypted wallets in an unencrypted backup.',
    },
    {
      question: 'How do I send AVN to someone?',
      answer:
        "Go to the main wallet view, click 'Send', enter the recipient's address (or scan their QR code), specify the amount, and confirm. The wallet will automatically calculate fees and validate the transaction before sending.",
    },
    {
      question: 'What are derived addresses and why do I need them?',
      answer:
        "HD wallets generate new addresses for improved privacy. Each wallet has 'receiving' addresses (for incoming payments) and 'change' addresses (for transaction outputs). You can view all addresses in the 'Derived Addresses' panel and configure how many change addresses to generate in wallet settings. When sending transactions, you can select which change address to use for better privacy management.",
    },
    {
      question: 'What is the difference between 12-word and 24-word recovery phrases?',
      answer:
        '12-word phrases are the standard and compatible with all Avian wallets. 24-word phrases provide enhanced security through increased entropy but may not be compatible with other Avian wallet software. Choose 24-word only if you plan to use FlightDeck exclusively or are certain about compatibility.',
    },
    {
      question: 'What is a BIP39 passphrase (25th word)?',
      answer:
        "A BIP39 passphrase is an optional additional security layer that acts like a '25th word' added to your recovery phrase. It provides extra protection but means you need BOTH your recovery phrase AND the passphrase to restore your wallet. Store them separately for maximum security.",
    },
    {
      question: 'What is BIP44 coin type compatibility and when should I use it?',
      answer:
        "BIP44 coin types determine the derivation path for generating addresses. Avian uses coin type 921, but some older wallets may have used Ravencoin's coin type 175. Only change this setting if you're importing a wallet that was created with the legacy coin type 175.",
    },
    {
      question: 'How do I configure HD wallet settings for change addresses?',
      answer:
        "In wallet settings, you can configure how many change addresses to generate (1-20) for HD wallets. This affects both the 'Derived Addresses' panel and the change address selection when sending transactions. More addresses provide better privacy options, while fewer addresses simplify management. The setting applies to all HD wallet features including manual change address selection and dust consolidation mode.",
    },
    {
      question: 'How do I restore a wallet from a recovery phrase?',
      answer:
        "Click 'Import from Recovery Phrase', enter your 12 or 24-word phrase in the correct order, and optionally set a password. The wallet will restore your account and scan for existing transactions and balances.",
    },
    {
      question: 'What should I do if I forget my wallet password?',
      answer:
        "If you forget your wallet password, you'll need to restore from your recovery phrase. This will give you access to your funds, but you'll lose transaction history and settings stored locally on the device.",
    },
    {
      question: "Why can't I see my transaction history after restoring?",
      answer:
        "Transaction history is stored locally and isn't part of the blockchain. When you restore a wallet, the app will scan for recent transactions, but older history may not appear. Your actual balance and funds are always safe on the blockchain.",
    },
    {
      question: 'What are watch addresses?',
      answer:
        "Watch addresses let you monitor any Avian address without having the private keys. This is useful for tracking donations, monitoring business addresses, or keeping an eye on transactions you're expecting.",
    },
    {
      question: 'What are the advanced UTXO and coin control features?',
      answer:
        'FlightDeck offers professional-grade transaction control including manual UTXO selection, multiple coin selection strategies (smallest-first for lower fees, largest-first for privacy, best-fit for efficiency, dust consolidation for cleanup), customizable fee rates, intelligent dust management, and HD wallet change address selection. You can view all UTXOs, select specific ones for transactions, choose which change address to use (for HD wallets), and optimize for different priorities like cost, privacy, or wallet cleanup. Dust consolidation mode automatically uses a single change address to simplify small UTXO management.',
    },
    {
      question: 'What makes this a Progressive Web App (PWA)?',
      answer:
        'FlightDeck is installable like a native app on any device, works offline after initial setup, includes service worker support for background functionality, and provides push notifications for wallet activity. You can add it to your home screen and use it like any other app while maintaining full wallet functionality even without internet.',
    },
    {
      question: 'How do I install this as an app on my phone/computer?',
      answer:
        "This is a PWA (Progressive Web App). On mobile browsers, look for 'Add to Home Screen' in the browser menu. On desktop, look for an install icon in the address bar. Once installed, it works like a native app.",
    },
    {
      question: 'Is this wallet suitable for large amounts?',
      answer:
        'This wallet is designed for everyday use and moderate amounts. For large holdings, consider using the core wallet. Always test with small amounts first and keep secure backups of your recovery phrases.',
    },
    {
      question: 'What are Message Utilities and how do I use them?',
      answer:
        'Message Utilities provide cryptographic tools for signing, verifying, encrypting, and decrypting messages. Use the Sign tab to prove you own an address, Verify tab to check signatures from others, Encrypt tab to send private messages, and Decrypt tab to read encrypted messages sent to you.',
    },
    {
      question: 'How do I sign a message to prove I own an address?',
      answer:
        "Go to Message Utilities > Sign tab, enter your wallet address and the message you want to sign, then click 'Sign Message'. If your wallet is encrypted, you'll need to enter your password. The generated signature can be shared to prove you control that address without revealing your private key.",
    },
    {
      question: "How do I verify someone else's signed message?",
      answer:
        "Use Message Utilities > Verify tab. Enter the signer's address, the original message (must be exact), and the signature. When verification succeeds, the public key is automatically extracted and can be used for encryption - a powerful workflow for secure communication.",
    },
    {
      question: 'How does message encryption work?',
      answer:
        "Message encryption uses ECDH (Elliptic Curve Diffie-Hellman) to create a shared secret. To encrypt, you need the recipient's public key (get this by verifying their signature first). To decrypt, you need the private key for the address the message was encrypted to. This provides end-to-end encryption between Avian addresses.",
    },
    {
      question: "Can I get someone's public key for encryption?",
      answer:
        "Yes! The easiest way is to verify one of their signed messages first. When verification succeeds, their public key is automatically extracted and stored. You can then switch to the Encrypt tab and use the quick-select buttons to encrypt messages for any address you've verified signatures from.",
    },
    {
      question: 'Are message signatures compatible with other Avian wallets?',
      answer:
        'Yes! Message signing and verification is compatible with Avian Core wallet and other standard Bitcoin-based wallets. However, the message encryption format is specific to FlightDeck wallet, so encrypted messages can only be decrypted by other FlightDeck users.',
    },
  ];

  const content = (
    <div className="space-y-4">
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as any)}
        className="w-full"
      >
        <TabsList className={`grid w-full grid-cols-3 ${isMobile ? 'h-12' : 'h-10'}`}>
          <TabsTrigger value="features" className={isMobile ? 'text-xs' : 'text-sm'}>
            Features
          </TabsTrigger>
          <TabsTrigger value="faq" className={isMobile ? 'text-xs' : 'text-sm'}>
            FAQ
          </TabsTrigger>
          <TabsTrigger value="info" className={isMobile ? 'text-xs' : 'text-sm'}>
            About
          </TabsTrigger>
        </TabsList>

        <TabsContent value="features" className="space-y-4">
          <div className="grid gap-4">
            {features.map((feature, index) => (
              <Card key={index} className="border-l-4 border-l-avian-500">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <span className="text-avian-500">{feature.icon}</span>
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-3">{feature.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {feature.highlights.map((highlight, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {highlight}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="faq" className="space-y-4">
          <div className="space-y-4">
            {faqItems.map((item, index) => (
              <Card key={index}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-start gap-2 text-base">
                    <HelpCircle className="h-4 w-4 text-avian-500 mt-0.5 flex-shrink-0" />
                    {item.question}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm leading-relaxed">{item.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="info" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <img src="/Avian_logo.svg" alt="Avian" className="h-6 w-6 invert-0 dark:invert" />
                Avian FlightDeck Wallet
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-muted-foreground">{packageJson.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Version:</strong> {packageJson.version}
                </div>
                <div>
                  <strong>Network:</strong> Avian Mainnet
                </div>
                <div>
                  <strong>Framework:</strong> Next.js + TypeScript
                </div>
                <div>
                  <strong>Storage:</strong> Local IndexedDB
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Quick Links</h4>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() =>
                      window.open('https://github.com/cdonnachie/avian-flightdeck', '_blank')
                    }
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Source Code
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => window.open('https://avn.network', '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Avian Network
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() =>
                      window.open('https://github.com/cdonnachie/avian-flightdeck/issues', '_blank')
                    }
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Report Issues
                  </Button>
                </div>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Security Notice
                </h4>
                <p className="text-sm text-muted-foreground">
                  This wallet stores all data locally on your device. Never share your recovery
                  phrases or passwords. Always verify addresses before sending transactions.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className="max-h-[95vh]">
          <DrawerHeader className="text-center">
            <DrawerTitle className="text-xl font-semibold flex items-center justify-center gap-2">
              <Info className="w-5 h-5 text-avian-500" />
              About FlightDeck
            </DrawerTitle>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="absolute right-4 top-4">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </DrawerHeader>

          <ScrollArea className="px-4 pb-4 overflow-y-auto max-h-[calc(95vh-120px)]">
            {content}
          </ScrollArea>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-avian-500" />
            About FlightDeck
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)]">{content}</ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
