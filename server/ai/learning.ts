import { storage } from "../storage";
import type { InsertLearningLog, LearningLog } from "@shared/schema";

const LEARNING_ENABLED = process.env.LEARNING_ENABLED !== "false";

export interface LearningContext {
  tool: string;
  industryType?: string;
  goal?: string;
  channel?: string;
  inputsSummary?: string;
  analysisMode?: string;
}

export interface LearningResult {
  rating?: string;
  observations?: string;
  recommendation?: string;
  decisionReasoning?: string;
  confidence?: string;
}

function sanitizeInput(input: string | undefined, maxLength: number = 200): string | undefined {
  if (!input) return undefined;
  const sanitized = input
    .replace(/password|api[_-]?key|secret|token|auth/gi, "[REDACTED]")
    .replace(/\b[\w.-]+@[\w.-]+\.\w+\b/g, "[EMAIL]")
    .replace(/\b\d{10,}\b/g, "[ID]")
    .trim();
  return sanitized.substring(0, maxLength);
}

export async function logLearning(
  context: LearningContext,
  result: LearningResult,
  userId?: string
): Promise<void> {
  if (!LEARNING_ENABLED) {
    return;
  }

  try {
    const log: InsertLearningLog = {
      tool: context.tool,
      industryType: sanitizeInput(context.industryType),
      goal: sanitizeInput(context.goal),
      channel: sanitizeInput(context.channel),
      inputsSummary: sanitizeInput(context.inputsSummary, 300),
      rating: result.rating,
      observations: result.observations,
      recommendation: sanitizeInput(result.recommendation, 500),
      decisionReasoning: sanitizeInput(result.decisionReasoning, 500),
      analysisMode: context.analysisMode,
      confidence: result.confidence,
      createdBy: userId,
    };

    await storage.createLearningLog(log);
  } catch (error) {
    console.error("[Learning] Error logging:", error);
  }
}

export async function retrieveSimilarCases(context: LearningContext): Promise<string> {
  if (!LEARNING_ENABLED) {
    return "";
  }

  try {
    const similarLogs = await storage.getSimilarLearningLogs({
      tool: context.tool,
      industryType: context.industryType,
      goal: context.goal,
      channel: context.channel,
      limit: 3,
    });

    if (similarLogs.length === 0) {
      return "";
    }

    const casesSummary = similarLogs
      .map((log, index) => {
        const parts: string[] = [];
        if (log.industryType) parts.push(`النشاط: ${log.industryType}`);
        if (log.goal) parts.push(`الهدف: ${log.goal}`);
        if (log.channel) parts.push(`القناة: ${log.channel}`);
        if (log.rating) parts.push(`التقييم: ${log.rating}`);
        if (log.recommendation) parts.push(`التوصية: ${log.recommendation.substring(0, 100)}`);
        return `[حالة ${index + 1}] ${parts.join(" | ")}`;
      })
      .join("\n");

    return `
---
سجلات سابقة مشابهة (للاتساق فقط - لا تذكرها للمستخدم):
${casesSummary}
---`;
  } catch (error) {
    console.error("[Learning] Error retrieving:", error);
    return "";
  }
}

export async function cleanupExpiredLogs(): Promise<number> {
  try {
    return await storage.clearExpiredLearningLogs();
  } catch (error) {
    console.error("[Learning] Error cleaning up:", error);
    return 0;
  }
}

export async function clearAllLogs(): Promise<number> {
  try {
    return await storage.clearAllLearningLogs();
  } catch (error) {
    console.error("[Learning] Error clearing:", error);
    return 0;
  }
}

export function isLearningEnabled(): boolean {
  return LEARNING_ENABLED;
}
