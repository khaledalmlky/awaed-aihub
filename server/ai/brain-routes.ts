import { Router } from "express";
import OpenAI from "openai";

const router = Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

router.post("/", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
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
