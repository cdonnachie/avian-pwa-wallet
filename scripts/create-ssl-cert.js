const fs = require("fs");
const path = require("path");
const selfsigned = require("selfsigned");

// Create self-signed certificates for localhost development
function createSelfSignedCert() {
  const certDir = path.join(__dirname, "../certs");
  const keyPath = path.join(certDir, "localhost-key.pem");
  const certPath = path.join(certDir, "localhost.pem");

  // Check if certificates already exist
  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    console.log("✅ SSL certificates already exist");
    return { keyPath, certPath };
  }

  try {
    console.log("🔐 Creating self-signed SSL certificates...");

    // Ensure certs directory exists
    if (!fs.existsSync(certDir)) {
      fs.mkdirSync(certDir, { recursive: true });
    }

    // Generate self-signed certificate
    const attrs = [
      { name: "commonName", value: "localhost" },
      { name: "countryName", value: "US" },
      { shortName: "ST", value: "Dev" },
      { name: "localityName", value: "Localhost" },
      { name: "organizationName", value: "Avian Wallet" },
    ];

    const pems = selfsigned.generate(attrs, {
      keySize: 2048,
      days: 365,
      algorithm: "sha256",
      extensions: [
        {
          name: "subjectAltName",
          altNames: [
            { type: 2, value: "localhost" },
            { type: 2, value: "*.localhost" },
            { type: 7, ip: "127.0.0.1" },
          ],
        },
      ],
    });

    // Write certificate files
    fs.writeFileSync(keyPath, pems.private);
    fs.writeFileSync(certPath, pems.cert);

    console.log("✅ SSL certificates created successfully");
    console.log(`📁 Key: ${keyPath}`);
    console.log(`📁 Cert: ${certPath}`);
    console.log("");
    console.log("🚨 IMPORTANT: Trust the certificate in your browser:");
    console.log("   1. Open https://localhost:3001 in your browser");
    console.log('   2. Click "Advanced" → "Proceed to localhost (unsafe)"');
    console.log(
      "   3. Or add the certificate to your trusted root certificates"
    );

    return { keyPath, certPath };
  } catch (error) {
    console.error("❌ Failed to create SSL certificates:", error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  createSelfSignedCert();
}

module.exports = { createSelfSignedCert };
