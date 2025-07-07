// PWA-enabled build script for production
process.env.ENABLE_PWA = "true";
process.env.NODE_ENV = "production";

console.log("🔧 Starting Next.js production build with PWA enabled...");
console.log("📁 Environment: production");
console.log("🚀 PWA: enabled");
console.log("");

// Start Next.js build with PWA enabled
const { spawnSync } = require("child_process");
const nextBuild = spawnSync("npx", ["next", "build"], {
  stdio: "inherit",
  env: { ...process.env, ENABLE_PWA: "true" },
});

if (nextBuild.error) {
  console.error(`Error during build: ${nextBuild.error.message}`);
  process.exit(1);
}

// Ensure service worker files are properly copied
console.log("\n🔍 Ensuring service worker files are available...");
require("./ensure-sw");

console.log("\n✅ Build completed with exit code:", nextBuild.status);
process.exit(nextBuild.status || 0);
