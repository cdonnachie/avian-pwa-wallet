// This script ensures the service worker files are copied to the output directory
// Run this after the build process

const fs = require("fs");
const path = require("path");

console.log(
  "Ensuring service worker files are present in the output directory..."
);

const PUBLIC_DIR = path.resolve(__dirname, "../public");
const OUTPUT_DIR = path.resolve(__dirname, "../.next");

// Check if the service worker exists in the public directory
if (fs.existsSync(path.join(PUBLIC_DIR, "sw.js"))) {
  console.log("Found sw.js in public directory");

  // Find any workbox files
  const workboxFiles = fs
    .readdirSync(PUBLIC_DIR)
    .filter((file) => file.startsWith("workbox-"));
  console.log(`Found ${workboxFiles.length} workbox files in public directory`);

  // Make sure they are all present in the output directory
  const files = ["sw.js", ...workboxFiles];

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
} else {
  console.warn(
    "❌ No service worker found in public directory. Make sure your build process generates one."
  );
}
