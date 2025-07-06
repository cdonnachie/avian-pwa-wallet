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
  // Handle PWA properly
  webpack: (config, { isServer }) => {
    // Enable WebAssembly support
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      topLevelAwait: true,
    };

    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        crypto: false,
        stream: false,
        buffer: false,
      };
    }
    return config;
  },
};

module.exports = withPWA(nextConfig);
