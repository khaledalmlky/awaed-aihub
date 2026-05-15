import { Router, Request, Response } from "express";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { db } from "../db";
import { nonprofitDesigns } from "../../shared/schema";
import { eq, desc } from "drizzle-orm";

const router = Router();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

function getUserId(req: Request): number | null {
    const session = (req as any).session;
    const user = (req as any).user;
    return session?.userId || user?.id || null;
}

// POST /generate
router.post("/generate", async (req: Request, res: Response) => {
    const userId = getUserId(req);
    if (!userId) {
          return res.status(401).json({ error: "يجب تسجيل الدخول لاستخدام هذه الأداة." });
    }

              const { projectName, highlightWord, primaryColor, visualContext } = req.body;

              if (!projectName || !highlightWord || !primaryColor || !visualContext) {
                    return res.status(400).json({ error: "جميع الحقول مطلوبة." });
              }

              const contextLabels: Record<string, string> = {
                    orphan_care: "كفالة يتيم",
                    water_sebil: "سقيا الماء",
                    food_basket: "سلة غذائية",
                    iftar_meal: "إفطار صائم",
                    mosque_service: "خدمة المسجد",
                    hajj_pilgrim: "خدمة الحاج",
                    general_charity: "خير عام",
              };

              const contextLabel = contextLabels[visualContext] || "خير عام";

              const prompt = `Create a professional Arabic charity social media post design for "${projectName}".
              The word "${highlightWord}" should be visually highlighted or emphasized.
              Primary brand color: ${primaryColor}.
              Context/theme: ${contextLabel}.
              Design requirements:
              - Clean, modern Arabic charity poster
              - Professional typography with Arabic text
              - The highlighted word "${highlightWord}" should stand out visually
              - Use the primary color ${primaryColor} as the dominant color
              - Include subtle Islamic geometric patterns or charity-related imagery
              - 1:1 square format suitable for social media
              - High quality, print-ready design
              - Arabic RTL layout`;

              try {
                    // Create uploads directory if it doesn't exist
      const uploadsDir = path.join(process.cwd(), "uploads", "nonprofit");
                    if (!fs.existsSync(uploadsDir)) {
                            fs.mkdirSync(uploadsDir, { recursive: true });
                    }

      const response = await openai.images.generate({
              model: "gpt-image-1",
              prompt,
              size: "1024x1024",
              quality: "medium",
      });

      const imageData = response.data[0];
                    if (!imageData || !imageData.b64_json) {
                            throw new Error("No image data returned from OpenAI");
                    }

      const filename = `design_${userId}_${Date.now()}.png`;
                    const filepath = path.join(uploadsDir, filename);
                    const buffer = Buffer.from(imageData.b64_json, "base64");
                    fs.writeFileSync(filepath, buffer);

      const imageUrl = `/uploads/nonprofit/${filename}`;

      const [design] = await db
                      .insert(nonprofitDesigns)
                      .values({
                                userId,
                                projectName,
                                highlightWord,
                                primaryColor,
                                visualContext,
                                imageUrl,
                                status: "completed",
                      })
                      .returning();

      return res.json({
              success: true,
              imageUrl,
              designId: design.id,
      });
              } catch (error: any) {
    console.error("Nonprofit studio error:", error);
                    return res.status(500).json({
                            error: error.message || "حدث خطأ أثناء توليد التصميم.",
                    });
              }
});

// GET /history
router.get("/history", async (req: Request, res: Response) => {
    const userId = getUserId(req);
    if (!userId) {
          return res.status(401).json({ error: "يجب تسجيل الدخول." });
    }

             try {
                   const designs = await db
                     .select()
                     .from(nonprofitDesigns)
                     .where(eq(nonprofitDesigns.userId, userId))
                     .orderBy(desc(nonprofitDesigns.createdAt))
                     .limit(10);

      return res.json({ designs });
             } catch (error: any) {
    console.error("History error:", error);
                   return res.status(500).json({ error: "خطأ في جلب السجل." });
             }
});

// GET /download/:id
router.get("/download/:id", async (req: Request, res: Response) => {
    const userId = getUserId(req);
    if (!userId) {
          return res.status(401).json({ error: "يجب تسجيل الدخول." });
    }

             const id = parseInt(req.params.id);
    if (isNaN(id)) {
          return res.status(400).json({ error: "معرف غير صالح." });
    }

             try {
                   const [design] = await db
                     .select()
                     .from(nonprofitDesigns)
                     .where(eq(nonprofitDesigns.id, id))
                     .limit(1);

      if (!design || design.userId !== userId) {
              return res.status(404).json({ error: "التصميم غير موجود." });
      }

      if (!design.imageUrl) {
              return res.status(404).json({ error: "ملف الصورة غير موجود." });
      }

      const filepath = path.join(process.cwd(), design.imageUrl);
                   if (!fs.existsSync(filepath)) {
                           return res.status(404).json({ error: "ملف الصورة غير موجود على الخادم." });
                   }

      return res.download(filepath, `design-${design.projectName}-${id}.png`);
             } catch (error: any) {
    console.error("Download error:", error);
                   return res.status(500).json({ error: "خطأ في تحميل الملف." });
             }
});

export default router;
