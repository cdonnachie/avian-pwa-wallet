# Avian PWA Wallet

A Progressive Web App (PWA) implementation of the Avian cryptocurrency wallet, built with Next.js and TypeScript. This project represents a modern migration from the original browser extension to a cross-platform web application.

## Features

- 🔐 **Secure Wallet Management**: Generate, import, and manage Avian wallets
- 🔒 **Encryption Support**: Optional password-based wallet encryption
- � **Biometric Authentication**: Face ID, Touch ID, and Windows Hello support
- �💸 **Send Transactions**: Send AVN to any valid Avian address
- 📱 **Receive Payments**: QR code generation for easy payment requests
- 📊 **Balance Tracking**: Real-time balance updates
- 💾 **Comprehensive Backup**: Full wallet backup with security settings
- 🌐 **Progressive Web App**: Installable, offline-capable application
- 🎨 **Modern UI**: Clean, responsive design with dark mode support
- 🔧 **Wallet Settings**: Comprehensive wallet management tools

## Technology Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **PWA**: next-pwa for service worker and manifest
- **Cryptocurrency**: bitcoinjs-lib for wallet operations
- **QR Codes**: qrcode library for address display
- **Icons**: Lucide React icons
- **Encryption**: CryptoJS for wallet security
- **Authentication**: WebAuthn/FIDO2 for biometric authentication
- **Storage**: IndexedDB for persistent data storage

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd avian-pwa-wallet
```

2. Install dependencies:

```bash
npm install
```

3. Run the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Building for Production

```bash
npm run build
npm start
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx         # Root layout with providers
│   ├── page.tsx           # Main wallet interface
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── SendForm.tsx       # Transaction sending form
│   ├── ReceiveModal.tsx   # Address/QR code modal
│   └── WalletSettings.tsx # Wallet management settings
├── contexts/              # React contexts
│   └── WalletContext.tsx  # Global wallet state
├── services/              # Business logic
│   ├── WalletService.ts   # Core wallet operations
│   ├── StorageService.ts  # Browser storage abstraction
│   ├── ElectrumService.ts # Blockchain communication
│   ├── SecurityService.ts # Authentication and security
│   └── BackupService.ts   # Wallet backup and restore
└── types/                 # TypeScript type definitions
```

## Key Features

### Wallet Management

- Generate new HD wallets with optional encryption
- Import existing wallets via private key
- Export private keys (with password protection)
- Encrypt/decrypt existing wallets

### Transaction Handling

- Send AVN with automatic fee calculation
- Address validation
- Balance checking before transactions
- Transaction confirmation and error handling

### Security

- Client-side private key storage
- Optional AES encryption with user passwords
- Biometric authentication (Face ID, Touch ID, Windows Hello)
- Per-wallet biometric security configuration
- Security audit logging for sensitive operations
- Secure key generation using bitcoinjs-lib
- No private keys transmitted over network
- Comprehensive backup and restore with security settings

### PWA Features

- Installable on mobile and desktop
- Offline functionality for wallet operations
- Background sync capabilities
- Native app-like experience

### Biometric Authentication

- Hardware-backed biometric security (WebAuthn/FIDO2)
- Support for Face ID, Touch ID, Windows Hello, and Android biometrics
- Per-wallet biometric configuration
- Optional biometric requirements for transactions and exports
- Device-specific implementation (biometrics require re-setup after restore on a new device)
- Global and per-wallet security settings

### Backup and Restore

- Comprehensive wallet backup including:
  - Multiple wallet configurations
  - Address book entries
  - Security settings and preferences
  - Transaction history
  - Security audit log
- Optional backup encryption with AES
- Backup validation and integrity checking
- Multiple backup types (full backup, wallets-only)
- Selective restore options (wallets, address book, settings, etc.)
- Portable backups for cross-device migration
- Biometric status tracking for wallets after restore

## Configuration

### ElectrumX Server

The app connects to Avian ElectrumX servers for blockchain interaction. Currently configured for:

- Server: `electrum-us.avn.network:50003`
- Protocol: WebSocket Secure (WSS)

### PWA Settings

PWA configuration is handled in:

- `next.config.js` - Next.js PWA setup
- `public/manifest.json` - Web app manifest

## Development

### Adding New Features

1. Create service functions in appropriate service files
2. Add React components in the `components/` directory
3. Update the WalletContext if state changes are needed
4. Add proper TypeScript types

### Testing

- Test wallet operations with small amounts
- Verify PWA installation on different devices
- Test offline functionality
- Validate transaction signing and broadcasting

### Security Notes

- Never store unencrypted private keys
- Always validate user inputs
- Use HTTPS in production
- Implement proper error handling for crypto operations

## Migration from Browser Extension

This PWA replaces the original Avian browser extension with several improvements:

### Advantages

- ✅ Cross-platform compatibility (mobile, desktop, any browser)
- ✅ No extension store approval process
- ✅ Modern React/TypeScript codebase
- ✅ Progressive Web App features
- ✅ Better mobile experience

### Limitations

- ❌ No automatic browser integration
- ❌ Manual installation required
- ❌ Limited background processing
- ❌ No context menu integration

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Security

This wallet is designed for small amounts and testing purposes. For large amounts:

- Use a hardware wallet
- Verify all transactions carefully
- Keep backups of your private keys
- Use strong passwords for encryption
- Enable biometric authentication where available

### Biometric Security Notes

- Biometric credentials are device-specific and cannot be transferred between devices
- After restoring a backup on a new device, biometrics must be set up again
- Biometrics provide an additional security layer, but are not a replacement for strong passwords
- The app maintains information about which wallets had biometrics enabled to guide re-setup

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:

- GitHub Issues: [Repository Issues](https://github.com/cdonnachie/avian-flightdeck/issues)
- Community: Avian Network Discord/Telegram

## Roadmap

- [x] Transaction history display
- [x] Biometric authentication
- [x] Comprehensive backup/restore system
- [x] Security audit logging
- [ ] Multi-language support
- [ ] Hardware wallet integration
- [ ] Advanced fee estimation
- [ ] Backup/restore via QR codes
- [ ] Multi-signature support
