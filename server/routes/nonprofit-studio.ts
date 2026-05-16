import { Router } from "express";
import fs from "fs/promises";
import path from "path";
import OpenAI from "openai";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import sharp from "sharp";

import { requireAuth } from "../auth-routes";
import { db } from "../db";
import { nonprofitDesigns } from "@shared/schema";

const router = Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const visualContexts = {
  orphan_care: "child's small hand held by caring adult hand, soft warm lighting, tender atmosphere",
  water_sebil: "water bottles being shared at mosque, fresh water drops, refreshing peaceful scene",
  food_basket: "bountiful food basket with rice, dates, oil, Ramadan essentials, warm golden lighting",
  iftar_meal: "traditional iftar meal with dates and traditional food, Ramadan atmosphere",
  mosque_service: "beautiful mosque exterior with golden minarets, soft sunset lighting, peaceful spiritual atmosphere",
  hajj_pilgrim: "pilgrim in white ihram clothing in prayer position, Mecca atmosphere, spiritual hope",
  general_charity: "two hands meeting in gesture of giving and receiving, warm light, symbol of charity",
} as const;

const generateSchema = z.object({
  projectName: z.string().trim().min(1, "اسم المشروع مطلوب"),
  highlightWord: z.string().trim().min(1, "كلمة التمييز مطلوبة"),
  primaryColor: z
    .string()
    .trim()
    .regex(/^#[0-9A-Fa-f]{6}$/, "يرجى إدخال لون HEX صحيح"),
  visualContext: z.enum([
    "orphan_care",
    "water_sebil",
    "food_basket",
    "iftar_meal",
    "mosque_service",
    "hajj_pilgrim",
    "general_charity",
  ]),
});

const uploadDir = path.resolve(process.cwd(), "uploads", "nonprofit");

function safeDownloadName(projectName: string): string {
  const safeName = projectName
    .trim()
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 80);

  return `${safeName || "nonprofit-design"}.jpg`;
}

router.use(requireAuth);

router.post("/generate", async (req, res) => {
  const parsed = generateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: parsed.error.errors[0]?.message || "بيانات غير صحيحة",
    });
  }

  const userId = req.session.userId!;
  const { projectName, highlightWord, primaryColor, visualContext } = parsed.data;
  const visualDescription = visualContexts[visualContext];
  let designId: number | null = null;

  try {
    const [design] = await db
      .insert(nonprofitDesigns)
      .values({
        userId,
        projectName,
        highlightWord,
        primaryColor,
        visualContext,
        status: "pending",
      })
      .returning({ id: nonprofitDesigns.id });

    designId = design.id;

    const imagePrompt = `Professional Islamic charity campaign poster, square 1024x1024 format.

VISUAL STYLE: Cinematic editorial photography with strong color overlay treatment.

BACKGROUND SCENE: ${visualDescription}

COLOR TREATMENT:
- Apply heavy color overlay of ${primaryColor} at 65% opacity over entire scene
- Scene visible but tinted with this dominant color
- Subtle vignette darkening at corners
- Soft cinematic lighting with light rays and gentle bokeh
- Film-like quality with slight grain texture

TEXT REQUIREMENTS (Arabic, right-to-left):
- Main title: "${projectName}"
- Position: Lower-center area of image
- Font: Bold Arabic typography, very heavy weight
- Color: PURE WHITE (#FFFFFF)
- Size: Large and prominent

CRITICAL HIGHLIGHT EFFECT:
- The word "${highlightWord}" MUST have a solid colored rectangle BEHIND it
- Rectangle color: ${primaryColor}
- Rectangle has slightly rounded corners (about 6px radius)
- Rectangle extends slightly beyond word width and height

COMPOSITION:
- Top center: KEEP EMPTY (reserved for logo)
- Middle: Atmospheric scene with color overlay
- Lower center: Arabic title with highlight block

DO NOT INCLUDE: Western faces, recognizable people, logos, watermarks, English text.
LANGUAGE: Arabic only.`;

    const response = await openai.images.generate({
      model: "gpt-image-1",
      prompt: imagePrompt,
      n: 1,
      size: "1024x1024",
      quality: "low",
    });

    const imageBase64 = response.data?.[0]?.b64_json;
    if (!imageBase64) {
      throw new Error("لم يتم استلام الصورة من مزود الذكاء الاصطناعي");
    }

    await fs.mkdir(uploadDir, { recursive: true });

    const fileName = `${designId}-${Date.now()}.jpg`;
    const filePath = path.join(uploadDir, fileName);
    const rawBuffer = Buffer.from(imageBase64, "base64");
    // ضغط الصورة وتصغيرها باستخدام sharp لتقليل حجم الملف
    const imageBuffer = await sharp(rawBuffer)
      .resize(600, 600, { fit: "cover" })
      .jpeg({ quality: 75 })
      .toBuffer();
    await fs.writeFile(filePath, imageBuffer);

    const imageUrl = `/uploads/nonprofit/${fileName}`;

    await db
      .update(nonprofitDesigns)
      .set({
        imageUrl,
        status: "completed",
        errorMessage: null,
      })
      .where(and(eq(nonprofitDesigns.id, designId), eq(nonprofitDesigns.userId, userId)));

    return res.json({
      success: true,
      imageUrl,
      designId,
    });
  } catch (error: any) {
    console.error("[Nonprofit Studio] Generate error:", error);

    if (designId) {
      await db
        .update(nonprofitDesigns)
        .set({
          status: "failed",
          errorMessage: error?.message || "فشل توليد التصميم",
        })
        .where(and(eq(nonprofitDesigns.id, designId), eq(nonprofitDesigns.userId, userId)));
    }

    return res.status(500).json({
      success: false,
      error: "حدث خطأ أثناء توليد التصميم. يرجى المحاولة مرة أخرى.",
    });
  }
});

router.get("/history", async (req, res) => {
  const userId = req.session.userId!;

  try {
    const designs = await db
      .select()
      .from(nonprofitDesigns)
      .where(eq(nonprofitDesigns.userId, userId))
      .orderBy(desc(nonprofitDesigns.createdAt))
      .limit(10);

    return res.json({ success: true, designs });
  } catch (error) {
    console.error("[Nonprofit Studio] History error:", error);
    return res.status(500).json({ error: "فشل في جلب آخر التصاميم" });
  }
});

router.get("/download/:id", async (req, res) => {
  const userId = req.session.userId!;
  const designId = Number(req.params.id);

  if (!Number.isInteger(designId) || designId <= 0) {
    return res.status(400).json({ error: "معرف التصميم غير صالح" });
  }

  try {
    const [design] = await db
      .select()
      .from(nonprofitDesigns)
      .where(and(eq(nonprofitDesigns.id, designId), eq(nonprofitDesigns.userId, userId)))
      .limit(1);

    if (!design || !design.imageUrl) {
      return res.status(404).json({ error: "التصميم غير موجود أو لا يمكنك الوصول إليه" });
    }

    const fileName = path.basename(design.imageUrl);
    const filePath = path.join(uploadDir, fileName);

    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ error: "ملف التصميم غير موجود" });
    }

    return res.download(filePath, safeDownloadName(design.projectName));
  } catch (error) {
    console.error("[Nonprofit Studio] Download error:", error);
    return res.status(500).json({ error: "فشل تحميل التصميم" });
  }
});

export default router;
