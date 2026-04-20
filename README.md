# معيار عوائد — Awaed AIHub

منصة داخلية للذكاء التسويقي تستخدم الذكاء الاصطناعي لتحليل الأعمال وصناعة القرار التسويقي للسوق السعودي والخليجي.

## 🛠 التقنيات

- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS v4
- **Backend:** Node.js 20 + Express + TypeScript
- **Database:** PostgreSQL + Drizzle ORM
- **AI:** OpenAI API (gpt-4o)
- **Auth:** Session-based + bcrypt

## 🚀 التشغيل السريع

### محلياً (للتطوير)

```bash
# 1. ثبّت التبعيات
npm install

# 2. انسخ متغيرات البيئة
cp .env.example .env
# ثم حدّث .env بقيمك الفعلية

# 3. جهّز قاعدة البيانات
npm run db:push

# 4. شغّل خادم التطوير
npm run dev
```

يفتح على: http://localhost:5000

### النشر على Railway

راجع [`DEPLOY_GUIDE_AR.md`](./DEPLOY_GUIDE_AR.md) لدليل كامل بالعربية.

## 📋 متغيرات البيئة المطلوبة

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | رابط PostgreSQL |
| `OPENAI_API_KEY` | مفتاح OpenAI |
| `SESSION_SECRET` | نص عشوائي طويل لتشفير الـ sessions |
| `ADMIN_EMAIL` | بريد الأدمن الأول |
| `ADMIN_PASSWORD` | كلمة مرور الأدمن الأول |

راجع `.env.example` للقائمة الكاملة.

## 🗂 الأدوات المتوفرة

1. **محلل الأعمال** (Business Analyzer) — تحليل المواقع/المتاجر للاستعداد الإعلاني
2. **محلل القنوات** (Smart Analyzer) — تحليل حسابات السوشيال ميديا
3. **ملهم الحملات** (Campaign Brain) — توليد أفكار الحملات بالذكاء الاصطناعي
4. **استوديو المحتوى** (Content Studio) — توليد المحتوى التسويقي العربي
5. **مخطط الحملات** (Campaign Planner) — تخطيط الميزانية والأهداف
6. **محلل الأداء** (Performance Analyzer) — تحليل أداء الحملات عبر المنصات

## 📁 هيكل المشروع

```
├── client/              # React frontend
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── pages/       # صفحات التطبيق
│   │   ├── lib/         # Utilities & contexts
│   │   └── hooks/       # Custom hooks
│   └── public/          # Static assets
├── server/              # Express backend
│   ├── ai/              # AI routes & prompts
│   ├── auth-routes.ts   # المصادقة
│   ├── storage.ts       # عمليات قاعدة البيانات
│   └── index.ts         # نقطة الدخول
├── shared/              # Types مشتركة
│   └── schema.ts        # Drizzle schema
├── script/
│   └── build.ts         # Build script
└── attached_assets/     # الصور والشعارات
```

## 🛡 الحسابات الافتراضية

الأدمن يُنشأ تلقائياً عند أول تشغيل باستخدام `ADMIN_EMAIL` و `ADMIN_PASSWORD` من متغيرات البيئة.

## 📜 الرخصة

MIT
