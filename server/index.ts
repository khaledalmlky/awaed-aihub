import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

import { setupSession, registerAuthRoutes } from "./auth-routes";
import { registerAIRoutes } from "./ai/routes";
import { registerAnalyzerRoutes } from "./ai/analyzer-routes";
import { registerPerformanceRoutes } from "./ai/performance-routes";
import { registerKnowledgeRoutes } from "./ai/knowledge-routes";
import brainRoutes from "./ai/brain-routes";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const isProduction = process.env.NODE_ENV === "production";

// -------- Middleware --------
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Trust proxy (required for Railway/Render behind load balancers)
app.set("trust proxy", 1);

// Sessions + auto admin bootstrap (uses ADMIN_EMAIL / ADMIN_PASSWORD env vars)
setupSession(app);

// -------- API Routes --------
// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Auth routes (login, logout, user management)
registerAuthRoutes(app);

// AI tool routes
registerAIRoutes(app);
registerAnalyzerRoutes(app);
registerPerformanceRoutes(app);
registerKnowledgeRoutes(app);

// Campaign Brain
app.use("/api/brain", brainRoutes);

// -------- Start server --------
async function start() {
  const httpServer = createServer(app);

  if (!isProduction) {
    // Development: use Vite middleware for HMR and client serving
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  } else {
    // Production: serve built static files from dist/public/
    // In production, this file lives at dist/index.js, so client is at ./public
    const distPath = path.resolve(__dirname, "public");
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      // SPA fallback: any non-API route returns index.html
      app.use("*", (_req, res) => {
        res.sendFile(path.resolve(distPath, "index.html"));
      });
    } else {
      console.warn(`⚠️  Build directory not found: ${distPath}`);
    }
  }

  // -------- Error handler (must be registered last) --------
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Server error:", err);
    res.status(500).json({
      error: "Internal server error",
      message: isProduction ? undefined : err.message,
    });
  });

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on port ${PORT} (${process.env.NODE_ENV || "development"})`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
