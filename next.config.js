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
  // Webpack configuration for WebAssembly support
  webpack: (config, { isServer }) => {
    // Enable WebAssembly experiments
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    // Handle .wasm files
    config.module.rules.push({
      test: /\.wasm$/,
      type: "webassembly/async",
    });

    // Fallback for Node.js modules in the browser
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        buffer: require.resolve("buffer"),
        process: require.resolve("process/browser"),
      };

      // Add buffer polyfill using webpack.ProvidePlugin
      const webpack = require("webpack");
      config.plugins.push(
        new webpack.ProvidePlugin({
          Buffer: ["buffer", "Buffer"],
          process: "process/browser",
        })
      );
    }

    // Handle tiny-secp256k1 specifically for better compatibility
    config.resolve.alias = {
      ...config.resolve.alias,
      "tiny-secp256k1": require.resolve("tiny-secp256k1"),
    };

    return config;
  },
};

module.exports = withPWA(nextConfig);
