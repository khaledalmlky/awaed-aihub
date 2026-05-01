export const ageRanges = [
  { value: "13-17", label: "13-17 (مراهقين)" },
  { value: "18-24", label: "18-24 (شباب)" },
  { value: "25-34", label: "25-34 (شباب بالغين)" },
  { value: "35-44", label: "35-44 (متوسطي العمر)" },
  { value: "45-54", label: "45-54 (بالغين)" },
  { value: "55+", label: "55+ (كبار السن)" },
];

export const genders = [
  { value: "mixed", label: "مختلط" },
  { value: "male", label: "ذكور" },
  { value: "female", label: "إناث" },
];

export const socialSegments = [
  { value: "students", label: "طلاب (ثانوي/جامعي)" },
  { value: "employees", label: "موظفين (قطاع عام/خاص)" },
  { value: "business_owners", label: "أصحاب أعمال (رواد أعمال/ملاك مشاريع)" },
  { value: "housewives", label: "ربات بيوت" },
  { value: "mothers", label: "أمهات" },
  { value: "retirees", label: "متقاعدين" },
  { value: "job_seekers", label: "باحثين عن عمل" },
];

export const regions = [
  { value: "riyadh", label: "الرياض" },
  { value: "jeddah_makkah", label: "جدة ومكة" },
  { value: "eastern", label: "الشرقية (الدمام/الخبر/الظهران)" },
  { value: "madinah", label: "المدينة المنورة" },
  { value: "asir", label: "عسير (أبها/خميس مشيط)" },
  { value: "qassim", label: "القصيم (بريدة/عنيزة)" },
  { value: "tabuk", label: "تبوك" },
  { value: "hail", label: "حائل" },
  { value: "jazan", label: "جازان" },
  { value: "najran", label: "نجران" },
  { value: "baha", label: "الباحة" },
  { value: "jouf", label: "الجوف" },
  { value: "northern_borders", label: "الحدود الشمالية" },
  { value: "ksa", label: "السعودية (كامل المملكة)" },
  { value: "gcc", label: "دول الخليج" },
  { value: "mixed", label: "مختلط" },
];

export const adPlatforms = [
  { id: "snapchat", value: "snapchat", label: "Snapchat (الأقوى للشباب 18-30)", shortLabel: "Snapchat" },
  { id: "instagram_meta", value: "instagram_meta", label: "Instagram/Meta (الأكثر شمولية)", shortLabel: "Instagram/Meta" },
  { id: "tiktok", value: "tiktok", label: "TikTok (للمحتوى الترفيهي)", shortLabel: "TikTok" },
  { id: "twitter_x", value: "twitter_x", label: "Twitter/X (للنقاشات)", shortLabel: "Twitter/X" },
  { id: "youtube", value: "youtube", label: "YouTube (المحتوى الطويل)", shortLabel: "YouTube" },
  { id: "google_ads", value: "google_ads", label: "Google Ads (نية الشراء)", shortLabel: "Google Ads" },
  { id: "linkedin", value: "linkedin", label: "LinkedIn (المهنيين)", shortLabel: "LinkedIn" },
  { id: "multi", value: "multi", label: "متعدد (يستخدم أكثر من منصة)", shortLabel: "متعدد" },
];

export const performancePlatforms = adPlatforms
  .filter((platform) => platform.value !== "multi")
  .map((platform) => ({
    value: platform.value,
    label: platform.shortLabel || platform.label,
  }));

export const businessTypes = [
  { value: "ecommerce", label: "متاجر إلكترونية (أزياء/إلكترونيات/منتجات)" },
  { value: "restaurants_cafes", label: "مطاعم وكافيهات" },
  { value: "beauty_care", label: "خدمات تجميل وعناية" },
  { value: "real_estate", label: "عقارات" },
  { value: "education_training", label: "تعليم وتدريب" },
  { value: "health_fitness", label: "صحة ولياقة" },
  { value: "professional_services", label: "استشارات وخدمات مهنية" },
  { value: "tourism_travel", label: "سياحة وسفر" },
  { value: "tech_apps", label: "تقنية وتطبيقات" },
  { value: "handmade", label: "منتجات يدوية وحرفية" },
  { value: "food_projects", label: "مشاريع غذائية" },
  { value: "home_services", label: "خدمات منزلية" },
  { value: "events", label: "فعاليات ومناسبات" },
  { value: "other", label: "أخرى" },
];

export const budgetRanges = [
  { value: "lt_1000", label: "أقل من 1,000 ريال" },
  { value: "1000_3000", label: "1,000 - 3,000 ريال" },
  { value: "3000_7000", label: "3,000 - 7,000 ريال" },
  { value: "7000_15000", label: "7,000 - 15,000 ريال" },
  { value: "15000_30000", label: "15,000 - 30,000 ريال" },
  { value: "30000_50000", label: "30,000 - 50,000 ريال" },
  { value: "gt_50000", label: "أكثر من 50,000 ريال" },
  { value: "open", label: "مفتوح / حسب الحاجة" },
];

export const campaignGoals = [
  { value: "brand_awareness", label: "زيادة الوعي بالعلامة التجارية (Brand Awareness)" },
  { value: "followers_engagement", label: "زيادة المتابعين والتفاعل" },
  { value: "sales_conversions", label: "زيادة المبيعات/التحويلات" },
  { value: "leads", label: "جلب عملاء محتملين (Leads)" },
  { value: "promotion", label: "الترويج لعرض/خصم" },
  { value: "launch", label: "إطلاق منتج/خدمة جديدة" },
  { value: "retargeting", label: "تذكير وإعادة استهداف (Retargeting)" },
  { value: "traffic", label: "زيادة زيارات الموقع/المتجر" },
];

export const campaignDurations = [
  { value: "3_days", label: "3 أيام (حملة قصيرة)" },
  { value: "7_days", label: "7 أيام (أسبوع)" },
  { value: "14_days", label: "14 يوم (أسبوعين)" },
  { value: "30_days", label: "30 يوم (شهر)" },
  { value: "60_days", label: "60 يوم (شهرين)" },
  { value: "90_days", label: "90 يوم (3 أشهر)" },
  { value: "ongoing", label: "مستمر (طويل الأمد)" },
];

export const marketingSeasons = [
  { value: "normal", label: "عادي (بدون موسم خاص)" },
  { value: "ramadan_eid", label: "رمضان والعيد" },
  { value: "national_day", label: "اليوم الوطني (سبتمبر)" },
  { value: "black_white_friday", label: "بلاك/وايت فرايدي (نوفمبر)" },
  { value: "riyadh_jeddah_season", label: "موسم الرياض/جدة" },
  { value: "back_to_school", label: "العودة للمدارس (أغسطس)" },
  { value: "summer", label: "الصيف والإجازات" },
  { value: "winter", label: "الشتاء" },
  { value: "custom", label: "حملة موسمية مخصصة" },
];

export const contentTypes = [
  { value: "brand_awareness_post", label: "منشور تعريفي (Brand Awareness Post)" },
  { value: "promotional", label: "منشور عرض/خصم (Promotional)" },
  { value: "testimonial", label: "قصة عميل/شهادة (Testimonial)" },
  { value: "educational", label: "منشور تعليمي/معلومة (Educational)" },
  { value: "engagement", label: "منشور مشاركة وتفاعل (Engagement)" },
  { value: "product_ad", label: "إعلان منتج/خدمة (Product Ad)" },
  { value: "seasonal", label: "منشور مناسبة/موسم (Seasonal)" },
  { value: "short_video", label: "فيديو قصير (Reels/TikTok)" },
  { value: "ugc", label: "منشور صوت العميل (UGC Style)" },
];

export const tones = [
  { value: "formal_professional", label: "احترافية رسمية" },
  { value: "friendly", label: "ودودة وقريبة" },
  { value: "inspiring", label: "حماسية وملهمة" },
  { value: "funny", label: "مرحة وفكاهية" },
  { value: "luxury", label: "فاخرة وأنيقة" },
  { value: "direct", label: "بسيطة ومباشرة" },
  { value: "educational_trusted", label: "تعليمية وموثوقة" },
];

export const interests = [
  { id: "sports_fitness", label: "رياضة ولياقة" },
  { id: "fashion", label: "موضة وأناقة" },
  { id: "food", label: "طعام ومطاعم" },
  { id: "travel", label: "سفر وسياحة" },
  { id: "technology", label: "تقنية وأجهزة" },
  { id: "cars", label: "سيارات" },
  { id: "real_estate_investment", label: "عقارات واستثمار" },
  { id: "education_self_dev", label: "تعليم وتطوير ذاتي" },
  { id: "family_children", label: "أسرة وأطفال" },
  { id: "beauty_makeup", label: "جمال ومكياج" },
  { id: "gaming_entertainment", label: "ألعاب وترفيه" },
  { id: "arts_creativity", label: "فنون وإبداع" },
  { id: "religious_values", label: "ديني وقيم" },
  { id: "health_wellness", label: "صحة وعافية" },
];

export function optionLabel(options: Array<{ value?: string; id?: string; label: string }>, value: string) {
  return options.find((option) => option.value === value || option.id === value)?.label || value;
}

export function optionLabels(options: Array<{ value?: string; id?: string; label: string }>, values: string[]) {
  return values.map((value) => optionLabel(options, value));
}
