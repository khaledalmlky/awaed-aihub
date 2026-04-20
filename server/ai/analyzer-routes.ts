import type { Express, Request, Response } from "express";
import OpenAI from "openai";
import { storage } from "../storage";
import { logLearning } from "./learning";
import { z } from "zod";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  // baseURL: uses default OpenAI endpoint
});

const analyzeRequestSchema = z.object({
  url: z.string().url("يرجى إدخال رابط صحيح"),
});

const guidedAnalyzeSchema = z.object({
  inputs: z.object({
    businessType: z.string().min(1, "نوع النشاط مطلوب"),
    goal: z.string().min(1, "الهدف مطلوب"),
    platform: z.string().min(1, "المنصة مطلوبة"),
    audience: z.string().min(1, "الفئة المستهدفة مطلوبة"),
    budget: z.string().optional(),
  }),
  analysisType: z.string().optional(),
});

// Scoring Rubric - Weights for weighted average calculation
const SCORING_WEIGHTS = {
  userExperience: 0.25,    // UX 25%
  trustSignals: 0.20,      // Trust 20%
  performance: 0.20,       // Performance 20%
  seo: 0.15,               // SEO 15%
  socialPresence: 0.20,    // Social 20%
};

const ANALYZER_PROMPT = `أنت محلل تسويقي ذكي متخصص في تقييم المواقع والمتاجر الإلكترونية للسوق السعودي والخليجي.

═══════════════════════════════════════════════════════════════
قواعد اللغة الموحدة (Tone Lock) - التحليل الكامل
═══════════════════════════════════════════════════════════════
1. نبرة تنفيذية، حاسمة، واقعية
2. ممنوع "قد، ربما، يمكن" في القرارات والتوصيات
3. النتائج والقرارات تبدأ بفعل: يوجد / لا يوجد / يُنصح / لا يُنصح
4. جمل قصيرة - لا فقرات طويلة
5. كل نص يؤدي لقرار أو إجراء

═══════════════════════════════════════════════════════════════
المصطلحات الموحدة
═══════════════════════════════════════════════════════════════
- جاهزية الإعلان (لا تقل: استعداد للإعلان)
- التقييم العام (لا تقل: الدرجة الكلية)
- القناة المقترحة (لا تقل: المنصة الموصى بها)
- نطاق الميزانية (لا تقل: مدى الميزانية)
- الإجراء المطلوب (لا تقل: الخطوة التالية)

═══════════════════════════════════════════════════════════════
نظام التقييم (Scoring Rubric)
═══════════════════════════════════════════════════════════════
قيّم كل محور من 0-100 بناءً على الـ Checklist التالي:

1. تجربة المستخدم (UX) - وزن 25%:
   ✓ تصميم واضح ومنظم (0-25)
   ✓ سهولة التنقل والقوائم (0-25)
   ✓ وضوح الـ CTA وزر الشراء/التواصل (0-25)
   ✓ توافق مع الجوال (0-25)

2. إشارات الثقة (Trust) - وزن 20%:
   ✓ شهادات SSL وأمان الموقع (0-25)
   ✓ معلومات التواصل واضحة (0-25)
   ✓ سياسات الاسترجاع والضمان (0-25)
   ✓ تقييمات وآراء العملاء (0-25)

3. الأداء والسرعة (Performance) - وزن 20%:
   ✓ سرعة التحميل (0-35)
   ✓ استجابة الموقع (0-35)
   ✓ خلو من الأخطاء التقنية (0-30)

4. تحسين محركات البحث (SEO) - وزن 15%:
   ✓ عناوين وأوصاف واضحة (0-35)
   ✓ هيكل URL منظم (0-35)
   ✓ محتوى ذو قيمة (0-30)

5. التواجد الاجتماعي (Social) - وزن 20%:
   ✓ روابط التواصل الاجتماعي (0-35)
   ✓ نشاط ومحتوى حديث (0-35)
   ✓ تكامل مع المنصات (0-30)

═══════════════════════════════════════════════════════════════
مستوى الثقة (Confidence Level)
═══════════════════════════════════════════════════════════════
حدد مستوى ثقتك في التقييم:
- "عالية": كل البيانات متوفرة ويمكن التحقق منها
- "متوسطة": بعض البيانات ناقصة لكن يمكن التقدير
- "منخفضة": بيانات محدودة جداً، التقييم تقريبي

قدم تحليلك بصيغة JSON التالية بالضبط:
{
  "businessName": "اسم النشاط التجاري",
  "businessType": "نوع النشاط (متجر إلكتروني / موقع خدمات / تطبيق / إلخ)",
  "rating": "ضعيف/متوسط/قوي",
  "ratingReason": "سبب التقييم في جملتين مختصرتين",
  "observations": ["ملاحظة رئيسية 1", "ملاحظة 2", "ملاحظة 3", "ملاحظة 4"],
  "recommendation": {
    "type": "مناسب للإعلان / غير مناسب للإعلان / يحتاج تحسينات أولاً",
    "text": "نص التوصية التفصيلي"
  },
  "scores": {
    "userExperience": {
      "score": رقم 0-100,
      "checklist": {"design": رقم, "navigation": رقم, "cta": رقم, "mobile": رقم},
      "positives": ["نقطة إيجابية 1", "نقطة 2", "نقطة 3"],
      "negatives": ["نقطة سلبية 1", "نقطة 2", "نقطة 3"],
      "reason": "سبب الدرجة في جملة واحدة"
    },
    "trustSignals": {
      "score": رقم 0-100,
      "checklist": {"ssl": رقم, "contact": رقم, "policies": رقم, "reviews": رقم},
      "positives": ["..."],
      "negatives": ["..."],
      "reason": "سبب الدرجة"
    },
    "performance": {
      "score": رقم 0-100,
      "checklist": {"speed": رقم, "responsiveness": رقم, "errors": رقم},
      "positives": ["..."],
      "negatives": ["..."],
      "reason": "سبب الدرجة"
    },
    "seo": {
      "score": رقم 0-100,
      "checklist": {"titles": رقم, "urls": رقم, "content": رقم},
      "positives": ["..."],
      "negatives": ["..."],
      "reason": "سبب الدرجة"
    },
    "socialPresence": {
      "score": رقم 0-100,
      "checklist": {"links": رقم, "activity": رقم, "integration": رقم},
      "positives": ["..."],
      "negatives": ["..."],
      "reason": "سبب الدرجة"
    }
  },
  "confidence": "عالية/متوسطة/منخفضة",
  "confidenceReason": "سبب مستوى الثقة",
  "criticalIssues": ["مشكلة حرجة 1", "مشكلة حرجة 2"],
  "priorities": [
    {"priority": 1, "action": "إجراء التحسين", "impact": "عالي/متوسط/منخفض"}
  ],
  "decision": {
    "shouldAdvertise": true/false,
    "reasoning": "سبب القرار بشكل مختصر",
    "recommendedChannel": "القناة المقترحة",
    "budgetRange": {"min": رقم, "max": رقم, "currency": "SAR", "period": "شهرياً"},
    "expectedROAS": "نطاق العائد المتوقع"
  },
  "decisionReasoning": {
    "mainReason": "السبب الرئيسي للقرار",
    "evidence": ["دليل 1", "دليل 2", "دليل 3"],
    "risks": "المخاطر المحتملة"
  },
  "summary": "ملخص تنفيذي في 2-3 جمل"
}

كن واقعياً ودقيقاً. قيّم كل محور بناءً على الـ Checklist المحددة.
إذا لم تتوفر معلومات كافية، خفّض مستوى الثقة ولا ترفع الدرجات بشكل مصطنع.`;

// Calculate weighted score from AI scores
function calculateWeightedScore(scores: any): { overallScore: number; breakdown: Record<string, number> } {
  const breakdown: Record<string, number> = {};
  let totalWeight = 0;
  let weightedSum = 0;

  for (const [key, weight] of Object.entries(SCORING_WEIGHTS)) {
    const score = scores[key]?.score || 0;
    breakdown[key] = score;
    weightedSum += score * (weight as number);
    totalWeight += weight as number;
  }

  const overallScore = Math.round(weightedSum / totalWeight);
  return { overallScore, breakdown };
}

// Normalize URL for caching
function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace('www.', '').toLowerCase();
  } catch {
    return url.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
  }
}

export function registerAnalyzerRoutes(app: Express): void {
  // Check for existing analysis (cached)
  app.get("/api/analyze/cached", async (req: Request, res: Response) => {
    const url = req.query.url as string;
    const userId = req.session?.userId;
    
    if (!url || !userId) {
      return res.json({ cached: false });
    }

    try {
      const normalizedUrl = normalizeUrl(url);
      const existingAnalysis = await storage.getLatestAnalysisByUrl(normalizedUrl, userId);
      
      if (existingAnalysis) {
        let fullAnalysis = null;
        try {
          fullAnalysis = existingAnalysis.fullAnalysis ? JSON.parse(existingAnalysis.fullAnalysis) : null;
        } catch (e) {
          fullAnalysis = null;
        }

        return res.json({
          cached: true,
          analysis: {
            id: existingAnalysis.id,
            url: existingAnalysis.url,
            businessName: existingAnalysis.businessName,
            businessType: existingAnalysis.businessType,
            overallScore: parseInt(existingAnalysis.overallScore || '0'),
            createdAt: existingAnalysis.createdAt,
            confidence: fullAnalysis?.confidence || 'متوسطة',
            ...fullAnalysis,
          },
        });
      }

      res.json({ cached: false });
    } catch (error) {
      console.error("[Analyzer Cache Error]", error);
      res.json({ cached: false });
    }
  });

  app.post("/api/analyze", async (req: Request, res: Response) => {
    const startTime = Date.now();
    const forceReanalyze = req.body.forceReanalyze === true;

    try {
      const parsed = analyzeRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: "يرجى إدخال رابط صحيح",
          details: parsed.error.errors,
        });
      }

      const { url } = parsed.data;
      const userId = req.session?.userId || null;
      const normalizedUrl = normalizeUrl(url);

      // Check cache first (unless force reanalyze)
      if (!forceReanalyze && userId) {
        const existingAnalysis = await storage.getLatestAnalysisByUrl(normalizedUrl, userId);
        if (existingAnalysis) {
          let fullAnalysis = null;
          try {
            fullAnalysis = existingAnalysis.fullAnalysis ? JSON.parse(existingAnalysis.fullAnalysis) : null;
          } catch (e) {
            fullAnalysis = null;
          }

          console.log(`[Analyzer] Returning cached analysis for: ${url}`);
          return res.json({
            success: true,
            cached: true,
            analysis: {
              id: existingAnalysis.id,
              ...fullAnalysis,
              overallScore: parseInt(existingAnalysis.overallScore || '0'),
            },
            duration: 0,
          });
        }
      }

      console.log(`[Analyzer] Starting fresh analysis for: ${url}`);

      // Use low temperature for deterministic results
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: ANALYZER_PROMPT },
          {
            role: "user",
            content: `حلل هذا الموقع/المتجر: ${url}

قدم تحليلاً شاملاً يتضمن:
1. فهم نموذج العمل
2. تقييم جاهزية الإعلان
3. تحليل تجربة المستخدم والتحويل
4. تقييم السرعة والأداء
5. تحليل الحضور في وسائل التواصل
6. قرار: هل يجب الإعلان الآن؟`,
          },
        ],
        max_tokens: 4000,
        temperature: 0.1,  // Low temperature for deterministic results
        top_p: 0.9,        // Fixed top_p
      });

      const responseContent = completion.choices[0]?.message?.content || "";

      let analysis: any;
      try {
        const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysis = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("No JSON found");
        }
      } catch (parseError) {
        analysis = { raw: responseContent, parseError: true };
      }

      // Calculate weighted score mathematically
      const { overallScore, breakdown } = calculateWeightedScore(analysis.scores || {});
      analysis.overallScore = overallScore;
      analysis.scoreBreakdown = breakdown;
      analysis.scoringMethod = 'weighted_average';
      analysis.weights = SCORING_WEIGHTS;

      const savedAnalysis = await storage.createBusinessAnalysis({
        url,
        urlNormalized: normalizedUrl,
        businessName: analysis.businessName || null,
        businessType: analysis.businessType || null,
        overallScore: String(overallScore),
        businessModelScore: String(analysis.scores?.trustSignals?.score || 0),
        adReadinessScore: String(analysis.scores?.performance?.score || 0),
        uxScore: String(analysis.scores?.userExperience?.score || 0),
        speedScore: String(analysis.scores?.performance?.score || 0),
        socialPresenceScore: String(analysis.scores?.socialPresence?.score || 0),
        confidence: analysis.confidence || 'متوسطة',
        confidenceReason: analysis.confidenceReason || null,
        criticalIssues: analysis.criticalIssues || [],
        priorities: analysis.priorities?.map((p: any) => `${p.priority}. ${p.action} (${p.impact})`) || [],
        shouldAdvertise: String(analysis.decision?.shouldAdvertise || false),
        recommendedChannel: analysis.decision?.recommendedChannel || null,
        budgetRange: analysis.decision?.budgetRange
          ? `${analysis.decision.budgetRange.min}-${analysis.decision.budgetRange.max} ${analysis.decision.budgetRange.currency}`
          : null,
        decisionReasoning: analysis.decision?.reasoning || null,
        fullAnalysis: JSON.stringify(analysis),
        createdBy: userId || null,
      });

      // Auto-log to invisible learning layer
      try {
        await logLearning(
          {
            tool: 'business_analyzer',
            industryType: analysis.businessType,
            goal: undefined,
            channel: analysis.decision?.recommendedChannel,
            inputsSummary: `URL: ${url}`,
            analysisMode: 'full',
          },
          {
            rating: analysis.rating,
            observations: JSON.stringify(analysis.observations || []),
            recommendation: analysis.recommendation?.text,
            decisionReasoning: analysis.decisionReasoning?.mainReason,
            confidence: analysis.confidence,
          },
          userId || undefined
        );
      } catch (learningError) {
        console.error('[Learning] Auto-log error:', learningError);
      }

      const duration = Date.now() - startTime;
      console.log(`[Analyzer] Completed in ${duration}ms for: ${url} (Score: ${overallScore})`);

      res.json({
        success: true,
        cached: false,
        analysis: {
          id: savedAnalysis.id,
          ...analysis,
        },
        duration,
      });
    } catch (error: any) {
      console.error("[Analyzer Error]", error);

      if (error.status === 429) {
        return res.status(429).json({
          error: "الخدمة مشغولة حالياً. يرجى المحاولة بعد قليل.",
        });
      }

      res.status(500).json({
        error: "حدث خطأ أثناء التحليل. يرجى المحاولة مرة أخرى.",
      });
    }
  });

  // Guided Analysis (without URL)
  app.post("/api/analyze-guided", async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
      const parsed = guidedAnalyzeSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: "يرجى تعبئة جميع الحقول المطلوبة",
          details: parsed.error.errors,
        });
      }

      const { inputs } = parsed.data;
      const userId = req.session?.userId || null;

      const businessTypeLabels: Record<string, string> = {
        ecommerce: 'متجر إلكتروني',
        services: 'خدمات',
        restaurant: 'مطعم / كافيه',
        education: 'تعليم / تدريب',
        health: 'صحة / جمال',
        realestate: 'عقارات',
        technology: 'تقنية',
        other: 'آخر',
      };

      const goalLabels: Record<string, string> = {
        sales: 'زيادة المبيعات',
        awareness: 'زيادة الوعي بالعلامة',
        leads: 'جمع بيانات العملاء',
        engagement: 'زيادة التفاعل',
        traffic: 'زيادة زيارات الموقع',
      };

      const platformLabels: Record<string, string> = {
        instagram: 'انستقرام',
        snapchat: 'سناب شات',
        tiktok: 'تيك توك',
        twitter: 'تويتر / X',
        google: 'قوقل',
      };

      const audienceLabels: Record<string, string> = {
        youth: 'شباب (18-25)',
        adults: 'بالغين (25-40)',
        mature: 'كبار (40+)',
        families: 'عائلات',
        business: 'أصحاب أعمال',
      };

      const GUIDED_PROMPT = `أنت مستشار تسويقي ذكي متخصص في السوق السعودي والخليجي.

═══════════════════════════════════════════════════════════════
قواعد اللغة الموحدة
═══════════════════════════════════════════════════════════════
1. نبرة تنفيذية، حاسمة، واقعية
2. ممنوع "قد، ربما، يمكن" في القرارات
3. جمل قصيرة وواضحة

═══════════════════════════════════════════════════════════════
⚠️ تنبيه مهم
═══════════════════════════════════════════════════════════════
هذا تحليل إرشادي مبني على معطيات مدخلة، وليس تحليلاً كاملاً للموقع.
الثقة في النتائج: متوسطة (بناءً على المعطيات فقط)

أجب بصيغة JSON:
{
  "businessName": "نشاط ${businessTypeLabels[inputs.businessType] || inputs.businessType}",
  "businessType": "${businessTypeLabels[inputs.businessType] || inputs.businessType}",
  "rating": "ضعيف/متوسط/قوي",
  "ratingReason": "سبب التقييم بناءً على المعطيات",
  "observations": ["ملاحظة 1", "ملاحظة 2", "ملاحظة 3"],
  "recommendation": {
    "type": "توصية إرشادية",
    "text": "نص التوصية"
  },
  "confidence": "متوسطة",
  "confidenceReason": "التقييم مبني على معطيات مدخلة وليس تحليل فعلي",
  "decision": {
    "shouldAdvertise": true/false,
    "reasoning": "سبب القرار",
    "recommendedChannel": "القناة المقترحة",
    "budgetRange": {"min": رقم, "max": رقم, "currency": "SAR", "period": "شهرياً"}
  },
  "decisionReasoning": {
    "mainReason": "السبب الرئيسي",
    "evidence": ["دليل 1", "دليل 2"],
    "risks": "المخاطر المحتملة"
  }
}`;

      console.log(`[Guided Analyzer] Starting analysis for: ${inputs.businessType}`);

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: GUIDED_PROMPT },
          {
            role: "user",
            content: `قدم توصيات إرشادية لنشاط تجاري بناءً على المعطيات التالية:

نوع النشاط: ${businessTypeLabels[inputs.businessType] || inputs.businessType}
الهدف التسويقي: ${goalLabels[inputs.goal] || inputs.goal}
المنصة المستهدفة: ${platformLabels[inputs.platform] || inputs.platform}
الفئة المستهدفة: ${audienceLabels[inputs.audience] || inputs.audience}
${inputs.budget ? `الميزانية الشهرية: ${inputs.budget}` : 'الميزانية: غير محددة'}

قدم توصيات إرشادية مع التأكيد على أن هذا ليس تحليلاً كاملاً.`,
          },
        ],
        max_tokens: 2000,
        temperature: 0.1,
      });

      const responseContent = completion.choices[0]?.message?.content || "";

      let analysis: any;
      try {
        const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysis = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("No JSON found");
        }
      } catch (parseError) {
        analysis = { raw: responseContent, parseError: true };
      }

      analysis.analysisType = 'guided';
      analysis.confidence = 'متوسطة';
      analysis.confidenceReason = 'التقييم مبني على معطيات مدخلة وليس تحليل فعلي للموقع';

      // Auto-log to invisible learning layer
      try {
        await logLearning(
          {
            tool: 'business_analyzer',
            industryType: inputs.businessType,
            goal: inputs.goal,
            channel: inputs.platform,
            inputsSummary: `Guided: ${inputs.businessType} - ${inputs.goal}`,
            analysisMode: 'guided',
          },
          {
            rating: analysis.rating,
            observations: JSON.stringify(analysis.observations || []),
            recommendation: analysis.recommendation?.text,
            decisionReasoning: analysis.decisionReasoning?.mainReason,
            confidence: 'متوسطة',
          },
          userId || undefined
        );
      } catch (learningError) {
        console.error('[Learning] Auto-log error:', learningError);
      }

      const duration = Date.now() - startTime;
      console.log(`[Guided Analyzer] Completed in ${duration}ms`);

      res.json({
        success: true,
        analysis: {
          id: 0,
          ...analysis,
        },
        duration,
      });
    } catch (error: any) {
      console.error("[Guided Analyzer Error]", error);

      if (error.status === 429) {
        return res.status(429).json({
          error: "الخدمة مشغولة حالياً. يرجى المحاولة بعد قليل.",
        });
      }

      res.status(500).json({
        error: "حدث خطأ أثناء التحليل. يرجى المحاولة مرة أخرى.",
      });
    }
  });

  app.get("/api/analyses", async (req: Request, res: Response) => {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: "يجب تسجيل الدخول" });
    }

    try {
      const dedupe = req.query.dedupe === 'true';
      
      let analyses;
      if (dedupe) {
        analyses = await storage.getLatestAnalysesPerUrl(userId);
      } else {
        analyses = await storage.getBusinessAnalysesByUser(userId);
      }
      
      res.json(analyses);
    } catch (error) {
      console.error("Error fetching analyses:", error);
      res.status(500).json({ error: "فشل في جلب التحليلات" });
    }
  });

  app.get("/api/analyses/:id", async (req: Request, res: Response) => {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: "يجب تسجيل الدخول" });
    }

    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "معرف غير صالح" });
      }

      const analysis = await storage.getBusinessAnalysisByIdAndUser(id, userId);
      if (!analysis) {
        return res.status(404).json({ error: "التحليل غير موجود أو لا يمكنك الوصول إليه" });
      }

      let fullAnalysis = null;
      try {
        fullAnalysis = analysis.fullAnalysis ? JSON.parse(analysis.fullAnalysis) : null;
      } catch (e) {
        fullAnalysis = null;
      }

      res.json({
        ...analysis,
        parsedAnalysis: fullAnalysis,
      });
    } catch (error) {
      console.error("Error fetching analysis:", error);
      res.status(500).json({ error: "فشل في جلب التحليل" });
    }
  });

  app.delete("/api/analyses/:id", async (req: Request, res: Response) => {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: "يجب تسجيل الدخول" });
    }

    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "معرف غير صالح" });
      }

      const analysis = await storage.getBusinessAnalysisByIdAndUser(id, userId);
      if (!analysis) {
        return res.status(404).json({ error: "التحليل غير موجود أو لا يمكنك حذفه" });
      }

      await storage.deleteBusinessAnalysis(id, userId);
      res.json({ success: true, message: "تم حذف التحليل بنجاح" });
    } catch (error) {
      console.error("Error deleting analysis:", error);
      res.status(500).json({ error: "فشل في حذف التحليل" });
    }
  });
}
