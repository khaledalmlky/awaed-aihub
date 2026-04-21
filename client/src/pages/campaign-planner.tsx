import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar, Sparkles, AlertTriangle, Target, DollarSign, TrendingUp, Users, Loader2, AlertCircle, ArrowLeft, CheckCircle2, XCircle, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { Link } from 'wouter';

interface PlanResult {
  readyToLaunch: boolean;
  preparationNeeded?: string[];
  plan: {
    totalBudget: number;
    dailyBudget: number;
    duration?: string;
    platform?: string;
    objective?: string;
    expectedReach: string;
    expectedClicks: string;
    expectedConversions: string;
    expectedROAS?: string;
    cpa: string;
    kpis: { name: string; target: string; description: string }[];
    phases?: { phase: number; name: string; duration: string; budget: string; goal: string }[];
    warnings: string[];
    recommendations: string[];
  };
}

interface ClientContext {
  businessName: string | null;
  businessType: string | null;
  shouldAdvertise: boolean;
  maturityLevel: 'beginner' | 'intermediate' | 'advanced';
}

interface Analysis {
  id: number;
  businessName: string | null;
  businessType: string | null;
  url: string;
  overallScore: string;
  shouldAdvertise: string;
  budgetRange: string | null;
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

export default function CampaignPlanner() {
  const { user } = useAuth();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<number | null>(null);
  const [clientContext, setClientContext] = useState<ClientContext | null>(null);
  const [formData, setFormData] = useState({
    budget: '',
    duration: '',
    objective: '',
    platforms: [] as string[],
  });
  const [result, setResult] = useState<PlanResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAnalyses, setIsLoadingAnalyses] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalyses();
  }, []);

  const fetchAnalyses = async () => {
    try {
      const response = await fetch('/api/user/analyses');
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
      const response = await fetch(`/api/brain/context/${analysisId}`);
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
      const response = await fetch(`/api/analyses/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setAnalyses(prev => prev.filter(a => a.id !== id));
        if (selectedAnalysisId === id) {
          setSelectedAnalysisId(null);
          setClientContext(null);
        }
      }
    } catch (err) {
      console.error('Error deleting analysis:', err);
    }
  };

  const handlePlan = async () => {
    if (!selectedAnalysisId) {
      setError('يرجى اختيار تحليل سابق أو إجراء تحليل جديد');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/brain/planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisId: selectedAnalysisId,
          inputs: formData,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.requiresAnalysis) {
          setError('يجب تحليل الموقع أولاً. انتقل إلى "محلل الأعمال" لتحليل موقعك.');
        } else {
          throw new Error(data.error || 'حدث خطأ غير متوقع');
        }
        return;
      }

      if (data.success && data.result) {
        setResult(data.result);
        if (data.context) {
          setClientContext(data.context);
        }
      } else {
        setError('لم يتم استلام نتائج صالحة');
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء التخطيط');
    } finally {
      setIsLoading(false);
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

  if (analyses.length === 0) {
    return (
      <AppLayout>
        <div className="space-y-8 lg:space-y-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">مخطط الحملات</h1>
              <p className="text-muted-foreground">مخطط الحملات - تخطيط الميزانية والمؤشرات</p>
            </div>
          </div>

          <Card className="glass border-0">
            <CardContent className="py-16">
              <div className="text-center space-y-8 lg:space-y-10">
                <div className="w-20 h-20 mx-auto rounded-full bg-blue-500/10 flex items-center justify-center">
                  <AlertCircle className="w-10 h-10 text-blue-500" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold">يجب تحليل موقعك أولاً</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    لتخطيط حملة دقيقة بميزانية واقعية، نحتاج أن نفهم نشاطك التجاري أولاً.
                    انتقل إلى محلل الأعمال لتحليل موقعك.
                  </p>
                </div>
                <Link href="/business-analyzer">
                  <Button className="bg-gradient-to-l from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white">
                    <ArrowLeft className="w-4 h-4 ml-2" />
                    انتقل لمحلل الأعمال
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
      <div className="space-y-10 lg:space-y-14">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-xl">
            <Calendar className="w-8 h-8 text-white" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold">مخطط الحملات</h1>
            <p className="text-muted-foreground text-lg mt-2">تخطيط الميزانية والمؤشرات بناءً على تحليل عميلك</p>
          </div>
        </div>

        {clientContext && (
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
                      {clientContext.shouldAdvertise ? 'جاهز للإعلان - يمكن التخطيط للحملة' : 'يحتاج تحسينات - ستكون الخطة تحضيرية'}
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

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.3fr] gap-8 lg:gap-12">
          <div className="bg-card/50 rounded-2xl p-6 lg:p-8 border border-border/30">
            <h2 className="text-xl font-semibold mb-2">تفاصيل الحملة</h2>
            <p className="text-muted-foreground mb-6">اختر العميل وخصص إعدادات الحملة</p>
            <div className="space-y-5">
              <div className="space-y-2">
                <Label>اختر العميل</Label>
                <div className="flex gap-2">
                  <Select
                    value={selectedAnalysisId?.toString() || ''}
                    onValueChange={handleAnalysisChange}
                  >
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
                          <AlertDialogAction 
                            onClick={() => handleDeleteAnalysis(selectedAnalysisId)}
                            className="bg-red-500 hover:bg-red-600"
                          >
                            حذف
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>الميزانية الإجمالية (ريال) - اختياري</Label>
                <Input
                  type="number"
                  placeholder="سيُستخدم النطاق من التحليل"
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                  className="bg-background/50"
                  data-testid="input-campaign-budget"
                />
              </div>

              <div className="space-y-2">
                <Label>مدة الحملة (أيام) - اختياري</Label>
                <Input
                  type="number"
                  placeholder="30"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  className="bg-background/50"
                  data-testid="input-campaign-duration"
                />
              </div>

              <div className="space-y-2">
                <Label>هدف الحملة</Label>
                <Select
                  value={formData.objective}
                  onValueChange={(value) => setFormData({ ...formData, objective: value })}
                >
                  <SelectTrigger className="bg-background/50" data-testid="select-objective">
                    <SelectValue placeholder="اختر الهدف (اختياري)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">تحديد تلقائي بناءً على التحليل</SelectItem>
                    <SelectItem value="awareness">الوعي بالعلامة</SelectItem>
                    <SelectItem value="traffic">زيادة الزيارات</SelectItem>
                    <SelectItem value="engagement">التفاعل</SelectItem>
                    <SelectItem value="leads">جمع البيانات</SelectItem>
                    <SelectItem value="conversions">التحويلات</SelectItem>
                    <SelectItem value="app_installs">تحميل التطبيق</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>المنصات الإعلانية (اختياري)</Label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'meta', label: 'ميتا (فيسبوك/انستقرام)' },
                    { id: 'google', label: 'قوقل أدز' },
                    { id: 'twitter', label: 'تويتر / X' },
                    { id: 'snapchat', label: 'سناب شات' },
                    { id: 'tiktok', label: 'تيك توك' },
                    { id: 'youtube', label: 'يوتيوب' },
                  ].map((platform) => (
                    <div key={platform.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`planner-platform-${platform.id}`}
                        checked={formData.platforms.includes(platform.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData({ ...formData, platforms: [...formData.platforms, platform.id] });
                          } else {
                            setFormData({ ...formData, platforms: formData.platforms.filter(p => p !== platform.id) });
                          }
                        }}
                        data-testid={`checkbox-ad-platform-${platform.id}`}
                      />
                      <Label htmlFor={`planner-platform-${platform.id}`} className="text-sm cursor-pointer">
                        {platform.label}
                      </Label>
                    </div>
                  ))}
                </div>
                {formData.platforms.length === 0 && (
                  <p className="text-xs text-muted-foreground">اتركها فارغة للتحديد التلقائي بناءً على التحليل</p>
                )}
              </div>

              <Button
                onClick={handlePlan}
                disabled={isLoading || !selectedAnalysisId}
                className="w-full bg-gradient-to-l from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white h-12 rounded-xl text-base"
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
                    إنشاء خطة مخصصة
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-6">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400"
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
                    <Calendar className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p>اختر التحليل واضغط "إنشاء خطة مخصصة"</p>
                    <p className="text-sm mt-2">الخطة ستكون مبنية على بيانات موقعك الحقيقية</p>
                  </div>
                </motion.div>
              ) : isLoading ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-64 flex items-center justify-center"
                >
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center animate-pulse">
                      <Sparkles className="w-8 h-8 text-white" />
                    </div>
                    <p className="text-muted-foreground">عقل عوائد يحلل ويخطط حملتك...</p>
                  </div>
                </motion.div>
              ) : result ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-5"
                >
                  {!result.readyToLaunch && result.preparationNeeded && result.preparationNeeded.length > 0 && (
                    <Card className="border-amber-500/20 bg-amber-500/10">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg text-amber-400 flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5" />
                          خطوات تحضيرية مطلوبة
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {result.preparationNeeded.map((step, i) => (
                            <li key={i} className="flex items-start gap-2 text-amber-200/80">
                              <span className="bg-amber-500/20 text-amber-400 rounded-full w-5 h-5 flex items-center justify-center text-xs shrink-0 mt-0.5">{i + 1}</span>
                              {step}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  <Card className="glass border-0">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">ملخص الخطة</CardTitle>
                        {result.plan.expectedROAS && (
                          <Badge className="bg-emerald-500/20 text-emerald-400">
                            ROAS المتوقع: {result.plan.expectedROAS}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="p-4 rounded-lg bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20">
                          <div className="flex items-center gap-2 text-blue-400 mb-1">
                            <DollarSign className="w-4 h-4" />
                            <span className="text-xs">الميزانية</span>
                          </div>
                          <p className="text-lg font-bold">{result.plan.totalBudget?.toLocaleString()} ر.س</p>
                          <p className="text-xs text-muted-foreground">{result.plan.dailyBudget?.toLocaleString()} يومياً</p>
                        </div>
                        <div className="p-4 rounded-lg bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
                          <div className="flex items-center gap-2 text-emerald-400 mb-1">
                            <Users className="w-4 h-4" />
                            <span className="text-xs">الوصول</span>
                          </div>
                          <p className="text-lg font-bold">{result.plan.expectedReach}</p>
                        </div>
                        <div className="p-4 rounded-lg bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20">
                          <div className="flex items-center gap-2 text-purple-400 mb-1">
                            <Target className="w-4 h-4" />
                            <span className="text-xs">النقرات</span>
                          </div>
                          <p className="text-lg font-bold">{result.plan.expectedClicks}</p>
                        </div>
                        <div className="p-4 rounded-lg bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20">
                          <div className="flex items-center gap-2 text-amber-400 mb-1">
                            <TrendingUp className="w-4 h-4" />
                            <span className="text-xs">التحويلات</span>
                          </div>
                          <p className="text-lg font-bold">{result.plan.expectedConversions}</p>
                          <p className="text-xs text-muted-foreground">CPA: {result.plan.cpa}</p>
                        </div>
                      </div>

                      {result.plan.phases && result.plan.phases.length > 0 && (
                        <div className="mb-6">
                          <h4 className="text-sm font-medium mb-3">مراحل الحملة</h4>
                          <div className="space-y-2">
                            {result.plan.phases.map((phase, i) => (
                              <div key={i} className="p-3 rounded-lg bg-card/50 flex items-center justify-between">
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
                                  <p className="text-sm font-medium">{phase.budget}</p>
                                  <p className="text-xs text-muted-foreground">{phase.duration}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {result.plan.kpis && result.plan.kpis.length > 0 && (
                        <div className="mb-6">
                          <h4 className="text-sm font-medium mb-3">مؤشرات الأداء (KPIs)</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {result.plan.kpis.map((kpi, i) => (
                              <div key={i} className="p-3 rounded-lg bg-card/50">
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

                      {result.plan.warnings && result.plan.warnings.length > 0 && (
                        <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-4">
                          <h4 className="text-sm font-medium text-amber-400 mb-2 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            تحذيرات مهمة
                          </h4>
                          <ul className="text-sm text-amber-200/80 space-y-1">
                            {result.plan.warnings.map((w, i) => (
                              <li key={i}>• {w}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {result.plan.recommendations && result.plan.recommendations.length > 0 && (
                        <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                          <h4 className="text-sm font-medium text-emerald-400 mb-2 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4" />
                            توصيات للنجاح
                          </h4>
                          <ul className="text-sm text-emerald-200/80 space-y-1">
                            {result.plan.recommendations.map((r, i) => (
                              <li key={i}>• {r}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
