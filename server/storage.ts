import { eq, ilike, or, sql, desc, and, ne } from "drizzle-orm";
import { db } from "./db";
import {
  users,
  knowledgeBase,
  aiRequestLogs,
  businessAnalyses,
  channelAnalyses,
  learningLogs,
  campaignPerformanceAnalyses,
  type User,
  type InsertUser,
  type Knowledge,
  type InsertKnowledge,
  type AIRequestLog,
  type BusinessAnalysis,
  type InsertBusinessAnalysis,
  type ChannelAnalysis,
  type InsertChannelAnalysis,
  type LearningLog,
  type InsertLearningLog,
  type CampaignPerformance,
  type InsertCampaignPerformance,
} from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined>;
  updateUserLastLogin(id: string): Promise<void>;
  getAllUsers(): Promise<User[]>;
  getActiveUsers(): Promise<User[]>;
  deleteUser(id: string): Promise<boolean>;
  getAllKnowledge(): Promise<Knowledge[]>;
  getKnowledgeById(id: number): Promise<Knowledge | undefined>;
  getKnowledgeByCategory(category: string): Promise<Knowledge[]>;
  searchKnowledge(query: string): Promise<Knowledge[]>;
  createKnowledge(knowledge: InsertKnowledge): Promise<Knowledge>;
  updateKnowledge(id: number, knowledge: Partial<InsertKnowledge>): Promise<Knowledge | undefined>;
  deleteKnowledge(id: number): Promise<void>;
  logAIRequest(tool: string, userId?: string, inputSummary?: string, success?: boolean): Promise<void>;
  getRecentAILogs(limit?: number): Promise<AIRequestLog[]>;
  countAIRequestsInWindow(userId: string, windowMs: number): Promise<number>;
  createBusinessAnalysis(analysis: InsertBusinessAnalysis): Promise<BusinessAnalysis>;
  getBusinessAnalysesByUser(userId: string): Promise<BusinessAnalysis[]>;
  getBusinessAnalysisByIdAndUser(id: number, userId: string): Promise<BusinessAnalysis | undefined>;
  getLatestAnalysisByUrl(normalizedUrl: string, userId: string): Promise<BusinessAnalysis | undefined>;
  getLatestAnalysesPerUrl(userId: string): Promise<BusinessAnalysis[]>;
  deleteBusinessAnalysis(id: number, userId: string): Promise<boolean>;
  createChannelAnalysis(analysis: InsertChannelAnalysis): Promise<ChannelAnalysis>;
  getChannelAnalysesByUser(userId: string): Promise<ChannelAnalysis[]>;
  // Learning Logs
  createLearningLog(log: InsertLearningLog): Promise<LearningLog>;
  getSimilarLearningLogs(params: { tool?: string; industryType?: string; goal?: string; channel?: string; limit?: number }): Promise<LearningLog[]>;
  clearExpiredLearningLogs(): Promise<number>;
  clearAllLearningLogs(): Promise<number>;
  // Campaign Performance
  createCampaignPerformance(analysis: InsertCampaignPerformance): Promise<CampaignPerformance>;
  getCampaignPerformancesByUser(userId: string): Promise<CampaignPerformance[]>;
  getCampaignPerformanceById(id: number, userId: string): Promise<CampaignPerformance | undefined>;
  deleteCampaignPerformance(id: number, userId: string): Promise<boolean>;
  // Dashboard Stats
  getDashboardStats(): Promise<{
    totalUsers: number;
    totalBusinessAnalyses: number;
    totalChannelAnalyses: number;
    totalCampaignPerformances: number;
    totalAIRequests: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return user;
  }

  async updateUserLastLogin(id: string): Promise<void> {
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, id));
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getActiveUsers(): Promise<User[]> {
    return db.select().from(users)
      .where(eq(users.status, "active"))
      .orderBy(desc(users.createdAt));
  }

  async deleteUser(id: string): Promise<boolean> {
    await db.delete(users).where(eq(users.id, id));
    return true;
  }

  async getAllKnowledge(): Promise<Knowledge[]> {
    return db.select().from(knowledgeBase).orderBy(desc(knowledgeBase.createdAt));
  }

  async getKnowledgeById(id: number): Promise<Knowledge | undefined> {
    const [item] = await db.select().from(knowledgeBase).where(eq(knowledgeBase.id, id)).limit(1);
    return item;
  }

  async getKnowledgeByCategory(category: string): Promise<Knowledge[]> {
    return db.select().from(knowledgeBase).where(eq(knowledgeBase.category, category));
  }

  async searchKnowledge(query: string): Promise<Knowledge[]> {
    const searchPattern = `%${query}%`;
    return db
      .select()
      .from(knowledgeBase)
      .where(
        or(
          ilike(knowledgeBase.title, searchPattern),
          ilike(knowledgeBase.content, searchPattern),
          ilike(knowledgeBase.category, searchPattern)
        )
      );
  }

  async createKnowledge(knowledge: InsertKnowledge): Promise<Knowledge> {
    const [item] = await db.insert(knowledgeBase).values(knowledge).returning();
    return item;
  }

  async updateKnowledge(id: number, knowledge: Partial<InsertKnowledge>): Promise<Knowledge | undefined> {
    const [item] = await db
      .update(knowledgeBase)
      .set({ ...knowledge, updatedAt: new Date() })
      .where(eq(knowledgeBase.id, id))
      .returning();
    return item;
  }

  async deleteKnowledge(id: number): Promise<void> {
    await db.delete(knowledgeBase).where(eq(knowledgeBase.id, id));
  }

  async logAIRequest(tool: string, userId?: string, inputSummary?: string, success: boolean = true): Promise<void> {
    await db.insert(aiRequestLogs).values({
      tool,
      userId,
      inputSummary,
      success: success ? "true" : "false",
    });
  }

  async getRecentAILogs(limit: number = 100): Promise<AIRequestLog[]> {
    return db.select().from(aiRequestLogs).orderBy(desc(aiRequestLogs.timestamp)).limit(limit);
  }

  async countAIRequestsInWindow(userId: string, windowMs: number): Promise<number> {
    const windowStart = new Date(Date.now() - windowMs);
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(aiRequestLogs)
      .where(
        sql`${aiRequestLogs.userId} = ${userId} AND ${aiRequestLogs.timestamp} > ${windowStart}`
      );
    return result[0]?.count ?? 0;
  }

  async createBusinessAnalysis(analysis: InsertBusinessAnalysis): Promise<BusinessAnalysis> {
    const [item] = await db.insert(businessAnalyses).values(analysis).returning();
    return item;
  }

  async getBusinessAnalysesByUser(userId: string): Promise<BusinessAnalysis[]> {
    return db.select().from(businessAnalyses)
      .where(eq(businessAnalyses.createdBy, userId))
      .orderBy(desc(businessAnalyses.createdAt));
  }

  async getBusinessAnalysisByIdAndUser(id: number, userId: string): Promise<BusinessAnalysis | undefined> {
    const [item] = await db.select().from(businessAnalyses)
      .where(sql`${businessAnalyses.id} = ${id} AND ${businessAnalyses.createdBy} = ${userId}`)
      .limit(1);
    return item;
  }

  async getLatestAnalysisByUrl(normalizedUrl: string, userId: string): Promise<BusinessAnalysis | undefined> {
    const [item] = await db.select().from(businessAnalyses)
      .where(sql`${businessAnalyses.urlNormalized} = ${normalizedUrl} AND ${businessAnalyses.createdBy} = ${userId}`)
      .orderBy(desc(businessAnalyses.createdAt))
      .limit(1);
    return item;
  }

  async getLatestAnalysesPerUrl(userId: string): Promise<BusinessAnalysis[]> {
    const allAnalyses = await db.select().from(businessAnalyses)
      .where(eq(businessAnalyses.createdBy, userId))
      .orderBy(desc(businessAnalyses.createdAt));
    
    const latestByKey = new Map<string, BusinessAnalysis>();
    const demoPatterns = ['demo', 'test', 'example', 'seed', 'localhost', '127.0.0.1'];
    
    for (const analysis of allAnalyses) {
      const url = analysis.urlNormalized || analysis.url;
      if (!url) continue;
      
      const lowerUrl = url.toLowerCase();
      const isDemo = demoPatterns.some(p => lowerUrl.includes(p));
      if (isDemo) continue;
      
      const normalizedUrl = lowerUrl
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .replace(/\/$/, '');
      
      const businessKey = analysis.businessName?.toLowerCase().trim() || '';
      const uniqueKey = businessKey || normalizedUrl;
      
      if (!latestByKey.has(uniqueKey)) {
        latestByKey.set(uniqueKey, analysis);
      }
    }
    
    return Array.from(latestByKey.values());
  }

  async deleteBusinessAnalysis(id: number, userId: string): Promise<boolean> {
    await db.delete(businessAnalyses)
      .where(sql`${businessAnalyses.id} = ${id} AND ${businessAnalyses.createdBy} = ${userId}`);
    return true;
  }

  async createChannelAnalysis(analysis: InsertChannelAnalysis): Promise<ChannelAnalysis> {
    const [item] = await db.insert(channelAnalyses).values(analysis).returning();
    return item;
  }

  async getChannelAnalysesByUser(userId: string): Promise<ChannelAnalysis[]> {
    return db.select().from(channelAnalyses)
      .where(eq(channelAnalyses.createdBy, userId))
      .orderBy(desc(channelAnalyses.createdAt));
  }

  // Learning Logs Implementation
  async createLearningLog(log: InsertLearningLog): Promise<LearningLog> {
    const ttlDays = parseInt(process.env.LEARNING_TTL_DAYS || "90", 10);
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
    const [item] = await db.insert(learningLogs).values({ ...log, expiresAt }).returning();
    return item;
  }

  async getSimilarLearningLogs(params: { tool?: string; industryType?: string; goal?: string; channel?: string; limit?: number }): Promise<LearningLog[]> {
    const { tool, industryType, goal, channel, limit = 5 } = params;
    const conditions: any[] = [];
    
    if (tool) conditions.push(eq(learningLogs.tool, tool));
    if (industryType) conditions.push(eq(learningLogs.industryType, industryType));
    if (goal) conditions.push(ilike(learningLogs.goal, `%${goal}%`));
    if (channel) conditions.push(eq(learningLogs.channel, channel));
    
    // Filter out expired logs
    conditions.push(sql`${learningLogs.expiresAt} > NOW() OR ${learningLogs.expiresAt} IS NULL`);
    
    if (conditions.length === 1) {
      return db.select().from(learningLogs)
        .where(conditions[0])
        .orderBy(desc(learningLogs.timestamp))
        .limit(limit);
    }
    
    return db.select().from(learningLogs)
      .where(and(...conditions))
      .orderBy(desc(learningLogs.timestamp))
      .limit(limit);
  }

  async clearExpiredLearningLogs(): Promise<number> {
    const result = await db.delete(learningLogs)
      .where(sql`${learningLogs.expiresAt} < NOW()`)
      .returning();
    return result.length;
  }

  async clearAllLearningLogs(): Promise<number> {
    const result = await db.delete(learningLogs).returning();
    return result.length;
  }

  // Campaign Performance Implementation
  async createCampaignPerformance(analysis: InsertCampaignPerformance): Promise<CampaignPerformance> {
    const [item] = await db.insert(campaignPerformanceAnalyses).values(analysis).returning();
    return item;
  }

  async getCampaignPerformancesByUser(userId: string): Promise<CampaignPerformance[]> {
    return db.select().from(campaignPerformanceAnalyses)
      .where(eq(campaignPerformanceAnalyses.createdBy, userId))
      .orderBy(desc(campaignPerformanceAnalyses.createdAt));
  }

  async getCampaignPerformanceById(id: number, userId: string): Promise<CampaignPerformance | undefined> {
    const [item] = await db.select().from(campaignPerformanceAnalyses)
      .where(sql`${campaignPerformanceAnalyses.id} = ${id} AND ${campaignPerformanceAnalyses.createdBy} = ${userId}`)
      .limit(1);
    return item;
  }

  async deleteCampaignPerformance(id: number, userId: string): Promise<boolean> {
    await db.delete(campaignPerformanceAnalyses)
      .where(sql`${campaignPerformanceAnalyses.id} = ${id} AND ${campaignPerformanceAnalyses.createdBy} = ${userId}`);
    return true;
  }

  async getDashboardStats(): Promise<{
    totalUsers: number;
    totalBusinessAnalyses: number;
    totalChannelAnalyses: number;
    totalCampaignPerformances: number;
    totalAIRequests: number;
  }> {
    const [usersCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
    const [businessCount] = await db.select({ count: sql<number>`count(*)` }).from(businessAnalyses);
    const [channelCount] = await db.select({ count: sql<number>`count(*)` }).from(channelAnalyses);
    const [performanceCount] = await db.select({ count: sql<number>`count(*)` }).from(campaignPerformanceAnalyses);
    const [aiLogsCount] = await db.select({ count: sql<number>`count(*)` }).from(aiRequestLogs);
    
    return {
      totalUsers: Number(usersCount?.count || 0),
      totalBusinessAnalyses: Number(businessCount?.count || 0),
      totalChannelAnalyses: Number(channelCount?.count || 0),
      totalCampaignPerformances: Number(performanceCount?.count || 0),
      totalAIRequests: Number(aiLogsCount?.count || 0),
    };
  }
}

export const storage = new DatabaseStorage();
