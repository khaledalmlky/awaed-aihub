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

interface ClientContext {
  businessName: string | null;
  businessType: string | null;
  shouldAdvertise: boolean;
  maturityLevel: 'beginner' | 'intermediate' | 'advanced';
}

interface PlannerContext {
  businessType: string;
  targetAudience: string;
  objective: string;
  platforms: string[];
  budget?: string;
  confidenceLevel?: 'low' | 'medium';
}

interface PlanPhase {
  phase: number;
  name: string;
  duration: string;
  budget: number | string;
  goal: string;
}

interface PlanKpi {
  name: string;
  target: string;
  description: string;
}

interface PlanResult {
  readyToLaunch: boolean;
  message?: string;
  executiveSummary?: string;
  confidenceLevel?: 'low' | 'medium';
  confidenceReason?: string;
  upgradeHint?: string;
  decision?: {
    verdict?: string;
    reason?: string;
    action?: string;
  };
  preparationNeeded?: string[];
  nextSteps?: string[];
  plan: {
    totalBudget?: number | string;
    dailyBudget?: number | string;
    duration?: string;
    platform?: string;
    objective?: string;
    expectedReach?: number | string;
    expectedClicks?: number | string;
    expectedConversions?: number | string;
    expectedROAS?: string;
    cpa?: number | string;
    kpis?: PlanKpi[];
    phases?: PlanPhase[];
    alternativePlan?: string;
    warnings?: string[];
    recommendations?: string[];
  };
}

interface Analysis {
  id: number;
  businessName: string | null;
  businessType: string | null;
  url: string;
  overallScore: string;
  shouldAdvertise: string;
  createdAt: string;
}

const formatAnalysisLabel = (analysis: Analysis): string => {
  const name = analysis.businessName || analysis.url;
  const score = analysis.overallScore || '0';
  const date = new Date(analysis.createdAt).toLocaleDateString('ar-SA', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${name} — ${score}/100 — ${date}`;
};

const formatValue = (value?: number | string) => {
  if (value === undefined || value === null || value === '') return 'غير محدد';
  return typeof value === 'number' ? value.toLocaleString('ar-SA') : value;
};

type Mode = 'full' | 'custom';

export default function CampaignPlanner() {
  useAuth();
  const [mode, setMode] = useState<Mode>('custom');
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<number | null>(null);
  const [clientContext, setClientContext] = useState<ClientContext | null>(null);
  const [plannerContext, setPlannerContext] = useState<PlannerContext | null>(null);
  const [formData, setFormData] = useState({
    businessType: '',
    ageRange: '',
    gender: '',
    region: '',
    budget: '',
    duration: '',
    objective: '',
    season: '',
    platforms: [] as string[],
  });
  const [result, setResult] = useState<PlanResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [isLoadingAnalyses, setIsLoadingAnalyses] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);

  useEffect(() => {
    fetchAnalyses();
  }, []);

  const fetchAnalyses = async () => {
    try {
      const response = await fetch('/api/user/analyses', {
        credentials: 'include',
      });
      if (response.status === 401) {
        setNeedsLogin(true);
        setIsLoadingAnalyses(false);
        return;
      }
      if (response.ok) {
        const data = await response.json();
        setAnalyses(data);
        if (data.length > 0) {
          setSelectedAnalysisId(data[0].id);
          fetchContext(data[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching analyses:', err);
    } finally {
      setIsLoadingAnalyses(false);
    }
  };

  const fetchContext = async (analysisId: number) => {
    try {
      const response = await fetch(`/api/brain/context/${analysisId}`, {
        credentials: 'include',
      });
      if (response.status === 401) {
        setNeedsLogin(true);
        return;
      }
      if (response.ok) {
        const data = await response.json();
        setClientContext(data.context);
      }
    } catch (err) {
      console.error('Error fetching context:', err);
    }
  };

  const handleAnalysisChange = (value: string) => {
    const id = parseInt(value);
    setSelectedAnalysisId(id);
    fetchContext(id);
    setResult(null);
    setError(null);
  };

  const handleDeleteAnalysis = async (id: number) => {
    try {
      const response = await fetch(`/api/analyses/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (response.status === 401) {
        setNeedsLogin(true);
        return;
      }
      if (response.ok) {
        const newAnalyses = analyses.filter(a => a.id !== id);
        setAnalyses(newAnalyses);
        if (selectedAnalysisId === id) {
          setSelectedAnalysisId(null);
          setClientContext(null);
        }
        if (newAnalyses.length === 0) {
          setMode('custom');
          setResult(null);
          setError(null);
        }
      }
    } catch (err) {
      console.error('Error deleting analysis:', err);
    }
  };

  const handlePlatformToggle = (platformId: string, checked: boolean | 'indeterminate') => {
    setFormData({
      ...formData,
      platforms: checked
        ? [...formData.platforms, platformId]
        : formData.platforms.filter((platform) => platform !== platformId),
    });
  };

  const buildSubmittedData = () => JSON.parse(JSON.stringify({
    ...formData,
    goal: formData.objective,
    targetAudience: [
      optionLabel(ageRanges, formData.ageRange),
      optionLabel(genders, formData.gender),
      optionLabel(regions, formData.region),
    ].filter(Boolean).join(' • '),
  }));

  const validateForm = () => {
    if (mode === 'full' && !selectedAnalysisId) {
      setError('يرجى اختيار تحليل سابق أو إجراء تحليل جديد');
      return false;
    }

    if (!formData.businessType || !formData.ageRange || !formData.gender || !formData.region || !formData.budget || !formData.duration || !formData.objective || !formData.season || formData.platforms.length === 0) {
      setError('يرجى تعبئة جميع الحقول المطلوبة: النشاط، الجمهور، الميزانية، المدة، الهدف، الموسم، والمنصات');
      return false;
    }

    return true;
  };

  const handlePlan = async () => {
    if (!validateForm()) return;

    const submittedData = buildSubmittedData();
    const filledFieldsCount = [
      submittedData.businessType,
      submittedData.ageRange,
      submittedData.gender,
      submittedData.region,
      submittedData.objective,
      submittedData.platforms.length > 0,
      submittedData.budget,
      submittedData.duration,
    ].filter(Boolean).length;
    const confidenceLevel = filledFieldsCount >= 6 ? 'medium' : 'low';

    setIsLoading(true);
    setLoadingStep(0);
    setError(null);
    setResult(null);

    try {
      setLoadingStep(1);
      const response = await fetch('/api/brain/planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          analysisId: mode === 'full' ? selectedAnalysisId : undefined,
          inputs: submittedData,
        }),
      });

      setLoadingStep(2);
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          setNeedsLogin(true);
          return;
        }
        if (data.requiresAnalysis) {
          setError('يجب تحليل الموقع أولاً. انتقل إلى "محلل الأعمال" لتحليل موقعك.');
        } else {
          throw new Error(data.error || 'حدث خطأ غير متوقع');
        }
        return;
      }

      if (data.success && data.result) {
        setLoadingStep(3);
        setResult(data.result);
        if (data.context) {
          setClientContext(data.context);
        }
        setPlannerContext({
          businessType: optionLabel(businessTypes, submittedData.businessType),
          targetAudience: submittedData.targetAudience,
          objective: optionLabel(campaignGoals, submittedData.objective),
          platforms: submittedData.platforms.map((platform: string) => optionLabel(adPlatforms, platform)),
          budget: optionLabel(budgetRanges, submittedData.budget),
          confidenceLevel: data.result.confidenceLevel || confidenceLevel,
        });
      } else {
        setError('لم يتم استلام خطة صالحة');
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء إنشاء الخطة');
    } finally {
      setIsLoading(false);
      setLoadingStep(0);
    }
  };

  if (isLoadingAnalyses) {
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
              <h1 className="text-2xl font-bold">مخطط الحملات</h1>
              <p className="text-muted-foreground">تخطيط حملة إعلانية بالذكاء الاصطناعي</p>
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
                    لاستخدام مخطط الحملات، يرجى تسجيل الدخول أولاً.
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
            <h1 className="text-3xl lg:text-4xl font-bold">مخطط الحملات</h1>
            <p className="text-muted-foreground text-lg mt-2">
              {mode === 'full' ? 'خطة حملة مبنية على تحليل كامل' : 'خطة حملة مبنية على معطيات مدخلة'}
            </p>
          </div>
        </div>

        <ToolModeTabs
          value={mode === 'custom' ? 'quick' : 'detailed'}
          hasAnalyses={analyses.length > 0}
          onValueChange={(value) => {
            setMode(value === 'quick' ? 'custom' : 'full');
            setResult(null);
            setError(null);
            if (value === 'quick') setClientContext(null);
            if (value === 'detailed' && selectedAnalysisId) fetchContext(selectedAnalysisId);
          }}
        />

        {mode === 'custom' && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 flex flex-row-reverse items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <p className="text-amber-400">هذه الخطة مبنية على معطيات مدخلة، وليست تحليلًا كاملًا للموقع.</p>
          </div>
        )}

        {mode === 'full' && clientContext && (
          <Card className={`border-0 ${clientContext.shouldAdvertise ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-amber-500/10 border border-amber-500/20'}`}>
            <CardContent className="py-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  {clientContext.shouldAdvertise ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  ) : (
                    <XCircle className="w-6 h-6 text-amber-500" />
                  )}
                  <div>
                    <p className="font-semibold">{clientContext.businessName || 'النشاط التجاري'}</p>
                    <p className="text-sm text-muted-foreground">
                      {clientContext.shouldAdvertise ? 'جاهز للإعلان' : 'يحتاج تحسينات قبل الإطلاق'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline">{clientContext.businessType || 'غير محدد'}</Badge>
                  <Badge variant="outline" className={clientContext.maturityLevel === 'advanced' ? 'bg-emerald-500/20' : clientContext.maturityLevel === 'intermediate' ? 'bg-blue-500/20' : 'bg-amber-500/20'}>
                    {clientContext.maturityLevel === 'advanced' ? 'متقدم' : clientContext.maturityLevel === 'intermediate' ? 'متوسط' : 'مبتدئ'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {plannerContext && (
          <Card className="border-0 bg-blue-500/10 border border-blue-500/20">
            <CardContent className="py-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <FileText className="w-6 h-6 text-blue-500" />
                    <div>
                      <p className="font-semibold">ملخص مدخلات الخطة</p>
                      <p className="text-sm text-muted-foreground">{plannerContext.targetAudience}</p>
                    </div>
                  </div>
                  {plannerContext.confidenceLevel && (
                    <Badge variant="outline" className={plannerContext.confidenceLevel === 'medium' ? 'bg-blue-500/20 text-blue-400' : 'bg-amber-500/20 text-amber-400'}>
                      ثقة {plannerContext.confidenceLevel === 'medium' ? 'متوسطة' : 'منخفضة'}
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{plannerContext.businessType}</Badge>
                  <Badge variant="outline" className="bg-emerald-500/20">{plannerContext.objective}</Badge>
                  <Badge variant="outline">{plannerContext.platforms.join(' • ')}</Badge>
                  {plannerContext.budget && <Badge variant="outline">{plannerContext.budget}</Badge>}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.3fr] gap-8 lg:gap-12">
          <form className="bg-card/50 rounded-2xl p-6 lg:p-8 border border-border/30 text-right" dir="rtl" onSubmit={(e) => { e.preventDefault(); handlePlan(); }}>
            <h2 className="text-xl font-semibold mb-2">
              {mode === 'full' ? 'مدخلات خطة الحملة' : 'معلومات الحملة'}
            </h2>
            <p className="text-muted-foreground mb-6">
              {mode === 'full' ? 'اختر العميل وأكمل تفاصيل الحملة' : 'أدخل معلومات النشاط والجمهور لإنشاء الخطة'}
            </p>

            <div className="space-y-5">
              {mode === 'full' && (
                <div className="space-y-2">
                  <Label>اختر العميل</Label>
                  <div className="flex gap-2">
                    <Select value={selectedAnalysisId?.toString() || ''} onValueChange={handleAnalysisChange}>
                      <SelectTrigger className="bg-background/50 flex-1" data-testid="select-analysis">
                        <SelectValue placeholder="اختر تحليلاً سابقاً" />
                      </SelectTrigger>
                      <SelectContent>
                        {analyses.map((analysis) => (
                          <SelectItem key={analysis.id} value={analysis.id.toString()}>
                            {formatAnalysisLabel(analysis)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedAnalysisId && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-500/10">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>حذف التحليل</AlertDialogTitle>
                            <AlertDialogDescription>
                              هل أنت متأكد من حذف هذا التحليل؟ لا يمكن التراجع عن هذا الإجراء.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteAnalysis(selectedAnalysisId)} className="bg-red-500 hover:bg-red-600">
                              حذف
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-4 rounded-xl border border-border/30 bg-background/30 p-4" dir="rtl">
                <div>
                  <h3 className="font-semibold flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-500" />
                    نوع النشاط التجاري
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">اختر التصنيف الأقرب لطبيعة النشاط.</p>
                </div>
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
              </div>

              <div className="space-y-4 rounded-xl border border-border/30 bg-background/30 p-4" dir="rtl">
                <div>
                  <h3 className="font-semibold flex items-center gap-2">
                    <Target className="w-4 h-4 text-cyan-500" />
                    الجمهور المستهدف
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">حدد العمر والجنس والمنطقة الجغرافية بدقة.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>الفئة العمرية *</Label>
                    <Select value={formData.ageRange} onValueChange={(value) => setFormData({ ...formData, ageRange: value })}>
                      <SelectTrigger className="bg-background/50"><SelectValue placeholder="اختر العمر" /></SelectTrigger>
                      <SelectContent>{ageRanges.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>الجنس *</Label>
                    <Select value={formData.gender} onValueChange={(value) => setFormData({ ...formData, gender: value })}>
                      <SelectTrigger className="bg-background/50"><SelectValue placeholder="اختر الجنس" /></SelectTrigger>
                      <SelectContent>{genders.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>المنطقة الجغرافية *</Label>
                    <Select value={formData.region} onValueChange={(value) => setFormData({ ...formData, region: value })}>
                      <SelectTrigger className="bg-background/50"><SelectValue placeholder="اختر المنطقة" /></SelectTrigger>
                      <SelectContent>{regions.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>الميزانية الشهرية *</Label>
                  <Select value={formData.budget} onValueChange={(value) => setFormData({ ...formData, budget: value })}>
                    <SelectTrigger className="bg-background/50" data-testid="select-budget">
                      <SelectValue placeholder="اختر الميزانية" />
                    </SelectTrigger>
                    <SelectContent>{budgetRanges.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>مدة الحملة *</Label>
                  <Select value={formData.duration} onValueChange={(value) => setFormData({ ...formData, duration: value })}>
                    <SelectTrigger className="bg-background/50" data-testid="select-duration">
                      <SelectValue placeholder="اختر مدة الحملة" />
                    </SelectTrigger>
                    <SelectContent>{campaignDurations.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>هدف الحملة *</Label>
                  <Select value={formData.objective} onValueChange={(value) => setFormData({ ...formData, objective: value })}>
                    <SelectTrigger className="bg-background/50" data-testid="select-objective">
                      <SelectValue placeholder="اختر هدف الحملة" />
                    </SelectTrigger>
                    <SelectContent>{campaignGoals.map((goal) => <SelectItem key={goal.value} value={goal.value}>{goal.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>الموسم التسويقي *</Label>
                  <Select value={formData.season} onValueChange={(value) => setFormData({ ...formData, season: value })}>
                    <SelectTrigger className="bg-background/50" data-testid="select-season">
                      <SelectValue placeholder="اختر الموسم" />
                    </SelectTrigger>
                    <SelectContent>{marketingSeasons.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <Label>المنصات الإعلانية *</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {adPlatforms.map((platform) => (
                    <div key={platform.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`planner-platform-${platform.id}`}
                        checked={formData.platforms.includes(platform.id)}
                        onCheckedChange={(checked) => handlePlatformToggle(platform.id, checked)}
                        data-testid={`checkbox-platform-${platform.id}`}
                      />
                      <Label htmlFor={`planner-platform-${platform.id}`} className="text-sm cursor-pointer">
                        {platform.label}
                      </Label>
                    </div>
                  ))}
                </div>
                {formData.platforms.length === 0 && (
                  <p className="text-xs text-muted-foreground">اختر منصة واحدة على الأقل لبناء خطة قابلة للتنفيذ.</p>
                )}
              </div>

              <Input type="hidden" value={socialSegments.length + interests.length} readOnly aria-hidden="true" />

              <Button
                type="submit"
                disabled={isLoading || (mode === 'full' && !selectedAnalysisId) || !formData.businessType || !formData.ageRange || !formData.gender || !formData.region || !formData.budget || !formData.duration || !formData.objective || !formData.season || formData.platforms.length === 0}
                className="w-full bg-gradient-to-l from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white h-12 rounded-xl text-base flex flex-row-reverse"
                data-testid="button-plan"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                    جاري التخطيط...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 ml-2" />
                    إنشاء خطة الحملة
                  </>
                )}
              </Button>
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
                    <p>أدخل تفاصيل الحملة واضغط "إنشاء خطة الحملة"</p>
                    <p className="text-sm mt-2">{mode === 'full' ? 'الخطة ستستفيد من تحليل العميل المختار' : 'الخطة ستكون مبنية على المعطيات المدخلة'}</p>
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
                    title="ملخص خطة الحملة"
                    summary={result.executiveSummary || result.decision?.reason || result.message || 'تم إنشاء خطة حملة رقمية قابلة للتنفيذ.'}
                    badge={result.readyToLaunch ? 'جاهز للإطلاق' : mode === 'full' ? 'تحليل مفصل' : 'تحليل سريع'}
                  />

                  <ReportStatGrid
                    items={[
                      { icon: DollarSign, label: 'الميزانية', value: `${formatValue(result.plan?.totalBudget)} ر.س`, tone: 'blue' },
                      { icon: TrendingUp, label: 'العائد المتوقع', value: result.plan?.expectedROAS || 'غير محدد', tone: 'green' },
                      { icon: Users, label: 'الوصول المتوقع', value: formatValue(result.plan?.expectedReach), tone: 'purple' },
                      { icon: Target, label: 'النقرات', value: formatValue(result.plan?.expectedClicks), tone: 'amber' },
                    ]}
                  />

                  <div className="flex flex-row-reverse items-center justify-between flex-wrap gap-4" id="analysis-result" dir="rtl">
                    {result.decision?.verdict && (
                      <p className="text-muted-foreground p-3 bg-card rounded-lg flex-1 text-right">
                        {result.decision.verdict}: {result.decision.action || result.decision.reason}
                      </p>
                    )}
                    <AnalysisActions data={result} title="خطة الحملة" />
                  </div>

                  {!result.readyToLaunch && result.preparationNeeded && result.preparationNeeded.length > 0 && (
                    <Card className="border-amber-500/20 bg-amber-500/10" dir="rtl">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg text-amber-600 dark:text-amber-400 flex items-center gap-2 text-right">
                          <AlertTriangle className="w-5 h-5" />
                          إجراءات مطلوبة قبل الإطلاق
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <IconList items={result.preparationNeeded} type="warning" />
                      </CardContent>
                    </Card>
                  )}

                  <Card className="glass border-0 overflow-hidden" dir="rtl">
                    <CardHeader>
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <CardTitle className="text-lg">تفاصيل الخطة</CardTitle>
                        {result.plan?.platform && <Badge variant="outline">{result.plan.platform}</Badge>}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-3 rounded-lg bg-background/50 space-y-1 text-right">
                          <div className="flex items-center gap-2 text-primary text-sm font-medium">
                            <Zap className="w-4 h-4" />
                            الهدف والمدة
                          </div>
                          <p className="text-sm">{result.plan?.objective || optionLabel(campaignGoals, formData.objective)}</p>
                          <p className="text-xs text-muted-foreground">{result.plan?.duration || optionLabel(campaignDurations, formData.duration)}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-background/50 space-y-1 text-right">
                          <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
                            <DollarSign className="w-4 h-4" />
                            الميزانية اليومية
                          </div>
                          <p className="text-sm">{formatValue(result.plan?.dailyBudget)} ر.س</p>
                          <p className="text-xs text-muted-foreground">CPA: {formatValue(result.plan?.cpa)}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-background/50 space-y-1 text-right">
                          <div className="flex items-center gap-2 text-blue-400 text-sm font-medium">
                            <Users className="w-4 h-4" />
                            التحويلات المتوقعة
                          </div>
                          <p className="text-sm">{formatValue(result.plan?.expectedConversions)}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-background/50 space-y-1 text-right">
                          <div className="flex items-center gap-2 text-pink-400 text-sm font-medium">
                            <MessageSquare className="w-4 h-4" />
                            الخطة البديلة
                          </div>
                          <p className="text-sm">{result.plan?.alternativePlan || 'راقب النتائج وعدّل الميزانية حسب الأداء.'}</p>
                        </div>
                      </div>

                      {result.plan?.phases && result.plan.phases.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-sm font-medium">مراحل الحملة</h4>
                          {result.plan.phases.map((phase) => (
                            <div key={phase.phase} className="p-3 rounded-lg bg-card/50 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <span className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-sm font-bold">
                                  {phase.phase}
                                </span>
                                <div>
                                  <p className="font-medium">{phase.name}</p>
                                  <p className="text-xs text-muted-foreground">{phase.goal}</p>
                                </div>
                              </div>
                              <div className="text-left">
                                <p className="text-sm font-medium">{formatValue(phase.budget)} ر.س</p>
                                <p className="text-xs text-muted-foreground">{phase.duration}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {result.plan?.kpis && result.plan.kpis.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-sm font-medium">مؤشرات الأداء</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {result.plan.kpis.map((kpi, index) => (
                              <div key={`${kpi.name}-${index}`} className="p-3 rounded-lg bg-card/50">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-sm font-medium">{kpi.name}</span>
                                  <Badge variant="outline">{kpi.target}</Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">{kpi.description}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {result.plan?.warnings && result.plan.warnings.length > 0 && (
                        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-right">
                          <div className="flex items-center gap-2 text-amber-400 text-sm font-medium mb-2">
                            <AlertTriangle className="w-4 h-4" />
                            تحذيرات
                          </div>
                          <IconList items={result.plan.warnings} type="warning" />
                        </div>
                      )}

                      {result.plan?.recommendations && result.plan.recommendations.length > 0 && (
                        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-right">
                          <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium mb-2">
                            <CheckCircle2 className="w-4 h-4" />
                            توصيات
                          </div>
                          <IconList items={result.plan.recommendations} type="positive" />
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {mode === 'custom' && (result.upgradeHint || result.confidenceReason) && (
                    <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                      <p className="text-sm text-blue-800 dark:text-blue-200 text-right">
                        {result.upgradeHint || result.confidenceReason}
                      </p>
                    </div>
                  )}

                  <NextStepsTimeline
                    steps={result.nextSteps || result.plan?.recommendations || result.preparationNeeded}
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
