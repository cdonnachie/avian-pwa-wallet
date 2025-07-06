const { createServer } = require("https");
const { parse } = require("url");
const next = require("next");
const fs = require("fs");
const path = require("path");

const dev = process.env.NODE_ENV !== "production";
// Ensure PWA is enabled when using HTTPS server
process.env.ENABLE_PWA = "true";
const app = next({ dev });
const handle = app.getRequestHandler();

const httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, "../certs/localhost-key.pem")),
  cert: fs.readFileSync(path.join(__dirname, "../certs/localhost.pem")),
};

app.prepare().then(() => {
  createServer(httpsOptions, (req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(3001, (err) => {
    if (err) throw err;
    console.log("🔒 HTTPS Server ready on https://localhost:3001");
    console.log("🚀 Avian PWA Wallet running with SSL");
  });
});
