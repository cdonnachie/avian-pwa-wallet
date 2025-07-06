// Test PWA configuration
console.log("Environment variables:");
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("ENABLE_PWA:", process.env.ENABLE_PWA);
console.log(
  "PWA disabled?",
  process.env.NODE_ENV === "development" && !process.env.ENABLE_PWA
);

// Test next-pwa configuration
const withPWA = require("next-pwa");
console.log("next-pwa loaded successfully");

// Test next.config.js
try {
  const config = require("./next.config.js");
  console.log("next.config.js loaded successfully");
} catch (error) {
  console.error("Error loading next.config.js:", error.message);
}
