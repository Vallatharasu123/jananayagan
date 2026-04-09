const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const PREFERRED = Number(process.env.PORT) || 3000;
/** If preferred port is taken, try up to this many higher ports. */
const PORT_RANGE = 40;
const PUBLIC = path.join(__dirname, "public");
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
};

/** Do not serve index.html for missing real assets (avoids HTML mistaken as video). */
const STATIC_EXT = new Set([
  ".mp4",
  ".webm",
  ".ogg",
  ".mp3",
  ".wav",
  ".css",
  ".js",
  ".mjs",
  ".json",
  ".map",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".svg",
  ".ico",
  ".woff2",
  ".txt",
  ".pdf",
]);

/** Paths that serve the SPA shell (no .html in URL). */
const SPA_ROUTES = new Set([
  "/",
  "/home",
  "/movie",
  "/synopsis",
  "/cast",
  "/gallery",
  "/screenshots",
  "/downloads",
  "/reviews",
  "/comments",
  "/explore",
  "/banners",
  "/advertisement",
]);

function safePathFromUrl(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const normalized = path.normalize(decoded).replace(/^(\.\.(\/|\\|$))+/, "");
  const full = path.join(PUBLIC, normalized);
  if (!full.startsWith(PUBLIC)) return null;
  return full;
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath);
  const type = MIME[ext] || "application/octet-stream";
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(err.code === "ENOENT" ? 404 : 500);
      res.end(err.code === "ENOENT" ? "Not found" : "Server error");
      return;
    }
    res.writeHead(200, { "Content-Type": type });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const u = new URL(req.url || "/", `http://${req.headers.host}`);
  let pathname = u.pathname;
  if (pathname.length > 1 && pathname.endsWith("/")) pathname = pathname.slice(0, -1);

  if (pathname === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok");
    return;
  }

  if (SPA_ROUTES.has(pathname)) {
    sendFile(res, path.join(PUBLIC, "index.html"));
    return;
  }

  const filePath = safePathFromUrl(pathname);
  if (!filePath) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.stat(filePath, (err, st) => {
    if (err || !st.isFile()) {
      const ext = path.extname(pathname).toLowerCase();
      if (STATIC_EXT.has(ext)) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      if (!pathname.endsWith(".html")) {
        sendFile(res, path.join(PUBLIC, "index.html"));
        return;
      }
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    sendFile(res, filePath);
  });
});

let tryPort = PREFERRED;

server.on("listening", () => {
  const addr = server.address();
  const bound = typeof addr === "object" && addr ? addr.port : tryPort;
  if (bound !== PREFERRED) {
    process.stderr.write(
      `Using port ${bound}. To free ${PREFERRED}, close the other app or inspect: Get-NetTCPConnection -LocalPort ${PREFERRED}\n`
    );
  }
  console.log(`Jananayagan hub — http://localhost:${bound}/`);
  console.log(`Routes: /movie /synopsis /cast /gallery /downloads /reviews /explore /advertisement`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE" && tryPort < PREFERRED + PORT_RANGE) {
    process.stderr.write(`Port ${tryPort} is in use — trying ${tryPort + 1}…\n`);
    tryPort += 1;
    server.listen(tryPort);
    return;
  }
  console.error("Server failed to start:", err.message);
  process.exit(1);
});

server.listen(tryPort);
