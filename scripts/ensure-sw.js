// This script ensures the service worker files are copied to the output directory
// Run this after the build process

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

console.log("Ensuring service worker files are present...");

const PUBLIC_DIR = path.resolve(__dirname, "../public");
const OUTPUT_DIR = path.resolve(__dirname, "../.next");

// If sw.js doesn't exist, try to generate it manually
if (!fs.existsSync(path.join(PUBLIC_DIR, "sw.js"))) {
  console.log("Service worker not found, attempting to generate it...");

  try {
    // Create a minimal workbox config and generate the service worker
    const workboxConfig = {
      globDirectory: "public/",
      globPatterns: ["**/*.{js,css,html,png,jpg,jpeg,svg,ico}"],
      swDest: "public/sw.js",
      clientsClaim: true,
      skipWaiting: true,
      runtimeCaching: [
        {
          urlPattern: new RegExp("/$"),
          handler: "NetworkFirst",
          options: {
            cacheName: "start-url",
            expiration: {
              maxEntries: 1,
              maxAgeSeconds: 60 * 60 * 24,
            },
          },
        },
        {
          urlPattern: /\.(js|css)$/,
          handler: "StaleWhileRevalidate",
          options: {
            cacheName: "static-resources",
            expiration: {
              maxEntries: 100,
              maxAgeSeconds: 24 * 60 * 60 * 30,
            },
          },
        },
        {
          urlPattern: /\.(png|jpg|jpeg|svg|gif|ico|webp)$/,
          handler: "CacheFirst",
          options: {
            cacheName: "images",
            expiration: {
              maxEntries: 100,
              maxAgeSeconds: 24 * 60 * 60 * 30,
            },
          },
        },
      ],
    };

    // Save this config to a temporary file
    fs.writeFileSync(
      path.resolve(__dirname, "../temp-workbox-config.js"),
      `module.exports = ${JSON.stringify(workboxConfig, null, 2)}`
    );

    // Install workbox-cli if needed and generate the service worker
    console.log("Installing workbox-cli and generating service worker...");
    execSync("npx workbox-cli generateSW temp-workbox-config.js", {
      stdio: "inherit",
      cwd: path.resolve(__dirname, ".."),
    });

    // Clean up the temporary config
    fs.unlinkSync(path.resolve(__dirname, "../temp-workbox-config.js"));
  } catch (err) {
    console.error("Failed to generate service worker:", err);
  }
}

// Check if the service worker exists in the public directory now
if (fs.existsSync(path.join(PUBLIC_DIR, "sw.js"))) {
  console.log("✅ Found sw.js in public directory");

  // Find any workbox files
  const workboxFiles = fs
    .readdirSync(PUBLIC_DIR)
    .filter((file) => file.startsWith("workbox-"));
  console.log(
    `✅ Found ${workboxFiles.length} workbox files in public directory`
  );

  // Make sure they are all present in the output directory
  const files = ["sw.js", ...workboxFiles];

  // Create .next directory if it doesn't exist
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  files.forEach((file) => {
    try {
      const sourcePath = path.join(PUBLIC_DIR, file);
      const destPath = path.join(OUTPUT_DIR, file);

      fs.copyFileSync(sourcePath, destPath);
      console.log(`✅ Copied ${file} to output directory`);
    } catch (err) {
      console.error(`❌ Error copying ${file}:`, err);
    }
  });

  console.log("✅ Service worker files are ready");
} else {
  console.error("❌ Failed to find or generate a service worker.");
  process.exit(1);
}
