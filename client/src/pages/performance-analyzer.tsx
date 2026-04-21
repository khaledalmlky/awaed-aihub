import { useState } from 'react';
import AppLayout from '@/components/layout/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AnalysisLoading } from '@/components/ui/analysis-loading';
import { AnalysisActions } from '@/components/ui/analysis-actions';
import {
  BarChart3,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  MousePointer,
  Eye,
  Share2,
  AlertCircle,
  CheckCircle2,
  Zap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';

type Platform = 'meta' | 'tiktok' | 'snapchat' | 'google';

interface PlatformBlock {
  id: string;
  platform: Platform;
  spend: string;
  impressions: string;
  clicks: string;
  conversions: string;
  revenue: string;
  reach: string;
  videoViews: string;
  engagement: string;
}

interface PlatformKPIs {
  platform: string;
  label: string;
  metrics: any;
  kpis: {
    CPA: number | null;
    ROAS: number | null;
    CTR: number | null;
    CPC: number | null;
    CPM: number | null;
    CVR: number | null;
  };
}

interface AnalysisResult {
  id: number;
  overallRating: 'قوي' | 'متوسط' | 'ضعيف';
  observations: string[];
  recommendation: string;
  decisionReasoning: {
    mainReason: string;
    evidence: string[];
    risks: string;
  };
  crossPlatformSummary: string;
  platformsWithKPIs: PlatformKPIs[];
}

const platformOptions = [
  { value: 'meta', label: 'ميتا (فيسبوك/إنستقرام)', icon: Share2 },
  { value: 'tiktok', label: 'تيك توك', icon: BarChart3 },
  { value: 'snapchat', label: 'سناب شات', icon: Zap },
  { value: 'google', label: 'قوقل', icon: Target },
];

const getRatingColor = (rating: string) => {
  if (rating === 'قوي') return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
  if (rating === 'متوسط') return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
  return 'text-red-400 bg-red-500/10 border-red-500/30';
};

const getRatingIcon = (rating: string) => {
  if (rating === 'قوي') return <CheckCircle2 className="w-6 h-6" />;
  if (rating === 'متوسط') return <AlertCircle className="w-6 h-6" />;
  return <AlertCircle className="w-6 h-6" />;
};

export default function PerformanceAnalyzer() {
  const { user } = useAuth();
  const [platforms, setPlatforms] = useState<PlatformBlock[]>([]);
  const [campaignGoal, setCampaignGoal] = useState('');
  const [industryType, setIndustryType] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const addPlatform = () => {
    const newPlatform: PlatformBlock = {
      id: `platform-${Date.now()}`,
      platform: 'meta',
      spend: '',
      impressions: '',
      clicks: '',
      conversions: '',
      revenue: '',
      reach: '',
      videoViews: '',
      engagement: '',
    };
    setPlatforms([...platforms, newPlatform]);
  };

  const removePlatform = (id: string) => {
    setPlatforms(platforms.filter(p => p.id !== id));
  };

  const updatePlatform = (id: string, field: keyof PlatformBlock, value: string) => {
    setPlatforms(platforms.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const validatePlatform = (platform: PlatformBlock): boolean => {
    if (!platform.spend || parseFloat(platform.spend) <= 0) return false;
    return true;
  };

  const handleAnalyze = async () => {
    if (platforms.length === 0) {
      setError('يجب إضافة منصة واحدة على الأقل');
      return;
    }

    const invalidPlatforms = platforms.filter(p => !validatePlatform(p));
    if (invalidPlatforms.length > 0) {
      setError('يرجى التأكد من إدخال الإنفاق لكل منصة');
      return;
    }

    setIsLoading(true);
    setLoadingStep(0);
    setError(null);

    const loadingInterval = setInterval(() => {
      setLoadingStep(prev => (prev < 3 ? prev + 1 : prev));
    }, 1500);

    try {
      const requestData = {
        platforms: platforms.map(p => ({
          platform: p.platform,
          spend: parseFloat(p.spend) || 0,
          impressions: p.impressions ? parseFloat(p.impressions) : undefined,
          clicks: p.clicks ? parseFloat(p.clicks) : undefined,
          conversions: p.conversions ? parseFloat(p.conversions) : undefined,
          revenue: p.revenue ? parseFloat(p.revenue) : undefined,
          reach: p.reach ? parseFloat(p.reach) : undefined,
          videoViews: p.videoViews ? parseFloat(p.videoViews) : undefined,
          engagement: p.engagement ? parseFloat(p.engagement) : undefined,
        })),
        campaignGoal: campaignGoal || undefined,
        industryType: industryType || undefined,
      };

      const response = await fetch('/api/performance/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'فشل التحليل');
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء التحليل');
    } finally {
      clearInterval(loadingInterval);
      setIsLoading(false);
      setLoadingStep(0);
    }
  };

  const handleReset = () => {
    setPlatforms([]);
    setCampaignGoal('');
    setIndustryType('');
    setResult(null);
    setError(null);
  };

  const formatNumber = (num: number | null): string => {
    if (num === null) return '-';
    return num.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const renderKPIBadge = (label: string, value: number | null, unit: string = '', good: 'high' | 'low' = 'high') => {
    if (value === null) return null;
    
    const isGood = good === 'high' ? value > 0 : true;
    const color = isGood ? 'text-emerald-400' : 'text-amber-400';
    
    return (
      <div className="flex items-center justify-between p-3 bg-card/30 rounded-lg border border-border/30">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className={`text-lg font-bold ${color}`}>
          {formatNumber(value)}{unit}
        </span>
      </div>
    );
  };

  if (isLoading) {
    return (
      <AppLayout>
        <AnalysisLoading currentStep={loadingStep} />
      </AppLayout>
    );
  }

  if (result) {
    const resultText = `
📊 تحليل أداء الحملات - معيار عوائد

${result.platformsWithKPIs.map((p, idx) => `
📍 ${p.label}
الإنفاق: ${p.metrics.spend.toLocaleString('ar-SA')} ريال
${p.kpis.ROAS !== null ? `عائد الإنفاق (ROAS): ${p.kpis.ROAS.toFixed(2)}x` : ''}
${p.kpis.CPA !== null ? `تكلفة التحويل (CPA): ${p.kpis.CPA.toFixed(2)} ريال` : ''}
${p.kpis.CTR !== null ? `نسبة النقر (CTR): ${p.kpis.CTR.toFixed(2)}%` : ''}
`).join('\n')}

📈 التقييم العام: ${result.overallRating}

🔍 الملاحظات الرئيسية:
${result.observations.map((obs, idx) => `${idx + 1}. ${obs}`).join('\n')}

💡 التوصية:
${result.recommendation}

🎯 لماذا هذا القرار؟
السبب: ${result.decisionReasoning.mainReason}

الأدلة:
${result.decisionReasoning.evidence.map((e, idx) => `${idx + 1}. ${e}`).join('\n')}

⚠️ المخاطر في حال عدم التنفيذ:
${result.decisionReasoning.risks}

📊 ملخص عبر المنصات:
${result.crossPlatformSummary}

---
تم الإنشاء بواسطة معيار عوائد
    `.trim();

    return (
      <AppLayout>
        <div className="space-y-8 max-w-5xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold">تحليل أداء الحملات</h1>
              <p className="text-muted-foreground mt-2 text-lg">
                تحليل شامل لأداء حملاتك عبر المنصات المختلفة
              </p>
            </div>
            <Button onClick={handleReset} variant="outline" data-testid="button-reset">
              تحليل جديد
            </Button>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <Card className="bg-card/50 border-border/30">
              <CardHeader className="border-b border-border/30 pb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {getRatingIcon(result.overallRating)}
                    <div>
                      <CardTitle className="text-2xl">التقييم العام</CardTitle>
                      <Badge className={`mt-2 ${getRatingColor(result.overallRating)} text-base px-4 py-1`}>
                        {result.overallRating}
                      </Badge>
                    </div>
                  </div>
                  <AnalysisActions 
                    data={result}
                    title="تحليل أداء الحملات"
                  />
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-accent" />
                    أداء المنصات
                  </h3>
                  <div className="space-y-6">
                    {result.platformsWithKPIs.map((platform, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="p-6 bg-card/30 rounded-xl border border-border/30"
                      >
                        <h4 className="text-xl font-bold mb-4 text-accent">{platform.label}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          <div className="col-span-full p-4 bg-accent/5 rounded-lg border border-accent/20">
                            <span className="text-sm text-muted-foreground">إجمالي الإنفاق</span>
                            <div className="text-2xl font-bold text-accent mt-1">
                              {platform.metrics.spend.toLocaleString('ar-SA')} ريال
                            </div>
                          </div>
                          {renderKPIBadge('عائد الإنفاق (ROAS)', platform.kpis.ROAS, 'x')}
                          {renderKPIBadge('تكلفة التحويل (CPA)', platform.kpis.CPA, ' ريال', 'low')}
                          {renderKPIBadge('نسبة النقر (CTR)', platform.kpis.CTR, '%')}
                          {renderKPIBadge('تكلفة النقرة (CPC)', platform.kpis.CPC, ' ريال', 'low')}
                          {renderKPIBadge('تكلفة الألف ظهور (CPM)', platform.kpis.CPM, ' ريال', 'low')}
                          {renderKPIBadge('معدل التحويل (CVR)', platform.kpis.CVR, '%')}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {result.crossPlatformSummary && (
                  <div className="p-6 bg-accent/5 rounded-xl border border-accent/20">
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-accent" />
                      ملخص عبر المنصات
                    </h3>
                    <p className="text-foreground leading-relaxed">{result.crossPlatformSummary}</p>
                  </div>
                )}

                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Eye className="w-5 h-5 text-accent" />
                    الملاحظات الرئيسية
                  </h3>
                  <div className="space-y-3">
                    {result.observations.map((obs, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="flex gap-3 p-4 bg-card/30 rounded-lg border border-border/30"
                      >
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold">
                          {idx + 1}
                        </div>
                        <p className="flex-1 text-foreground pt-1">{obs}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="p-6 bg-gradient-to-br from-accent/10 to-accent/5 rounded-xl border border-accent/20">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Target className="w-5 h-5 text-accent" />
                    التوصية
                  </h3>
                  <p className="text-foreground text-lg leading-relaxed">{result.recommendation}</p>
                </div>

                <div className="p-6 bg-card/30 rounded-xl border border-border/30">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-accent" />
                    لماذا هذا القرار؟
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold text-accent mb-2">السبب الرئيسي:</h4>
                      <p className="text-foreground">{result.decisionReasoning.mainReason}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-accent mb-2">الأدلة:</h4>
                      <ul className="space-y-2">
                        {result.decisionReasoning.evidence.map((evidence, idx) => (
                          <li key={idx} className="flex gap-2 text-foreground">
                            <span className="text-accent">•</span>
                            <span>{evidence}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-red-400 mb-2">⚠️ المخاطر في حال عدم التنفيذ:</h4>
                      <p className="text-foreground">{result.decisionReasoning.risks}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-8 max-w-4xl mx-auto">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold">تحليل أداء الحملات</h1>
          <p className="text-muted-foreground mt-3 text-lg">
            حلل أداء حملاتك عبر منصات متعددة واحصل على توصيات مدعومة بالبيانات
          </p>
        </div>

        <Card className="bg-card/50 border-border/30">
          <CardHeader>
            <CardTitle>معلومات الحملة (اختياري)</CardTitle>
            <CardDescription>ساعدنا على فهم سياق حملتك للحصول على تحليل أفضل</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="campaignGoal">هدف الحملة</Label>
              <Input
                id="campaignGoal"
                placeholder="مثال: زيادة المبيعات، الوعي بالعلامة، جمع عملاء محتملين..."
                value={campaignGoal}
                onChange={(e) => setCampaignGoal(e.target.value)}
                data-testid="input-campaign-goal"
              />
            </div>
            <div>
              <Label htmlFor="industryType">نوع النشاط</Label>
              <Input
                id="industryType"
                placeholder="مثال: تجارة إلكترونية، خدمات، مطاعم..."
                value={industryType}
                onChange={(e) => setIndustryType(e.target.value)}
                data-testid="input-industry-type"
              />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">المنصات الإعلانية</h2>
            <Button onClick={addPlatform} data-testid="button-add-platform">
              <Plus className="w-4 h-4 ml-2" />
              إضافة منصة
            </Button>
          </div>

          {platforms.length === 0 && (
            <Card className="bg-card/30 border-border/30 border-dashed">
              <CardContent className="py-12 text-center">
                <BarChart3 className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-lg">
                  لم تضف أي منصة بعد. ابدأ بإضافة منصة واحدة على الأقل
                </p>
              </CardContent>
            </Card>
          )}

          <AnimatePresence>
            {platforms.map((platform, idx) => (
              <motion.div
                key={platform.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className="bg-card/50 border-border/30">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">منصة {idx + 1}</CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removePlatform(platform.id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        data-testid={`button-remove-platform-${idx}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>اختر المنصة *</Label>
                      <Select
                        value={platform.platform}
                        onValueChange={(value) => updatePlatform(platform.id, 'platform', value)}
                      >
                        <SelectTrigger data-testid={`select-platform-${idx}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {platformOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`spend-${platform.id}`}>
                          <DollarSign className="w-4 h-4 inline ml-1" />
                          الإنفاق (ريال) *
                        </Label>
                        <Input
                          id={`spend-${platform.id}`}
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={platform.spend}
                          onChange={(e) => updatePlatform(platform.id, 'spend', e.target.value)}
                          data-testid={`input-spend-${idx}`}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`revenue-${platform.id}`}>
                          <TrendingUp className="w-4 h-4 inline ml-1" />
                          الإيرادات (ريال)
                        </Label>
                        <Input
                          id={`revenue-${platform.id}`}
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={platform.revenue}
                          onChange={(e) => updatePlatform(platform.id, 'revenue', e.target.value)}
                          data-testid={`input-revenue-${idx}`}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`impressions-${platform.id}`}>
                          <Eye className="w-4 h-4 inline ml-1" />
                          مرات الظهور
                        </Label>
                        <Input
                          id={`impressions-${platform.id}`}
                          type="number"
                          min="0"
                          placeholder="0"
                          value={platform.impressions}
                          onChange={(e) => updatePlatform(platform.id, 'impressions', e.target.value)}
                          data-testid={`input-impressions-${idx}`}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`clicks-${platform.id}`}>
                          <MousePointer className="w-4 h-4 inline ml-1" />
                          النقرات
                        </Label>
                        <Input
                          id={`clicks-${platform.id}`}
                          type="number"
                          min="0"
                          placeholder="0"
                          value={platform.clicks}
                          onChange={(e) => updatePlatform(platform.id, 'clicks', e.target.value)}
                          data-testid={`input-clicks-${idx}`}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`conversions-${platform.id}`}>
                          <Target className="w-4 h-4 inline ml-1" />
                          التحويلات
                        </Label>
                        <Input
                          id={`conversions-${platform.id}`}
                          type="number"
                          min="0"
                          placeholder="0"
                          value={platform.conversions}
                          onChange={(e) => updatePlatform(platform.id, 'conversions', e.target.value)}
                          data-testid={`input-conversions-${idx}`}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`reach-${platform.id}`}>
                          <Share2 className="w-4 h-4 inline ml-1" />
                          الوصول
                        </Label>
                        <Input
                          id={`reach-${platform.id}`}
                          type="number"
                          min="0"
                          placeholder="0"
                          value={platform.reach}
                          onChange={(e) => updatePlatform(platform.id, 'reach', e.target.value)}
                          data-testid={`input-reach-${idx}`}
                        />
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground">
                      * الحقول المطلوبة. باقي الحقول اختيارية لكنها تحسن دقة التحليل
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
            {error}
          </div>
        )}

        <div className="flex gap-4">
          <Button
            onClick={handleAnalyze}
            disabled={platforms.length === 0}
            className="flex-1 bg-accent hover:bg-accent/90 text-[#0a1628]"
            size="lg"
            data-testid="button-analyze"
          >
            <BarChart3 className="w-5 h-5 ml-2" />
            تحليل الأداء
          </Button>
          {platforms.length > 0 && (
            <Button
              onClick={handleReset}
              variant="outline"
              size="lg"
              data-testid="button-clear"
            >
              مسح الكل
            </Button>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
