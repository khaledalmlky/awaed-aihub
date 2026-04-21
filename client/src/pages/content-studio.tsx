import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PenTool, Sparkles, Copy, Check, FileText, Loader2, Save, AlertTriangle, AlertCircle, ArrowLeft, CheckCircle2, XCircle, Clock, Hash, Trash2, Target } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { Link } from 'wouter';

interface ClientContext {
  businessName: string | null;
  businessType: string | null;
  shouldAdvertise: boolean;
  maturityLevel: 'beginner' | 'intermediate' | 'advanced';
}

interface GuidedContext {
  businessType: string;
  targetAudience: string;
  goal: string;
  platforms: string[];
  budget?: string;
  confidenceLevel?: 'low' | 'medium';
}

interface ContentResult {
  content: string;
  platform?: string;
  hashtags?: string[];
  bestTime?: string;
  notes?: string;
  alternativeVersions?: { platform: string; content: string }[];
  confidenceLevel?: 'low' | 'medium';
  confidenceReason?: string;
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

const tones = [
  { value: 'professional', label: 'احترافي', description: 'أسلوب رسمي ومهني' },
  { value: 'friendly', label: 'ودي', description: 'أسلوب قريب ودافئ' },
  { value: 'motivational', label: 'تحفيزي', description: 'أسلوب ملهم ومحفز' },
  { value: 'educational', label: 'تعليمي', description: 'أسلوب شرح وتوضيح' },
  { value: 'fun', label: 'مرح', description: 'أسلوب خفيف وممتع' },
];

const contentTypes = [
  { value: 'post', label: 'منشور عادي' },
  { value: 'story', label: 'ستوري' },
  { value: 'reel', label: 'ريلز / فيديو قصير' },
  { value: 'thread', label: 'ثريد' },
  { value: 'ad', label: 'إعلان' },
];

const businessTypes = [
  { id: 'ecommerce', label: 'متجر إلكتروني' },
  { id: 'services', label: 'خدمات' },
  { id: 'restaurant', label: 'مطعم / كافيه' },
  { id: 'education', label: 'تعليم / تدريب' },
  { id: 'health', label: 'صحة / جمال' },
  { id: 'realestate', label: 'عقارات' },
  { id: 'technology', label: 'تقنية' },
  { id: 'other', label: 'آخر' },
];

const goals = [
  { id: 'sales', label: 'زيادة المبيعات' },
  { id: 'awareness', label: 'زيادة الوعي بالعلامة' },
  { id: 'leads', label: 'جمع بيانات العملاء' },
  { id: 'engagement', label: 'زيادة التفاعل' },
  { id: 'traffic', label: 'زيادة زيارات الموقع' },
];

const audiences = [
  { id: 'youth', label: 'شباب (18-25)' },
  { id: 'adults', label: 'بالغين (25-40)' },
  { id: 'mature', label: 'كبار (40+)' },
  { id: 'families', label: 'عائلات' },
  { id: 'business', label: 'أصحاب أعمال' },
];

const platforms = [
  { id: 'instagram', label: 'انستقرام' },
  { id: 'snapchat', label: 'سناب شات' },
  { id: 'tiktok', label: 'تيك توك' },
  { id: 'twitter', label: 'تويتر / X' },
];

type Mode = 'select' | 'full' | 'guided';

export default function ContentStudio() {
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>('select');
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<number | null>(null);
  const [clientContext, setClientContext] = useState<ClientContext | null>(null);
  const [guidedContext, setGuidedContext] = useState<GuidedContext | null>(null);
  const [prompt, setPrompt] = useState('');
  const [tone, setTone] = useState('professional');
  const [contentType, setContentType] = useState('post');
  const [result, setResult] = useState<ContentResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAnalyses, setIsLoadingAnalyses] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [guidedData, setGuidedData] = useState({
    businessType: '',
    targetAudience: '',
    goal: '',
    platforms: [] as string[],
    budget: '',
  });

  useEffect(() => {
    fetchAnalyses();
  }, []);

  const fetchAnalyses = async () => {
    try {
      const response = await fetch('/api/user/analyses', { credentials: 'include' });
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
      const response = await fetch(`/api/brain/context/${analysisId}`, { credentials: 'include' });
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
      const response = await fetch(`/api/analyses/${id}`, { method: 'DELETE', credentials: 'include' });
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

    if (!prompt.trim()) {
      setError('يرجى كتابة الفكرة أو الموضوع');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/brain/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          analysisId: selectedAnalysisId,
          inputs: { prompt, tone, contentType },
        }),
      });

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
        setResult(data.result);
        if (data.context) {
          setClientContext(data.context);
        }
      } else {
        setError('لم يتم استلام محتوى صالح');
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء كتابة المحتوى');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateGuided = async () => {
    if (!guidedData.businessType || !guidedData.targetAudience || !guidedData.goal || guidedData.platforms.length === 0) {
      setError('يرجى تعبئة جميع الحقول المطلوبة: نوع النشاط، الفئة المستهدفة، الهدف، والمنصة');
      return;
    }

    if (!prompt.trim()) {
      setError('يرجى كتابة الفكرة أو الموضوع');
      return;
    }

    const submittedData = JSON.parse(JSON.stringify(guidedData));
    const filledFieldsCount = [
      submittedData.businessType,
      submittedData.targetAudience,
      submittedData.goal,
      submittedData.platforms.length > 0,
      submittedData.budget,
    ].filter(Boolean).length;
    const confidenceLevel = filledFieldsCount >= 4 ? 'medium' : 'low';

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/brain/content-guided', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          inputs: {
            ...submittedData,
            prompt,
            tone,
            contentType,
          } 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          setNeedsLogin(true);
          return;
        }
        throw new Error(data.error || 'حدث خطأ غير متوقع');
      }

      if (data.success && data.result) {
        setResult(data.result);
        setGuidedContext({
          businessType: submittedData.businessType,
          targetAudience: submittedData.targetAudience,
          goal: submittedData.goal,
          platforms: submittedData.platforms,
          budget: submittedData.budget || undefined,
          confidenceLevel: data.result.confidenceLevel || confidenceLevel,
        });
      } else {
        setError('لم يتم استلام محتوى صالح');
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء كتابة المحتوى');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const AnalysisBasisBadge = ({ type }: { type: 'full' | 'guided' }) => (
    <Badge 
      className={`${type === 'full' 
        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
        : 'bg-amber-500/20 text-amber-400 border-amber-500/30'}`}
    >
      {type === 'full' ? '🎯 مبني على تحليل كامل' : '📋 مبني على معطيات'}
    </Badge>
  );

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
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-lg">
              <PenTool className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">استوديو المحتوى</h1>
              <p className="text-muted-foreground">كتابة محتوى مخصص لنشاطك</p>
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
                    لاستخدام استوديو المحتوى، يرجى تسجيل الدخول أولاً.
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

  if (mode === 'select') {
    return (
      <AppLayout>
        <div className="space-y-10 lg:space-y-14">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-xl">
              <PenTool className="w-8 h-8 text-white" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold">استوديو المحتوى</h1>
              <p className="text-muted-foreground text-lg mt-2">اختر طريقة كتابة المحتوى</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
            <Card 
              className="glass border-2 border-emerald-500/30 cursor-pointer hover:border-emerald-500/50 transition-all hover:shadow-xl"
              onClick={() => {
                if (analyses.length > 0) {
                  setMode('full');
                  setGuidedContext(null);
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
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 mx-auto">أعلى دقة</Badge>
              </CardHeader>
              <CardContent className="text-center space-y-3">
                <p className="text-muted-foreground">
                  محتوى مخصص مبني على تحليل شامل لنشاطك
                </p>
                <ul className="text-sm text-right space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>محتوى يعكس هوية نشاطك</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>هاشتاقات مناسبة للمجال</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>CTA مخصص لنوع النشاط</span>
                  </li>
                </ul>
                {analyses.length === 0 && (
                  <p className="text-xs text-amber-500">يتطلب تحليل موقع مسبق</p>
                )}
              </CardContent>
            </Card>

            <Card 
              className="glass border-2 border-border/30 cursor-pointer hover:border-accent/30 transition-all hover:shadow-xl"
              onClick={() => { setMode('guided'); setClientContext(null); setResult(null); }}
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
                  محتوى مبني على معلومات تدخلها يدوياً
                </p>
                <ul className="text-sm text-right space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>سريع بدون الحاجة لتحليل</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>مناسب للعملاء الجدد</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span>تخصيص يعتمد على المعطيات</span>
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
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-xl">
            <PenTool className="w-8 h-8 text-white" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold">استوديو المحتوى</h1>
            <p className="text-muted-foreground text-lg mt-2">
              {mode === 'full' ? 'محتوى مخصص بناءً على تحليل كامل' : 'محتوى مبني على معطيات مدخلة'}
            </p>
          </div>
        </div>

        {mode === 'guided' && !result && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <p className="text-amber-400">المحتوى سيكون مبنياً على معطيات مدخلة، وليس تحليلًا كاملًا.</p>
          </div>
        )}

        {mode === 'full' && clientContext && (
          <Card className={`border-0 ${clientContext.shouldAdvertise ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-pink-500/10 border border-pink-500/20'}`}>
            <CardContent className="py-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-pink-500" />
                  <div>
                    <p className="font-semibold">{clientContext.businessName || 'النشاط التجاري'}</p>
                    <p className="text-sm text-muted-foreground">
                      المحتوى سيكون مخصصاً لهذا النشاط
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline">{clientContext.businessType || 'غير محدد'}</Badge>
                  <AnalysisBasisBadge type="full" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {mode === 'guided' && guidedContext && (
          <Card className="border-0 bg-blue-500/10 border border-blue-500/20">
            <CardContent className="py-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <FileText className="w-6 h-6 text-blue-500" />
                    <div>
                      <p className="font-semibold">محتوى مبني على معطيات مدخلة</p>
                      <p className="text-sm text-muted-foreground">لتخصيص أكبر، نفّذ التحليل الكامل</p>
                    </div>
                  </div>
                  <AnalysisBasisBadge type="guided" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{guidedContext.businessType}</Badge>
                  <Badge variant="outline" className="bg-emerald-500/20">{guidedContext.goal}</Badge>
                  <Badge variant="outline">{guidedContext.platforms.join(' • ')}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.3fr] gap-8 lg:gap-12">
          <div className="bg-card/50 rounded-2xl p-6 lg:p-8 border border-border/30">
            <h2 className="text-xl font-semibold mb-2">
              {mode === 'full' ? 'إنشاء المحتوى' : 'معلومات النشاط التجاري'}
            </h2>
            <p className="text-muted-foreground mb-6">
              {mode === 'full' ? 'اختر العميل واكتب فكرتك' : 'أدخل المعلومات واكتب فكرتك'}
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
                </>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>نوع النشاط *</Label>
                    <Select value={guidedData.businessType} onValueChange={(v) => setGuidedData({...guidedData, businessType: v})}>
                      <SelectTrigger className="bg-background/50">
                        <SelectValue placeholder="اختر نوع النشاط" />
                      </SelectTrigger>
                      <SelectContent>
                        {businessTypes.map((t) => (
                          <SelectItem key={t.id} value={t.label}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>الهدف *</Label>
                    <Select value={guidedData.goal} onValueChange={(v) => setGuidedData({...guidedData, goal: v})}>
                      <SelectTrigger className="bg-background/50">
                        <SelectValue placeholder="اختر الهدف" />
                      </SelectTrigger>
                      <SelectContent>
                        {goals.map((g) => (
                          <SelectItem key={g.id} value={g.label}>{g.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>الفئة المستهدفة *</Label>
                    <Select value={guidedData.targetAudience} onValueChange={(v) => setGuidedData({...guidedData, targetAudience: v})}>
                      <SelectTrigger className="bg-background/50">
                        <SelectValue placeholder="اختر الفئة" />
                      </SelectTrigger>
                      <SelectContent>
                        {audiences.map((a) => (
                          <SelectItem key={a.id} value={a.label}>{a.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>المنصة *</Label>
                    <div className="flex flex-wrap gap-3">
                      {platforms.map((platform) => (
                        <div key={platform.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`content-platform-${platform.id}`}
                            checked={guidedData.platforms.includes(platform.label)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setGuidedData({ ...guidedData, platforms: [...guidedData.platforms, platform.label] });
                              } else {
                                setGuidedData({ ...guidedData, platforms: guidedData.platforms.filter(p => p !== platform.label) });
                              }
                            }}
                          />
                          <label htmlFor={`content-platform-${platform.id}`} className="text-sm cursor-pointer">
                            {platform.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>الفكرة أو الموضوع *</Label>
                <Textarea
                  placeholder="اكتب هنا الفكرة التي تريد الكتابة عنها..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="bg-background/50 min-h-[100px]"
                  data-testid="textarea-prompt"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>نوع المحتوى</Label>
                  <Select value={contentType} onValueChange={setContentType}>
                    <SelectTrigger className="bg-background/50" data-testid="select-content-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {contentTypes.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>أسلوب المحتوى</Label>
                  <Select value={tone} onValueChange={setTone}>
                    <SelectTrigger className="bg-background/50" data-testid="select-tone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {tones.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={mode === 'full' ? handleGenerate : handleGenerateGuided}
                disabled={isLoading || !prompt || (mode === 'full' ? !selectedAnalysisId : (!guidedData.businessType || !guidedData.goal || !guidedData.targetAudience || guidedData.platforms.length === 0))}
                className={`w-full ${mode === 'full' ? 'bg-gradient-to-l from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600' : 'bg-gradient-to-l from-amber-500 to-orange-500 hover:opacity-90'} text-white h-12 rounded-xl text-base`}
                data-testid="button-generate-content"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                    جاري الكتابة...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 ml-2" />
                    {mode === 'full' ? 'اكتب محتوى مخصص' : 'اكتب محتوى بناءً على المعطيات'}
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="bg-card/50 rounded-2xl border border-border/30 p-6 lg:p-8">
            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  <p>{error}</p>
                </div>
              </div>
            )}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">المحتوى المُنتج</h2>
              {result?.content && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(result.content)}
                  className="text-muted-foreground hover:text-foreground"
                  data-testid="button-copy"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              )}
            </div>
            <div>
              <AnimatePresence mode="wait">
                {!result && !isLoading ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="h-64 flex items-center justify-center"
                  >
                    <div className="text-center text-muted-foreground">
                      <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
                      <p>المحتوى سيظهر هنا</p>
                      <p className="text-sm mt-2">{mode === 'full' ? 'مخصص بناءً على بيانات نشاطك' : 'مبني على المعطيات المدخلة'}</p>
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
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center animate-pulse">
                        <PenTool className="w-8 h-8 text-white" />
                      </div>
                      <p className="text-muted-foreground">عقل عوائد يكتب محتوى...</p>
                    </div>
                  </motion.div>
                ) : result ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-5"
                  >
                    {mode === 'guided' && (
                      <div className="flex items-center justify-between">
                        <AnalysisBasisBadge type="guided" />
                        {result.upgradeHint && (
                          <Link href="/business-analyzer">
                            <Button size="sm" variant="outline" className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10">
                              ابدأ التحليل الكامل
                            </Button>
                          </Link>
                        )}
                      </div>
                    )}

                    <div 
                      className="p-4 rounded-lg bg-background/50 whitespace-pre-wrap text-sm leading-relaxed"
                      data-testid="text-generated-content"
                    >
                      {result.content}
                    </div>

                    {(result.hashtags || result.bestTime || result.platform) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {result.platform && (
                          <div className="p-3 rounded-lg bg-card/50 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-pink-400" />
                            <span className="text-sm">المنصة: {result.platform}</span>
                          </div>
                        )}
                        {result.bestTime && (
                          <div className="p-3 rounded-lg bg-card/50 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-blue-400" />
                            <span className="text-sm">أفضل وقت: {result.bestTime}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {result.hashtags && result.hashtags.length > 0 && (
                      <div className="p-3 rounded-lg bg-card/50">
                        <div className="flex items-center gap-2 mb-2">
                          <Hash className="w-4 h-4 text-emerald-400" />
                          <span className="text-sm font-medium">هاشتاقات مقترحة</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {result.hashtags.map((tag, i) => (
                            <Badge 
                              key={i} 
                              variant="outline" 
                              className="cursor-pointer hover:bg-emerald-500/20"
                              onClick={() => handleCopy(tag)}
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {result.notes && (
                      <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <p className="text-sm text-amber-200/80">💡 {result.notes}</p>
                      </div>
                    )}

                    {result.alternativeVersions && result.alternativeVersions.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-sm font-medium text-muted-foreground">نسخ بديلة:</p>
                        {result.alternativeVersions.map((alt, i) => (
                          <div key={i} className="p-3 rounded-lg bg-card/30 space-y-2">
                            <div className="flex items-center justify-between">
                              <Badge variant="outline">{alt.platform}</Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopy(alt.content)}
                                className="h-7 text-xs"
                              >
                                <Copy className="w-3 h-3 ml-1" />
                                نسخ
                              </Button>
                            </div>
                            <p className="text-sm whitespace-pre-wrap">{alt.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
