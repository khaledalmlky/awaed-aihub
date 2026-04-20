import type { Express, Request, Response } from "express";
import OpenAI from "openai";
import { storage } from "../storage";
import { z } from "zod";
import { logLearning, retrieveSimilarCases, isLearningEnabled } from "./learning";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  // baseURL: uses default OpenAI endpoint
});

const responseCache = new Map<string, { result: any; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

const platformBlockSchema = z.object({
  platform: z.enum(['meta', 'tiktok', 'snapchat', 'google']),
  spend: z.number().min(0),
  impressions: z.number().min(0).optional(),
  clicks: z.number().min(0).optional(),
  conversions: z.number().min(0).optional(),
  revenue: z.number().min(0).optional(),
  reach: z.number().min(0).optional(),
  videoViews: z.number().min(0).optional(),
  engagement: z.number().min(0).optional(),
});

const performanceAnalysisSchema = z.object({
  platforms: z.array(platformBlockSchema).min(1, "يجب إضافة منصة واحدة على الأقل"),
  campaignGoal: z.string().optional(),
  industryType: z.string().optional(),
});

type PlatformBlock = z.infer<typeof platformBlockSchema>;
type PerformanceAnalysisInput = z.infer<typeof performanceAnalysisSchema>;

function calculateDerivedKPIs(platform: PlatformBlock): Record<string, number | null> {
  const { spend, impressions, clicks, conversions, revenue } = platform;
  
  return {
    CPA: conversions && conversions > 0 ? spend / conversions : null,
    ROAS: revenue && spend > 0 ? revenue / spend : null,
    CTR: impressions && impressions > 0 && clicks ? (clicks / impressions) * 100 : null,
    CPC: clicks && clicks > 0 ? spend / clicks : null,
    CPM: impressions && impressions > 0 ? (spend / impressions) * 1000 : null,
    CVR: clicks && clicks > 0 && conversions ? (conversions / clicks) * 100 : null,
  };
}

function getCacheKey(input: PerformanceAnalysisInput): string {
  return JSON.stringify(input);
}

function getCachedResponse(key: string): any | null {
  const cached = responseCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.result;
  }
  responseCache.delete(key);
  return null;
}

function setCachedResponse(key: string, result: any): void {
  if (responseCache.size > 100) {
    const oldestKey = responseCache.keys().next().value;
    if (oldestKey) responseCache.delete(oldestKey);
  }
  responseCache.set(key, { result, timestamp: Date.now() });
}

const PLATFORM_LABELS: Record<string, string> = {
  meta: 'ميتا (فيسبوك/إنستقرام)',
  tiktok: 'تيك توك',
  snapchat: 'سناب شات',
  google: 'قوقل',
};

function buildAnalysisPrompt(input: PerformanceAnalysisInput, platformsWithKPIs: Array<{ platform: PlatformBlock; kpis: Record<string, number | null> }>): string {
  const platformsSummary = platformsWithKPIs.map(({ platform, kpis }) => {
    const label = PLATFORM_LABELS[platform.platform] || platform.platform;
    return `
### ${label}
- **الإنفاق**: ${platform.spend.toLocaleString('ar-SA')} ريال
${platform.impressions ? `- **مرات الظهور**: ${platform.impressions.toLocaleString('ar-SA')}` : ''}
${platform.clicks ? `- **النقرات**: ${platform.clicks.toLocaleString('ar-SA')}` : ''}
${platform.conversions ? `- **التحويلات**: ${platform.conversions.toLocaleString('ar-SA')}` : ''}
${platform.revenue ? `- **الإيرادات**: ${platform.revenue.toLocaleString('ar-SA')} ريال` : ''}
${platform.reach ? `- **الوصول**: ${platform.reach.toLocaleString('ar-SA')}` : ''}
${platform.videoViews ? `- **مشاهدات الفيديو**: ${platform.videoViews.toLocaleString('ar-SA')}` : ''}
${platform.engagement ? `- **التفاعلات**: ${platform.engagement.toLocaleString('ar-SA')}` : ''}

**المؤشرات المحسوبة:**
${kpis.CPA !== null ? `- تكلفة التحويل (CPA): ${kpis.CPA.toFixed(2)} ريال` : ''}
${kpis.ROAS !== null ? `- عائد الإنفاق (ROAS): ${kpis.ROAS.toFixed(2)}x` : ''}
${kpis.CTR !== null ? `- نسبة النقر (CTR): ${kpis.CTR.toFixed(2)}%` : ''}
${kpis.CPC !== null ? `- تكلفة النقرة (CPC): ${kpis.CPC.toFixed(2)} ريال` : ''}
${kpis.CPM !== null ? `- تكلفة الألف ظهور (CPM): ${kpis.CPM.toFixed(2)} ريال` : ''}
${kpis.CVR !== null ? `- معدل التحويل (CVR): ${kpis.CVR.toFixed(2)}%` : ''}
    `.trim();
  }).join('\n\n');

  return `أنت خبير تحليل أداء الحملات الإعلانية في السوق السعودي والخليجي، تعمل في منصة معيار عوائد - منصة التحليل وصناعة القرار التسويقي.

المطلوب: تحليل أداء الحملات الإعلانية عبر منصات متعددة وتقديم تقييم شامل.
${input.campaignGoal ? `هدف الحملة: ${input.campaignGoal}` : ''}
${input.industryType ? `نوع النشاط: ${input.industryType}` : ''}

## بيانات المنصات:
${platformsSummary}

## التعليمات:
1. **التقييم العام**: قيّم الأداء الكلي للحملات (قوي/متوسط/ضعيف) بناءً على:
   - كفاءة الإنفاق عبر المنصات
   - تحقيق الأهداف المحددة
   - المقارنة بمعايير السوق السعودي

2. **الملاحظات الرئيسية** (3-5 نقاط):
   - حدد أبرز نقاط القوة والضعف
   - قارن الأداء بين المنصات
   - حدد الفرص غير المستغلة
   - استخدم الأرقام والنسب لدعم ملاحظاتك

3. **التوصية**:
   - توصية واحدة واضحة وقابلة للتنفيذ
   - ركز على أعلى تأثير ممكن

4. **لماذا هذا القرار؟**:
   - السبب الرئيسي للتوصية
   - 2-3 أدلة داعمة من البيانات
   - المخاطر في حال عدم التنفيذ

## ملاحظات مهمة:
- استخدم لغة حازمة وواضحة (يوجد/لا يوجد/يُنصح)
- تجنب الكلمات الضعيفة (قد، ربما، يمكن)
- ركز على البيانات المتوفرة فقط
- قارن بمعايير السوق السعودي

أجب بصيغة JSON التالية فقط:
{
  "overallRating": "قوي" | "متوسط" | "ضعيف",
  "observations": ["ملاحظة 1", "ملاحظة 2", ...],
  "recommendation": "التوصية الرئيسية",
  "decisionReasoning": {
    "mainReason": "السبب الرئيسي",
    "evidence": ["دليل 1", "دليل 2", "دليل 3"],
    "risks": "المخاطر في حال عدم التنفيذ"
  },
  "crossPlatformSummary": "ملخص شامل يقارن الأداء عبر المنصات ويحدد أفضلها وأضعفها"
}`;
}

export function registerPerformanceRoutes(app: Express): void {
  app.post("/api/performance/analyze", async (req: Request, res: Response) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: "غير مصرح" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ error: "المستخدم غير موجود" });
      }

      const input = performanceAnalysisSchema.parse(req.body);

      const cacheKey = getCacheKey(input);
      const cachedResult = getCachedResponse(cacheKey);
      if (cachedResult) {
        return res.json({ ...cachedResult, cached: true });
      }

      const platformsWithKPIs = input.platforms.map(platform => ({
        platform,
        kpis: calculateDerivedKPIs(platform),
      }));

      const learningContext = await retrieveSimilarCases({
        tool: "performance_analyzer",
        industryType: input.industryType,
        goal: input.campaignGoal,
      });

      const systemPrompt = `أنت خبير تحليل حملات إعلانية في منصة معيار عوائد، متخصص في السوق السعودي والخليجي.${learningContext ? `\n\nسياق من حالات سابقة:\n${learningContext}` : ''}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: buildAnalysisPrompt(input, platformsWithKPIs) },
        ],
        temperature: 0.7,
        max_tokens: 1500,
        response_format: { type: "json_object" },
      });

      const rawContent = completion.choices[0]?.message?.content || "{}";
      const analysis = JSON.parse(rawContent);

      const result = {
        overallRating: analysis.overallRating || "متوسط",
        observations: analysis.observations || [],
        recommendation: analysis.recommendation || "",
        decisionReasoning: analysis.decisionReasoning || {},
        crossPlatformSummary: analysis.crossPlatformSummary || "",
        platformsWithKPIs: platformsWithKPIs.map(({ platform, kpis }) => ({
          platform: platform.platform,
          label: PLATFORM_LABELS[platform.platform],
          metrics: platform,
          kpis,
        })),
      };

      setCachedResponse(cacheKey, result);

      const savedAnalysis = await storage.createCampaignPerformance({
        platforms: input.platforms.map(p => p.platform),
        platformsData: JSON.stringify(input.platforms),
        overallRating: result.overallRating,
        observations: result.observations,
        recommendation: result.recommendation,
        decisionReasoning: JSON.stringify(result.decisionReasoning),
        crossPlatformSummary: result.crossPlatformSummary,
        derivedKPIs: JSON.stringify(platformsWithKPIs.map(p => p.kpis)),
        createdBy: userId,
      });

      if (isLearningEnabled()) {
        await logLearning(
          {
            tool: "performance_analyzer",
            industryType: input.industryType,
            goal: input.campaignGoal,
            channel: input.platforms.map(p => p.platform).join(','),
            inputsSummary: `منصات: ${input.platforms.length}, إجمالي الإنفاق: ${input.platforms.reduce((sum, p) => sum + p.spend, 0)}`,
          },
          {
            rating: result.overallRating,
            observations: JSON.stringify(result.observations),
            recommendation: result.recommendation,
            decisionReasoning: JSON.stringify(result.decisionReasoning),
          },
          userId
        );
      }

      await storage.logAIRequest("performance_analyzer", userId, `${input.platforms.length} platforms`);

      res.json({ ...result, id: savedAnalysis.id });
    } catch (error: any) {
      console.error("Performance analysis error:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "بيانات غير صالحة", details: error.errors });
      }
      res.status(500).json({ error: "فشل التحليل" });
    }
  });

  app.get("/api/performance/history", async (req: Request, res: Response) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: "غير مصرح" });
      }

      const analyses = await storage.getCampaignPerformancesByUser(userId);
      res.json(analyses);
    } catch (error) {
      console.error("Get performance history error:", error);
      res.status(500).json({ error: "فشل استرجاع السجل" });
    }
  });

  app.get("/api/performance/:id", async (req: Request, res: Response) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: "غير مصرح" });
      }

      const id = parseInt(req.params.id);
      const analysis = await storage.getCampaignPerformanceById(id, userId);
      
      if (!analysis) {
        return res.status(404).json({ error: "التحليل غير موجود" });
      }

      res.json(analysis);
    } catch (error) {
      console.error("Get performance error:", error);
      res.status(500).json({ error: "فشل استرجاع التحليل" });
    }
  });

  app.delete("/api/performance/:id", async (req: Request, res: Response) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: "غير مصرح" });
      }

      const id = parseInt(req.params.id);
      await storage.deleteCampaignPerformance(id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete performance error:", error);
      res.status(500).json({ error: "فشل حذف التحليل" });
    }
  });
}
