import type { Express } from "express";
import express from "express";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Single-service deploy: serve Vite output from ../../web-client/dist (from server/dist/*.js at runtime).
 * Same-origin UI can use VITE_API_BASE="" so /api hits this host.
 */
export function mountWebClientDistIfPresent(app: Express): void {
  if (process.env.NODE_ENV !== "production") return;

  const here = dirname(fileURLToPath(import.meta.url));
  const webDist = join(here, "..", "..", "web-client", "dist");
  const indexHtml = join(webDist, "index.html");
  if (!existsSync(indexHtml)) return;

  app.use(express.static(webDist, { fallthrough: true, index: false }));
  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    if (req.path.startsWith("/api")) return next();
    res.sendFile(indexHtml, (err) => next(err));
  });
}
