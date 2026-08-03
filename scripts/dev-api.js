// Server local mínimo que monta api/progress.js igual que Vercel y sirve el
// estático del dashboard — el flujo completo (front + sync + Neon) en un puerto.
// Uso: npm run dev-api  ->  http://localhost:8787
import "./load-env.js";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const mod = await import("../api/progress.js");
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml"
};

createServer(async (req, res) => {
  try {
    if (!req.url.startsWith("/api/progress")) {
      // estático
      let ruta = decodeURIComponent(req.url.split("?")[0]);
      if (ruta === "/") ruta = "/index.html";
      const archivo = normalize(join(ROOT, ruta));
      if (!archivo.startsWith(normalize(ROOT + sep)) && archivo !== normalize(ROOT)) {
        res.writeHead(403).end("forbidden");
        return;
      }
      try {
        const buf = await readFile(archivo);
        res.writeHead(200, { "content-type": MIME[extname(archivo)] || "application/octet-stream" });
        res.end(buf);
      } catch {
        res.writeHead(404).end("not found");
      }
      return;
    }
    const handler = mod[req.method];
    if (!handler) {
      res.writeHead(405).end("method not allowed");
      return;
    }
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const request = new Request(`http://localhost:8787${req.url}`, {
      method: req.method,
      headers: req.headers,
      body: ["GET", "HEAD"].includes(req.method) ? undefined : Buffer.concat(chunks)
    });
    const response = await handler(request);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (err) {
    res.writeHead(500, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: String(err) }));
  }
}).listen(8787, () => console.log("API de prueba: http://localhost:8787/api/progress"));
