/** @type {import('next').NextConfig} */
const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development" && !process.env.ENABLE_PWA,
  // Make sure PWA is NEVER disabled in production
  disableInDev: true,
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
  // Transpile ESM crypto libraries
  transpilePackages: [
    "bitcoinjs-lib",
    "ecpair",
    "bip32",
    "bip39",
    "tiny-secp256k1",
    "bs58check",
    "bs58",
    "base-x",
    "wif",
    "coinselect",
    "bech32",
    "typeforce",
    "varuint-bitcoin",
    "pushdata-bitcoin",
    "bitcoin-ops",
    "create-hash",
    "create-hmac",
    "randombytes",
    "safe-buffer",
    "secp256k1",
  ],
  // Webpack configuration for WebAssembly support
  webpack: (config, { isServer }) => {
    // Enable WebAssembly experiments
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    // Use node-polyfill-webpack-plugin for automatic Node.js core polyfills
    if (!isServer) {
      const NodePolyfillPlugin = require("node-polyfill-webpack-plugin");
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        "tiny-secp256k1": require.resolve("@bitcoin-js/tiny-secp256k1-asmjs"),
      };
      config.plugins.push(
        new NodePolyfillPlugin({
          excludeAliases: ["console"], // Exclude console as it's natively available
        })
      );
    }

    return config;
  },
};

module.exports = withPWA(nextConfig);
