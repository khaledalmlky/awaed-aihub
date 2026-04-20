import type { Express } from "express";
import { createServer, type Server } from "http";

import brainRoutes from "./ai/brain-routes";

/**
 * Register all application routes here
 */
export async function registerRoutes(
  httpServer: Server,
  app: Express
) {

  /**
   * AI Brain Route
   * POST /api/brain
   */
  app.use("/api/brain", brainRoutes);


  /**
   * Health check (اختياري)
   */
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });


  return httpServer;
}
