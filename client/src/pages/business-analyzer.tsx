import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AnalysisLoading } from '@/components/ui/analysis-loading';
import { AnalysisActions } from '@/components/ui/analysis-actions';
import {
  Globe,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  Target,
  Zap,
  Users,
  Clock,
  DollarSign,
  Loader2,
  ArrowLeft,
  ExternalLink,
  Lightbulb,
  BarChart3,
  Shield,
  Search,
  Share2,
  Info,
  AlertCircle,
  FileText,
  CheckCircle2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { Link } from 'wouter';

interface ScoreDetail {
  score: number;
  reason?: string;
  positives?: string[];
  negatives?: string[];
}

interface AnalysisResult {
  id: number;
  businessName: string;
  businessType: string;
  rating: 'ضعيف' | 'متوسط' | 'قوي';
  ratingReason: string;
  observations: string[];
  recommendation: {
    type: string;
    text: string;
  };
  overallScore: number;
  confidence: string;
  confidenceReason: string;
  scores: {
    userExperience: ScoreDetail;
    trustSignals: ScoreDetail;
    performance: ScoreDetail;
    seo: ScoreDetail;
    socialPresence: ScoreDetail;
  };
  criticalIssues: string[];
  priorities: { priority: number; action: string; impact: string }[];
  decision: {
    shouldAdvertise: boolean;
    confidence: string;
    reasoning: string;
    recommendedChannel: string;
    budgetRange: { min: number; max: number; currency: string; period: string };
    expectedROAS: string;
  };
  decisionReasoning?: {
    mainReason: string;
    evidence: string[];
    risks: string;
  };
  summary: string;
  weights?: Record<string, number>;
  analysisType?: 'full' | 'guided';
}

type AnalysisMode = 'select' | 'full' | 'guided';

const businessTypes = [
  { value: 'ecommerce', label: 'متجر إلكتروني' },
  { value: 'services', label: 'خدمات' },
  { value: 'restaurant', label: 'مطعم / كافيه' },
  { value: 'education', label: 'تعليم / تدريب' },
  { value: 'health', label: 'صحة / جمال' },
  { value: 'realestate', label: 'عقارات' },
  { value: 'technology', label: 'تقنية' },
  { value: 'other', label: 'آخر' },
];

const goals = [
  { value: 'sales', label: 'زيادة المبيعات' },
  { value: 'awareness', label: 'زيادة الوعي بالعلامة' },
  { value: 'leads', label: 'جمع بيانات العملاء' },
  { value: 'engagement', label: 'زيادة التفاعل' },
  { value: 'traffic', label: 'زيادة زيارات الموقع' },
];

const platforms = [
  { value: 'instagram', label: 'انستقرام' },
  { value: 'snapchat', label: 'سناب شات' },
  { value: 'tiktok', label: 'تيك توك' },
  { value: 'twitter', label: 'تويتر / X' },
  { value: 'google', label: 'قوقل' },
];

const audiences = [
  { value: 'youth', label: 'شباب (18-25)' },
  { value: 'adults', label: 'بالغين (25-40)' },
  { value: 'mature', label: 'كبار (40+)' },
  { value: 'families', label: 'عائلات' },
  { value: 'business', label: 'أصحاب أعمال' },
];

const scoreColors = {
  high: 'text-emerald-400',
  medium: 'text-amber-400',
  low: 'text-red-400',
};

const getScoreColor = (score: number) => {
  if (score >= 70) return scoreColors.high;
  if (score >= 40) return scoreColors.medium;
  return scoreColors.low;
};

const getRatingColor = (rating: string) => {
  if (rating === 'قوي') return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
  if (rating === 'متوسط') return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
  return 'text-red-400 bg-red-500/10 border-red-500/30';
};

const getRatingIcon = (rating: string) => {
  if (rating === 'قوي') return <CheckCircle className="w-6 h-6" />;
  if (rating === 'متوسط') return <AlertCircle className="w-6 h-6" />;
  return <AlertTriangle className="w-6 h-6" />;
};

export default function BusinessAnalyzer() {
  const { user } = useAuth();
  const [mode, setMode] = useState<AnalysisMode>('select');
  const [url, setUrl] = useState('');
  const [socialUrl, setSocialUrl] = useState('');
  const [guidedData, setGuidedData] = useState({
    businessType: '',
    goal: '',
    platform: '',
    audience: '',
    budget: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isCached, setIsCached] = useState(false);
  const [lastAnalysisDate, setLastAnalysisDate] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading) {
      setLoadingStep(0);
      return;
    }
    const interval = setInterval(() => {
      setLoadingStep((prev) => (prev < 2 ? prev + 1 : prev));
    }, 1500);
    return () => clearInterval(interval);
  }, [isLoading]);

  const parseAnalysisData = (data: any, analysisType: 'full' | 'guided'): AnalysisResult => {
    const analysis = data.analysis;
    const scores = analysis.scores || {};
    
    const parseScore = (scoreData: any): ScoreDetail => ({
      score: scoreData?.score || 0,
      reason: scoreData?.reason || scoreData?.notes || '',
      positives: scoreData?.positives || [],
      negatives: scoreData?.negatives || [],
    });
    
    return {
      id: analysis.id,
      businessName: analysis.businessName || 'غير محدد',
      businessType: analysis.businessType || 'غير محدد',
      rating: analysis.rating || 'متوسط',
      ratingReason: analysis.ratingReason || '',
      observations: Array.isArray(analysis.observations) ? analysis.observations : [],
      recommendation: analysis.recommendation || { type: '', text: '' },
      overallScore: analysis.overallScore || 0,
      confidence: analysis.confidence || 'متوسطة',
      confidenceReason: analysis.confidenceReason || '',
      scores: {
        userExperience: parseScore(scores.userExperience),
        trustSignals: parseScore(scores.trustSignals),
        performance: parseScore(scores.performance),
        seo: parseScore(scores.seo),
        socialPresence: parseScore(scores.socialPresence),
      },
      criticalIssues: analysis.criticalIssues || [],
      priorities: analysis.priorities || [],
      decision: analysis.decision || {
        shouldAdvertise: false,
        confidence: analysis.confidence || 'منخفضة',
        reasoning: '',
        recommendedChannel: '',
        budgetRange: { min: 0, max: 0, currency: 'SAR', period: 'شهرياً' },
        expectedROAS: '',
      },
      decisionReasoning: analysis.decisionReasoning,
      summary: analysis.summary || '',
      weights: analysis.weights || null,
      analysisType,
    };
  };

  const handleFullAnalysis = async (forceReanalyze = false) => {
    if (!url.trim()) {
      setError('يرجى إدخال رابط الموقع');
      return;
    }

    let finalUrl = url.trim();
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl;
    }

    setIsLoading(true);
    setLoadingStep(0);
    setError(null);
    setResult(null);
    setIsCached(false);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: finalUrl,
          socialUrl: socialUrl.trim() || undefined,
          forceReanalyze,
          analysisType: 'full',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'حدث خطأ أثناء التحليل');
      }

      if (data.success && data.analysis) {
        setResult(parseAnalysisData(data, 'full') as any);
        setIsCached(data.cached || false);
        if (data.analysis.createdAt) {
          setLastAnalysisDate(new Date(data.analysis.createdAt).toLocaleDateString('ar-SA'));
        }
      } else {
        setError('لم يتم استلام نتائج صالحة');
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء التحليل');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuidedAnalysis = async () => {
    if (!guidedData.businessType || !guidedData.goal || !guidedData.platform || !guidedData.audience) {
      setError('يرجى تعبئة جميع الحقول المطلوبة');
      return;
    }

    setIsLoading(true);
    setLoadingStep(0);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/analyze-guided', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputs: guidedData,
          analysisType: 'guided',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'حدث خطأ أثناء التحليل');
      }

      if (data.success && data.analysis) {
        setResult(parseAnalysisData(data, 'guided') as any);
      } else {
        setError('لم يتم استلام نتائج صالحة');
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء التحليل');
    } finally {
      setIsLoading(false);
    }
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

  const ScoreCard = ({ 
    title, 
    score, 
    reason, 
    weight, 
    icon: Icon,
    positives,
    negatives 
  }: { 
    title: string; 
    score: number; 
    reason?: string; 
    weight?: string; 
    icon: any;
    positives?: string[];
    negatives?: string[];
  }) => (
    <Card className="glass border-0 h-full">
      <CardContent className="p-5 space-y-4">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Icon className="w-5 h-5 text-accent" />
            <span className="font-semibold text-lg">{title}</span>
          </div>
          <div className={`text-4xl font-bold ${getScoreColor(score)}`}>{score}%</div>
        </div>
        
        <Progress value={score} className="h-2" />
        
        <div className="space-y-3 text-sm">
          {positives && positives.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1 text-emerald-400 font-medium">
                <TrendingUp className="w-4 h-4" />
                <span>رفع النتيجة:</span>
              </div>
              <ul className="space-y-1.5 text-muted-foreground">
                {positives.slice(0, 2).map((p, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span className="leading-relaxed">{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {negatives && negatives.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1 text-amber-400 font-medium">
                <AlertTriangle className="w-4 h-4" />
                <span>خفّض النتيجة:</span>
              </div>
              <ul className="space-y-1.5 text-muted-foreground">
                {negatives.slice(0, 2).map((n, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                    <span className="leading-relaxed">{n}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (mode === 'select') {
    return (
      <AppLayout>
        <div className="space-y-10 lg:space-y-14">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-xl">
              <Globe className="w-8 h-8 text-white" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold">محلل الأعمال</h1>
              <p className="text-muted-foreground text-lg mt-2">اختر طريقة التحليل المناسبة</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
            <Card 
              className="glass border-2 border-emerald-500/30 cursor-pointer hover:border-emerald-500/50 transition-all hover:shadow-xl"
              onClick={() => setMode('full')}
            >
              <CardHeader className="text-center pb-2">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/20 flex items-center justify-center mb-4">
                  <Globe className="w-8 h-8 text-emerald-500" />
                </div>
                <CardTitle className="text-xl">تحليل كامل</CardTitle>
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 mx-auto">أعلى دقة</Badge>
              </CardHeader>
              <CardContent className="text-center space-y-3">
                <p className="text-muted-foreground">
                  تحليل شامل مبني على رابط الموقع أو المتجر
                </p>
                <ul className="text-sm text-right space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>تحليل تقني للموقع والأداء</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>تقييم جاهزية الإعلان</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>توصيات مخصصة ودقيقة</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card 
              className="glass border-2 border-border/30 cursor-pointer hover:border-accent/30 transition-all hover:shadow-xl"
              onClick={() => setMode('guided')}
            >
              <CardHeader className="text-center pb-2">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/20 flex items-center justify-center mb-4">
                  <FileText className="w-8 h-8 text-amber-500" />
                </div>
                <CardTitle className="text-xl">تحليل اختياري</CardTitle>
                <Badge variant="outline" className="mx-auto">بدون روابط</Badge>
              </CardHeader>
              <CardContent className="text-center space-y-3">
                <p className="text-muted-foreground">
                  توصيات مبنية على معلومات تدخلها يدوياً
                </p>
                <ul className="text-sm text-right space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>سريع بدون الحاجة لموقع</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>مناسب للأنشطة الجديدة</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span>دقة تعتمد على المعطيات المدخلة</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
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
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-xl">
            <Globe className="w-8 h-8 text-white" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold">محلل الأعمال</h1>
            <p className="text-muted-foreground text-lg mt-2">
              {mode === 'full' ? 'تحليل كامل للموقع والمتجر' : 'تحليل مبني على معطيات'}
            </p>
          </div>
        </div>

        {mode === 'guided' && !result && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <p className="text-amber-400">النتائج ستكون مبنية على معطيات مدخلة وليست تحليلًا كاملاً. للحصول على أعلى دقة، استخدم التحليل الكامل.</p>
          </div>
        )}

        {!result && (
          <div className="bg-card/50 rounded-2xl p-8 lg:p-10 border border-border/30">
            <div className="max-w-3xl">
              {mode === 'full' ? (
                <>
                  <h2 className="text-xl font-semibold mb-2">تحليل موقع أو متجر</h2>
                  <p className="text-muted-foreground mb-6">أدخل رابط الموقع لتحليل جاهزيته الإعلانية</p>
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <Label className="mb-2 block">رابط الموقع / المتجر *</Label>
                        <Input
                          placeholder="https://example.com أو example.com"
                          value={url}
                          onChange={(e) => setUrl(e.target.value)}
                          className="bg-background/80 text-left h-12 text-base rounded-xl"
                          dir="ltr"
                          data-testid="input-url"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="mb-2 block">رابط حساب سوشيال ميديا (اختياري)</Label>
                      <Input
                        placeholder="https://instagram.com/username"
                        value={socialUrl}
                        onChange={(e) => setSocialUrl(e.target.value)}
                        className="bg-background/80 text-left h-12 text-base rounded-xl"
                        dir="ltr"
                        data-testid="input-social-url"
                      />
                    </div>
                    <Button
                      onClick={() => handleFullAnalysis(false)}
                      disabled={isLoading}
                      className="bg-gradient-to-l from-primary to-accent hover:opacity-90 text-white px-10 h-12 rounded-xl text-base"
                      data-testid="button-analyze"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                          جاري التحليل...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5 ml-2" />
                          تحليل كامل
                        </>
                      )}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-xl font-semibold mb-2">معلومات النشاط التجاري</h2>
                  <p className="text-muted-foreground mb-6">أدخل المعلومات للحصول على توصيات إرشادية</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>نوع النشاط *</Label>
                      <Select value={guidedData.businessType} onValueChange={(v) => setGuidedData({...guidedData, businessType: v})}>
                        <SelectTrigger className="bg-background/50">
                          <SelectValue placeholder="اختر نوع النشاط" />
                        </SelectTrigger>
                        <SelectContent>
                          {businessTypes.map((t) => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>الهدف التسويقي *</Label>
                      <Select value={guidedData.goal} onValueChange={(v) => setGuidedData({...guidedData, goal: v})}>
                        <SelectTrigger className="bg-background/50">
                          <SelectValue placeholder="اختر الهدف" />
                        </SelectTrigger>
                        <SelectContent>
                          {goals.map((g) => (
                            <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>المنصة المستهدفة *</Label>
                      <Select value={guidedData.platform} onValueChange={(v) => setGuidedData({...guidedData, platform: v})}>
                        <SelectTrigger className="bg-background/50">
                          <SelectValue placeholder="اختر المنصة" />
                        </SelectTrigger>
                        <SelectContent>
                          {platforms.map((p) => (
                            <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>الفئة المستهدفة *</Label>
                      <Select value={guidedData.audience} onValueChange={(v) => setGuidedData({...guidedData, audience: v})}>
                        <SelectTrigger className="bg-background/50">
                          <SelectValue placeholder="اختر الفئة" />
                        </SelectTrigger>
                        <SelectContent>
                          {audiences.map((a) => (
                            <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>الميزانية الشهرية (اختياري)</Label>
                      <Input
                        placeholder="مثال: 5000 ريال"
                        value={guidedData.budget}
                        onChange={(e) => setGuidedData({...guidedData, budget: e.target.value})}
                        className="bg-background/50"
                      />
                    </div>
                  </div>
                  <Button
                    onClick={handleGuidedAnalysis}
                    disabled={isLoading}
                    className="mt-6 bg-gradient-to-l from-amber-500 to-orange-500 hover:opacity-90 text-white px-10 h-12 rounded-xl text-base"
                    data-testid="button-guided-analyze"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                        جاري التحليل...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 ml-2" />
                        تحليل بناءً على المعطيات
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>
        )}

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
          {isLoading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <AnalysisLoading currentStep={loadingStep} />
            </motion.div>
          ) : result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
              id="analysis-result"
            >
              <div className="flex justify-between items-center flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div>
                    <h2 className="text-2xl font-bold">{result.businessName}</h2>
                    <p className="text-muted-foreground">{result.businessType}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <AnalysisBasisBadge type={result.analysisType || 'full'} />
                  <AnalysisActions data={result} title="تحليل الأعمال" />
                </div>
              </div>

              {result.analysisType === 'guided' && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-amber-400">النتائج مبنية على معطيات مدخلة وليست تحليلًا كاملًا</p>
                  </div>
                  <Link href="/business-analyzer">
                    <Button size="sm" variant="outline" className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10" onClick={() => { setMode('full'); setResult(null); }}>
                      ابدأ التحليل الكامل
                    </Button>
                  </Link>
                </div>
              )}

              {isCached && (
                <div className="flex items-center justify-between p-4 rounded-lg bg-accent/10 border border-accent/20">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-accent" />
                    <div>
                      <p className="text-sm font-medium">آخر تحليل محفوظ</p>
                      {lastAnalysisDate && (
                        <p className="text-xs text-muted-foreground">تاريخ التحليل: {lastAnalysisDate}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleFullAnalysis(true)}
                    disabled={isLoading}
                    className="border-accent/30 hover:bg-accent/10"
                    data-testid="button-reanalyze"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'إعادة التحليل'}
                  </Button>
                </div>
              )}

              <Card className="glass border-0" data-testid="card-rating">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">التقييم العام</p>
                      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border ${getRatingColor(result.rating)}`}>
                        {getRatingIcon(result.rating)}
                        <span className="text-xl font-bold">{result.rating}</span>
                      </div>
                    </div>
                    {result.analysisType === 'full' && (
                      <div className="text-center">
                        <div className={`text-4xl font-bold ${getScoreColor(result.overallScore)}`}>
                          {result.overallScore}%
                        </div>
                        <div className="text-sm text-muted-foreground">النتيجة الإجمالية</div>
                      </div>
                    )}
                  </div>
                  <p className="mt-4 text-muted-foreground">{result.ratingReason}</p>
                </CardContent>
              </Card>

              {result.observations && result.observations.length > 0 && (
                <Card className="glass border-0" data-testid="card-observations">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Lightbulb className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                      الملاحظات الرئيسية
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {result.observations.map((item, i) => (
                        <li key={i} className="text-sm flex items-start gap-2 p-2 rounded-lg bg-muted/30">
                          <span className="mt-0.5" style={{ color: 'var(--accent)' }}>•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {result.recommendation && (
                <Card className="glass border-0" data-testid="card-recommendation">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      {result.recommendation.type.includes('مناسب') ? (
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-amber-400" />
                      )}
                      التوصية
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`p-4 rounded-lg border ${
                      result.recommendation.type.includes('مناسب') 
                        ? 'bg-emerald-500/10 border-emerald-500/30' 
                        : 'bg-amber-500/10 border-amber-500/30'
                    }`}>
                      <p className="font-semibold mb-1">{result.recommendation.type}</p>
                      <p className="text-sm text-muted-foreground">{result.recommendation.text}</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {result.decisionReasoning && (
                <Card className="glass border-0" data-testid="card-decision-reasoning">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Target className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                      لماذا هذا القرار؟
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="font-medium">{result.decisionReasoning.mainReason}</p>
                    {result.decisionReasoning.evidence && result.decisionReasoning.evidence.length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">الأدلة:</p>
                        <ul className="space-y-2">
                          {result.decisionReasoning.evidence.map((e, i) => (
                            <li key={i} className="text-sm flex items-start gap-2">
                              <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                              <span>{e}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {result.decisionReasoning.risks && (
                      <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                        <p className="text-sm text-red-400">
                          <AlertTriangle className="w-4 h-4 inline ml-1" />
                          المخاطر إذا لم يتم اتخاذ الإجراء: {result.decisionReasoning.risks}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {result.analysisType === 'full' && (
                <Tabs defaultValue="detailed" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="detailed">التحليل التفصيلي</TabsTrigger>
                    <TabsTrigger value="decision">قرار الإعلان</TabsTrigger>
                  </TabsList>
                  <TabsContent value="detailed" className="space-y-6 mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                      <ScoreCard
                        title="تجربة المستخدم"
                        score={result.scores.userExperience.score}
                        reason={result.scores.userExperience.reason}
                        weight="25%"
                        icon={Users}
                        positives={result.scores.userExperience.positives}
                        negatives={result.scores.userExperience.negatives}
                      />
                      <ScoreCard
                        title="إشارات الثقة"
                        score={result.scores.trustSignals.score}
                        reason={result.scores.trustSignals.reason}
                        weight="20%"
                        icon={Shield}
                        positives={result.scores.trustSignals.positives}
                        negatives={result.scores.trustSignals.negatives}
                      />
                      <ScoreCard
                        title="الأداء والسرعة"
                        score={result.scores.performance.score}
                        reason={result.scores.performance.reason}
                        weight="20%"
                        icon={Zap}
                        positives={result.scores.performance.positives}
                        negatives={result.scores.performance.negatives}
                      />
                      <ScoreCard
                        title="SEO"
                        score={result.scores.seo.score}
                        reason={result.scores.seo.reason}
                        weight="15%"
                        icon={Search}
                        positives={result.scores.seo.positives}
                        negatives={result.scores.seo.negatives}
                      />
                      <ScoreCard
                        title="التواجد الاجتماعي"
                        score={result.scores.socialPresence.score}
                        reason={result.scores.socialPresence.reason}
                        weight="20%"
                        icon={Share2}
                        positives={result.scores.socialPresence.positives}
                        negatives={result.scores.socialPresence.negatives}
                      />
                    </div>

                    {result.confidence && (
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/50">
                        <Badge 
                          variant="outline" 
                          className={`${
                            result.confidence === 'عالية' ? 'border-emerald-500 text-emerald-500' :
                            result.confidence === 'متوسطة' ? 'border-amber-500 text-amber-500' :
                            'border-red-500 text-red-500'
                          }`}
                        >
                          ثقة {result.confidence}
                        </Badge>
                        {result.confidenceReason && (
                          <span className="text-xs text-muted-foreground">{result.confidenceReason}</span>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Card className="glass border-0">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg flex items-center gap-2 text-amber-400">
                            <AlertTriangle className="w-5 h-5" />
                            ملاحظات مهمة
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {result.criticalIssues.length > 0 ? (
                            <ul className="space-y-2">
                              {result.criticalIssues.map((issue, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm">
                                  <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                                  <span>{issue}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-muted-foreground text-sm">لا توجد مشاكل حرجة</p>
                          )}
                        </CardContent>
                      </Card>

                      <Card className="glass border-0">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg flex items-center gap-2 text-emerald-400">
                            <Target className="w-5 h-5" />
                            الأولويات
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {result.priorities.length > 0 ? (
                            <ul className="space-y-2">
                              {result.priorities.slice(0, 5).map((p, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm">
                                  <Badge variant="outline" className="mt-0.5 text-xs w-6 h-6 flex items-center justify-center p-0">
                                    {p.priority}
                                  </Badge>
                                  <div>
                                    <span className="font-medium">{p.action}</span>
                                    {p.impact && <span className="text-muted-foreground"> — {p.impact}</span>}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-muted-foreground text-sm">لا توجد أولويات محددة</p>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="decision" className="space-y-6 mt-6">
                    <Card className={`glass border-2 ${result.decision.shouldAdvertise ? 'border-emerald-500/30' : 'border-amber-500/30'}`}>
                      <CardContent className="p-6">
                        <div className="flex items-center gap-4 mb-4">
                          {result.decision.shouldAdvertise ? (
                            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                              <CheckCircle className="w-8 h-8 text-emerald-500" />
                            </div>
                          ) : (
                            <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center">
                              <AlertTriangle className="w-8 h-8 text-amber-500" />
                            </div>
                          )}
                          <div>
                            <h3 className="text-xl font-bold">
                              {result.decision.shouldAdvertise ? 'جاهز للإعلان' : 'يحتاج تحسينات أولاً'}
                            </h3>
                            <p className="text-muted-foreground">{result.decision.reasoning}</p>
                          </div>
                        </div>

                        <div className="flex flex-col md:flex-row-reverse gap-4 mt-6">
                          {result.decision.expectedROAS && (
                            <div className="flex-1 p-4 rounded-lg bg-background/50 text-right">
                              <p className="text-sm text-muted-foreground">العائد المتوقع</p>
                              <p className="font-semibold mt-1">{result.decision.expectedROAS}</p>
                            </div>
                          )}
                          {result.decision.budgetRange && result.decision.budgetRange.min > 0 && (
                            <div className="flex-1 p-4 rounded-lg bg-background/50 text-right">
                              <p className="text-sm text-muted-foreground">الميزانية المقترحة</p>
                              <p className="font-semibold mt-1">
                                {result.decision.budgetRange.min.toLocaleString()} - {result.decision.budgetRange.max.toLocaleString()} {result.decision.budgetRange.currency}
                              </p>
                              <p className="text-xs text-muted-foreground">{result.decision.budgetRange.period}</p>
                            </div>
                          )}
                          {result.decision.recommendedChannel && (
                            <div className="flex-1 p-4 rounded-lg bg-background/50 text-right">
                              <p className="text-sm text-muted-foreground">القناة الموصى بها</p>
                              <p className="font-semibold mt-1">{result.decision.recommendedChannel}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
}
