'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { WalletService } from '@/services/wallet/WalletService';
import { StorageService } from '@/services/core/StorageService';
import AuthenticationDialog from './AuthenticationDialog';
import { toast } from 'sonner';
import { Copy, Check, Info, Lock, PenTool, Stamp, KeyRound } from 'lucide-react';

// Shadcn UI components
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';

export default function MessageUtilities() {
  const { address } = useWallet();
  const [mode, setMode] = useState<'sign' | 'verify' | 'encrypt' | 'decrypt'>('sign');
  const [previousMode, setPreviousMode] = useState<'sign' | 'verify' | 'encrypt' | 'decrypt'>(
    'sign',
  );
  const [message, setMessage] = useState('');
  const [signature, setSignature] = useState('');
  const [signAddress, setSignAddress] = useState('');
  const [verifyAddress, setVerifyAddress] = useState('');
  const [recipientPublicKey, setRecipientPublicKey] = useState('');
  const [encryptedMessage, setEncryptedMessage] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [addressPublicKeys, setAddressPublicKeys] = useState<Record<string, string>>({});
  const [walletService] = useState(() => new WalletService());
  const [isProcessing, setIsProcessing] = useState(false);

  // Copy states
  const [copiedSignature, setCopiedSignature] = useState(false);
  const [copiedEncrypted, setCopiedEncrypted] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);

  // Authentication dialog state
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [authAction, setAuthAction] = useState<'sign' | 'decrypt'>('sign');

  // Set the current address when it changes
  useEffect(() => {
    if (address) {
      setSignAddress(address);
      setVerifyAddress(address);
    }
  }, [address]);

  // Reset state when mode changes
  useEffect(() => {
    // Clear appropriate fields when switching modes
    if (mode === 'sign') {
      setSignature('');
    } else if (mode === 'verify') {
      setPublicKey('');
      setSignature('');
    } else if (mode === 'encrypt') {
      setEncryptedMessage('');
    } else if (mode === 'decrypt') {
      setMessage(''); // Clear decrypted message when switching to decrypt mode
    }

    // When switching between major mode types, clear shared fields
    // that would be confusing if they persisted
    if (
      (mode === 'sign' || mode === 'verify') &&
      (previousMode === 'encrypt' || previousMode === 'decrypt')
    ) {
      // Switching between signature and encryption modes
      setMessage('');
    } else if (
      (mode === 'encrypt' || mode === 'decrypt') &&
      (previousMode === 'sign' || previousMode === 'verify')
    ) {
      // Switching between encryption and signature modes
      setMessage('');
    }

    // Specific case: when switching between encrypt and decrypt, always clear message
    if (
      (mode === 'encrypt' && previousMode === 'decrypt') ||
      (mode === 'decrypt' && previousMode === 'encrypt')
    ) {
      setMessage('');
    }

    // Remember the previous mode for future comparisons
    setPreviousMode(mode);
  }, [mode, previousMode]);

  // Handle initiating the signing process
  const handleSignMessage = async () => {
    if (!message || !signAddress) {
      toast.error('Missing information', {
        description: 'Please enter a message and provide an address',
      });
      return;
    }

    // Check if wallet exists and if it's encrypted
    try {
      const wallet = await StorageService.getWalletByAddress(signAddress);
      if (!wallet?.privateKey) {
        throw new Error('Cannot find private key for this address. Make sure you own this wallet.');
      }

      // If wallet is encrypted, show authentication dialog
      if (wallet.isEncrypted) {
        setAuthAction('sign');
        setShowAuthDialog(true);
      } else {
        // If wallet is not encrypted, sign directly
        await processSignMessage();
      }
    } catch (error) {
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  // Process signing after authentication (or directly if not encrypted)
  const processSignMessage = async (password?: string) => {
    setIsProcessing(true);

    try {
      // Get the private key for the address
      const wallet = await StorageService.getWalletByAddress(signAddress);
      if (!wallet?.privateKey) {
        throw new Error('Cannot find private key for this address. Make sure you own this wallet.');
      }

      // Sign the message
      const signedMessage = await walletService.signMessage(wallet.privateKey, message, password);

      setSignature(signedMessage);
      toast.success('Success!', {
        description: 'Message signed successfully!',
      });
    } catch (error) {
      toast.error('Signing failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle verifying a signed message
  const handleVerifyMessage = async () => {
    if (!message || !signature || !verifyAddress) {
      toast.error('Missing information', {
        description: 'Please enter a message, signature, and address',
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Verify the signature and get the public key
      const result = await walletService.verifyMessage(
        verifyAddress,
        message,
        signature,
        true, // Return public key
      );

      if (typeof result === 'object' && result.isValid) {
        // Store the public key if we got one
        if (result.publicKey) {
          setAddressPublicKeys((prev) => ({
            ...prev,
            [verifyAddress]: result.publicKey!,
          }));

          toast.success('Verification successful!', {
            description: `The signature is valid and matches the address. Public key extracted and can be used for encryption.`,
          });
        } else {
          toast.success('Verification successful!', {
            description: 'The signature is valid and matches the address.',
          });
        }
      } else {
        toast.error('Verification failed', {
          description: 'The signature is not valid for this address and message.',
        });
      }
    } catch (error) {
      toast.error('Verification error', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle encrypting a message
  const handleEncryptMessage = async () => {
    if (!message || !recipientPublicKey) {
      toast.error('Missing information', {
        description: 'Please enter a message and recipient public key',
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Encrypt the message using the recipient's public key
      const encrypted = await walletService.encryptMessage(recipientPublicKey, message);

      setEncryptedMessage(encrypted);
      toast.success('Success!', {
        description: 'Message encrypted successfully!',
      });
    } catch (error) {
      toast.error('Encryption failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle initiating the decryption process
  const handleDecryptMessage = async () => {
    if (!encryptedMessage || !verifyAddress) {
      toast.error('Missing information', {
        description: 'Please enter an encrypted message and provide your address',
      });
      return;
    }

    // Check if wallet exists and if it's encrypted
    try {
      const wallet = await StorageService.getWalletByAddress(verifyAddress);
      if (!wallet?.privateKey) {
        throw new Error('Cannot find private key for this address. Make sure you own this wallet.');
      }

      // If wallet is encrypted, show authentication dialog
      if (wallet.isEncrypted) {
        setAuthAction('decrypt');
        setShowAuthDialog(true);
      } else {
        // If wallet is not encrypted, decrypt directly
        await processDecryptMessage();
      }
    } catch (error) {
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  // Process decryption after authentication (or directly if not encrypted)
  const processDecryptMessage = async (password?: string) => {
    setIsProcessing(true);

    try {
      // Get the private key for the address
      const wallet = await StorageService.getWalletByAddress(verifyAddress);
      if (!wallet?.privateKey) {
        throw new Error('Cannot find private key for this address. Make sure you own this wallet.');
      }

      // Decrypt the message (no sender address needed)
      const decrypted = await walletService.decryptMessage(
        wallet.privateKey,
        encryptedMessage,
        password,
      );

      setMessage(decrypted);
      toast.success('Success!', {
        description: 'Message decrypted successfully!',
      });
    } catch (error) {
      toast.error('Decryption failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle copying text to clipboard
  const copyToClipboard = async (
    text: string,
    setter: React.Dispatch<React.SetStateAction<boolean>>,
  ) => {
    try {
      await navigator.clipboard.writeText(text);
      setter(true);
      setTimeout(() => setter(false), 2000);
      toast.success('Copied', {
        description: 'Text copied to clipboard!',
      });
    } catch (error) {
      toast.error('Copy failed', {
        description: 'Failed to copy to clipboard',
      });
    }
  };

  // Handle authentication success
  const handleAuthenticated = (password: string) => {
    setShowAuthDialog(false);

    // Route to the appropriate action based on what triggered the authentication
    switch (authAction) {
      case 'sign':
        processSignMessage(password);
        break;
      case 'decrypt':
        processDecryptMessage(password);
        break;
      default:
        toast.error('Unknown action', {
          description: 'Unexpected authentication action',
        });
        break;
    }
  };

  return (
    <Card className="w-full mt-2">
      <CardContent className="py-6">
        <Tabs
          value={mode}
          onValueChange={(value) => setMode(value as 'sign' | 'verify' | 'encrypt' | 'decrypt')}
          className="w-full"
        >
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="sign">Sign</TabsTrigger>
            <TabsTrigger value="verify">Verify</TabsTrigger>
            <TabsTrigger value="encrypt">Encrypt</TabsTrigger>
            <TabsTrigger value="decrypt">Decrypt</TabsTrigger>
          </TabsList>

          <TabsContent value="sign" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="sign-address">Your Wallet Address</Label>
              <Input
                id="sign-address"
                value={signAddress}
                onChange={(e) => setSignAddress(e.target.value)}
                placeholder="Your Avian address"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sign-message">Message to Sign</Label>
              <Textarea
                id="sign-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter the message to sign"
                rows={4}
              />
            </div>

            {signature && (
              <div className="space-y-2">
                <Label htmlFor="signature">Signature</Label>
                <div className="relative">
                  <Textarea id="signature" value={signature} readOnly rows={4} />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(signature, setCopiedSignature)}
                  >
                    {copiedSignature ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}

            <Button
              onClick={handleSignMessage}
              disabled={isProcessing || !message || !signAddress}
              className="w-full"
            >
              {isProcessing ? 'Signing...' : 'Sign Message'}
            </Button>
          </TabsContent>

          <TabsContent value="verify" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="verify-address">Signer&apos;s Avian Address</Label>
              <Input
                id="verify-address"
                value={verifyAddress}
                onChange={(e) => setVerifyAddress(e.target.value)}
                placeholder="Address that signed the message"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="verify-message">Message</Label>
              <Textarea
                id="verify-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter the original message"
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="verify-signature">Signature</Label>
              <Textarea
                id="verify-signature"
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                placeholder="Enter the signature to verify"
                rows={4}
              />
            </div>

            <Button
              onClick={handleVerifyMessage}
              disabled={isProcessing || !message || !signature || !verifyAddress}
              className="w-full"
            >
              {isProcessing ? 'Verifying...' : 'Verify Signature'}
            </Button>

            {addressPublicKeys[verifyAddress] && (
              <div className="space-y-2">
                <Label htmlFor="extracted-pubkey">Extracted Public Key</Label>
                <div className="relative">
                  <Input
                    id="extracted-pubkey"
                    value={addressPublicKeys[verifyAddress]}
                    readOnly
                    className="pr-20"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        copyToClipboard(addressPublicKeys[verifyAddress], setCopiedSignature)
                      }
                      className="h-6 px-2"
                    >
                      {copiedSignature ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setRecipientPublicKey(addressPublicKeys[verifyAddress]);
                        setMode('encrypt');
                        toast.success('Public key set for encryption');
                      }}
                      className="h-6 px-2 text-xs"
                    >
                      Use
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="encrypt" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="public-key">Recipient&apos;s Public Key</Label>
              <Input
                id="public-key"
                value={recipientPublicKey}
                onChange={(e) => setRecipientPublicKey(e.target.value)}
                placeholder="Enter the recipient's public key"
              />
              {Object.keys(addressPublicKeys).length > 0 && (
                <div className="mt-2">
                  <Label className="text-sm text-muted-foreground">
                    Use public key from verified signatures:
                  </Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {Object.entries(addressPublicKeys).map(([addr, pubKey]) => (
                      <Button
                        key={addr}
                        variant="outline"
                        size="sm"
                        onClick={() => setRecipientPublicKey(pubKey)}
                        className="text-xs"
                      >
                        {addr.slice(0, 8)}...{addr.slice(-6)}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="encrypt-message">Message to Encrypt</Label>
              <Textarea
                id="encrypt-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter the message to encrypt"
                rows={4}
              />
            </div>

            {encryptedMessage && (
              <div className="space-y-2">
                <Label htmlFor="encrypted-message">Encrypted Message</Label>
                <div className="relative">
                  <Textarea id="encrypted-message" value={encryptedMessage} readOnly rows={6} />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(encryptedMessage, setCopiedEncrypted)}
                  >
                    {copiedEncrypted ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}

            <Button
              onClick={handleEncryptMessage}
              disabled={isProcessing || !message || !recipientPublicKey}
              className="w-full"
            >
              {isProcessing ? 'Encrypting...' : 'Encrypt Message'}
            </Button>
          </TabsContent>

          <TabsContent value="decrypt" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="decrypt-address">Your Wallet Address</Label>
              <Input
                id="decrypt-address"
                value={verifyAddress}
                onChange={(e) => setVerifyAddress(e.target.value)}
                placeholder="Your Avian address"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="encrypted-input">Encrypted Message</Label>
              <Textarea
                id="encrypted-input"
                value={encryptedMessage}
                onChange={(e) => setEncryptedMessage(e.target.value)}
                placeholder="Enter the encrypted message"
                rows={6}
              />
            </div>

            {message && (
              <div className="space-y-2">
                <Label htmlFor="decrypted-message">Decrypted Message</Label>
                <div className="relative">
                  <Textarea id="decrypted-message" value={message} readOnly rows={4} />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(message, setCopiedMessage)}
                  >
                    {copiedMessage ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}

            <Button
              onClick={handleDecryptMessage}
              disabled={isProcessing || !encryptedMessage || !verifyAddress}
              className="w-full"
            >
              {isProcessing ? 'Decrypting...' : 'Decrypt Message'}
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>

      <CardFooter className="flex-col items-start border-t p-4">
        <Alert className="mb-2 border-avian-600/30 bg-avian-200 dark:bg-avian-900/20">
          {mode === 'sign' && <PenTool className="h-4 w-4 text-avian-600" />}
          {mode === 'verify' && <Stamp className="h-4 w-4 text-avian-600" />}
          {mode === 'encrypt' && <Lock className="h-4 w-4 text-avian-600" />}
          {mode === 'decrypt' && <KeyRound className="h-4 w-4 text-avian-600" />}
          <AlertDescription>
            {mode === 'sign' && 'Signing a message allows you to prove you own this Avian address.'}
            {mode === 'verify' &&
              'Verify that a message was signed by the owner of a specific Avian address.'}
            {mode === 'encrypt' && 'Encrypt a message that can only be read by the recipient.'}
            {mode === 'decrypt' && 'Decrypt a message that was encrypted specifically for you.'}
          </AlertDescription>
        </Alert>

        {mode === 'verify' && (
          <Alert className="mt-2 bg-muted/50">
            <Info className="h-4 w-4" />
            <AlertDescription>
              You can verify signatures from the Avian core wallet and other compatible wallets.
              Make sure to copy the entire signature exactly as it was provided. When verification
              succeeds, the public key will be extracted and can be used for encryption.
            </AlertDescription>
          </Alert>
        )}

        {mode === 'sign' && (
          <Alert className="mt-2 bg-muted/50">
            <Info className="h-4 w-4" />
            <AlertDescription>
              The generated signature is compatible with the Avian core wallet and can be verified
              there.
            </AlertDescription>
          </Alert>
        )}

        {mode === 'encrypt' && (
          <Alert className="mt-2 bg-muted/50">
            <Info className="h-4 w-4" />
            <AlertDescription>
              Message encryption uses ECDH (Elliptic Curve Diffie-Hellman) with the recipient&apos;s
              public key to create a shared secret. No sender authentication is required.
            </AlertDescription>
          </Alert>
        )}

        {mode === 'decrypt' && (
          <Alert className="mt-2 bg-muted/50">
            <Info className="h-4 w-4" />
            <AlertDescription>
              To decrypt a message, you must own the private key for the address the message was
              encrypted to. The encrypted message contains all necessary information for decryption.
            </AlertDescription>
          </Alert>
        )}
      </CardFooter>

      {/* Authentication Dialog */}
      <AuthenticationDialog
        isOpen={showAuthDialog}
        onClose={() => setShowAuthDialog(false)}
        onAuthenticate={handleAuthenticated}
        title={
          authAction === 'sign' ? 'Authenticate to Sign Message' : 'Authenticate to Decrypt Message'
        }
        message={
          authAction === 'sign'
            ? 'Please enter your wallet password to sign this message.'
            : 'Please enter your wallet password to decrypt this message.'
        }
        walletAddress={signAddress}
      />
    </Card>
  );
}
