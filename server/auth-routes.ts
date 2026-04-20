import type { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import MemoryStore from "memorystore";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { createUserSchema, ALL_TOOLS, type ToolId } from "@shared/schema";
import { z } from "zod";

declare module "express-session" {
  interface SessionData {
    userId: string;
    userRole: string;
    userName: string;
    userEmail: string;
    allowedTools: string[];
  }
}

const MemoryStoreSession = MemoryStore(session);

const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const attempt = loginAttempts.get(ip);
  
  if (attempt) {
    if (now - attempt.lastAttempt > LOCKOUT_TIME) {
      loginAttempts.delete(ip);
      return true;
    }
    if (attempt.count >= MAX_LOGIN_ATTEMPTS) {
      return false;
    }
  }
  return true;
}

function recordFailedAttempt(ip: string): void {
  const now = Date.now();
  const attempt = loginAttempts.get(ip);
  
  if (attempt) {
    loginAttempts.set(ip, { count: attempt.count + 1, lastAttempt: now });
  } else {
    loginAttempts.set(ip, { count: 1, lastAttempt: now });
  }
}

function clearFailedAttempts(ip: string): void {
  loginAttempts.delete(ip);
}

async function ensureAdminExists(): Promise<void> {
  try {
    const allUsers = await storage.getAllUsers();
    const hasAdmin = allUsers.some(u => u.role === "admin" && u.status === "active");
    
    if (!hasAdmin) {
      const adminEmail = process.env.ADMIN_EMAIL || "admin@awaed.com";
      const adminPassword = process.env.ADMIN_PASSWORD;
      
      if (!adminPassword) {
        console.log("[Auth] No ADMIN_PASSWORD set. Please set ADMIN_EMAIL and ADMIN_PASSWORD env vars to create admin account.");
        return;
      }
      
      const existingAdmin = await storage.getUserByEmail(adminEmail);
      if (!existingAdmin) {
        const hashedPassword = await bcrypt.hash(adminPassword, 12);
        await storage.createUser({
          email: adminEmail,
          username: "admin",
          password: hashedPassword,
          name: "المدير",
          role: "admin",
          status: "active",
          allowedTools: [...ALL_TOOLS],
        });
        console.log(`[Auth] Admin account created: ${adminEmail}`);
      }
    }
  } catch (error) {
    console.error("[Auth] Error ensuring admin exists:", error);
  }
}

export function setupSession(app: Express): void {
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "awaed-marketing-secret-2024",
      resave: false,
      saveUninitialized: false,
      store: new MemoryStoreSession({
        checkPeriod: 86400000,
      }),
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: "lax",
      },
    })
  );
  
  ensureAdminExists();
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session.userId) {
    res.status(401).json({ error: "يجب تسجيل الدخول أولاً" });
    return;
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.session.userId) {
    res.status(401).json({ error: "يجب تسجيل الدخول أولاً" });
    return;
  }
  if (req.session.userRole !== "admin") {
    res.status(403).json({ error: "هذا الإجراء متاح للمديرين فقط" });
    return;
  }
  next();
}

export function requireToolAccess(toolId: ToolId) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.session.userId) {
      res.status(401).json({ error: "يجب تسجيل الدخول أولاً" });
      return;
    }
    
    if (req.session.userRole === "admin") {
      next();
      return;
    }
    
    const allowedTools = req.session.allowedTools || [];
    if (!allowedTools.includes(toolId)) {
      res.status(403).json({ error: "ليس لديك صلاحية للوصول إلى هذه الأداة" });
      return;
    }
    
    next();
  };
}

export function registerAuthRoutes(app: Express): void {
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    
    if (!checkRateLimit(clientIp)) {
      return res.status(429).json({ 
        error: "تم تجاوز عدد المحاولات المسموحة. يرجى المحاولة بعد 15 دقيقة." 
      });
    }

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "يرجى إدخال البريد وكلمة المرور" });
    }

    try {
      const user = await storage.getUserByEmail(email);

      if (!user) {
        recordFailedAttempt(clientIp);
        return res.status(401).json({ error: "بيانات الدخول غير صحيحة" });
      }

      if (user.status !== "active") {
        return res.status(403).json({ error: "الحساب معطل. تواصل مع المدير." });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      
      if (!isValidPassword) {
        recordFailedAttempt(clientIp);
        return res.status(401).json({ error: "بيانات الدخول غير صحيحة" });
      }

      clearFailedAttempts(clientIp);
      await storage.updateUserLastLogin(user.id);

      req.session.userId = user.id;
      req.session.userRole = user.role;
      req.session.userName = user.name;
      req.session.userEmail = user.email;
      req.session.allowedTools = user.allowedTools || [];

      res.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          allowedTools: user.allowedTools,
        },
      });
    } catch (error) {
      console.error("[Auth] Login error:", error);
      res.status(500).json({ error: "حدث خطأ أثناء تسجيل الدخول" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "فشل في تسجيل الخروج" });
      }
      res.clearCookie("connect.sid");
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.json({ user: null });
    }

    try {
      const user = await storage.getUser(req.session.userId);
      if (!user || user.status !== "active") {
        req.session.destroy(() => {});
        return res.json({ user: null });
      }

      res.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          allowedTools: user.allowedTools,
        },
      });
    } catch (error) {
      res.json({ user: null });
    }
  });

  // Change own password
  app.post("/api/auth/change-password", requireAuth, async (req: Request, res: Response) => {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "يرجى إدخال كلمة المرور الحالية والجديدة" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: "كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل" });
      }

      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ error: "المستخدم غير موجود" });
      }

      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: "كلمة المرور الحالية غير صحيحة" });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 12);
      await storage.updateUser(user.id, { password: hashedPassword });

      res.json({ success: true, message: "تم تغيير كلمة المرور بنجاح" });
    } catch (error) {
      console.error("[Auth] Change password error:", error);
      res.status(500).json({ error: "حدث خطأ أثناء تغيير كلمة المرور" });
    }
  });

  // Update own profile
  app.patch("/api/auth/profile", requireAuth, async (req: Request, res: Response) => {
    try {
      const { name, email, currentPassword, newPassword } = req.body;

      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ error: "المستخدم غير موجود" });
      }

      const updateData: any = {};

      if (name && name !== user.name) {
        if (name.length < 2) {
          return res.status(400).json({ error: "الاسم يجب أن يكون حرفين على الأقل" });
        }
        updateData.name = name;
      }

      if (email && email !== user.email) {
        const existingEmail = await storage.getUserByEmail(email);
        if (existingEmail) {
          return res.status(400).json({ error: "البريد الإلكتروني مستخدم بالفعل" });
        }
        updateData.email = email;
      }

      if (newPassword) {
        if (!currentPassword) {
          return res.status(400).json({ error: "يرجى إدخال كلمة المرور الحالية" });
        }
        const isValidPassword = await bcrypt.compare(currentPassword, user.password);
        if (!isValidPassword) {
          return res.status(401).json({ error: "كلمة المرور الحالية غير صحيحة" });
        }
        if (newPassword.length < 6) {
          return res.status(400).json({ error: "كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل" });
        }
        updateData.password = await bcrypt.hash(newPassword, 12);
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: "لا توجد تغييرات لحفظها" });
      }

      const updated = await storage.updateUser(user.id, updateData);

      // Update session
      if (updateData.name) req.session.userName = updateData.name;
      if (updateData.email) req.session.userEmail = updateData.email;

      res.json({
        success: true,
        message: "تم تحديث البيانات بنجاح",
        user: {
          id: updated!.id,
          name: updated!.name,
          email: updated!.email,
          role: updated!.role,
          allowedTools: updated!.allowedTools,
        },
      });
    } catch (error) {
      console.error("[Auth] Update profile error:", error);
      res.status(500).json({ error: "حدث خطأ أثناء تحديث البيانات" });
    }
  });

  app.get("/api/admin/users", requireAdmin, async (req: Request, res: Response) => {
    try {
      const allUsers = await storage.getAllUsers();
      const safeUsers = allUsers.map(u => ({
        id: u.id,
        email: u.email,
        username: u.username,
        name: u.name,
        role: u.role,
        status: u.status,
        allowedTools: u.allowedTools,
        lastLoginAt: u.lastLoginAt,
        createdAt: u.createdAt,
      }));
      res.json({ users: safeUsers });
    } catch (error) {
      res.status(500).json({ error: "فشل في جلب المستخدمين" });
    }
  });

  app.post("/api/admin/users", requireAdmin, async (req: Request, res: Response) => {
    try {
      const validation = createUserSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors[0].message });
      }

      const { email, username, password, name, role, allowedTools } = validation.data;

      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ error: "البريد الإلكتروني مستخدم بالفعل" });
      }

      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ error: "اسم المستخدم مستخدم بالفعل" });
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      const finalTools = role === "admin" ? [...ALL_TOOLS] : allowedTools;

      const user = await storage.createUser({
        email,
        username,
        password: hashedPassword,
        name,
        role,
        status: "active",
        allowedTools: finalTools,
        createdBy: req.session.userId,
      });

      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          name: user.name,
          role: user.role,
          status: user.status,
          allowedTools: user.allowedTools,
        },
      });
    } catch (error) {
      console.error("[Admin] Create user error:", error);
      res.status(500).json({ error: "فشل في إنشاء المستخدم" });
    }
  });

  app.patch("/api/admin/users/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, email, role, status, allowedTools, password } = req.body;

      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ error: "المستخدم غير موجود" });
      }

      if (user.id === req.session.userId && status === "inactive") {
        return res.status(400).json({ error: "لا يمكنك تعطيل حسابك الخاص" });
      }

      if (email && email !== user.email) {
        const existingEmail = await storage.getUserByEmail(email);
        if (existingEmail) {
          return res.status(400).json({ error: "البريد الإلكتروني مستخدم بالفعل" });
        }
      }

      const updateData: any = {};
      if (name) updateData.name = name;
      if (email) updateData.email = email;
      if (role) updateData.role = role;
      if (status) updateData.status = status;
      if (allowedTools) updateData.allowedTools = role === "admin" ? [...ALL_TOOLS] : allowedTools;
      if (password) updateData.password = await bcrypt.hash(password, 12);

      const updated = await storage.updateUser(id, updateData);

      res.json({
        success: true,
        user: {
          id: updated!.id,
          email: updated!.email,
          username: updated!.username,
          name: updated!.name,
          role: updated!.role,
          status: updated!.status,
          allowedTools: updated!.allowedTools,
        },
      });
    } catch (error) {
      console.error("[Admin] Update user error:", error);
      res.status(500).json({ error: "فشل في تحديث المستخدم" });
    }
  });

  app.delete("/api/admin/users/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (id === req.session.userId) {
        return res.status(400).json({ error: "لا يمكنك حذف حسابك الخاص" });
      }

      await storage.deleteUser(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "فشل في حذف المستخدم" });
    }
  });

  app.get("/api/admin/tools", requireAdmin, (req: Request, res: Response) => {
    res.json({ tools: ALL_TOOLS });
  });
}
