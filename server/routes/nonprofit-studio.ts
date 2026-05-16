import { Router } from "express";
import fs from "fs/promises";
import path from "path";
import OpenAI from "openai";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { requireAuth } from "../auth-routes";
import { db } from "../db";
import { nonprofitDesigns } from "@shared/schema";

const router = Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const uploadsDir = path.resolve(process.cwd(), "uploads", "nonprofit");
const logoUploadsDir = path.resolve(process.cwd(), "uploads", "nonprofit-logos");
const maxLogoSizeBytes = 5 * 1024 * 1024;
const defaultColors = {
  primary: "#1B5E3F",
  secondary: "#D4AF37",
  accent: "#FFFFFF",
};

const DESIGN_TYPES = ["store_post", "marketing_post", "store_banner"] as const;
const PROJECT_TYPE_KEYS = [
  "orphan_care",
  "water_hajj",
  "meal_hajj",
  "home_restoration",
  "iftar",
  "mosque_building",
  "mosque_restoration",
  "food_basket",
  "crisis_relief",
  "water_sebil",
  "education_fees",
  "wedding_help",
  "medical_treatment",
  "general_charity",
] as const;

const PROJECT_TYPES: Record<(typeof PROJECT_TYPE_KEYS)[number], string> = {
  orphan_care: "Sponsoring orphans, caring hands holding child's hand gently, soft warm lighting",
  water_hajj: "Pilgrims drinking water at Mecca's holy sites, water bottles being shared",
  meal_hajj: "Hajj meals being prepared and distributed at holy sites, traditional food",
  home_restoration: "Old house being restored, construction tools, hope for families",
  iftar: "Ramadan iftar meal with dates, traditional Saudi setting, warm atmosphere",
  mosque_building: "New mosque being built, beautiful Islamic architecture, scaffolding",
  mosque_restoration: "Old mosque being renovated, preserving Islamic heritage",
  food_basket: "Bountiful food basket with rice, dates, oil, Ramadan essentials",
  crisis_relief: "Hands offering help, family receiving aid, hope amid difficulty",
  water_sebil: "Fresh water being shared at mosques, water drops, refreshing",
  education_fees: "Books, student supplies, graduation cap, school setting",
  wedding_help: "Wedding preparations, helping families with marriage costs",
  medical_treatment: "Caring hands, medical care, healing atmosphere, hope",
  general_charity: "Symbol of giving, hands meeting in charity, warm light",
};

const hexSchema = z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/, "يرجى إدخال لون HEX صحيح");

const uploadLogoSchema = z.object({
  logo: z.string().min(1, "ملف الشعار مطلوب"),
});

const generateSchema = z.object({
  designType: z.enum(DESIGN_TYPES),
  projectType: z.enum(PROJECT_TYPE_KEYS),
  projectName: z.string().trim().min(1, "اسم المشروع مطلوب"),
  logoUrl: z.string().trim().min(1, "يرجى رفع شعار الجمعية"),
  primaryColor: hexSchema,
  secondaryColor: hexSchema.optional(),
  accentColor: hexSchema.optional(),
});

type DesignType = (typeof DESIGN_TYPES)[number];
type ProjectType = (typeof PROJECT_TYPE_KEYS)[number];

function normalizeHex(value: unknown, fallback: string): string {
  return typeof value === "string" && /^#[0-9A-Fa-f]{6}$/.test(value)
    ? value.toUpperCase()
    : fallback;
}

function parseVisionColors(content: string | null | undefined) {
  if (!content) return defaultColors;

  try {
    const match = content.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match?.[0] || content);

    return {
      primary: normalizeHex(parsed.primary, defaultColors.primary),
      secondary: normalizeHex(parsed.secondary, defaultColors.secondary),
      accent: normalizeHex(parsed.accent, defaultColors.accent),
    };
  } catch {
    return defaultColors;
  }
}

function parseLogoDataUrl(logo: string): { buffer: Buffer; mimeType: "image/png" | "image/jpeg"; extension: "png" | "jpg" } {
  const match = logo.match(/^data:(image\/(?:png|jpe?g));base64,([A-Za-z0-9+/=\s]+)$/);

  if (!match) {
    throw new Error("يرجى رفع شعار بصيغة PNG أو JPG فقط");
  }

  const rawMimeType = match[1].toLowerCase();
  const mimeType = rawMimeType === "image/png" ? "image/png" : "image/jpeg";
  const extension = mimeType === "image/png" ? "png" : "jpg";
  const base64Data = match[2].replace(/\s/g, "");
  const buffer = Buffer.from(base64Data, "base64");

  if (buffer.length === 0) {
    throw new Error("ملف الشعار غير صالح");
  }

  if (buffer.length > maxLogoSizeBytes) {
    throw new Error("حجم الصورة كبير جداً");
  }

  return { buffer, mimeType, extension };
}

function deriveHighlightWord(projectName: string): string {
  const words = projectName.trim().split(/\s+/).filter(Boolean);
  return words.at(-1) || projectName.trim();
}

function safeDownloadName(projectName: string): string {
  const safeName = projectName
    .trim()
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 80);

  return `${safeName || "nonprofit-design"}.png`;
}

function buildStylePrompt(
  designType: DesignType,
  projectDescription: string,
  primaryColor: string,
  secondaryColor: string,
  accentColor: string
): string {
  if (designType === "marketing_post") {
    return `
COMPOSITION: Rich and detailed marketing poster.
- Top: Large bold Arabic title
- Middle: Background scene of ${projectDescription} with ${primaryColor} overlay
- Quote section: Hint of Islamic quote area (don't include actual text)
- Bottom: Designed space for QR code and donation info (visual hint only)
- Use ${secondaryColor} as accent color for decorative elements
`;
  }

  if (designType === "store_banner") {
    return `
COMPOSITION: Wide horizontal banner feel (even within square).
- Right side: Empty space for logo placement
- Left side: Project name and call-to-action area
- Background: ${projectDescription} with ${primaryColor} overlay
- More dynamic and energetic feel
- Use ${accentColor} for highlight elements
`;
  }

  return `
COMPOSITION: Clean and minimalist square design.
- Center: Bold Arabic project name with colored highlight block on key word
- Background: ${projectDescription} with ${primaryColor} overlay (65% opacity)
- Top center: Empty space (logo will be placed here)
- Bottom: Simple, no extra elements
`;
}

function buildImagePrompt({
  designType,
  projectType,
  projectName,
  primaryColor,
  secondaryColor,
  accentColor,
}: {
  designType: DesignType;
  projectType: ProjectType;
  projectName: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}): string {
  const projectDescription = PROJECT_TYPES[projectType];
  const stylePrompt = buildStylePrompt(
    designType,
    projectDescription,
    primaryColor,
    secondaryColor,
    accentColor
  );

  return `Professional Islamic charity campaign poster, square 1024x1024 format.

VISUAL STYLE: Cinematic editorial photography with strong color overlay treatment.

${stylePrompt}

BACKGROUND SCENE: ${projectDescription}

COLOR TREATMENT:
- Primary overlay color: ${primaryColor}
- Secondary accent: ${secondaryColor || "#D4AF37"}
- Heavy color tint at 65% opacity
- Subtle vignette at corners
- Cinematic lighting

TEXT REQUIREMENTS (Arabic, RTL):
- Main title: "${projectName}"
- Position: Per composition above
- Style: Bold Arabic typography, pure white
- Size: Large and prominent

DO NOT INCLUDE: Faces, recognizable people, logos, watermarks, English text.
LANGUAGE: Arabic only.`;
}

router.use(requireAuth);

router.post("/upload-logo", async (req, res) => {
  const parsed = uploadLogoSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0]?.message || "ملف الشعار مطلوب" });
  }

  try {
    const userId = req.session.userId!;
    const { buffer, mimeType, extension } = parseLogoDataUrl(parsed.data.logo);
    const filename = `logo_${userId}_${Date.now()}.${extension}`;
    const filepath = path.join(logoUploadsDir, filename);

    await fs.mkdir(logoUploadsDir, { recursive: true });
    await fs.writeFile(filepath, buffer);

    const imageBase64 = buffer.toString("base64");
    const visionResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: 'Analyze this charity logo. Extract the main colors. Return ONLY a valid JSON object in this exact format: {"primary": "#XXXXXX", "secondary": "#XXXXXX", "accent": "#XXXXXX"}. The primary should be the most dominant color, secondary the supporting color, and accent for details. Do not include any text outside the JSON.',
            },
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${imageBase64}` },
            },
          ],
        },
      ],
      max_tokens: 200,
    });

    const colors = parseVisionColors(visionResponse.choices[0]?.message?.content);

    return res.json({
      logoUrl: `/uploads/nonprofit-logos/${filename}`,
      colors,
    });
  } catch (error: any) {
    console.error("[Nonprofit Studio] Logo upload error:", error);
    return res.status(400).json({
      error: error?.message || "فشل رفع الشعار وتحليل الألوان",
    });
  }
});

router.post("/generate", async (req, res) => {
  const parsed = generateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: parsed.error.errors[0]?.message || "بيانات غير صحيحة",
    });
  }

  const userId = req.session.userId!;
  const {
    designType,
    projectType,
    projectName,
    logoUrl,
    primaryColor,
    secondaryColor = defaultColors.secondary,
    accentColor = defaultColors.accent,
  } = parsed.data;
  let designId: number | null = null;

  try {
    const colors = {
      primary: primaryColor.toUpperCase(),
      secondary: secondaryColor.toUpperCase(),
      accent: accentColor.toUpperCase(),
    };

    const [design] = await db
      .insert(nonprofitDesigns)
      .values({
        userId,
        designType,
        projectType,
        projectName,
        highlightWord: deriveHighlightWord(projectName),
        primaryColor: colors.primary,
        visualContext: projectType,
        logoUrl,
        extractedColors: JSON.stringify(colors),
        status: "pending",
      })
      .returning({ id: nonprofitDesigns.id });

    designId = design.id;

    const imagePrompt = buildImagePrompt({
      designType,
      projectType,
      projectName,
      primaryColor: colors.primary,
      secondaryColor: colors.secondary,
      accentColor: colors.accent,
    });

    const response = await openai.images.generate({
      model: "gpt-image-1",
      prompt: imagePrompt,
      n: 1,
      size: "1024x1024",
      quality: "medium",
    });

    const imageBase64 = response.data?.[0]?.b64_json;
    if (!imageBase64) {
      throw new Error("لم يتم استلام الصورة من مزود الذكاء الاصطناعي");
    }

    await fs.mkdir(uploadsDir, { recursive: true });

    const fileName = `${designId}-${Date.now()}.png`;
    const filePath = path.join(uploadsDir, fileName);
    await fs.writeFile(filePath, Buffer.from(imageBase64, "base64"));

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
    const filePath = path.join(uploadsDir, fileName);

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
