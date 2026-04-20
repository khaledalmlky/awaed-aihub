import type { Express, Request, Response } from "express";
import OpenAI from "openai";
import { storage } from "../storage";
import { buildPromptWithContext, TOOL_PROMPTS } from "./prompts";
import { logLearning, retrieveSimilarCases, cleanupExpiredLogs, clearAllLogs, isLearningEnabled } from "./learning";
import { z } from "zod";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  // baseURL: uses default OpenAI endpoint
});

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 20;

const responseCache = new Map<string, { result: any; timestamp: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const campaignBrainSchema = z.object({
  activity: z.string(),
  goal: z.string(),
  platform: z.string(),
  budget: z.string().optional(),
  duration: z.string().optional(),
});

const contentStudioSchema = z.object({
  prompt: z.string(),
  tone: z.string().optional(),
  contentType: z.string().optional(),
});

const smartAnalyzerSchema = z.object({
  accountUrl: z.string().min(1, "رابط الحساب مطلوب"),
});

const campaignPlannerSchema = z.object({
  budget: z.string(),
  duration: z.string(),
  objective: z.string(),
  platform: z.string(),
  audience: z.string(),
});

const aiRequestSchema = z.object({
  tool: z.enum(["campaign_brain", "content_studio", "smart_analyzer", "campaign_planner"]),
  inputs: z.record(z.any()),
  userId: z.string().optional(),
  fastMode: z.boolean().optional().default(true),
});

function getCacheKey(tool: string, inputs: Record<string, any>): string {
  const sortedInputs = Object.keys(inputs).sort().reduce((acc, key) => {
    acc[key] = inputs[key];
    return acc;
  }, {} as Record<string, any>);
  return `${tool}:${JSON.stringify(sortedInputs)}`;
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
  if (responseCache.size > 500) {
    const oldestKey = responseCache.keys().next().value;
    if (oldestKey) responseCache.delete(oldestKey);
  }
  responseCache.set(key, { result, timestamp: Date.now() });
}

function detectPlatform(url: string): string {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('instagram.com') || lowerUrl.includes('instagr.am')) return 'Instagram';
  if (lowerUrl.includes('tiktok.com')) return 'TikTok';
  if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) return 'X / Twitter';
  if (lowerUrl.includes('snapchat.com')) return 'Snapchat';
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) return 'YouTube';
  if (lowerUrl.includes('facebook.com') || lowerUrl.includes('fb.com')) return 'Facebook';
  if (lowerUrl.includes('linkedin.com')) return 'LinkedIn';
  return 'غير معروف';
}

async function getRelevantKnowledge(tool: string, inputs: Record<string, any>): Promise<string> {
  try {
    const allKnowledge = await storage.getAllKnowledge();
    const knowledgeContext = allKnowledge.length > 0 
      ? allKnowledge.slice(0, 2)
          .map((item) => `[${item.category}] ${item.title}: ${item.content.substring(0, 150)}`)
          .join("\n")
      : "";
    
    const learningContext = await retrieveSimilarCases({
      tool,
      industryType: inputs.activity || inputs.industryType,
      goal: inputs.goal || inputs.objective,
      channel: inputs.platform || inputs.channel,
    });
    
    return [knowledgeContext, learningContext].filter(Boolean).join("\n");
  } catch (error) {
    console.error("Error fetching knowledge:", error);
    return "";
  }
}

function extractLearningResult(tool: string, result: any): { rating?: string; observations?: string; recommendation?: string; decisionReasoning?: string; confidence?: string } {
  try {
    if (tool === "content_studio") {
      return { recommendation: result?.content?.substring(0, 500) };
    }
    
    if (tool === "smart_analyzer" || tool === "business_analyzer") {
      return {
        rating: result?.rating || result?.overallScore,
        observations: JSON.stringify(result?.observations || result?.priorities || []),
        recommendation: result?.recommendation,
        decisionReasoning: result?.decisionReasoning,
        confidence: result?.confidence,
      };
    }
    
    if (tool === "campaign_brain") {
      const ideas = Array.isArray(result) ? result : [];
      return {
        observations: JSON.stringify(ideas.slice(0, 2).map((i: any) => i?.title || "")),
        recommendation: ideas[0]?.description?.substring(0, 300),
      };
    }
    
    return {};
  } catch {
    return {};
  }
}

function buildUserMessage(tool: string, inputs: Record<string, any>): string {
  switch (tool) {
    case "campaign_brain":
      return `أفكار حملات لـ: ${inputs.activity || "غير محدد"}
الهدف: ${inputs.goal || "غير محدد"}
المنصة: ${inputs.platform || "غير محدد"}
الميزانية: ${inputs.budget || "غير محدد"} ريال
المدة: ${inputs.duration || "غير محدد"} يوم`;

    case "content_studio":
      return `محتوى تسويقي عن: ${inputs.prompt}
النبرة: ${inputs.tone || "احترافي"}
النوع: ${inputs.contentType || "منشور"}`;

    case "smart_analyzer":
      const platform = detectPlatform(inputs.accountUrl);
      return `تحليل تقديري للحساب: ${inputs.accountUrl}
المنصة: ${platform}
تذكر: تحليل تقديري، بدون أرقام دقيقة`;

    case "campaign_planner":
      return `خطة حملة:
الميزانية: ${inputs.budget} ريال
المدة: ${inputs.duration} يوم
الهدف: ${inputs.objective}
المنصة: ${inputs.platform}
الجمهور: ${inputs.audience}`;

    default:
      return JSON.stringify(inputs);
  }
}

export function registerAIRoutes(app: Express): void {
  app.post("/api/ai", async (req: Request, res: Response) => {
    const startTime = Date.now();
    let success = true;
    let tool = "unknown";

    try {
      const parsed = aiRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          error: "بيانات غير صحيحة",
          details: parsed.error.errors 
        });
      }

      const { tool: requestedTool, inputs, userId, fastMode } = parsed.data;
      tool = requestedTool;

      if (userId) {
        const requestCount = await storage.countAIRequestsInWindow(userId, RATE_LIMIT_WINDOW_MS);
        if (requestCount >= MAX_REQUESTS_PER_WINDOW) {
          return res.status(429).json({ 
            error: "تم تجاوز الحد الأقصى للطلبات. يرجى الانتظار دقيقة." 
          });
        }
      }

      let validatedInputs: Record<string, any>;
      switch (tool) {
        case "campaign_brain":
          const cbParsed = campaignBrainSchema.safeParse(inputs);
          if (!cbParsed.success) {
            return res.status(400).json({ error: "بيانات الحملة غير صحيحة" });
          }
          validatedInputs = cbParsed.data;
          break;
        case "content_studio":
          const csParsed = contentStudioSchema.safeParse(inputs);
          if (!csParsed.success) {
            return res.status(400).json({ error: "بيانات المحتوى غير صحيحة" });
          }
          validatedInputs = csParsed.data;
          break;
        case "smart_analyzer":
          const saParsed = smartAnalyzerSchema.safeParse(inputs);
          if (!saParsed.success) {
            return res.status(400).json({ error: "رابط الحساب مطلوب" });
          }
          validatedInputs = saParsed.data;
          break;
        case "campaign_planner":
          const cpParsed = campaignPlannerSchema.safeParse(inputs);
          if (!cpParsed.success) {
            return res.status(400).json({ error: "بيانات التخطيط غير صحيحة" });
          }
          validatedInputs = cpParsed.data;
          break;
        default:
          return res.status(400).json({ error: "أداة غير معروفة" });
      }

      const cacheKey = getCacheKey(tool, validatedInputs);
      const cachedResult = getCachedResponse(cacheKey);
      if (cachedResult) {
        console.log(`[AI Cache Hit] Tool: ${tool}`);
        return res.json({ 
          success: true, 
          result: cachedResult,
          tool,
          duration: Date.now() - startTime,
          cached: true
        });
      }

      const knowledgeContext = await getRelevantKnowledge(tool, validatedInputs);
      const systemPrompt = buildPromptWithContext(tool as keyof typeof TOOL_PROMPTS, knowledgeContext);
      const userMessage = buildUserMessage(tool, validatedInputs);

      console.log(`[AI Request] Tool: ${tool}, User: ${userId || "anonymous"}`);

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        max_tokens: 1000,
        temperature: 0,
        seed: 42,
      });

      const responseContent = completion.choices[0]?.message?.content || "";

      let result: any;
      if (tool === "content_studio") {
        result = { content: responseContent };
      } else {
        try {
          const jsonMatch = responseContent.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
          if (jsonMatch) {
            result = JSON.parse(jsonMatch[0]);
          } else {
            result = { raw: responseContent };
          }
        } catch (parseError) {
          result = { raw: responseContent };
        }
      }

      setCachedResponse(cacheKey, result);

      // Auto-log to invisible learning layer
      try {
        const learningResult = extractLearningResult(tool, result);
        await logLearning(
          {
            tool,
            industryType: validatedInputs.activity || validatedInputs.industryType,
            goal: validatedInputs.goal || validatedInputs.objective,
            channel: validatedInputs.platform || validatedInputs.channel,
            inputsSummary: userMessage.substring(0, 300),
            analysisMode: "full",
          },
          learningResult,
          userId
        );
      } catch (learningError) {
        console.error("[Learning] Auto-log error:", learningError);
      }

      const duration = Date.now() - startTime;
      console.log(`[AI Response] Tool: ${tool}, Duration: ${duration}ms`);

      res.json({ 
        success: true, 
        result,
        tool,
        duration
      });

    } catch (error: any) {
      success = false;
      console.error("[AI Error]", error);
      
      if (error.status === 429) {
        return res.status(429).json({ 
          error: "خدمة الذكاء الاصطناعي مشغولة حالياً. يرجى المحاولة لاحقاً." 
        });
      }

      res.status(500).json({ 
        error: "حدث خطأ أثناء معالجة طلبك. يرجى المحاولة مرة أخرى." 
      });
    } finally {
      try {
        await storage.logAIRequest(
          tool,
          req.body?.userId,
          JSON.stringify(req.body?.inputs || {}).substring(0, 200),
          success
        );
      } catch (logError) {
        console.error("Error logging AI request:", logError);
      }
    }
  });
}
