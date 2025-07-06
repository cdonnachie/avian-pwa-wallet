# 🔒 HTTPS Development Setup for Avian PWA Wallet

## Why HTTPS for Local Development?

PWA features require HTTPS, including:

- ✅ Service Workers
- ✅ Web App Manifest
- ✅ Push Notifications
- ✅ IndexedDB (full features)
- ✅ Clipboard API
- ✅ Camera/Microphone access

## 🚀 Quick Start

### Option 1: Automatic Setup (Recommended)

```bash
# Generate SSL certificates and start HTTPS server
npm run dev:https
```

### Option 2: Next.js with SSL Environment Variables

```bash
# Generate certificates first
npm run ssl:setup

# Start Next.js with SSL
npm run dev:ssl
```

## 📋 Available Scripts

```bash
# Regular HTTP development (PWA disabled)
npm run dev                 # http://localhost:3000

# HTTPS development with PWA enabled
npm run dev:https          # https://localhost:3001 (custom server + PWA)
npm run dev:ssl            # https://localhost:3001 (Next.js + PWA)

# HTTP development with PWA enabled
npm run dev:pwa            # http://localhost:3000 (PWA enabled)

# Generate SSL certificates only
npm run ssl:setup

# Production HTTPS
npm run start:https        # https://localhost:3001
```

## 🔧 PWA Configuration

The PWA is **disabled by default** in development to speed up builds. It's enabled automatically when using HTTPS scripts.

### Enable PWA in Development

```bash
# Option 1: Use HTTPS scripts (recommended)
npm run dev:https

# Option 2: Enable PWA with HTTP
npm run dev:pwa

# Option 3: Set environment variable manually
ENABLE_PWA=true npm run dev
```

### Why PWA is Disabled in Development

- ⚡ **Faster builds**: No service worker generation
- 🔄 **Hot reload**: No caching interference
- 🐛 **Easier debugging**: No service worker cache conflicts
- 🧪 **Clean testing**: Fresh state on every reload

## 🔧 Manual Certificate Setup

If automatic setup fails, you can create certificates manually:

### Using mkcert (Recommended for multiple projects)

```bash
# Install mkcert (Windows)
winget install FiloSottile.mkcert

# Install the local CA
mkcert -install

# Generate certificates
mkcert localhost 127.0.0.1 ::1

# Move certificates to certs folder
mkdir certs
move localhost+2.pem certs/localhost.pem
move localhost+2-key.pem certs/localhost-key.pem
```

### Using OpenSSL

```bash
# Generate private key
openssl genrsa -out certs/localhost-key.pem 2048

# Generate certificate
openssl req -new -x509 -key certs/localhost-key.pem -out certs/localhost.pem -days 365 -subj "/C=US/ST=Dev/L=Localhost/O=Avian Wallet/CN=localhost" -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
```

## 🌐 Browser Setup

### Chrome/Edge

1. Go to `https://localhost:3001`
2. Click "Advanced" → "Proceed to localhost (unsafe)"
3. Or import certificate to "Trusted Root Certification Authorities"

### Firefox

1. Go to `https://localhost:3001`
2. Click "Advanced" → "Accept the Risk and Continue"
3. Or go to Settings → Privacy & Security → Certificates → View Certificates

### Trust Certificate System-wide (Windows)

```bash
# Import certificate to Windows certificate store
certlm.msc
# Navigate to: Trusted Root Certification Authorities → Certificates
# Right-click → All Tasks → Import → Select certs/localhost.pem
```

## 🔍 Testing PWA Features

Once HTTPS is running, test these PWA features:

### Service Worker

```javascript
// Check in browser console
navigator.serviceWorker.getRegistrations().then(console.log);
```

### Web App Manifest

```javascript
// Check install prompt
window.addEventListener("beforeinstallprompt", (e) => {
  console.log("PWA install prompt available");
});
```

### IndexedDB

```javascript
// Test IndexedDB (should work in HTTPS)
indexedDB.databases().then(console.log);
```

## 🚨 Troubleshooting

### Certificate Errors

- **"Certificate not trusted"**: Normal for self-signed certificates
- **"NET::ERR_CERT_AUTHORITY_INVALID"**: Click "Advanced" and proceed
- **Script errors**: Ensure all resources load over HTTPS

### Port Conflicts

```bash
# Check what's using port 3001
netstat -an | findstr :3001

# Kill process using port
taskkill /F /PID <process_id>
```

### PWA Not Installing

- Clear browser cache and service workers
- Check browser dev tools → Application → Manifest
- Ensure all manifest requirements are met

## 📱 Mobile Testing

### Android (Chrome)

1. Enable "Remote debugging" in Developer Options
2. Connect via USB
3. Access `https://YOUR_IP:3001` (replace YOUR_IP)
4. Trust certificate on mobile device

### iOS (Safari)

1. Enable "Web Inspector" in Safari settings
2. Access via local network IP
3. Trust certificate in Settings → General → About → Certificate Trust Settings

## 🔒 Security Notes

- ⚠️ Self-signed certificates are for development only
- ⚠️ Never use these certificates in production
- ⚠️ Browsers will show warnings (this is normal)
- ✅ All PWA features work with self-signed certificates
- ✅ Localhost is treated as "secure context" by browsers

## 📊 Performance Testing

```bash
# Build and test production version with HTTPS
npm run build
npm run start:https

# Test PWA lighthouse score
# Open Chrome DevTools → Lighthouse → Run PWA audit
```

## 🔄 Updating Certificates

Certificates expire after 365 days. To renew:

```bash
# Remove old certificates
rm -rf certs/

# Generate new ones
npm run ssl:setup
```

## 🎯 Next Steps

1. **Development**: Use `npm run dev:https` for daily development
2. **Testing**: Test PWA installation and offline features
3. **Deployment**: Deploy to Vercel (automatic HTTPS)
4. **Mobile**: Test on real devices using network IP
