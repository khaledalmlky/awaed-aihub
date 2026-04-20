import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { insertKnowledgeSchema } from "@shared/schema";
import { requireAdmin } from "../auth-routes";

export function registerKnowledgeRoutes(app: Express): void {
  app.get("/api/knowledge", async (req: Request, res: Response) => {
    try {
      const knowledge = await storage.getAllKnowledge();
      res.json(knowledge);
    } catch (error) {
      console.error("Error fetching knowledge:", error);
      res.status(500).json({ error: "فشل في جلب قاعدة المعرفة" });
    }
  });

  app.get("/api/knowledge/search", async (req: Request, res: Response) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ error: "يرجى إدخال كلمة للبحث" });
      }
      const results = await storage.searchKnowledge(query);
      res.json(results);
    } catch (error) {
      console.error("Error searching knowledge:", error);
      res.status(500).json({ error: "فشل في البحث" });
    }
  });

  app.get("/api/knowledge/category/:category", async (req: Request, res: Response) => {
    try {
      const { category } = req.params;
      const knowledge = await storage.getKnowledgeByCategory(category);
      res.json(knowledge);
    } catch (error) {
      console.error("Error fetching by category:", error);
      res.status(500).json({ error: "فشل في جلب البيانات" });
    }
  });

  app.get("/api/knowledge/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "معرف غير صالح" });
      }
      const item = await storage.getKnowledgeById(id);
      if (!item) {
        return res.status(404).json({ error: "العنصر غير موجود" });
      }
      res.json(item);
    } catch (error) {
      console.error("Error fetching knowledge item:", error);
      res.status(500).json({ error: "فشل في جلب العنصر" });
    }
  });

  app.post("/api/knowledge", requireAdmin, async (req: Request, res: Response) => {
    try {
      const parsed = insertKnowledgeSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          error: "بيانات غير صحيحة",
          details: parsed.error.errors 
        });
      }

      const item = await storage.createKnowledge(parsed.data);
      res.status(201).json(item);
    } catch (error) {
      console.error("Error creating knowledge:", error);
      res.status(500).json({ error: "فشل في إنشاء العنصر" });
    }
  });

  app.put("/api/knowledge/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "معرف غير صالح" });
      }

      const existing = await storage.getKnowledgeById(id);
      if (!existing) {
        return res.status(404).json({ error: "العنصر غير موجود" });
      }

      const item = await storage.updateKnowledge(id, req.body);
      res.json(item);
    } catch (error) {
      console.error("Error updating knowledge:", error);
      res.status(500).json({ error: "فشل في تحديث العنصر" });
    }
  });

  app.delete("/api/knowledge/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "معرف غير صالح" });
      }

      const existing = await storage.getKnowledgeById(id);
      if (!existing) {
        return res.status(404).json({ error: "العنصر غير موجود" });
      }

      await storage.deleteKnowledge(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting knowledge:", error);
      res.status(500).json({ error: "فشل في حذف العنصر" });
    }
  });
}
