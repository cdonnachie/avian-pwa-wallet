/** @type {import('next').NextConfig} */
const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development" && !process.env.ENABLE_PWA,
  runtimeCaching: [
    {
      // cache any .wasm artifact
      urlPattern: /\.wasm$/,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "wasm-cache",
        expiration: { maxEntries: 10 },
      },
    },
    {
      // Cache API responses
      urlPattern: /^https:\/\/api\./,
      handler: "NetworkFirst",
      options: {
        cacheName: "api-cache",
        expiration: { maxEntries: 50, maxAgeSeconds: 300 },
      },
    },
  ],
});

const nextConfig = {
  // Enable TypeScript strict mode
  typescript: {
    ignoreBuildErrors: false,
  },
  // Optimize for Vercel
  poweredByHeader: false,
  compress: true,
  // External packages for server components (moved from experimental)
  serverExternalPackages: ["bitcoinjs-lib", "tiny-secp256k1"],
  // Turbopack configuration
  turbopack: {
    // Configure module resolution for browser compatibility
    resolveAlias: {
      // Use browser-compatible versions of Node.js modules
      buffer: "buffer",
      process: "process/browser",
    },
  },
};

module.exports = withPWA(nextConfig);
