// Browser polyfills for Node.js modules
export { Buffer } from "buffer";
export { default as process } from "process/browser";

// Make Buffer and process globally available if needed
if (typeof window !== "undefined") {
  if (!window.Buffer) {
    window.Buffer = require("buffer").Buffer;
  }
  if (!window.process) {
    window.process = require("process/browser");
  }
}
