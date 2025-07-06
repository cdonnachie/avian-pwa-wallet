// PWA-enabled development server
process.env.ENABLE_PWA = "true";
process.env.NODE_ENV = process.env.NODE_ENV || "development";

console.log("🔧 Starting Next.js with PWA enabled...");
console.log("📁 Environment: development");
console.log("🚀 PWA: enabled");
console.log("");

// Start Next.js development server
const { spawn } = require("child_process");
const nextDev = spawn("npx", ["next", "dev"], {
  stdio: "inherit",
  env: { ...process.env, ENABLE_PWA: "true" },
});

nextDev.on("close", (code) => {
  console.log(`Development server exited with code ${code}`);
});
