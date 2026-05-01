import { Router } from "express";
import OpenAI from "openai";
import { getClientContext, processWithBrain } from "./brain";

const router = Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function requireUserId(req: any, res: any): string | null {
  const userId = req.session?.userId || req.body?.userId;
  if (!userId) {
    res.status(401).json({ error: "يجب تسجيل الدخول لاستخدام هذه الأداة." });
    return null;
  }
  return userId;
}

router.get("/context/:analysisId", async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const analysisId = Number(req.params.analysisId);
  if (!Number.isFinite(analysisId)) {
    return res.status(400).json({ error: "معرف التحليل غير صالح" });
  }

  const context = await getClientContext(analysisId, userId);
  if (!context) {
    return res.status(404).json({ error: "التحليل غير موجود أو لا يمكنك الوصول إليه" });
  }

  res.json({ context });
});

router.post("/campaign", async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const response = await processWithBrain({
    tool: "campaign_brain",
    analysisId: req.body?.analysisId,
    inputs: req.body?.inputs || {},
    userId,
  });

  res.status(response.success ? 200 : 400).json(response);
});

router.post("/campaign-guided", async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const response = await processWithBrain({
    tool: "campaign_brain_guided",
    inputs: req.body?.inputs || {},
    userId,
  });

  res.status(response.success ? 200 : 400).json(response);
});

router.post("/content", async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const response = await processWithBrain({
    tool: "content_studio",
    analysisId: req.body?.analysisId,
    inputs: req.body?.inputs || {},
    userId,
  });

  res.status(response.success ? 200 : 400).json(response);
});

router.post("/content-guided", async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const response = await processWithBrain({
    tool: "content_studio_guided",
    inputs: req.body?.inputs || {},
    userId,
  });

  res.status(response.success ? 200 : 400).json(response);
});

router.post("/planner", async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const response = await processWithBrain({
    tool: req.body?.analysisId ? "campaign_planner" : "campaign_planner_guided",
    analysisId: req.body?.analysisId,
    inputs: req.body?.inputs || {},
    userId,
  });

  res.status(response.success ? 200 : 400).json(response);
});

router.post("/", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `
أنت مستشار تسويق رقمي بخبرة 15 سنة في السوق السعودي.
تحلل المشاريع بواقعية.
تعطي خطة تنفيذ واضحة.
تحدد KPIs.
تذكر المخاطر.
لا تعطي نصائح عامة.
لا تنظّر.
`
        },
        {
          role: "user",
          content: message
        }
      ],
      temperature: 0.7
    });

    res.json({
      reply: completion.choices[0].message.content
    });

  } catch (error) {
    console.error("Brain error:", error);
    res.status(500).json({ error: "AI failed" });
  }
});

export default router;
