import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("team"),
  status: text("status").notNull().default("active"),
  allowedTools: text("allowed_tools").array().notNull().default(sql`'{}'::text[]`),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: text("created_by"),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  lastLoginAt: true,
  createdAt: true,
});

export const createUserSchema = z.object({
  email: z.string().email("البريد الإلكتروني غير صالح"),
  username: z.string().min(3, "اسم المستخدم يجب أن يكون 3 أحرف على الأقل"),
  password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
  name: z.string().min(2, "الاسم يجب أن يكون حرفين على الأقل"),
  role: z.enum(["admin", "team"]).default("team"),
  allowedTools: z.array(z.string()).default([]),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type CreateUser = z.infer<typeof createUserSchema>;
export type User = typeof users.$inferSelect;
export type UserRole = "admin" | "team";
export type UserStatus = "active" | "inactive";

export const ALL_TOOLS = [
  "business_analyzer",
  "smart_analyzer", 
  "campaign_brain",
  "content_studio",
  "campaign_planner",
  "performance_analyzer",
] as const;

export type ToolId = typeof ALL_TOOLS[number];

export const TOOL_LABELS: Record<ToolId, string> = {
  business_analyzer: "محلل الأعمال",
  smart_analyzer: "محلل القنوات",
  campaign_brain: "ملهم الحملات",
  content_studio: "استوديو المحتوى",
  campaign_planner: "مخطط الحملات",
  performance_analyzer: "محلل أداء الحملات",
};

export const knowledgeBase = pgTable("knowledge_base", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  content: text("content").notNull(),
  tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: text("created_by").notNull(),
});

export const insertKnowledgeSchema = createInsertSchema(knowledgeBase).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertKnowledge = z.infer<typeof insertKnowledgeSchema>;
export type Knowledge = typeof knowledgeBase.$inferSelect;

export const aiRequestLogs = pgTable("ai_request_logs", {
  id: serial("id").primaryKey(),
  tool: text("tool").notNull(),
  userId: text("user_id"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  inputSummary: text("input_summary"),
  success: text("success").notNull().default("true"),
});

export type AIRequestLog = typeof aiRequestLogs.$inferSelect;

export const businessAnalyses = pgTable("business_analyses", {
  id: serial("id").primaryKey(),
  url: text("url").notNull(),
  urlNormalized: text("url_normalized"),
  businessName: text("business_name"),
  businessType: text("business_type"),
  overallScore: text("overall_score"),
  businessModelScore: text("business_model_score"),
  adReadinessScore: text("ad_readiness_score"),
  uxScore: text("ux_score"),
  speedScore: text("speed_score"),
  socialPresenceScore: text("social_presence_score"),
  confidence: text("confidence"),
  confidenceReason: text("confidence_reason"),
  criticalIssues: text("critical_issues").array().default(sql`'{}'::text[]`),
  priorities: text("priorities").array().default(sql`'{}'::text[]`),
  shouldAdvertise: text("should_advertise"),
  recommendedChannel: text("recommended_channel"),
  budgetRange: text("budget_range"),
  decisionReasoning: text("decision_reasoning"),
  fullAnalysis: text("full_analysis"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: text("created_by"),
});

export const insertBusinessAnalysisSchema = createInsertSchema(businessAnalyses).omit({
  id: true,
  createdAt: true,
});

export type InsertBusinessAnalysis = z.infer<typeof insertBusinessAnalysisSchema>;
export type BusinessAnalysis = typeof businessAnalyses.$inferSelect;

export const channelAnalyses = pgTable("channel_analyses", {
  id: serial("id").primaryKey(),
  url: text("url").notNull(),
  platform: text("platform").notNull(),
  rating: text("rating").notNull(),
  ratingReason: text("rating_reason"),
  observations: text("observations").array().default(sql`'{}'::text[]`),
  recommendation: text("recommendation"),
  recommendationType: text("recommendation_type"),
  decisionReasoning: text("decision_reasoning"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: text("created_by"),
});

export const insertChannelAnalysisSchema = createInsertSchema(channelAnalyses).omit({
  id: true,
  createdAt: true,
});

export type InsertChannelAnalysis = z.infer<typeof insertChannelAnalysisSchema>;
export type ChannelAnalysis = typeof channelAnalyses.$inferSelect;

// Invisible Learning Layer - auto-logged AI usage data
export const learningLogs = pgTable("learning_logs", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  tool: text("tool").notNull(), // business_analyzer, smart_analyzer, campaign_brain, content_studio
  industryType: text("industry_type"), // نوع النشاط
  goal: text("goal"), // الهدف
  channel: text("channel"), // القناة/المنصة
  inputsSummary: text("inputs_summary"), // ملخص المدخلات (منظّف)
  rating: text("rating"), // التقييم النهائي
  observations: text("observations"), // الملاحظات (JSON string)
  recommendation: text("recommendation"), // التوصية
  decisionReasoning: text("decision_reasoning"), // لماذا هذا القرار
  analysisMode: text("analysis_mode"), // full or guided
  confidence: text("confidence"), // مستوى الثقة
  createdBy: text("created_by"), // user id (optional, for internal use)
  expiresAt: timestamp("expires_at"), // for TTL-based cleanup
});

export const insertLearningLogSchema = createInsertSchema(learningLogs).omit({
  id: true,
  timestamp: true,
});

export type InsertLearningLog = z.infer<typeof insertLearningLogSchema>;
export type LearningLog = typeof learningLogs.$inferSelect;

// Campaign Performance Analyzer - multi-platform metrics analysis
export const campaignPerformanceAnalyses = pgTable("campaign_performance_analyses", {
  id: serial("id").primaryKey(),
  platforms: text("platforms").array().notNull(), // ['meta', 'tiktok', 'snapchat', 'google']
  platformsData: text("platforms_data").notNull(), // JSON string of platform-specific metrics
  overallRating: text("overall_rating").notNull(), // قوي/متوسط/ضعيف
  observations: text("observations").array().default(sql`'{}'::text[]`),
  recommendation: text("recommendation"),
  decisionReasoning: text("decision_reasoning"),
  crossPlatformSummary: text("cross_platform_summary"),
  derivedKPIs: text("derived_kpis"), // JSON: {CPA, ROAS, CTR, CPC, CPM, CVR}
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: text("created_by"),
});

export const insertCampaignPerformanceSchema = createInsertSchema(campaignPerformanceAnalyses).omit({
  id: true,
  createdAt: true,
});

export type InsertCampaignPerformance = z.infer<typeof insertCampaignPerformanceSchema>;
export type CampaignPerformance = typeof campaignPerformanceAnalyses.$inferSelect;
