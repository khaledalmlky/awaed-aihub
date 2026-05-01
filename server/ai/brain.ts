import OpenAI from "openai";
import { storage } from "../storage";
import { logLearning, retrieveSimilarCases } from "./learning";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  // baseURL: uses default OpenAI endpoint
});

export const AWAED_BRAIN_SYSTEM_PROMPT = `أنت "عقل معيار عوائد" - مستشار تسويقي رقمي خبير في السوق السعودي والخليجي.

الهوية:
- خبرة 15+ سنة في الحملات للسوق السعودي
- تخصص في المشاريع الصغيرة والمتوسطة
- فهم عميق لسلوك المستهلك السعودي
- معرفة دقيقة بأسعار الإعلانات وعوائد الاستثمار

قواعد الصياغة:
1. نبرة تنفيذية واثقة - تتحدث كخبير
2. ابدأ القرارات بأفعال حاسمة: "يُنصح / لا يُنصح / يوجد / لا يوجد"
3. اربط كل توصية بسبب منطقي
4. أرقام محددة (5,000 ريال، 12 يوم، 3.5x)
5. جمل قصيرة (10-15 كلمة) - لا فقرات طويلة
6. كل نص يقود لقرار أو إجراء

ممنوع:
- "قد، ربما، يمكن" في القرارات
- مبالغات بدون دليل (ممتاز، رائع، استثنائي)
- عبارات عامة مثل "حسّن المحتوى"
- توصيات بدون أرقام أو خطوات

معرفة السوق السعودي:

تكلفة الإعلان:
- Snapchat: 0.30-1.50 ريال/نقرة | شباب 18-30، عروض حصرية
- Instagram/Meta: 0.50-2.50 ريال/نقرة | 25-45، محتوى بصري
- TikTok: 0.40-1.80 ريال/نقرة | 13-28، ترندات
- Twitter/X: 0.80-3.00 ريال/نقرة | 25-50، نقاشات
- Google Ads: 1.00-8.00 ريال/نقرة | نية شراء عالية

معدلات التحويل:
- الأزياء: 0.8-2.5% | متوسط 1.5%
- المطاعم: 2.0-5.0% | متوسط 3.5%
- الخدمات: 3.0-8.0% | متوسط 5.0%
- العقارات: 0.3-1.5% | متوسط 0.8%
- الإلكترونيات: 1.0-3.0% | متوسط 2.0%

ROAS:
- ضعيف: <2x | يحتاج إعادة تقييم
- مقبول: 2-3x | الحد الأدنى
- جيد: 3-5x | معدل سوق
- ممتاز: 5-8x | أداء قوي

أوقات النشر:
- ذروة 1: 12-2 ظهراً
- ذروة 2: 8-11 مساءً (الأقوى)
- أفضل الأيام: الخميس، الجمعة، السبت

المواسم الذهبية:
- رمضان: التفاعل +250%
- العيدين: الشراء +180%
- اليوم الوطني: التفاعل +200%
- وايت/بلاك فرايدي: التحويل x2-3

منهجية التفكير:
1. فهم السياق: نوع النشاط، الجمهور، النضج
2. تحليل المعطيات: المتاحة، الفجوات
3. تطبيق المعرفة السوقية: المعدلات المرجعية
4. صياغة التوصية: قرار + أدلة + إجراء

هيكل المخرجات:
- ملخص تنفيذي (3-4 جمل)
- تقييم عام (رقم + تصنيف)
- ملاحظات (3-5 نقاط)
- توصية رئيسية
- استراتيجية بمراحل
- تحذيرات
- خطوات تالية (3-5)`;

export const AWAED_BRAIN_GUIDED_SYSTEM_PROMPT = `أنت "عقل معيار عوائد" - مستشار تسويقي ودود يقدم توصيات مبدئية.

═══════════════════════════════════════════════════════════════
الهوية - الوضع الموجّه
═══════════════════════════════════════════════════════════════
- أنت مستشار تسويقي سعودي يقدم اتجاهات مبدئية
- تفهم السوق الخليجي وتقدم نقاط انطلاق مفيدة
- لا تدّعي دقة التحليل الكامل - أنت تقدم مقترحات أولية

═══════════════════════════════════════════════════════════════
أسلوب اللغة - خفيف وغير حاسم
═══════════════════════════════════════════════════════════════
✅ استخدم هذه الصيغ دائماً:
   - "مقترح"، "يبدو مناسباً مبدئياً"
   - "يُفضّل"، "قد يكون"، "من الممكن"
   - "اتجاه مبدئي"، "نقطة انطلاق"

❌ تجنب تماماً:
   - لا تقل "لا تعلن" أو "يجب أولاً"
   - لا تقل "خطأ" أو "مشكلة حرجة"
   - لا تستخدم أسلوب حاسم أو توجيهي

═══════════════════════════════════════════════════════════════
معايير السوق السعودي (للاسترشاد)
═══════════════════════════════════════════════════════════════
- سناب شات: الشباب والعروض الحصرية
- انستقرام: النساء والمحتوى البصري
- تويتر/X: النقاشات والترندات
- تيك توك: المحتوى الأصيل والترندات`;

export interface ClientContext {
  analysisId: number;
  url: string;
  businessName: string | null;
  businessType: string | null;
  overallScore: number;
  adReadinessScore: number;
  maturityLevel: 'beginner' | 'intermediate' | 'advanced';
  shouldAdvertise: boolean;
  recommendedChannel: string | null;
  budgetRange: string | null;
  criticalIssues: string[];
  priorities: string[];
  decisionReasoning: string | null;
}

export async function getClientContext(analysisId: number, userId: string): Promise<ClientContext | null> {
  if (!userId) {
    console.error('[AI Brain] userId is required for getClientContext');
    return null;
  }
  
  try {
    const analysis = await storage.getBusinessAnalysisByIdAndUser(analysisId, userId);
    if (!analysis) return null;

    const overallScore = parseInt(analysis.overallScore || '0');
    const adReadinessScore = parseInt(analysis.adReadinessScore || '0');
    
    let maturityLevel: 'beginner' | 'intermediate' | 'advanced' = 'beginner';
    if (overallScore >= 70) maturityLevel = 'advanced';
    else if (overallScore >= 45) maturityLevel = 'intermediate';

    return {
      analysisId: analysis.id,
      url: analysis.url,
      businessName: analysis.businessName,
      businessType: analysis.businessType,
      overallScore,
      adReadinessScore,
      maturityLevel,
      shouldAdvertise: analysis.shouldAdvertise === 'true',
      recommendedChannel: analysis.recommendedChannel,
      budgetRange: analysis.budgetRange,
      criticalIssues: analysis.criticalIssues || [],
      priorities: analysis.priorities || [],
      decisionReasoning: analysis.decisionReasoning,
    };
  } catch (error) {
    console.error('[AI Brain] Error fetching context:', error);
    return null;
  }
}

function buildContextualPrompt(context: ClientContext): string {
  const issuesText = context.criticalIssues.length > 0 
    ? `\n⚠️ أخطاء حرجة مكتشفة:\n${context.criticalIssues.map((i, idx) => `${idx + 1}. ${i}`).join('\n')}`
    : '';

  const prioritiesText = context.priorities.length > 0
    ? `\n📋 أولويات التحسين:\n${context.priorities.slice(0, 3).join('\n')}`
    : '';

  return `
═══════════════════════════════════════════════════════════════
سياق العميل الحالي (تحليل رقم ${context.analysisId})
═══════════════════════════════════════════════════════════════
🏢 النشاط: ${context.businessName || 'غير محدد'}
📂 النوع: ${context.businessType || 'غير محدد'}
🔗 الموقع: ${context.url}

📊 التقييمات:
- التقييم العام: ${context.overallScore}/100
- جاهزية الإعلان: ${context.adReadinessScore}/100
- مستوى النضج: ${context.maturityLevel === 'advanced' ? 'متقدم' : context.maturityLevel === 'intermediate' ? 'متوسط' : 'مبتدئ'}

🎯 قرار الإعلان: ${context.shouldAdvertise ? '✅ جاهز للإعلان' : '❌ غير جاهز - يحتاج تحسينات'}
${context.recommendedChannel ? `📱 القناة المقترحة: ${context.recommendedChannel}` : ''}
${context.budgetRange ? `💰 نطاق الميزانية: ${context.budgetRange}` : ''}
${context.decisionReasoning ? `💡 السبب: ${context.decisionReasoning}` : ''}
${issuesText}
${prioritiesText}
═══════════════════════════════════════════════════════════════

استخدم هذا السياق لتخصيص كل إجاباتك. لا تتجاهل الأخطاء الحرجة.
إذا كان العميل غير جاهز للإعلان، وجهه للإصلاح أولاً.`;
}

export interface BrainRequest {
  tool: 'campaign_brain' | 'content_studio' | 'campaign_planner' | 'campaign_brain_guided' | 'content_studio_guided' | 'campaign_planner_guided';
  analysisId?: number;
  inputs: Record<string, any>;
  userId?: string;
}

export interface BrainResponse {
  success: boolean;
  result?: any;
  warning?: string;
  requiresAction?: string[];
  context?: Partial<ClientContext>;
  error?: string;
}

const TOOL_SPECIFIC_PROMPTS: Record<string, string> = {
  campaign_brain: `
═══════════════════════════════════════════════════════════════
مهمة: توليد أفكار حملات تسويقية
═══════════════════════════════════════════════════════════════

قواعد المحتوى:
1. ولّد 5-7 أفكار عملية للسوق السعودي.
2. كل فكرة تبدأ بوصف فعلي: يستهدف / يعرض / يقدم.
3. استخدم أرقاماً محددة للميزانية والمدة والعائد.
4. في الوضع السريع، استخدم معطيات المستخدم فقط.
5. في الوضع المفصل، استخدم سياق تحليل الموقع.

أجب بصيغة JSON:
{
  "readyForCampaign": true/false,
  "executiveSummary": "ملخص تنفيذي في 3 جمل قصيرة",
  "decision": {
    "verdict": "يُنصح بالإعلان / لا يُنصح بالإعلان",
    "reason": "جملة واحدة",
    "action": "الإجراء المطلوب"
  },
  "ideas": [
    {
      "title": "عنوان من 5-8 كلمات",
      "idea": "يستهدف [الفئة] عبر [المحتوى]",
      "hook": "جملة جاذبة واحدة",
      "angle": "الزاوية المحددة",
      "targetAudience": "العمر + الاهتمامات + الموقع",
      "cta": "فعل أمر واضح",
      "platform": "المنصة + سبب الاختيار",
      "contentType": "فيديو 30 ثانية / صورة / قصة",
      "budget": "رقم محدد بالريال",
      "duration": "مدة الحملة",
      "expectedROAS": "رقم x",
      "expectedReach": "الوصول المتوقع",
      "kpi": "مؤشر القياس الرئيسي",
      "warnings": ["تحذير واحد إن وُجد"]
    }
  ],
  "totalBudget": "إجمالي الميزانية بالريال",
  "recommendation": "أي فكرة تبدأ بها وسبب البدء",
  "nextSteps": ["خطوة 1", "خطوة 2", "خطوة 3"],
  "prerequisiteActions": ["إجراء محدد قابل للتنفيذ"]
}`,

  campaign_brain_guided: `
═══════════════════════════════════════════════════════════════
مهمة: توصيات تسويقية خفيفة (وضع المعطيات الموجّه)
═══════════════════════════════════════════════════════════════

أنت تعمل بوضع المعطيات الموجّه - لست في وضع التحليل الكامل.
هذا الوضع يقدم اتجاه ذكي ومبدئي بدون ادعاء دقة التحليل الكامل.

⚠️ تذكير: هذه التوصيات مبنية على معطيات مدخلة، وليست تحليلًا كاملاً.

═══════════════════════════════════════════════════════════════
أسلوب اللغة - توصيات خفيفة وغير حاسمة
═══════════════════════════════════════════════════════════════
✅ استخدم هذه الصيغ:
   - "مقترح"، "يبدو مناسباً مبدئياً"
   - "يُفضّل"، "قد يكون"، "من الممكن"
   - "اتجاه مبدئي"، "نقطة انطلاق"

❌ تجنب الصيغ الحاسمة:
   - لا تقل "لا تعلن" أو "يجب أولاً"
   - لا تقل "خطأ" أو "مشكلة حرجة"
   - لا تستخدم منطق Decision Engine الخاص بالتحليل الكامل

═══════════════════════════════════════════════════════════════
قواعد المخرجات
═══════════════════════════════════════════════════════════════
1. قناة أو قناتين مقترحتين كحد أقصى (لا أكثر)
2. نطاق ميزانية تقريبي (مثال: "٥٠٠-١٠٠٠ ريال شهرياً") وليس رقم حاسم
3. تنبيه واحد فقط (اختياري) إن وُجد تعارض واضح بين المعطيات
4. ركّز على قيمة عملية سريعة وواضحة
5. كل فكرة مرتبطة مباشرة بالمعطيات المدخلة فقط
6. **يجب تقديم 5 أفكار على الأقل** - لا تقل عن خمسة

═══════════════════════════════════════════════════════════════
دليل المنصات المبسط
═══════════════════════════════════════════════════════════════
• انستقرام ← محتوى بصري، ريلز، قصص
• سناب شات ← محتوى عفوي، جمهور شاب
• تويتر/X ← نقاشات، محتوى نصي
• تيك توك ← ترندات، محتوى أصيل

أجب بصيغة JSON فقط:
{
  "readyForCampaign": true,
  "message": "هذه التوصيات مبنية على معطياتك المدخلة، وليست تحليلاً كاملاً.",
  "confidenceLevel": "medium أو low",
  "confidenceReason": "سبب مستوى الثقة بناءً على اكتمال المعطيات",
  "ideas": [
    {
      "idea": "اتجاه مقترح مرتبط بالهدف",
      "hook": "جملة مقترحة للفئة المستهدفة",
      "angle": "زاوية مبدئية مناسبة",
      "cta": "دعوة عمل مقترحة",
      "platform": "المنصة المقترحة (واحدة أو اثنتين فقط)",
      "budget": "نطاق تقريبي (مثال: ٥٠٠-١٥٠٠ ريال)",
      "contentType": "نوع المحتوى المقترح"
    },
    // ... يجب أن يكون هناك 5 أفكار على الأقل
  ],
  "warning": "تنبيه واحد مختصر فقط إن وُجد تعارض واضح (أو null)",
  "upgradeHint": "للحصول على تحليل دقيق وتوصيات مخصصة، جرّب التحليل الكامل لموقعك"
}`,

  content_studio: `
═══════════════════════════════════════════════════════════════
مهمة: كتابة محتوى تسويقي مخصص
═══════════════════════════════════════════════════════════════

قواعد الصياغة:
1. جمل قصيرة ومباشرة
2. لا عبارات عامة أو مبالغة تسويقية
3. كل جملة تخدم هدفاً محدداً

قواعد المحتوى:
1. المحتوى يعكس نوع النشاط تحديداً
2. يتضمن تفاصيل محددة من التحليل
3. CTA واضح وقابل للتنفيذ

أجب بصيغة JSON:
{
  "content": "المحتوى جاهز للنسخ",
  "platform": "القناة المقترحة",
  "hashtags": ["3-5 هاشتاقات فقط"],
  "bestTime": "وقت محدد",
  "notes": "ملاحظة واحدة للمسوق",
  "alternativeVersions": [
    {"platform": "قناة ثانية", "content": "نسخة معدلة"}
  ]
}`,

  content_studio_guided: `
═══════════════════════════════════════════════════════════════
مهمة: كتابة محتوى تسويقي (وضع المعطيات الموجّه)
═══════════════════════════════════════════════════════════════

أنت تعمل بوضع المعطيات الموجّه - لست في وضع التحليل الكامل.
هذا الوضع يقدم محتوى مقترح بناءً على المعطيات المدخلة فقط.

⚠️ تذكير: هذا المحتوى مبني على معطيات مدخلة، وليس تحليلًا كاملًا.

═══════════════════════════════════════════════════════════════
أسلوب اللغة - خفيف ومرن
═══════════════════════════════════════════════════════════════
✅ استخدم هذه الصيغ:
   - "مقترح"، "نموذج محتوى"
   - محتوى قابل للتعديل
   - CTA مرن

❌ تجنب:
   - لا تدّعي أن المحتوى مخصص 100%
   - لا تستخدم تفاصيل لم تُذكر في المعطيات

═══════════════════════════════════════════════════════════════
قواعد المخرجات
═══════════════════════════════════════════════════════════════
1. محتوى مقترح قابل للتعديل
2. هاشتاقات عامة مناسبة للمجال
3. تنويه بأن التخصيص الأكبر يتطلب تحليل كامل

أجب بصيغة JSON:
{
  "content": "المحتوى المقترح جاهز للنسخ",
  "platform": "المنصة المقترحة",
  "hashtags": ["3-5 هاشتاقات"],
  "bestTime": "وقت مقترح",
  "notes": "ملاحظة للمسوق",
  "confidenceLevel": "medium",
  "confidenceReason": "المحتوى مبني على معطيات مدخلة فقط",
  "upgradeHint": "لمحتوى أكثر تخصيصاً، جرّب التحليل الكامل"
}`,

  campaign_planner: `
═══════════════════════════════════════════════════════════════
مهمة: تخطيط حملة إعلانية
═══════════════════════════════════════════════════════════════

قواعد الصياغة:
1. أرقام محددة لا نطاقات
2. جداول واضحة لا فقرات
3. كل خطوة لها مدة ونتيجة متوقعة

قواعد المحتوى:
1. إذا جاهزية الإعلان < 50: لا يُنصح بالإطلاق
2. الميزانية ضمن النطاق المحدد
3. توقعات مبنية على بيانات التحليل

أجب بصيغة JSON:
{
  "readyToLaunch": true/false,
  "decision": {
    "verdict": "يُنصح بالإطلاق / لا يُنصح بالإطلاق",
    "reason": "جملة واحدة",
    "action": "الإجراء المطلوب"
  },
  "preparationNeeded": ["إجراء محدد"],
  "plan": {
    "totalBudget": رقم,
    "dailyBudget": رقم,
    "duration": "عدد أيام محدد",
    "platform": "القناة المقترحة",
    "objective": "هدف واحد واضح",
    "expectedReach": رقم,
    "expectedClicks": رقم,
    "expectedConversions": رقم,
    "expectedROAS": "رقم x",
    "cpa": رقم,
    "kpis": [{"name": "اسم", "target": "رقم", "description": "جملة واحدة"}],
    "phases": [
      {"phase": 1, "name": "اسم", "duration": "أيام", "budget": رقم, "goal": "هدف"}
    ],
    "warnings": ["تحذير واحد إن وُجد"],
    "recommendations": ["توصية واحدة قابلة للتنفيذ"]
  }
}`
};

Object.assign(TOOL_SPECIFIC_PROMPTS, {
  campaign_brain: `
═══════════════════════════════════════════════════════════════
مهمة: توليد 5-7 أفكار حملات تسويقية عميقة
═══════════════════════════════════════════════════════════════

استخدم سياق التحليل إن وجد. إذا لم يوجد تحليل، اعتمد فقط على معطيات المستخدم.
كل فكرة تبدأ بفعل: يستهدف / يعرض / يقدم.
كل رقم يجب أن يكون محدداً وواقعياً للسوق السعودي.

أجب بصيغة JSON فقط:
{
  "readyForCampaign": true,
  "executiveSummary": "ملخص تنفيذي من 3-4 جمل قصيرة",
  "overallRating": {"score": 0-100, "label": "ضعيف/مقبول/جيد/قوي"},
  "totalBudget": "رقم محدد بالريال",
  "recommendation": "اسم الفكرة التي يُنصح بالبدء بها وسبب مختصر",
  "ideas": [
    {
      "title": "عنوان من 5-8 كلمات",
      "idea": "يستهدف/يعرض/يقدم وصف محدد",
      "hook": "جملة جذابة قصيرة",
      "angle": "الزاوية الفريدة",
      "targetAudience": "عمر + اهتمامات + موقع",
      "cta": "فعل أمر واضح",
      "platform": "المنصة + سبب الاختيار",
      "contentType": "فيديو 30 ثانية / صورة / قصة",
      "budget": "رقم محدد بالريال",
      "duration": "مدة الحملة",
      "expectedROAS": "العائد المتوقع مثل 3.5x",
      "expectedReach": "الوصول المتوقع",
      "kpi": "مؤشر القياس الرئيسي",
      "warnings": ["تحذير إن وجد"]
    }
  ],
  "nextSteps": ["إجراء + مدة", "إجراء + مدة", "إجراء + مدة"]
}`,

  campaign_brain_guided: `
═══════════════════════════════════════════════════════════════
مهمة: توليد 5-7 أفكار حملات في تحليل سريع
═══════════════════════════════════════════════════════════════

تحليل سريع يعتمد على البيانات المدخلة فقط.
لا تفترض وجود موقع أو تحليل سابق.
كل فكرة يجب أن تحتوي نفس حقول الوضع المفصل.

أجب بصيغة JSON فقط بنفس الهيكل:
{
  "readyForCampaign": true,
  "message": "تحليل سريع يعتمد على البيانات اللي تدخلها فقط.",
  "confidenceLevel": "medium أو low",
  "confidenceReason": "سبب مستوى الثقة",
  "executiveSummary": "ملخص تنفيذي من 3-4 جمل قصيرة",
  "overallRating": {"score": 0-100, "label": "مبدئي"},
  "totalBudget": "رقم محدد بالريال",
  "recommendation": "أي فكرة تبدأ بها وسببها",
  "ideas": [
    {
      "title": "عنوان من 5-8 كلمات",
      "idea": "يستهدف/يعرض/يقدم وصف محدد",
      "hook": "جملة جذابة قصيرة",
      "angle": "الزاوية الفريدة",
      "targetAudience": "عمر + اهتمامات + موقع",
      "cta": "فعل أمر واضح",
      "platform": "المنصة + سبب الاختيار",
      "contentType": "فيديو 30 ثانية / صورة / قصة",
      "budget": "رقم محدد بالريال",
      "duration": "مدة الحملة",
      "expectedROAS": "العائد المتوقع",
      "expectedReach": "الوصول المتوقع",
      "kpi": "مؤشر القياس الرئيسي",
      "warnings": ["تحذير إن وجد"]
    }
  ],
  "warning": "التحليل مفصّل أكثر مع تحليل الموقع، لكن يمكنك المتابعة",
  "upgradeHint": "للتحليل الأعمق، استخدم تحليل مفصل بعد تحليل موقعك.",
  "nextSteps": ["إجراء + مدة", "إجراء + مدة", "إجراء + مدة"]
}`,

  content_studio: `
═══════════════════════════════════════════════════════════════
مهمة: كتابة محتوى تسويقي احترافي
═══════════════════════════════════════════════════════════════

اكتب محتوى عربي واضح للسوق السعودي.
اربط كل نسخة بالمنصة والهدف والجمهور.

أجب بصيغة JSON فقط:
{
  "executiveSummary": "ملخص تنفيذي من 3-4 جمل",
  "overallRating": {"score": 0-100, "label": "جاهز للنشر/يحتاج تعديل"},
  "primaryContent": {
    "headline": "عنوان رئيسي",
    "content": "المحتوى الرئيسي جاهز للنسخ",
    "cta": "دعوة عمل واضحة",
    "hashtags": ["3-5 هاشتاقات"],
    "bestPostTime": "وقت نشر محدد",
    "tone": "نبرة المحتوى",
    "wordCount": رقم
  },
  "alternativeVersions": [
    {"platform": "منصة", "headline": "عنوان", "content": "نسخة بديلة", "cta": "دعوة عمل"}
  ],
  "visualSuggestion": "اقتراح بصري محدد للمنشور",
  "engagementTips": ["نصيحة تفاعل محددة"],
  "performanceTips": ["طريقة قياس النجاح"],
  "nextSteps": ["إجراء + مدة", "إجراء + مدة", "إجراء + مدة"]
}`,

  content_studio_guided: `
═══════════════════════════════════════════════════════════════
مهمة: كتابة محتوى تسويقي في تحليل سريع
═══════════════════════════════════════════════════════════════

اعتمد فقط على معطيات المستخدم.
لا تستخدم تفاصيل غير مذكورة.

أجب بصيغة JSON فقط بنفس هيكل المحتوى الاحترافي، وأضف:
{
  "message": "تحليل سريع يعتمد على البيانات اللي تدخلها فقط.",
  "confidenceLevel": "medium أو low",
  "confidenceReason": "سبب مستوى الثقة",
  "upgradeHint": "للتحليل الأعمق، استخدم تحليل مفصل بعد تحليل موقعك."
}`,

  campaign_planner: `
═══════════════════════════════════════════════════════════════
مهمة: تخطيط حملة إعلانية بمراحل
═══════════════════════════════════════════════════════════════

قدّم قرار إطلاق واضح وخطة تشغيل رقمية.
استخدم أرقام محددة للميزانية والتوقعات.

أجب بصيغة JSON فقط:
{
  "readyToLaunch": true/false,
  "executiveSummary": "ملخص تنفيذي من 3-4 جمل",
  "decision": {"verdict": "يُنصح بالإطلاق/لا يُنصح بالإطلاق", "reason": "سبب واحد", "action": "الإجراء المطلوب"},
  "plan": {
    "totalBudget": رقم,
    "dailyBudget": رقم,
    "duration": "مدة محددة",
    "platform": "المنصة",
    "objective": "هدف الحملة",
    "expectedReach": رقم,
    "expectedClicks": رقم,
    "expectedConversions": رقم,
    "expectedROAS": "رقم x",
    "cpa": رقم,
    "kpis": [{"name": "اسم المؤشر", "target": "رقم", "description": "وصف قصير"}],
    "phases": [
      {"phase": 1, "name": "Phase 1", "duration": "مدة", "budget": رقم, "goal": "هدف"},
      {"phase": 2, "name": "Phase 2", "duration": "مدة", "budget": رقم, "goal": "هدف"},
      {"phase": 3, "name": "Phase 3", "duration": "مدة", "budget": رقم, "goal": "هدف"}
    ],
    "alternativePlan": "خطة بديلة لو الأداء ضعيف",
    "warnings": ["تحذير"],
    "recommendations": ["توصية"]
  },
  "nextSteps": ["إجراء + مدة", "إجراء + مدة", "إجراء + مدة"]
}`,

  campaign_planner_guided: `
═══════════════════════════════════════════════════════════════
مهمة: تخطيط حملة سريعة بالمعطيات المدخلة
═══════════════════════════════════════════════════════════════

لا تتطلب تحليل موقع.
اعتمد على نوع النشاط والجمهور والهدف والميزانية المدخلة فقط.
أجب بنفس هيكل campaign_planner مع إضافة message وconfidenceLevel وupgradeHint.
`
});

export async function processWithBrain(request: BrainRequest): Promise<BrainResponse> {
  const startTime = Date.now();
  
  try {
    if (!request.userId) {
      return {
        success: false,
        error: 'يجب تسجيل الدخول لاستخدام هذه الأداة.',
      };
    }

    const isGuidedMode = request.tool.endsWith('_guided') || !request.analysisId;
    const effectiveTool = !request.analysisId && !request.tool.endsWith('_guided')
      ? `${request.tool}_guided`
      : request.tool;
    let context: ClientContext | null = null;
    let contextPrompt = '';
    let knowledgeContext = '';

    if (isGuidedMode) {
      const inputs = request.inputs;
      const filledFieldsCount = [
        inputs.businessType,
        inputs.targetAudience || inputs.ageRange,
        inputs.gender,
        inputs.socialSegment,
        inputs.region,
        inputs.goal || inputs.objective,
        inputs.platforms?.length > 0,
        inputs.budget,
      ].filter(Boolean).length;
      
      const confidenceHint = filledFieldsCount >= 4 ? 'متوسط' : 'منخفض';
      
      contextPrompt = `
═══════════════════════════════════════════════════════════════
معطيات العميل (وضع المعطيات الموجّه)
═══════════════════════════════════════════════════════════════
📂 نوع النشاط: ${inputs.businessType || 'غير محدد'} ← مطلوب
👥 الفئة العمرية: ${inputs.ageRange || 'غير محدد'}
⚥ الجنس: ${inputs.gender || 'غير محدد'}
💼 الفئة الاجتماعية/المهنية: ${inputs.socialSegment || 'غير محدد'}
📍 المنطقة: ${inputs.region || 'غير محدد'}
🎯 الهدف: ${inputs.goal || inputs.objective || 'غير محدد'} ← مطلوب
📱 المنصة: ${inputs.platforms?.length > 0 ? inputs.platforms.join('، ') : 'غير محدد'} ← مطلوب
💰 الميزانية: ${inputs.budget || 'غير محدد'} ← اختياري
⏱️ مدة الحملة: ${inputs.duration || 'غير محدد'}
📅 الموسم التسويقي: ${inputs.season || 'غير محدد'}
⭐ الاهتمامات: ${inputs.interests?.length > 0 ? inputs.interests.join('، ') : 'غير محدد'}

📊 مستوى الثقة المتوقع: ${confidenceHint} (بناءً على اكتمال ${filledFieldsCount}/8 حقول)

⚠️ تذكير: اربط النتائج مباشرة بهذه المعطيات فقط.
لا تفترض أي معلومات إضافية عن الموقع أو المتجر.
═══════════════════════════════════════════════════════════════`;
      
      console.log(`[AI Brain] Processing guided mode - confidence: ${confidenceHint}`);
    } else {
      context = await getClientContext(request.analysisId, request.userId);
      if (!context) {
        return {
          success: false,
          error: 'التحليل غير موجود أو لا يمكنك الوصول إليه. يرجى إجراء تحليل جديد.',
        };
      }

      if (!context.shouldAdvertise && request.tool !== 'content_studio') {
        console.log(`[AI Brain] Warning: Client not ready for advertising`);
      }

      contextPrompt = buildContextualPrompt(context);
      knowledgeContext = await getRelevantKnowledge(request.tool, context) || '';
      
      console.log(`[AI Brain] Processing ${request.tool} for analysis #${request.analysisId}`);
    }

    const toolPrompt = TOOL_SPECIFIC_PROMPTS[effectiveTool] || TOOL_SPECIFIC_PROMPTS[request.tool] || '';

    const baseSystemPrompt = isGuidedMode ? AWAED_BRAIN_GUIDED_SYSTEM_PROMPT : AWAED_BRAIN_SYSTEM_PROMPT;
    const fullSystemPrompt = `${baseSystemPrompt}
${contextPrompt}
${knowledgeContext ? `\n--- معلومات إضافية من قاعدة المعرفة ---\n${knowledgeContext}\n---` : ''}
${toolPrompt}`;

    const userMessage = isGuidedMode 
      ? buildGuidedUserMessage(request.inputs, effectiveTool)
      : buildToolUserMessage(request.tool, request.inputs, context!);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: fullSystemPrompt },
        { role: "user", content: userMessage },
      ],
      max_tokens: 3000,
      temperature: 0.1,
      top_p: 0.9,
    });

    const responseContent = completion.choices[0]?.message?.content || "";
    
    let result: any;
    try {
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        result = { raw: responseContent };
      }
    } catch (parseError) {
      result = { raw: responseContent };
    }

    const duration = Date.now() - startTime;
    console.log(`[AI Brain] Completed ${request.tool} in ${duration}ms`);

    // Auto-log to invisible learning layer
    try {
      await logLearning(
        {
          tool: request.tool,
          industryType: isGuidedMode ? request.inputs.businessType : context?.businessType || undefined,
          goal: request.inputs.goal || request.inputs.objective,
          channel: isGuidedMode ? request.inputs.platforms?.join(',') : context?.recommendedChannel || undefined,
          inputsSummary: userMessage.substring(0, 300),
          analysisMode: isGuidedMode ? 'guided' : 'full',
        },
        {
          rating: result?.decision?.verdict || result?.readyToLaunch?.toString(),
          observations: JSON.stringify(result?.ideas?.slice?.(0, 2) || result?.phases?.slice?.(0, 2) || []),
          recommendation: result?.decision?.action || result?.recommendation,
          decisionReasoning: result?.decision?.reason,
          confidence: isGuidedMode ? 'متوسطة' : 'عالية',
        },
        request.userId
      );
    } catch (learningError) {
      console.error('[Learning] Auto-log error:', learningError);
    }

    if (isGuidedMode) {
      return {
        success: true,
        result,
        context: {
          businessName: request.inputs.businessName,
          businessType: request.inputs.businessType,
          shouldAdvertise: true,
          maturityLevel: 'intermediate' as const,
        },
        warning: 'هذه النتائج مبنية على معطيات مدخلة وليست تحليلاً كاملاً',
      };
    }

    return {
      success: true,
      result,
      context: {
        businessName: context!.businessName,
        businessType: context!.businessType,
        shouldAdvertise: context!.shouldAdvertise,
        maturityLevel: context!.maturityLevel,
      },
      warning: !context!.shouldAdvertise ? 'العميل غير جاهز للإعلان حالياً' : undefined,
      requiresAction: context!.criticalIssues.length > 0 ? context!.criticalIssues : undefined,
    };

  } catch (error: any) {
    console.error('[AI Brain] Error:', error);
    
    if (error.status === 429) {
      return {
        success: false,
        error: 'الخدمة مشغولة حالياً. يرجى المحاولة بعد قليل.',
      };
    }

    return {
      success: false,
      error: 'حدث خطأ أثناء المعالجة. يرجى المحاولة مرة أخرى.',
    };
  }
}

async function getRelevantKnowledge(tool: string, context: ClientContext): Promise<string> {
  try {
    const allKnowledge = await storage.getAllKnowledge();
    let knowledgeContext = "";
    
    if (allKnowledge.length > 0) {
      const relevantItems = allKnowledge
        .filter(item => {
          const tags = item.tags || [];
          return tags.some(tag => 
            context.businessType?.toLowerCase().includes(tag.toLowerCase()) ||
            tool.includes(tag.toLowerCase())
          );
        })
        .slice(0, 3);
      
      if (relevantItems.length === 0) {
        knowledgeContext = allKnowledge.slice(0, 2)
          .map(item => `[${item.category}] ${item.title}:\n${item.content}`)
          .join("\n\n");
      } else {
        knowledgeContext = relevantItems
          .map(item => `[${item.category}] ${item.title}:\n${item.content}`)
          .join("\n\n");
      }
    }
    
    const learningContext = await retrieveSimilarCases({
      tool,
      industryType: context.businessType || undefined,
      goal: undefined,
      channel: context.recommendedChannel || undefined,
    });
    
    return [knowledgeContext, learningContext].filter(Boolean).join("\n");
  } catch (error) {
    console.error("[AI Brain] Error fetching knowledge:", error);
    return "";
  }
}

function buildToolUserMessage(tool: string, inputs: Record<string, any>, context: ClientContext): string {
  const baseContext = `
[السياق التلقائي]
النشاط: ${context.businessName || context.businessType || 'غير محدد'}
التقييم: ${context.overallScore}/100
الجاهزية: ${context.shouldAdvertise ? 'جاهز' : 'غير جاهز'}
`;

  switch (tool) {
    case 'campaign_brain':
      return `${baseContext}
[طلب المستخدم]
الهدف: ${inputs.goal || 'زيادة المبيعات'}
المنصة المفضلة: ${inputs.platform || context.recommendedChannel || 'أي منصة'}
الميزانية: ${inputs.budget || context.budgetRange || 'غير محدد'}
المدة: ${inputs.duration || '30 يوم'}

أريد أفكار حملات مخصصة لهذا النشاط تحديداً.`;

    case 'content_studio':
      return `${baseContext}
[طلب المستخدم]
نوع المحتوى: ${inputs.contentType || 'منشور'}
الموضوع: ${inputs.prompt || 'محتوى ترويجي'}
النبرة: ${inputs.tone || 'احترافي'}

اكتب محتوى مخصص يعكس طبيعة هذا النشاط.`;

    case 'campaign_planner':
      return `${baseContext}
[طلب المستخدم]
الميزانية: ${inputs.budget || context.budgetRange || 'غير محدد'} ريال
المدة: ${inputs.duration || '30'} يوم
الهدف: ${inputs.objective || 'زيادة المبيعات'}
المنصة: ${inputs.platform || context.recommendedChannel || 'أي منصة'}

خطط حملة تناسب وضع هذا العميل.`;

    default:
      return `${baseContext}\n${JSON.stringify(inputs)}`;
  }
}

function buildGuidedUserMessage(inputs: Record<string, any>, tool: string = 'campaign_brain_guided'): string {
  const goalMap: Record<string, string> = {
    awareness: 'زيادة الوعي بالعلامة التجارية',
    brand_awareness: 'زيادة الوعي بالعلامة التجارية',
    sales: 'زيادة المبيعات',
    sales_conversions: 'زيادة المبيعات/التحويلات',
    traffic: 'زيادة الزيارات',
    followers_engagement: 'زيادة المتابعين والتفاعل',
    engagement: 'زيادة التفاعل مع الجمهور',
    conversion: 'زيادة التحويلات والمبيعات',
    retention: 'الاحتفاظ بالعملاء الحاليين',
    downloads: 'زيادة تحميلات التطبيق',
    leads: 'جلب عملاء محتملين',
    promotion: 'الترويج لعرض/خصم',
    launch: 'إطلاق منتج/خدمة جديدة',
    retargeting: 'تذكير وإعادة استهداف',
  };

  const budgetMap: Record<string, string> = {
    low: 'أقل من 5,000 ريال',
    medium: '5,000 - 20,000 ريال',
    high: '20,000 - 50,000 ريال',
    unlimited: 'أكثر من 50,000 ريال',
    lt_1000: 'أقل من 1,000 ريال',
    '1000_3000': '1,000 - 3,000 ريال',
    '3000_7000': '3,000 - 7,000 ريال',
    '7000_15000': '7,000 - 15,000 ريال',
    '15000_30000': '15,000 - 30,000 ريال',
    '30000_50000': '30,000 - 50,000 ريال',
    gt_50000: 'أكثر من 50,000 ريال',
    open: 'مفتوح / حسب الحاجة',
  };

  const platformMap: Record<string, string> = {
    instagram: 'انستقرام',
    instagram_meta: 'Instagram/Meta',
    twitter: 'تويتر / X',
    twitter_x: 'Twitter/X',
    tiktok: 'تيك توك',
    snapchat: 'سناب شات',
    youtube: 'يوتيوب',
    google: 'قوقل أدز',
    google_ads: 'Google Ads',
    linkedin: 'LinkedIn',
    multi: 'متعدد',
  };

  const platformNames = inputs.platforms?.map((p: string) => platformMap[p] || p).join('، ') || 'غير محدد';

  const baseInputs = `
[المعطيات الأساسية]
نوع النشاط: ${inputs.businessType || 'غير محدد'}
الفئة المستهدفة: ${inputs.targetAudience || 'غير محدد'}
الهدف: ${goalMap[inputs.goal] || inputs.goal || 'غير محدد'}
المنصة: ${platformNames}
الميزانية: ${budgetMap[inputs.budget] || 'غير محدد'}
`;

  if (tool.includes('content_studio')) {
    return `${baseInputs}
[المطلوب]
الموضوع: ${inputs.prompt || 'غير محدد'}
نوع المحتوى: ${inputs.contentType || 'منشور'}
النبرة: ${inputs.tone || 'احترافي'}

اكتب محتوى احترافياً جاهزاً للنشر مع headline وcta وhashtags وbestPostTime.
قدّم 2-3 نسخ بديلة ونصائح تفاعل وقياس.`;
  }

  if (tool.includes('campaign_planner')) {
    return `${baseInputs}
[المطلوب]
المدة: ${inputs.duration || '30 يوم'}
هدف الحملة: ${goalMap[inputs.objective] || inputs.objective || inputs.goal || 'زيادة المبيعات'}

خطط حملة كاملة بمراحل وميزانية يومية وتوقعات وصول ونقرات وتحويلات وROAS وCPA.
أضف خطة بديلة لو الأداء ضعيف وخطوات تالية واضحة.`;
  }

  return `${baseInputs}

[المطلوب]
أفكار حملات موجّهة مع زوايا (Angles) و CTA مناسب للهدف والمنصة.
قدم أفكاراً عملية وسريعة التطبيق.`;
}

export async function validateAnalysisRequired(analysisId: number | undefined, userId?: string): Promise<{valid: boolean; error?: string; warning?: string; analysisId?: number}> {
  if (!analysisId) {
    return {
      valid: true,
      warning: 'التحليل مفصّل أكثر مع تحليل الموقع، لكن يمكنك المتابعة',
    };
  }

  if (!userId) {
    return {
      valid: false,
      error: 'يجب تسجيل الدخول لاستخدام هذه الأداة.',
    };
  }

  const context = await getClientContext(analysisId, userId);
  if (!context) {
    return {
      valid: false,
      error: 'التحليل غير موجود أو لا يمكنك الوصول إليه. يرجى إجراء تحليل جديد.',
    };
  }

  return { valid: true, analysisId: context.analysisId };
}
