# 🚀 دليل نشر منصة معيار عوائد على Railway

دليل شامل خطوة بخطوة لنشر المنصة من الصفر. اتبع الخطوات بالترتيب.

---

## 📋 ما تحتاجه قبل البدء

- [ ] حساب على [Railway](https://railway.app) (التسجيل مجاني)
- [ ] مفتاح OpenAI API جاهز (لديك بالفعل ✅)
- [ ] ملف مشروع `Awaed-AIHub.zip` (جاهز في هذا الملف ✅)
- [ ] Node.js 20+ مثبت على جهازك ([حمّل من هنا](https://nodejs.org))

---

## المرحلة 1: إنشاء حساب Railway

1. اذهب إلى [railway.app](https://railway.app)
2. اضغط **"Login"** ثم **"Login with GitHub"** أو **"Login with Google"**
3. Railway يعطيك **$5 رصيد مجاني شهرياً** — كافي لمشروع صغير/متوسط

---

## المرحلة 2: تثبيت Railway CLI

افتح Terminal (أو PowerShell على Windows) وشغّل:

```bash
npm install -g @railway/cli
```

تحقق من التثبيت:
```bash
railway --version
```

سجّل دخول:
```bash
railway login
```
راح يفتح المتصفح لتأكيد الدخول.

---

## المرحلة 3: تجهيز المشروع محلياً

### 3.1 فك ضغط المشروع
- فك ضغط `Awaed-AIHub-Railway.zip` في مجلد على جهازك
- مثلاً: `C:\Projects\Awaed-AIHub\` أو `~/Projects/Awaed-AIHub/`

### 3.2 افتح Terminal داخل مجلد المشروع

**على Windows:**
- افتح المجلد في File Explorer
- اضغط Shift + Right Click في مكان فاضي → "Open PowerShell here"

**على Mac:**
- افتح المجلد في Finder
- Right Click → Services → "New Terminal at Folder"

### 3.3 ثبّت التبعيات
```bash
npm install
```
هذه الخطوة تأخذ 2-5 دقائق. راح تشوف تحذيرات، تجاهلها.

### 3.4 اختبر المشروع محلياً (اختياري لكن مُوصى به)

أنشئ ملف `.env` (انسخ `.env.example`):
```bash
# على Windows:
copy .env.example .env

# على Mac/Linux:
cp .env.example .env
```

ثم حدّث `.env` بمفتاح OpenAI فقط. **تجاوز `DATABASE_URL` مؤقتاً**:
```
OPENAI_API_KEY=sk-your-actual-key
ADMIN_EMAIL=admin@awaed.com
ADMIN_PASSWORD=TestPassword123!
SESSION_SECRET=any_random_long_string_here_at_least_32_chars
```

> ⚠️ **ملاحظة:** التطبيق لن يعمل محلياً بدون قاعدة PostgreSQL. تخطى هذه الخطوة وانتقل للمرحلة 4 مباشرة إذا لم يكن لديك PostgreSQL محلياً.

---

## المرحلة 4: إنشاء مشروع Railway

### 4.1 من Terminal داخل مجلد المشروع:

```bash
railway init
```

راح يسألك:
- **Project name?** → اكتب `awaed-aihub` أو أي اسم
- **Create a new project?** → اختر `Empty Project`

### 4.2 أضف قاعدة بيانات PostgreSQL

```bash
railway add
```

اختر من القائمة:
- **Database** → **PostgreSQL**

راح يُنشئ قاعدة البيانات تلقائياً ويضيف متغير `DATABASE_URL` لمشروعك.

---

## المرحلة 5: إضافة متغيرات البيئة

### 5.1 عبر Railway Dashboard (الأسهل):

1. افتح مشروعك على [railway.app/dashboard](https://railway.app/dashboard)
2. اضغط على **Service** (البطاقة الرئيسية للتطبيق)
3. روح لتبويب **Variables**
4. اضغط **+ New Variable** وأضف التالي واحد واحد:

| Variable Name | القيمة |
|---------------|--------|
| `OPENAI_API_KEY` | مفتاحك من OpenAI (`sk-...`) |
| `ADMIN_EMAIL` | `admin@awaed.com` (أو بريدك) |
| `ADMIN_PASSWORD` | كلمة مرور قوية (لا تنساها!) |
| `SESSION_SECRET` | نص عشوائي طويل (64+ حرف) |
| `NODE_ENV` | `production` |
| `LEARNING_ENABLED` | `true` |
| `LEARNING_TTL_DAYS` | `90` |

> 💡 لتوليد `SESSION_SECRET` قوي، شغّل في Terminal:
> ```bash
> node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
> ```
> وانسخ الناتج.

### 5.2 تأكد أن `DATABASE_URL` موجود:

في نفس صفحة Variables، يجب أن ترى `DATABASE_URL` مضاف تلقائياً من قاعدة PostgreSQL. إذا لم يكن موجوداً:
- اضغط **+ New Variable** 
- اختر **Add Reference** → اختر `DATABASE_URL` من PostgreSQL service

---

## المرحلة 6: النشر الأولي (Deploy)

### 6.1 ارفع المشروع إلى Railway:

من Terminal في مجلد المشروع:
```bash
railway up
```

راح يرفع الملفات ويبني المشروع. تأخذ 3-7 دقائق. **راقب الـ logs** — إذا فيه خطأ راح يظهر هنا.

### 6.2 شغّل migrations قاعدة البيانات:

بعد ما ينجح البناء، شغّل:
```bash
railway run npm run db:push
```

هذي الخطوة تنشئ الجداول في PostgreSQL. **ضروري جداً** وإلا التطبيق ما راح يشتغل.

---

## المرحلة 7: توليد رابط عام

### 7.1 افتح Railway Dashboard:
- روح لمشروعك
- اضغط على **Service** الخاص بالتطبيق (مو PostgreSQL)
- روح لتبويب **Settings**
- في قسم **Networking** اضغط **"Generate Domain"**

راح يعطيك رابط مثل: `https://awaed-aihub-production.up.railway.app`

### 7.2 افتح الرابط:

يفتح صفحة تسجيل الدخول. استخدم:
- **البريد:** الـ `ADMIN_EMAIL` اللي وضعته
- **كلمة المرور:** الـ `ADMIN_PASSWORD` اللي وضعته

---

## ✅ تأكدت إنها شغالة!

الآن تقدر:
- تسجل دخول كأدمن
- تضيف مستخدمين جدد (أخصائيين تسويق)
- تستخدم كل الأدوات الـ 6

---

## 🔧 عمليات شائعة بعد النشر

### عرض logs مباشرة:
```bash
railway logs
```

### تحديث متغير بيئة:
إما من Dashboard → Variables، أو:
```bash
railway variables --set "KEY=value"
```

### إعادة النشر بعد تعديل الكود:
```bash
railway up
```

### فتح shell داخل السيرفر:
```bash
railway shell
```

### إضافة دومين مخصص:
1. Dashboard → Settings → Networking
2. **Custom Domain** → أدخل دومينك (مثلاً `app.awaed.com`)
3. أضف CNAME record في إعدادات DNS لديك

---

## 🆘 مشاكل شائعة وحلولها

### "Build failed: TypeScript errors"
```bash
# شغّل محلياً للتحقق من الأخطاء:
npm run check
```

### "Cannot connect to database"
- تأكد أن `DATABASE_URL` موجود في Variables
- تأكد أنك شغّلت `railway run npm run db:push`

### "OpenAI API error: 401"
- تأكد من صحة `OPENAI_API_KEY`
- تأكد أن حسابك في OpenAI فيه رصيد

### "Session errors / لا أستطيع تسجيل الدخول"
- تأكد أن `SESSION_SECRET` موجود وطويل
- تأكد أن `NODE_ENV=production`

### الصفحة بيضاء بدون محتوى
- تحقق من logs: `railway logs`
- تأكد أن البناء نجح: يجب ترى `✅ Build complete!` في logs

---

## 💰 التكلفة المتوقعة

Railway يحسب الاستهلاك بالساعة:
- **$5 مجاناً شهرياً** (يكفي لتطبيق صغير)
- تطبيق متوسط الاستخدام: **$5-$15/شهر**
- PostgreSQL: **~$5/شهر** (مشمول في الـ $5 المجاني)
- **OpenAI منفصل**: يُحسب على حسابك في OpenAI مباشرة

---

## 📞 الدعم

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- OpenAI Status: https://status.openai.com

---

**تم بحمد الله 🎉**

إذا واجهتك أي مشكلة، افتح محادثة جديدة مع Claude وشارك رسالة الخطأ.
