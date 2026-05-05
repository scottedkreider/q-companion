"use strict";

const http = require("node:http");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const port = Number(process.env.PORT || 5173);
const lanOnly = process.argv.includes("--lan");

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
};

function getLanAddress() {
  const nets = os.networkInterfaces();
  for (const addresses of Object.values(nets)) {
    for (const address of addresses || []) {
      if (address.family === "IPv4" && !address.internal) return address.address;
    }
  }
  return "localhost";
}

function serveFile(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const decoded = decodeURIComponent(url.pathname);
  const requestedPath = decoded === "/" ? "/index.html" : decoded;
  const filePath = path.resolve(root, `.${requestedPath}`);

  if (!filePath.startsWith(root)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, body) => {
    if (error) {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    response.writeHead(200, {
      "content-type": types[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      "cache-control": "no-store",
    });
    response.end(body);
  });
}

const server = http.createServer(serveFile);

server.listen(port, "0.0.0.0", () => {
  const lanAddress = getLanAddress();
  console.log("");
  console.log("Q Companion phone testing");
  console.log(`Laptop: http://127.0.0.1:${port}`);
  console.log(`Phone on same Wi-Fi: http://${lanAddress}:${port}`);
  console.log("");

  if (lanOnly) {
    console.log("LAN-only mode. Press Ctrl+C when done.");
    return;
  }

  console.log("Opening temporary localtunnel...");
  console.log("If localtunnel shows 503, stop with Ctrl+C and run npm run phone again.");
  console.log("");

  const tunnel = spawn("npx", ["--yes", "localtunnel", "--port", String(port)], {
    stdio: "inherit",
    shell: true,
  });

  tunnel.on("exit", (code) => {
    if (code) console.log(`localtunnel exited with code ${code}`);
  });
});

process.on("SIGINT", () => {
  console.log("\nStopping phone test server.");
  server.close(() => process.exit(0));
});
