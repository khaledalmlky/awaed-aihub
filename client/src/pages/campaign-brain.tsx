import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Lightbulb, Sparkles, AlertTriangle, Target, MessageSquare, Zap, FileText, Loader2, AlertCircle, ArrowLeft, CheckCircle2, XCircle, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { Link } from 'wouter';
import { AnalysisLoading } from '@/components/ui/analysis-loading';
import { AnalysisActions } from '@/components/ui/analysis-actions';

interface CampaignIdea {
  idea: string;
  hook: string;
  angle: string;
  cta: string;
  platform?: string;
  budget?: string;
  expectedROAS?: string;
  contentType?: string;
  warnings?: string[];
}

interface ClientContext {
  businessName: string | null;
  businessType: string | null;
  shouldAdvertise: boolean;
  maturityLevel: 'beginner' | 'intermediate' | 'advanced';
}

interface CustomContext {
  businessType: string;
  targetAudience: string;
  goal: string;
  platforms: string[];
  budget?: string;
  confidenceLevel?: 'low' | 'medium';
}

interface BrainResponse {
  readyForCampaign: boolean;
  message: string;
  ideas: CampaignIdea[];
  prerequisiteActions?: string[];
  confidenceLevel?: 'low' | 'medium';
  confidenceReason?: string;
  warning?: string | null;
  upgradeHint?: string;
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

type Mode = 'select' | 'full' | 'custom';

export default function CampaignBrain() {
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>('select');
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<number | null>(null);
  const [clientContext, setClientContext] = useState<ClientContext | null>(null);
  const [formData, setFormData] = useState({
    goal: '',
    platforms: [] as string[],
    budget: '',
    duration: '',
  });
  const [customData, setCustomData] = useState({
    businessType: '',
    targetAudience: '',
    goal: '',
    platforms: [] as string[],
    budget: '',
  });
  const [result, setResult] = useState<BrainResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [isLoadingAnalyses, setIsLoadingAnalyses] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [customContext, setCustomContext] = useState<CustomContext | null>(null);

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
          setMode('select');
          setResult(null);
          setError(null);
        }
      }
    } catch (err) {
      console.error('Error deleting analysis:', err);
    }
  };

  const handleGenerate = async () => {
    if (!selectedAnalysisId) {
      setError('يرجى اختيار تحليل سابق أو إجراء تحليل جديد');
      return;
    }

    setIsLoading(true);
    setLoadingStep(0);
    setError(null);
    setResult(null);

    try {
      setLoadingStep(1);
      const response = await fetch('/api/brain/campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          analysisId: selectedAnalysisId,
          inputs: formData,
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
      } else {
        setError('لم يتم استلام نتائج صالحة');
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء توليد الأفكار');
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
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
              <Lightbulb className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">مُلهم الحملات</h1>
              <p className="text-muted-foreground">توليد أفكار إبداعية بالذكاء الاصطناعي</p>
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
                    لاستخدام مُلهم الحملات، يرجى تسجيل الدخول أولاً.
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

  const handleGenerateCustom = async () => {
    if (!customData.businessType || !customData.targetAudience || !customData.goal || customData.platforms.length === 0) {
      setError('يرجى تعبئة جميع الحقول المطلوبة: نوع النشاط، الفئة المستهدفة، الهدف، والمنصة');
      return;
    }

    const submittedData = JSON.parse(JSON.stringify(customData));
    const filledFieldsCount = [
      submittedData.businessType,
      submittedData.targetAudience,
      submittedData.goal,
      submittedData.platforms.length > 0,
      submittedData.budget,
    ].filter(Boolean).length;
    const confidenceLevel = filledFieldsCount >= 4 ? 'medium' : 'low';

    setIsLoading(true);
    setLoadingStep(0);
    setError(null);
    setResult(null);

    try {
      setLoadingStep(1);
      const response = await fetch('/api/brain/campaign-guided', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ inputs: submittedData }),
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

      if (data.success && data.result) {
        setLoadingStep(3);
        setResult(data.result);
        setCustomContext({
          businessType: submittedData.businessType,
          targetAudience: submittedData.targetAudience,
          goal: submittedData.goal,
          platforms: submittedData.platforms,
          budget: submittedData.budget || undefined,
          confidenceLevel: data.result.confidenceLevel || confidenceLevel,
        });
      } else {
        setError('لم يتم استلام نتائج صالحة');
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء توليد الأفكار');
    } finally {
      setIsLoading(false);
      setLoadingStep(0);
    }
  };

  if (mode === 'select') {
    return (
      <AppLayout>
        <div className="space-y-10 lg:space-y-14">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-xl">
              <Lightbulb className="w-8 h-8 text-white" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold">مُلهم الحملات</h1>
              <p className="text-muted-foreground text-lg mt-2">اختر طريقة توليد أفكار الحملات</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
            <Card 
              className="glass border-2 border-emerald-500/30 cursor-pointer hover:border-emerald-500/50 transition-all hover:shadow-xl"
              onClick={() => {
                if (analyses.length > 0) {
                  setMode('full');
                  setCustomContext(null);
                  setResult(null);
                } else {
                  setError('لا يوجد تحليلات سابقة. يرجى تحليل موقع أولاً في محلل الأعمال.');
                }
              }}
            >
              <CardHeader className="text-center pb-2">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/20 flex items-center justify-center mb-4">
                  <Target className="w-8 h-8 text-emerald-500" />
                </div>
                <CardTitle className="text-xl">تحليل كامل</CardTitle>
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 mx-auto">موصى به</Badge>
              </CardHeader>
              <CardContent className="text-center space-y-3">
                <p className="text-muted-foreground">
                  أفكار دقيقة مبنية على تحليل شامل لموقع العميل
                </p>
                <ul className="text-sm text-right space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>دقة عالية مبنية على بيانات حقيقية</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>توصيات مخصصة لنوع النشاط</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>ميزانيات واقعية</span>
                  </li>
                </ul>
                {analyses.length === 0 && (
                  <p className="text-xs text-amber-500">يتطلب تحليل موقع مسبق</p>
                )}
              </CardContent>
            </Card>

            <Card 
              className="glass border-2 border-border/30 cursor-pointer hover:border-accent/30 transition-all hover:shadow-xl"
              onClick={() => { setMode('custom'); setClientContext(null); setResult(null); }}
            >
              <CardHeader className="text-center pb-2">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/20 flex items-center justify-center mb-4">
                  <FileText className="w-8 h-8 text-amber-500" />
                </div>
                <CardTitle className="text-xl">معطيات اختيارية</CardTitle>
                <Badge variant="outline" className="mx-auto">بدون تحليل</Badge>
              </CardHeader>
              <CardContent className="text-center space-y-3">
                <p className="text-muted-foreground">
                  أفكار مبنية على معلومات تدخلها يدوياً
                </p>
                <ul className="text-sm text-right space-y-1">
                  <li className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span>دقة تعتمد على المعطيات المدخلة</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>سريع بدون الحاجة لتحليل</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>مناسب للعملاء الجدد</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center gap-3 max-w-4xl">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-red-400">{error}</p>
              <Link href="/business-analyzer" className="mr-auto">
                <Button size="sm" variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10">
                  انتقل لمحلل الأعمال
                </Button>
              </Link>
            </div>
          )}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-10 lg:space-y-14">
        <div className="flex items-center gap-5">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => { setMode('select'); setResult(null); setError(null); }}
            className="rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-xl">
            <Lightbulb className="w-8 h-8 text-white" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold">مُلهم الحملات</h1>
            <p className="text-muted-foreground text-lg mt-2">
              {mode === 'full' ? 'أفكار إبداعية مبنية على تحليل كامل' : 'أفكار مبنية على معطيات مدخلة'}
            </p>
          </div>
        </div>

        {mode === 'custom' && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <p className="text-amber-400">هذه التوصيات مبنية على معطيات مُدخلة، وليست تحليلًا كاملًا.</p>
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
                      {clientContext.shouldAdvertise ? 'جاهز للإعلان' : 'يحتاج تحسينات قبل الإعلان'}
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

        {mode === 'custom' && customContext && (
          <Card className="border-0 bg-blue-500/10 border border-blue-500/20">
            <CardContent className="py-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <FileText className="w-6 h-6 text-blue-500" />
                    <div>
                      <p className="font-semibold">نتائج مبنية على معطيات مدخلة</p>
                      <p className="text-sm text-muted-foreground">لرفع الدقة، نفّذ التحليل الكامل</p>
                    </div>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={customContext.confidenceLevel === 'medium' ? 'bg-blue-500/20 text-blue-400' : 'bg-amber-500/20 text-amber-400'}
                  >
                    ثقة {customContext.confidenceLevel === 'medium' ? 'متوسطة' : 'منخفضة'}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{customContext.businessType}</Badge>
                  <Badge variant="outline" className="bg-emerald-500/20">{customContext.goal}</Badge>
                  <Badge variant="outline">{customContext.platforms.join(' • ')}</Badge>
                  {customContext.budget && (
                    <Badge variant="outline">{customContext.budget}</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.3fr] gap-8 lg:gap-12">
          <div className="bg-card/50 rounded-2xl p-6 lg:p-8 border border-border/30">
            <h2 className="text-xl font-semibold mb-2">
              {mode === 'full' ? 'مدخلات الحملة' : 'معلومات النشاط التجاري'}
            </h2>
            <p className="text-muted-foreground mb-6">
              {mode === 'full' ? 'اختر العميل وخصص إعدادات الحملة' : 'أدخل معلومات النشاط التجاري يدوياً'}
            </p>
            <div className="space-y-5">
              {mode === 'full' ? (
                <>
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
                    <Label htmlFor="goal">الهدف الرئيسي</Label>
                    <Select
                      value={formData.goal}
                      onValueChange={(value) => setFormData({ ...formData, goal: value })}
                    >
                      <SelectTrigger className="bg-background/50" data-testid="select-goal">
                        <SelectValue placeholder="اختر الهدف" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="awareness">زيادة الوعي</SelectItem>
                        <SelectItem value="engagement">زيادة التفاعل</SelectItem>
                        <SelectItem value="sales">زيادة المبيعات</SelectItem>
                        <SelectItem value="conversion">زيادة التحويلات</SelectItem>
                        <SelectItem value="retention">الاحتفاظ بالعملاء</SelectItem>
                        <SelectItem value="downloads">زيادة التحميلات</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>نوع النشاط *</Label>
                    <Input
                      placeholder="مثال: مطعم، متجر إلكتروني، صالون تجميل، شركة خدمات..."
                      value={customData.businessType}
                      onChange={(e) => setCustomData({ ...customData, businessType: e.target.value })}
                      className="bg-background/50 text-right"
                      dir="rtl"
                      data-testid="input-business-type"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>الفئة المستهدفة *</Label>
                    <Input
                      placeholder="مثال: شباب سعوديين 18-35، أمهات، رواد أعمال..."
                      value={customData.targetAudience}
                      onChange={(e) => setCustomData({ ...customData, targetAudience: e.target.value })}
                      className="bg-background/50 text-right"
                      dir="rtl"
                      data-testid="input-target-audience"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="goal">الهدف *</Label>
                    <Select
                      value={customData.goal}
                      onValueChange={(value) => setCustomData({ ...customData, goal: value })}
                    >
                      <SelectTrigger className="bg-background/50">
                        <SelectValue placeholder="اختر الهدف" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="awareness">زيادة الوعي</SelectItem>
                        <SelectItem value="sales">زيادة المبيعات</SelectItem>
                        <SelectItem value="traffic">زيادة الزيارات</SelectItem>
                        <SelectItem value="engagement">زيادة التفاعل</SelectItem>
                        <SelectItem value="downloads">زيادة التحميلات</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <div className="space-y-3">
                <Label>المنصة المستهدفة {mode === 'custom' && '*'}</Label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'instagram', label: 'انستقرام' },
                    { id: 'twitter', label: 'تويتر / X' },
                    { id: 'tiktok', label: 'تيك توك' },
                    { id: 'snapchat', label: 'سناب شات' },
                    { id: 'youtube', label: 'يوتيوب' },
                    { id: 'google', label: 'قوقل أدز' },
                  ].map((platform) => (
                    <div key={platform.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`platform-${platform.id}`}
                        checked={mode === 'full' ? formData.platforms.includes(platform.id) : customData.platforms.includes(platform.id)}
                        onCheckedChange={(checked) => {
                          if (mode === 'full') {
                            if (checked) {
                              setFormData({ ...formData, platforms: [...formData.platforms, platform.id] });
                            } else {
                              setFormData({ ...formData, platforms: formData.platforms.filter(p => p !== platform.id) });
                            }
                          } else {
                            if (checked) {
                              setCustomData({ ...customData, platforms: [...customData.platforms, platform.id] });
                            } else {
                              setCustomData({ ...customData, platforms: customData.platforms.filter(p => p !== platform.id) });
                            }
                          }
                        }}
                        data-testid={`checkbox-platform-${platform.id}`}
                      />
                      <Label htmlFor={`platform-${platform.id}`} className="text-sm cursor-pointer">
                        {platform.label}
                      </Label>
                    </div>
                  ))}
                </div>
                {(mode === 'full' ? formData.platforms.length === 0 : customData.platforms.length === 0) && (
                  <p className="text-xs text-muted-foreground">
                    {mode === 'full' ? 'اتركها فارغة للتحديد التلقائي بناءً على التحليل' : 'اتركها فارغة لتحديدها تلقائياً'}
                  </p>
                )}
              </div>

              {mode === 'full' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="budget">الميزانية (ريال) - اختياري</Label>
                    <Input
                      id="budget"
                      type="number"
                      placeholder="سيُستخدم النطاق من التحليل"
                      value={formData.budget}
                      onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                      className="bg-background/50"
                      data-testid="input-budget"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="duration">المدة (أيام) - اختياري</Label>
                    <Input
                      id="duration"
                      type="number"
                      placeholder="مثال: 30"
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                      className="bg-background/50"
                      data-testid="input-duration"
                    />
                  </div>
                </>
              )}

              {mode === 'custom' && (
                <div className="space-y-2">
                  <Label htmlFor="custom-budget">الميزانية الشهرية (اختياري)</Label>
                  <Input
                    id="custom-budget"
                    placeholder="مثال: 5000 ريال"
                    value={customData.budget}
                    onChange={(e) => setCustomData({ ...customData, budget: e.target.value })}
                    className="bg-background/50 text-right"
                    dir="rtl"
                    data-testid="input-custom-budget"
                  />
                </div>
              )}

              <Button
                onClick={mode === 'full' ? handleGenerate : handleGenerateCustom}
                disabled={isLoading || (mode === 'full' ? !selectedAnalysisId : (!customData.businessType || !customData.goal))}
                className="w-full bg-gradient-to-l from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white h-12 rounded-xl text-base"
                data-testid="button-generate"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                    جاري التوليد...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 ml-2" />
                    توليد أفكار {mode === 'full' ? 'مخصصة' : 'إبداعية'}
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
                    {mode === 'full' ? (
                      <>
                        <p>اختر التحليل واضغط "توليد أفكار مخصصة"</p>
                        <p className="text-sm mt-2">الأفكار ستكون مبنية على بيانات موقعك الحقيقية</p>
                      </>
                    ) : (
                      <>
                        <p>أدخل معلومات النشاط واضغط "توليد أفكار إبداعية"</p>
                        <p className="text-sm mt-2">الأفكار ستكون عامة بناءً على المعلومات المدخلة</p>
                      </>
                    )}
                  </div>
                </motion.div>
              ) : isLoading ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <AnalysisLoading currentStep={loadingStep} />
                </motion.div>
              ) : result ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-5"
                >
                  {!result.readyForCampaign && result.prerequisiteActions && result.prerequisiteActions.length > 0 && (
                    <Card className="border-amber-500/20 bg-amber-500/10" dir="rtl">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg text-amber-600 dark:text-amber-400 flex items-center gap-2 text-right">
                          <AlertTriangle className="w-5 h-5" />
                          إجراءات مطلوبة قبل الإعلان
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2 text-right">
                          {result.prerequisiteActions.map((action, i) => (
                            <li key={i} className="flex items-start gap-2 text-amber-800 dark:text-amber-200">
                              <span className="bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-full w-5 h-5 flex items-center justify-center text-xs shrink-0 mt-0.5">{i + 1}</span>
                              <span className="text-right">{action}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  <div className="flex items-center justify-between flex-wrap gap-4" id="analysis-result" dir="rtl">
                    {result.message && (
                      <p className="text-muted-foreground p-3 bg-card rounded-lg flex-1 text-right">{result.message}</p>
                    )}
                    <AnalysisActions data={result} title="أفكار الحملة" />
                  </div>

                  {mode === 'custom' && (result.warning || result.upgradeHint) && (
                    <div className="space-y-2" dir="rtl">
                      {result.warning && (
                        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                          <p className="text-sm text-amber-800 dark:text-amber-200 text-right">{result.warning}</p>
                        </div>
                      )}
                      {result.upgradeHint && (
                        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                          <p className="text-sm text-blue-800 dark:text-blue-200 text-right">{result.upgradeHint}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {result.ideas && result.ideas.map((idea, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.2 }}
                    >
                      <Card className="glass border-0 overflow-hidden" data-testid={`card-result-${index}`} dir="rtl">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <Badge className="bg-gradient-to-l from-amber-500 to-orange-500 text-white">
                              فكرة {index + 1}
                            </Badge>
                            <div className="flex gap-2">
                              {idea.platform && <Badge variant="outline">{idea.platform}</Badge>}
                              {idea.expectedROAS && <Badge variant="outline" className="bg-emerald-500/20">ROAS: {idea.expectedROAS}</Badge>}
                            </div>
                          </div>
                          <CardTitle className="text-lg mt-2 text-right">{idea.idea}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-5">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4" dir="rtl">
                            <div className="p-3 rounded-lg bg-background/50 space-y-1 text-right">
                              <div className="flex items-center gap-2 text-primary text-sm font-medium">
                                <Zap className="w-4 h-4" />
                                الخطاف (Hook)
                              </div>
                              <p className="text-sm text-right">{idea.hook}</p>
                            </div>
                            <div className="p-3 rounded-lg bg-background/50 space-y-1 text-right">
                              <div className="flex items-center gap-2 text-accent text-sm font-medium">
                                <Target className="w-4 h-4" />
                                الزاوية (Angle)
                              </div>
                              <p className="text-sm text-right">{idea.angle}</p>
                            </div>
                            <div className="p-3 rounded-lg bg-background/50 space-y-1 text-right">
                              <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
                                <MessageSquare className="w-4 h-4" />
                                دعوة العمل (CTA)
                              </div>
                              <p className="text-sm text-right">{idea.cta}</p>
                            </div>
                            <div className="p-3 rounded-lg bg-background/50 space-y-1 text-right">
                              <div className="flex items-center gap-2 text-pink-400 text-sm font-medium">
                                <FileText className="w-4 h-4" />
                                نوع المحتوى
                              </div>
                              <p className="text-sm text-right">{idea.contentType || 'محتوى متنوع'}</p>
                            </div>
                          </div>

                          {idea.budget && (
                            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-right">
                              <p className="text-sm text-blue-400">💰 الميزانية المقترحة: {idea.budget}</p>
                            </div>
                          )}

                          {idea.warnings && idea.warnings.length > 0 && (
                            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-right">
                              <div className="flex items-center gap-2 text-amber-400 text-sm font-medium mb-2">
                                <AlertTriangle className="w-4 h-4" />
                                تحذيرات
                              </div>
                              <ul className="text-sm text-amber-200/80 space-y-1 text-right">
                                {idea.warnings.map((warning, i) => (
                                  <li key={i}>• {warning}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
