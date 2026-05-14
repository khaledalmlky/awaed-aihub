import { and, desc, eq } from "drizzle-orm";
import { Router, type Request, type Response } from "express";
import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import OpenAI from "openai";
import sharp from "sharp";
import { Vibrant } from "node-vibrant/node";
import { z } from "zod";

import { requireAuth } from "../auth-routes";
import { db } from "../db";
import { nonprofitDesigns } from "@shared/schema";

const router = Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const uploadRoot = path.resolve(process.cwd(), "uploads");
const nonprofitRoot = path.join(uploadRoot, "nonprofit");
const logoRoot = path.join(nonprofitRoot, "logos");

function ensureDirectory(directory: string): void {
  fs.mkdirSync(directory, { recursive: true });
}

function safeSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function normalizeHexColor(color: string | undefined, fallback: string): string {
  if (!color) return fallback;
  const trimmed = color.trim();
  return /^#[0-9a-fA-F]{6}$/.test(trimmed) ? trimmed : fallback;
}

function filePathToUrl(filePath: string): string {
  const relativePath = path.relative(uploadRoot, filePath).split(path.sep).join("/");
  return `/uploads/${relativePath}`;
}

function urlToUploadPath(url: string): string {
  const cleanUrl = decodeURIComponent(url.split("?")[0] || "");
  const relativePath = cleanUrl.replace(/^\/uploads\/?/, "");
  const resolved = path.resolve(uploadRoot, relativePath);
  if (!resolved.startsWith(uploadRoot)) {
    throw new Error("Invalid upload path");
  }
  return resolved;
}

function estimateTextWidth(text: string, fontSize: number): number {
  const arabicChars = Array.from(text.replace(/\s+/g, ""));
  const spaces = (text.match(/\s/g) || []).length;
  return arabicChars.length * fontSize * 0.58 + spaces * fontSize * 0.28;
}

function buildVignetteSvg(): Buffer {
  return Buffer.from(`
    <svg width="1080" height="1080" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="v" cx="50%" cy="48%" r="74%">
          <stop offset="52%" stop-color="#000000" stop-opacity="0" />
          <stop offset="100%" stop-color="#000000" stop-opacity="0.45" />
        </radialGradient>
      </defs>
      <rect width="1080" height="1080" fill="url(#v)" />
    </svg>
  `);
}

function buildTextureSvg(): Buffer {
  return Buffer.from(`
    <svg width="1080" height="1080" xmlns="http://www.w3.org/2000/svg">
      <filter id="grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
        <feComponentTransfer>
          <feFuncA type="table" tableValues="0 0.12" />
        </feComponentTransfer>
      </filter>
      <rect width="1080" height="1080" filter="url(#grain)" opacity="0.16" />
    </svg>
  `);
}

function buildTitleSvg(projectName: string, highlightWord: string, primaryColor: string): Buffer {
  const title = projectName.trim();
  const highlight = highlightWord.trim();
  const fontSize = title.length > 24 ? 92 : title.length > 16 ? 108 : 130;
  const titleY = 620;
  const totalWidth = Math.min(920, estimateTextWidth(title, fontSize));
  const highlightWidth = Math.min(560, Math.max(180, estimateTextWidth(highlight, fontSize) + 58));
  const highlightHeight = Math.round(fontSize * 0.92);
  const highlightY = Math.round(titleY - fontSize * 0.76);
  const isLastWord = title.endsWith(highlight);
  const highlightCenterX = isLastWord ? 540 - totalWidth / 2 + highlightWidth / 2 - 4 : 540;
  const highlightX = Math.round(highlightCenterX - highlightWidth / 2);

  return Buffer.from(`
    <svg width="1080" height="1080" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <style>
          .title {
            font-family: 'Tajawal', 'Cairo', 'Arial', sans-serif;
            font-weight: 900;
            fill: white;
            letter-spacing: -2px;
          }
        </style>
      </defs>
      <rect x="${highlightX}" y="${highlightY}" width="${Math.round(highlightWidth)}" height="${highlightHeight}" fill="${primaryColor}" rx="14" opacity="0.98" />
      <text class="title" x="540" y="${titleY}" font-size="${fontSize}" text-anchor="middle" direction="rtl" unicode-bidi="bidi-override">${escapeXml(title)}</text>
      <text class="title" x="${Math.round(highlightCenterX)}" y="${titleY}" font-size="${fontSize}" text-anchor="middle" direction="rtl" unicode-bidi="bidi-override">${escapeXml(highlight)}</text>
    </svg>
  `);
}

async function generateBackground(projectName: string, primaryColor: string): Promise<Buffer> {
  const imagePrompt = `
Cinematic editorial photography for Islamic charity campaign.
Theme: ${projectName}
Style: Soft photography with rays of light, subtle bokeh, warm atmosphere.
Color tone: Should harmonize with ${primaryColor} (will be overlaid).
No text, no logos, no people's faces clearly visible.
Use hands, silhouettes, or contextual objects (food baskets, water bottles, prayer rugs).
Square composition 1024x1024.
Professional studio photography quality.
Empty space in the center-right for text overlay.
`;

  const response = await openai.images.generate({
    model: "gpt-image-1",
    prompt: imagePrompt,
    n: 1,
    size: "1024x1024",
    quality: "medium",
  });

  const imageData = response.data?.[0];
  if (imageData?.b64_json) {
    return Buffer.from(imageData.b64_json, "base64");
  }

  if (imageData?.url) {
    const imageResponse = await fetch(imageData.url);
    if (!imageResponse.ok) {
      throw new Error("تعذر تحميل الخلفية المولدة");
    }
    return Buffer.from(await imageResponse.arrayBuffer());
  }

  throw new Error("لم يرجع نموذج الصور أي نتيجة");
}

async function buildWhiteLogo(logoPath: string): Promise<{ buffer: Buffer; width: number; height: number }> {
  const resized = sharp(logoPath)
    .resize({ height: 130, width: 260, fit: "inside", withoutEnlargement: true })
    .ensureAlpha()
    .tint({ r: 255, g: 255, b: 255 })
    .png();

  const { data, info } = await resized.toBuffer({ resolveWithObject: true });
  return { buffer: data, width: info.width, height: info.height };
}

async function composePoster(params: {
  backgroundBuffer: Buffer;
  logoPath: string;
  primaryColor: string;
  projectName: string;
  highlightWord: string;
  outputPath: string;
}): Promise<void> {
  const { backgroundBuffer, logoPath, primaryColor, projectName, highlightWord, outputPath } = params;
  const whiteLogo = await buildWhiteLogo(logoPath);
  const logoLeft = Math.round((1080 - whiteLogo.width) / 2);

  const colorOverlay = Buffer.from(`
    <svg width="1080" height="1080" xmlns="http://www.w3.org/2000/svg">
      <rect width="1080" height="1080" fill="${primaryColor}" fill-opacity="0.65" />
    </svg>
  `);

  await sharp(backgroundBuffer)
    .resize(1080, 1080, { fit: "cover" })
    .composite([
      { input: colorOverlay, top: 0, left: 0 },
      { input: buildVignetteSvg(), top: 0, left: 0 },
      { input: buildTextureSvg(), top: 0, left: 0 },
      { input: buildTitleSvg(projectName, highlightWord, primaryColor), top: 0, left: 0 },
      { input: whiteLogo.buffer, top: 80, left: logoLeft },
    ])
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(outputPath);
}

ensureDirectory(logoRoot);
ensureDirectory(nonprofitRoot);

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, _file, callback) => {
      const userId = req.session.userId;
      const directory = path.join(logoRoot, safeSegment(userId));
      ensureDirectory(directory);
      callback(null, directory);
    },
    filename: (_req, file, callback) => {
      const extensionByMime: Record<string, string> = {
        "image/png": ".png",
        "image/jpeg": ".jpg",
        "image/webp": ".webp",
        "image/svg+xml": ".svg",
      };
      const extension = extensionByMime[file.mimetype] || path.extname(file.originalname).toLowerCase() || ".png";
      callback(null, `logo-${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`);
    },
  }),
  fileFilter: (_req, file, callback) => {
    if (!["image/png", "image/jpeg", "image/webp", "image/svg+xml"].includes(file.mimetype)) {
      callback(new Error("يرجى رفع شعار بصيغة PNG أو JPG أو WEBP أو SVG"));
      return;
    }
    callback(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

const generateSchema = z.object({
  type: z.literal("store_post"),
  projectName: z.string().trim().min(2, "اسم المشروع مطلوب"),
  highlightWord: z.string().trim().min(2, "الكلمة المميزة مطلوبة"),
  logoUrl: z.string().trim().startsWith("/uploads/", "مسار الشعار غير صحيح"),
  primaryColor: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "لون الشعار غير صحيح"),
  secondaryColor: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

router.use(requireAuth);

router.post("/upload-logo", upload.single("logo"), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "يرجى رفع ملف الشعار" });
    }

    const paletteSource = await sharp(req.file.path)
      .resize({ width: 256, height: 256, fit: "inside", withoutEnlargement: true })
      .png()
      .toBuffer();
    const palette = await Vibrant.from(paletteSource).getPalette();
    const primaryColor = normalizeHexColor(
      palette.Vibrant?.hex || palette.DarkVibrant?.hex,
      "#1B5E3F"
    );
    const secondaryColor = normalizeHexColor(
      palette.Muted?.hex || palette.LightVibrant?.hex,
      "#D4AF37"
    );
    const accentColor = normalizeHexColor(
      palette.LightMuted?.hex || palette.DarkMuted?.hex,
      "#FFFFFF"
    );

    res.json({
      logoUrl: filePathToUrl(req.file.path),
      primaryColor,
      secondaryColor,
      accentColor,
    });
  } catch (error) {
    console.error("[Nonprofit Studio] Logo upload failed:", error);
    res.status(500).json({ error: "تعذر رفع الشعار أو استخراج ألوانه" });
  }
});

router.post("/generate", async (req: Request, res: Response) => {
  const userId = req.session.userId;
  const parsed = generateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0]?.message || "المدخلات غير صحيحة" });
  }

  const { type, projectName, highlightWord, logoUrl, primaryColor, secondaryColor } = parsed.data;
  let designId: number | undefined;

  try {
    const logoPath = urlToUploadPath(logoUrl);
    if (!fs.existsSync(logoPath)) {
      return res.status(400).json({ error: "ملف الشعار غير موجود" });
    }

    const [design] = await db
      .insert(nonprofitDesigns)
      .values({
        userId,
        type,
        projectName,
        highlightWord,
        logoUrl,
        primaryColor,
        secondaryColor,
        status: "generating",
      })
      .returning();
    designId = design.id;

    const userDirectory = path.join(nonprofitRoot, safeSegment(userId));
    ensureDirectory(userDirectory);

    const timestamp = Date.now();
    const backgroundPath = path.join(userDirectory, `background-${timestamp}.png`);
    const outputPath = path.join(userDirectory, `design-${timestamp}.png`);

    const backgroundBuffer = await generateBackground(projectName, primaryColor);
    await sharp(backgroundBuffer).resize(1080, 1080, { fit: "cover" }).png().toFile(backgroundPath);

    await composePoster({
      backgroundBuffer,
      logoPath,
      primaryColor,
      projectName,
      highlightWord,
      outputPath,
    });

    const [completed] = await db
      .update(nonprofitDesigns)
      .set({
        imageUrl: filePathToUrl(outputPath),
        backgroundUrl: filePathToUrl(backgroundPath),
        status: "completed",
        errorMessage: null,
      })
      .where(and(eq(nonprofitDesigns.id, designId), eq(nonprofitDesigns.userId, userId)))
      .returning();

    res.json({ design: completed });
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذر توليد التصميم";
    console.error("[Nonprofit Studio] Generate failed:", error);

    if (designId) {
      await db
        .update(nonprofitDesigns)
        .set({ status: "failed", errorMessage: message })
        .where(and(eq(nonprofitDesigns.id, designId), eq(nonprofitDesigns.userId, userId)));
    }

    res.status(500).json({ error: "تعذر توليد التصميم حالياً. حاول مرة أخرى بعد قليل." });
  }
});

router.get("/history", async (req: Request, res: Response) => {
  try {
    const designs = await db
      .select()
      .from(nonprofitDesigns)
      .where(eq(nonprofitDesigns.userId, req.session.userId))
      .orderBy(desc(nonprofitDesigns.createdAt))
      .limit(10);

    res.json({ designs });
  } catch (error) {
    console.error("[Nonprofit Studio] History failed:", error);
    res.status(500).json({ error: "تعذر تحميل سجل التصاميم" });
  }
});

router.get("/download/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "معرف التصميم غير صحيح" });
  }

  try {
    const [design] = await db
      .select()
      .from(nonprofitDesigns)
      .where(and(eq(nonprofitDesigns.id, id), eq(nonprofitDesigns.userId, req.session.userId)))
      .limit(1);

    if (!design || !design.imageUrl) {
      return res.status(404).json({ error: "التصميم غير موجود" });
    }

    const imagePath = urlToUploadPath(design.imageUrl);
    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({ error: "ملف التصميم غير موجود" });
    }

    const safeFilename = `${design.projectName.replace(/[\\/:*?"<>|]/g, "-") || "nonprofit-design"}.png`;
    res.download(imagePath, safeFilename);
  } catch (error) {
    console.error("[Nonprofit Studio] Download failed:", error);
    res.status(500).json({ error: "تعذر تحميل التصميم" });
  }
});

export default router;
