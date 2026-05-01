import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Lightbulb, Sparkles, AlertTriangle, Target, MessageSquare, Zap, FileText, Loader2, AlertCircle, ArrowLeft, CheckCircle2, XCircle, Trash2, DollarSign, TrendingUp, Users } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { Link } from 'wouter';
import { AnalysisLoading } from '@/components/ui/analysis-loading';
import { AnalysisActions } from '@/components/ui/analysis-actions';
import {
  adPlatforms,
  ageRanges,
  budgetRanges,
  businessTypes,
  campaignDurations,
  campaignGoals,
  genders,
  interests,
  marketingSeasons,
  optionLabel,
  regions,
  socialSegments,
} from '@/lib/marketing-options';
import { ExecutiveSummary, IconList, NextStepsTimeline, ReportStatGrid, ToolModeTabs } from '@/components/ai/tool-report-widgets';

type Mode = 'full' | 'custom';

type PlatformId = 'snapchat' | 'instagram_meta' | 'tiktok' | 'twitter_x' | 'youtube' | 'google_ads' | 'linkedin';

interface PerformanceMetrics {
  spend: string;
  impressions: string;
  clicks: string;
  conversions: string;
  revenue: string;
  reach: string;
  videoViews: string;
  engagement: string;
}

interface PlatformKpis {
  CPA: number | null;
  ROAS: number | null;
  CTR: number | null;
  CPC: number | null;
  CPM: number | null;
  CVR: number | null;
}

interface PlatformResult {
  platform: PlatformId;
  label: string;
  metrics: {
    platform: PlatformId;
    spend: number;
    impressions?: number;
    clicks?: number;
    conversions?: number;
    revenue?: number;
    reach?: number;
    videoViews?: number;
    engagement?: number;
  };
  kpis: PlatformKpis;
}

interface PerformanceResult {
  id?: number;
  cached?: boolean;
  overallRating: 'قوي' | 'متوسط' | 'ضعيف' | string;
  observations: string[];
  recommendation: string;
  decisionReasoning?: {
    mainReason?: string;
    evidence?: string[];
    risks?: string;
  };
  crossPlatformSummary?: string;
  platformsWithKPIs: PlatformResult[];
  meta?: {
    businessType: string;
    campaignGoal: string;
    timeRange: string;
    selectedMetrics: string[];
    websiteUrl?: string;
  };
}

const timeRanges = [
  { value: '7_days', label: 'آخر 7 أيام' },
  { value: '30_days', label: 'آخر 30 يوم' },
  { value: '90_days', label: 'آخر 90 يوم' },
  { value: 'custom', label: 'فترة مخصصة' },
];

const performanceMetricOptions = [
  { id: 'ROAS', label: 'ROAS - عائد الإنفاق' },
  { id: 'CTR', label: 'CTR - نسبة النقر' },
  { id: 'CPC', label: 'CPC - تكلفة النقرة' },
  { id: 'CPA', label: 'CPA - تكلفة التحويل' },
  { id: 'CPM', label: 'CPM - تكلفة الألف ظهور' },
  { id: 'CVR', label: 'CVR - معدل التحويل' },
  { id: 'conversions', label: 'التحويلات' },
  { id: 'reach', label: 'الوصول' },
  { id: 'engagement', label: 'التفاعل' },
  { id: 'videoViews', label: 'مشاهدات الفيديو' },
];

const defaultMetrics: PerformanceMetrics = {
  spend: '',
  impressions: '',
  clicks: '',
  conversions: '',
  revenue: '',
  reach: '',
  videoViews: '',
  engagement: '',
};

const supportedPlatforms = adPlatforms.filter((platform) => platform.value !== 'multi');

const formatValue = (value?: number | string | null, suffix = '') => {
  if (value === undefined || value === null || value === '') return 'غير محدد';
  const formatted = typeof value === 'number'
    ? value.toLocaleString('ar-SA', { maximumFractionDigits: 2 })
    : value;
  return `${formatted}${suffix}`;
};

const parseOptionalNumber = (value: string) => {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const kpiNeedsField = (selectedMetrics: string[], field: keyof PerformanceMetrics) => {
  if (field === 'spend') return true;
  if (field === 'revenue') return selectedMetrics.includes('ROAS');
  if (field === 'impressions') return selectedMetrics.some((metric) => ['CTR', 'CPM'].includes(metric));
  if (field === 'clicks') return selectedMetrics.some((metric) => ['CTR', 'CPC', 'CVR'].includes(metric));
  if (field === 'conversions') return selectedMetrics.some((metric) => ['CPA', 'CVR', 'conversions'].includes(metric));
  if (field === 'reach') return selectedMetrics.includes('reach');
  if (field === 'videoViews') return selectedMetrics.includes('videoViews');
  if (field === 'engagement') return selectedMetrics.includes('engagement');
  return false;
};

export default function PerformanceAnalyzer() {
  useAuth();
  const [mode, setMode] = useState<Mode>('custom');
  const [formData, setFormData] = useState({
    businessType: '',
    timeRange: '',
    campaignGoal: '',
    websiteUrl: '',
    selectedPlatforms: [] as PlatformId[],
    selectedMetrics: ['ROAS', 'CTR', 'CPC', 'conversions'] as string[],
    platformMetrics: {} as Record<string, PerformanceMetrics>,
  });
  const [result, setResult] = useState<PerformanceResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const response = await fetch('/api/performance/history', {
        credentials: 'include',
      });
      if (response.status === 401) {
        setNeedsLogin(true);
      }
    } catch (err) {
      console.error('Error checking performance session:', err);
    } finally {
      setIsCheckingSession(false);
    }
  };

  const handlePlatformToggle = (platformId: string, checked: boolean | 'indeterminate') => {
    const selectedPlatforms = checked
      ? [...formData.selectedPlatforms, platformId as PlatformId]
      : formData.selectedPlatforms.filter((platform) => platform !== platformId);

    setFormData({
      ...formData,
      selectedPlatforms,
      platformMetrics: {
        ...formData.platformMetrics,
        [platformId]: formData.platformMetrics[platformId] || { ...defaultMetrics },
      },
    });
    setResult(null);
    setError(null);
  };

  const handleMetricToggle = (metricId: string, checked: boolean | 'indeterminate') => {
    setFormData({
      ...formData,
      selectedMetrics: checked
        ? [...formData.selectedMetrics, metricId]
        : formData.selectedMetrics.filter((metric) => metric !== metricId),
    });
    setResult(null);
    setError(null);
  };

  const updatePlatformMetric = (platformId: PlatformId, field: keyof PerformanceMetrics, value: string) => {
    setFormData({
      ...formData,
      platformMetrics: {
        ...formData.platformMetrics,
        [platformId]: {
          ...(formData.platformMetrics[platformId] || defaultMetrics),
          [field]: value,
        },
      },
    });
  };

  const validateForm = () => {
    if (!formData.businessType || !formData.campaignGoal || !formData.timeRange) {
      setError('يرجى تعبئة نوع النشاط، الفترة الزمنية، ونوع الحملة');
      return false;
    }

    if (formData.selectedPlatforms.length === 0) {
      setError('يرجى اختيار منصة إعلانية واحدة على الأقل');
      return false;
    }

    if (formData.selectedMetrics.length === 0) {
      setError('يرجى اختيار مؤشر أداء واحد على الأقل');
      return false;
    }

    const missingSpend = formData.selectedPlatforms.some((platformId) => {
      const spend = Number(formData.platformMetrics[platformId]?.spend);
      return !Number.isFinite(spend) || spend <= 0;
    });

    if (missingSpend) {
      setError('يرجى إدخال الميزانية المصروفة لكل منصة مختارة');
      return false;
    }

    return true;
  };

  const buildRequestBody = () => ({
    platforms: formData.selectedPlatforms.map((platformId) => {
      const metrics = formData.platformMetrics[platformId] || defaultMetrics;
      return {
        platform: platformId,
        spend: Number(metrics.spend) || 0,
        impressions: parseOptionalNumber(metrics.impressions),
        clicks: parseOptionalNumber(metrics.clicks),
        conversions: parseOptionalNumber(metrics.conversions),
        revenue: parseOptionalNumber(metrics.revenue),
        reach: parseOptionalNumber(metrics.reach),
        videoViews: parseOptionalNumber(metrics.videoViews),
        engagement: parseOptionalNumber(metrics.engagement),
      };
    }),
    campaignGoal: formData.campaignGoal,
    industryType: formData.businessType,
  });

  const handleAnalyze = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    setLoadingStep(0);
    setError(null);
    setResult(null);

    try {
      setLoadingStep(1);
      const response = await fetch('/api/performance/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(buildRequestBody()),
      });

      setLoadingStep(2);
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          setNeedsLogin(true);
          return;
        }
        throw new Error(data.error || 'حدث خطأ غير متوقع');
      }

      setLoadingStep(3);
      setResult({
        ...data,
        meta: {
          businessType: optionLabel(businessTypes, formData.businessType),
          campaignGoal: optionLabel(campaignGoals, formData.campaignGoal),
          timeRange: optionLabel(timeRanges, formData.timeRange),
          selectedMetrics: formData.selectedMetrics,
          websiteUrl: formData.websiteUrl || undefined,
        },
      });
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تحليل الأداء');
    } finally {
      setIsLoading(false);
      setLoadingStep(0);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
    setFormData({
      businessType: '',
      timeRange: '',
      campaignGoal: '',
      websiteUrl: '',
      selectedPlatforms: [],
      selectedMetrics: ['ROAS', 'CTR', 'CPC', 'conversions'],
      platformMetrics: {},
    });
  };

  const totalSpend = result?.platformsWithKPIs?.reduce((sum, platform) => sum + (Number(platform.metrics.spend) || 0), 0) || 0;
  const bestRoas = Math.max(0, ...(result?.platformsWithKPIs?.map((platform) => platform.kpis.ROAS || 0) || [0]));
  const bestCtr = Math.max(0, ...(result?.platformsWithKPIs?.map((platform) => platform.kpis.CTR || 0) || [0]));
  const totalConversions = result?.platformsWithKPIs?.reduce((sum, platform) => sum + (Number(platform.metrics.conversions) || 0), 0) || 0;
  const ratingTone = result?.overallRating === 'قوي' ? 'green' : result?.overallRating === 'ضعيف' ? 'amber' : 'blue';
  const referenceOptionsCount = ageRanges.length + genders.length + regions.length + socialSegments.length + interests.length + marketingSeasons.length + campaignDurations.length + budgetRanges.length;

  if (isCheckingSession) {
    return (
      <AppLayout>
        <div className="h-96 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (needsLogin) {
    return (
      <AppLayout>
        <div className="space-y-8 lg:space-y-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
              <Lightbulb className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">تحليل أداء الحملات</h1>
              <p className="text-muted-foreground">تحليل مؤشرات الحملات الإعلانية</p>
            </div>
          </div>

          <Card className="glass border-0">
            <CardContent className="py-16">
              <div className="text-center space-y-8 lg:space-y-10">
                <div className="w-20 h-20 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
                  <AlertCircle className="w-10 h-10 text-red-500" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold">يجب تسجيل الدخول</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    لاستخدام تحليل أداء الحملات، يرجى تسجيل الدخول أولاً.
                  </p>
                </div>
                <Link href="/login">
                  <Button className="bg-gradient-to-l from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white">
                    <ArrowLeft className="w-4 h-4 ml-2" />
                    تسجيل الدخول
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-10 lg:space-y-14 text-right" dir="rtl">
        <div className="flex flex-row-reverse items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-xl">
            <Lightbulb className="w-8 h-8 text-white" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold">تحليل أداء الحملات</h1>
            <p className="text-muted-foreground text-lg mt-2">
              {mode === 'full' ? 'تحليل مفصل لمؤشرات الحملات الإعلانية' : 'تحليل سريع مبني على بيانات الأداء المدخلة'}
            </p>
          </div>
        </div>

        <ToolModeTabs
          value={mode === 'custom' ? 'quick' : 'detailed'}
          hasAnalyses
          onValueChange={(value) => {
            setMode(value === 'quick' ? 'custom' : 'full');
            setResult(null);
            setError(null);
          }}
        />

        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 flex flex-row-reverse items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <p className="text-amber-400">
            أدخل أرقام الأداء المتاحة فقط. دقة التحليل تتحسن عند إدخال الإنفاق، الظهور، النقرات، التحويلات، والإيرادات.
          </p>
        </div>

        {result?.meta && (
          <Card className="border-0 bg-blue-500/10 border border-blue-500/20">
            <CardContent className="py-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <FileText className="w-6 h-6 text-blue-500" />
                    <div>
                      <p className="font-semibold">ملخص مدخلات التحليل</p>
                      <p className="text-sm text-muted-foreground">{result.meta.timeRange}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={result.overallRating === 'قوي' ? 'bg-emerald-500/20 text-emerald-400' : result.overallRating === 'ضعيف' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}>
                    {result.overallRating}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{result.meta.businessType}</Badge>
                  <Badge variant="outline" className="bg-emerald-500/20">{result.meta.campaignGoal}</Badge>
                  <Badge variant="outline">{result.meta.selectedMetrics.join(' • ')}</Badge>
                  {result.meta.websiteUrl && <Badge variant="outline">{result.meta.websiteUrl}</Badge>}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.3fr] gap-8 lg:gap-12">
          <form className="bg-card/50 rounded-2xl p-6 lg:p-8 border border-border/30 text-right" dir="rtl" onSubmit={(e) => { e.preventDefault(); handleAnalyze(); }}>
            <h2 className="text-xl font-semibold mb-2">بيانات أداء الحملة</h2>
            <p className="text-muted-foreground mb-6">أدخل المنصات والمؤشرات المتاحة ليتم تحليل الأداء</p>

            <div className="space-y-5">
              <div className="space-y-4 rounded-xl border border-border/30 bg-background/30 p-4" dir="rtl">
                <div>
                  <h3 className="font-semibold flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-500" />
                    معلومات الحملة
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">هذه الحقول ترسل كـ industryType و campaignGoal إلى الخادم.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>نوع النشاط التجاري *</Label>
                    <Select value={formData.businessType} onValueChange={(value) => setFormData({ ...formData, businessType: value })}>
                      <SelectTrigger className="bg-background/50" data-testid="select-business-type">
                        <SelectValue placeholder="اختر نوع النشاط" />
                      </SelectTrigger>
                      <SelectContent>
                        {businessTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>نوع الحملة / الهدف *</Label>
                    <Select value={formData.campaignGoal} onValueChange={(value) => setFormData({ ...formData, campaignGoal: value })}>
                      <SelectTrigger className="bg-background/50" data-testid="select-campaign-goal">
                        <SelectValue placeholder="اختر هدف الحملة" />
                      </SelectTrigger>
                      <SelectContent>
                        {campaignGoals.map((goal) => (
                          <SelectItem key={goal.value} value={goal.value}>{goal.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>الفترة الزمنية *</Label>
                    <Select value={formData.timeRange} onValueChange={(value) => setFormData({ ...formData, timeRange: value })}>
                      <SelectTrigger className="bg-background/50" data-testid="select-time-range">
                        <SelectValue placeholder="اختر الفترة" />
                      </SelectTrigger>
                      <SelectContent>
                        {timeRanges.map((range) => (
                          <SelectItem key={range.value} value={range.value}>{range.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>رابط الموقع لتحليل الأداء التقني (اختياري)</Label>
                    <Input
                      value={formData.websiteUrl}
                      onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                      placeholder="https://example.com"
                      className="bg-background/50 text-right"
                      dir="ltr"
                      data-testid="input-website-url"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 rounded-xl border border-border/30 bg-background/30 p-4" dir="rtl">
                <div>
                  <h3 className="font-semibold flex items-center gap-2">
                    <Target className="w-4 h-4 text-cyan-500" />
                    المنصات الإعلانية
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">اختر المنصات التي تريد تحليلها. كل منصة ترسل كعنصر داخل platforms.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {supportedPlatforms.map((platform) => (
                    <div key={platform.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`performance-platform-${platform.id}`}
                        checked={formData.selectedPlatforms.includes(platform.id as PlatformId)}
                        onCheckedChange={(checked) => handlePlatformToggle(platform.id, checked)}
                        data-testid={`checkbox-platform-${platform.id}`}
                      />
                      <Label htmlFor={`performance-platform-${platform.id}`} className="text-sm cursor-pointer">
                        {platform.label}
                      </Label>
                    </div>
                  ))}
                </div>
                {formData.selectedPlatforms.length === 0 && (
                  <p className="text-xs text-muted-foreground">اختر منصة واحدة على الأقل لبدء التحليل.</p>
                )}
              </div>

              <div className="space-y-4 rounded-xl border border-border/30 bg-background/30 p-4" dir="rtl">
                <div>
                  <h3 className="font-semibold flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    المؤشرات التي تريد تحليلها
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">اختر المؤشرات المطلوبة لإظهار حقول البيانات المناسبة.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {performanceMetricOptions.map((metric) => (
                    <div key={metric.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`metric-${metric.id}`}
                        checked={formData.selectedMetrics.includes(metric.id)}
                        onCheckedChange={(checked) => handleMetricToggle(metric.id, checked)}
                        data-testid={`checkbox-metric-${metric.id}`}
                      />
                      <Label htmlFor={`metric-${metric.id}`} className="text-sm cursor-pointer">
                        {metric.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {formData.selectedPlatforms.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-blue-500" />
                    الميزانية المصروفة وبيانات الأداء
                  </h3>
                  {formData.selectedPlatforms.map((platformId) => {
                    const metrics = formData.platformMetrics[platformId] || defaultMetrics;
                    const platformLabel = optionLabel(adPlatforms, platformId);
                    return (
                      <Card key={platformId} className="bg-background/30 border-border/30" dir="rtl">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center justify-between">
                            <span>{platformLabel}</span>
                            <Badge variant="outline">{platformId}</Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>الميزانية المصروفة (ريال) *</Label>
                              <Input
                                value={metrics.spend}
                                onChange={(e) => updatePlatformMetric(platformId, 'spend', e.target.value)}
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0"
                                className="bg-background/50 text-right"
                                data-testid={`input-spend-${platformId}`}
                              />
                            </div>
                            {kpiNeedsField(formData.selectedMetrics, 'revenue') && (
                              <div className="space-y-2">
                                <Label>الإيرادات (لـ ROAS)</Label>
                                <Input value={metrics.revenue} onChange={(e) => updatePlatformMetric(platformId, 'revenue', e.target.value)} type="number" min="0" placeholder="0" className="bg-background/50 text-right" />
                              </div>
                            )}
                            {kpiNeedsField(formData.selectedMetrics, 'impressions') && (
                              <div className="space-y-2">
                                <Label>مرات الظهور</Label>
                                <Input value={metrics.impressions} onChange={(e) => updatePlatformMetric(platformId, 'impressions', e.target.value)} type="number" min="0" placeholder="0" className="bg-background/50 text-right" />
                              </div>
                            )}
                            {kpiNeedsField(formData.selectedMetrics, 'clicks') && (
                              <div className="space-y-2">
                                <Label>النقرات</Label>
                                <Input value={metrics.clicks} onChange={(e) => updatePlatformMetric(platformId, 'clicks', e.target.value)} type="number" min="0" placeholder="0" className="bg-background/50 text-right" />
                              </div>
                            )}
                            {kpiNeedsField(formData.selectedMetrics, 'conversions') && (
                              <div className="space-y-2">
                                <Label>التحويلات</Label>
                                <Input value={metrics.conversions} onChange={(e) => updatePlatformMetric(platformId, 'conversions', e.target.value)} type="number" min="0" placeholder="0" className="bg-background/50 text-right" />
                              </div>
                            )}
                            {kpiNeedsField(formData.selectedMetrics, 'reach') && (
                              <div className="space-y-2">
                                <Label>الوصول</Label>
                                <Input value={metrics.reach} onChange={(e) => updatePlatformMetric(platformId, 'reach', e.target.value)} type="number" min="0" placeholder="0" className="bg-background/50 text-right" />
                              </div>
                            )}
                            {kpiNeedsField(formData.selectedMetrics, 'videoViews') && (
                              <div className="space-y-2">
                                <Label>مشاهدات الفيديو</Label>
                                <Input value={metrics.videoViews} onChange={(e) => updatePlatformMetric(platformId, 'videoViews', e.target.value)} type="number" min="0" placeholder="0" className="bg-background/50 text-right" />
                              </div>
                            )}
                            {kpiNeedsField(formData.selectedMetrics, 'engagement') && (
                              <div className="space-y-2">
                                <Label>التفاعلات</Label>
                                <Input value={metrics.engagement} onChange={(e) => updatePlatformMetric(platformId, 'engagement', e.target.value)} type="number" min="0" placeholder="0" className="bg-background/50 text-right" />
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              <Input type="hidden" value={referenceOptionsCount} readOnly aria-hidden="true" />

              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
                <Button
                  type="submit"
                  disabled={isLoading || !formData.businessType || !formData.timeRange || !formData.campaignGoal || formData.selectedPlatforms.length === 0 || formData.selectedMetrics.length === 0}
                  className="w-full bg-gradient-to-l from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white h-12 rounded-xl text-base flex flex-row-reverse"
                  data-testid="button-analyze-performance"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                      جاري التحليل...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 ml-2" />
                      تحليل أداء الحملات
                    </>
                  )}
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button type="button" variant="outline" className="h-12 rounded-xl" data-testid="button-reset-form">
                      <Trash2 className="w-4 h-4 ml-2" />
                      مسح
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent dir="rtl">
                    <AlertDialogHeader>
                      <AlertDialogTitle>مسح بيانات التحليل</AlertDialogTitle>
                      <AlertDialogDescription>
                        سيتم حذف المدخلات الحالية من النموذج فقط. هل تريد المتابعة؟
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>إلغاء</AlertDialogCancel>
                      <AlertDialogAction onClick={handleReset} className="bg-red-500 hover:bg-red-600">
                        مسح
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </form>

          <div className="space-y-6">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  <p>{error}</p>
                </div>
              </motion.div>
            )}

            <AnimatePresence mode="wait">
              {!result && !isLoading && !error ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-64 flex items-center justify-center"
                >
                  <div className="text-center text-muted-foreground">
                    <Lightbulb className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p>أدخل بيانات الأداء واضغط "تحليل أداء الحملات"</p>
                    <p className="text-sm mt-2">النتائج ستعرض التقييم العام، المقارنات، والتوصيات التنفيذية</p>
                  </div>
                </motion.div>
              ) : isLoading ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <AnalysisLoading currentStep={loadingStep} />
                </motion.div>
              ) : result ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5" dir="rtl">
                  <ExecutiveSummary
                    icon={Lightbulb}
                    title="ملخص تحليل أداء الحملات"
                    summary={result.crossPlatformSummary || result.recommendation || 'تم إنشاء تحليل أداء للحملات الإعلانية.'}
                    badge={result.overallRating}
                  />

                  <ReportStatGrid
                    items={[
                      { icon: DollarSign, label: 'إجمالي الإنفاق', value: formatValue(totalSpend, ' ر.س'), tone: 'blue' },
                      { icon: TrendingUp, label: 'أفضل ROAS', value: formatValue(bestRoas, 'x'), tone: 'green' },
                      { icon: Users, label: 'المنصات', value: result.platformsWithKPIs.length, tone: 'purple' },
                      { icon: Target, label: 'التحويلات', value: formatValue(totalConversions), tone: ratingTone },
                    ]}
                  />

                  <div className="flex flex-row-reverse items-center justify-between flex-wrap gap-4" id="analysis-result" dir="rtl">
                    <p className="text-muted-foreground p-3 bg-card rounded-lg flex-1 text-right">
                      {result.recommendation || 'راجع تفاصيل المؤشرات لكل منصة قبل اتخاذ القرار.'}
                    </p>
                    <AnalysisActions data={result} title="تحليل أداء الحملات" />
                  </div>

                  <Card className="glass border-0 overflow-hidden" dir="rtl">
                    <CardHeader>
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <CardTitle className="text-lg">التقييم والقرار</CardTitle>
                        <Badge variant="outline" className={result.overallRating === 'قوي' ? 'bg-emerald-500/20 text-emerald-400' : result.overallRating === 'ضعيف' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}>
                          {result.overallRating === 'قوي' ? <CheckCircle2 className="w-4 h-4 ml-1 inline" /> : result.overallRating === 'ضعيف' ? <XCircle className="w-4 h-4 ml-1 inline" /> : <AlertCircle className="w-4 h-4 ml-1 inline" />}
                          {result.overallRating}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      {result.observations?.length > 0 && (
                        <div className="p-3 rounded-lg bg-background/50 text-right">
                          <div className="flex items-center gap-2 text-primary text-sm font-medium mb-2">
                            <Zap className="w-4 h-4" />
                            الملاحظات الرئيسية
                          </div>
                          <IconList items={result.observations} type="warning" />
                        </div>
                      )}

                      {result.decisionReasoning?.mainReason && (
                        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-right">
                          <div className="flex items-center gap-2 text-blue-400 text-sm font-medium mb-2">
                            <MessageSquare className="w-4 h-4" />
                            لماذا هذا القرار؟
                          </div>
                          <p className="text-sm text-right">{result.decisionReasoning.mainReason}</p>
                        </div>
                      )}

                      {result.decisionReasoning?.evidence && result.decisionReasoning.evidence.length > 0 && (
                        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-right">
                          <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium mb-2">
                            <CheckCircle2 className="w-4 h-4" />
                            الأدلة الداعمة
                          </div>
                          <IconList items={result.decisionReasoning.evidence} type="success" />
                        </div>
                      )}

                      {result.decisionReasoning?.risks && (
                        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-right">
                          <div className="flex items-center gap-2 text-amber-400 text-sm font-medium mb-2">
                            <AlertTriangle className="w-4 h-4" />
                            المخاطر في حال عدم التنفيذ
                          </div>
                          <p className="text-sm text-right">{result.decisionReasoning.risks}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {result.platformsWithKPIs.map((platform) => (
                    <Card key={platform.platform} className="glass border-0 overflow-hidden" dir="rtl">
                      <CardHeader>
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <CardTitle className="text-lg">{platform.label}</CardTitle>
                          <Badge variant="outline">{formatValue(platform.metrics.spend, ' ر.س')}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="p-3 rounded-lg bg-background/50 text-right">
                            <p className="text-xs text-muted-foreground">ROAS</p>
                            <p className="text-lg font-bold text-emerald-400">{platform.kpis.ROAS ? formatValue(platform.kpis.ROAS, 'x') : 'غير متاح'}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-background/50 text-right">
                            <p className="text-xs text-muted-foreground">CTR</p>
                            <p className="text-lg font-bold text-blue-400">{platform.kpis.CTR ? formatValue(platform.kpis.CTR, '%') : 'غير متاح'}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-background/50 text-right">
                            <p className="text-xs text-muted-foreground">CPC</p>
                            <p className="text-lg font-bold text-amber-400">{platform.kpis.CPC ? formatValue(platform.kpis.CPC, ' ر.س') : 'غير متاح'}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-background/50 text-right">
                            <p className="text-xs text-muted-foreground">CPA</p>
                            <p className="text-lg font-bold text-pink-400">{platform.kpis.CPA ? formatValue(platform.kpis.CPA, ' ر.س') : 'غير متاح'}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-background/50 text-right">
                            <p className="text-xs text-muted-foreground">CPM</p>
                            <p className="text-lg font-bold text-purple-400">{platform.kpis.CPM ? formatValue(platform.kpis.CPM, ' ر.س') : 'غير متاح'}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-background/50 text-right">
                            <p className="text-xs text-muted-foreground">CVR</p>
                            <p className="text-lg font-bold text-cyan-400">{platform.kpis.CVR ? formatValue(platform.kpis.CVR, '%') : 'غير متاح'}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  <NextStepsTimeline
                    steps={[
                      result.recommendation,
                      ...(result.decisionReasoning?.evidence || []),
                      result.decisionReasoning?.risks,
                    ].filter(Boolean) as string[]}
                    onCopy={() => navigator.clipboard.writeText(JSON.stringify(result, null, 2))}
                  />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
