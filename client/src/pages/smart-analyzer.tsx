import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BarChart3, Sparkles, CheckCircle, AlertCircle, Lightbulb, AlertTriangle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { AnalysisLoading } from '@/components/ui/analysis-loading';
import { AnalysisActionBar } from '@/components/ui/analysis-action-bar';

interface AnalysisResult {
  rating: 'ضعيف' | 'متوسط' | 'قوي';
  ratingReason: string;
  platform: string;
  observations: string[];
  recommendation: {
    type: string;
    text: string;
  };
  decisionReasoning?: {
    mainReason: string;
    evidence: string[];
    risks: string;
  };
}

const platformPatterns = [
  { pattern: /instagram\.com|instagr\.am/i, name: 'Instagram', icon: '📸' },
  { pattern: /tiktok\.com/i, name: 'TikTok', icon: '🎵' },
  { pattern: /twitter\.com|x\.com/i, name: 'X / Twitter', icon: '𝕏' },
  { pattern: /snapchat\.com/i, name: 'Snapchat', icon: '👻' },
  { pattern: /youtube\.com|youtu\.be/i, name: 'YouTube', icon: '▶️' },
];

function detectPlatform(url: string): { name: string; icon: string } | null {
  for (const p of platformPatterns) {
    if (p.pattern.test(url)) return { name: p.name, icon: p.icon };
  }
  return null;
}

export default function SmartAnalyzer() {
  const { user } = useAuth();
  const [accountUrl, setAccountUrl] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [detectedPlatform, setDetectedPlatform] = useState<{ name: string; icon: string } | null>(null);

  const handleUrlChange = (value: string) => {
    setAccountUrl(value);
    setDetectedPlatform(detectPlatform(value));
  };

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

  const handleAnalyze = async () => {
    if (!accountUrl.trim()) {
      setError('يرجى إدخال رابط الحساب');
      return;
    }

    if (!detectedPlatform) {
      setError('يرجى إدخال رابط صالح من المنصات المدعومة (Instagram, TikTok, X, Snapchat)');
      return;
    }

    setIsLoading(true);
    setLoadingStep(0);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'smart_analyzer',
          inputs: { accountUrl },
          userId: user?.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'حدث خطأ غير متوقع');
      }

      if (data.success && data.result) {
        const r = data.result;
        setResult({
          rating: r.rating || 'متوسط',
          ratingReason: r.ratingReason || '',
          platform: r.platform || detectedPlatform.name,
          observations: Array.isArray(r.observations) ? r.observations : [],
          recommendation: r.recommendation || { type: '', text: '' },
          decisionReasoning: r.decisionReasoning,
        });
      } else {
        setError('لم يتم استلام نتائج صالحة');
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء التحليل');
    } finally {
      setIsLoading(false);
    }
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

  const getSuggestedAction = () => {
    if (!result) return '';
    if (result.rating === 'قوي') return 'تطوير حملة تسويقية للحساب';
    if (result.rating === 'متوسط') return 'تحسين المحتوى أولاً ثم إطلاق حملة';
    return 'التركيز على بناء المحتوى قبل الإعلان';
  };

  return (
    <AppLayout>
      <div className="space-y-10 lg:space-y-14">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center shadow-xl">
            <BarChart3 className="w-8 h-8 text-white" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold">محلل القنوات</h1>
            <p className="text-muted-foreground text-lg mt-2">تحليل تقديري ذكي لحسابات التواصل الاجتماعي</p>
          </div>
        </div>

        <div className="bg-[#1a2744]/10 dark:bg-[#1a2744]/30 border border-[#3B82F6]/20 rounded-xl p-4 flex items-center gap-3">
          <Info className="w-5 h-5 text-[#3B82F6] flex-shrink-0" />
          <p className="text-muted-foreground">
            هذا التحليل تقديري ذكي مبني على قراءة عامة للحساب، وليس تحليلاً رسمياً عبر واجهات برمجية (API).
          </p>
        </div>

        {!result && (
          <div className="bg-card/50 rounded-2xl p-8 lg:p-10 border border-border/30">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-xl font-semibold mb-2 text-center">تحليل حساب تواصل اجتماعي</h2>
              <p className="text-muted-foreground mb-6 text-center">أدخل رابط الحساب لتحليل جودته وجاهزيته الإعلانية</p>
              
              <div className="space-y-4">
                <div>
                  <Label className="mb-2 block">رابط الحساب *</Label>
                  <Input
                    placeholder="https://instagram.com/username"
                    value={accountUrl}
                    onChange={(e) => handleUrlChange(e.target.value)}
                    className="bg-background/80 text-left h-12 text-base rounded-xl"
                    dir="ltr"
                    data-testid="input-account-url"
                  />
                  {detectedPlatform && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                      <span>{detectedPlatform.icon}</span>
                      <span>تم اكتشاف: {detectedPlatform.name}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">المنصات المدعومة</Label>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {platformPatterns.map((p) => (
                      <Badge key={p.name} variant="outline" className="text-xs">
                        {p.icon} {p.name}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={handleAnalyze}
                  disabled={isLoading || !accountUrl.trim()}
                  className="btn-primary px-10 h-12 rounded-xl text-base mx-auto block"
                  data-testid="button-analyze"
                >
                  <Sparkles className="w-5 h-5 ml-2" />
                  تحليل الحساب
                </Button>
              </div>
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
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <AnalysisLoading currentStep={loadingStep} />
            </motion.div>
          )}
          {result && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-5"
                >
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
                        <div className="text-left">
                          <Badge variant="outline">{result.platform}</Badge>
                        </div>
                      </div>
                      <p className="mt-4 text-muted-foreground">{result.ratingReason}</p>
                    </CardContent>
                  </Card>

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

                  {result.decisionReasoning && (
                    <Card className="glass border-0" data-testid="card-reasoning">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Info className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                          لماذا هذا القرار؟
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">السبب الرئيسي</p>
                          <p className="text-sm">{result.decisionReasoning.mainReason}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">الأدلة</p>
                          <ul className="space-y-1">
                            {result.decisionReasoning.evidence.map((e, i) => (
                              <li key={i} className="text-sm flex items-start gap-2">
                                <span style={{ color: 'var(--accent)' }}>•</span>
                                {e}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">المخاطر</p>
                          <p className="text-sm text-amber-400">{result.decisionReasoning.risks}</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <AnalysisActionBar 
                    suggestedAction={getSuggestedAction()}
                    analysisContext={{ 
                      platform: result.platform, 
                      rating: result.rating,
                      accountUrl 
                    }}
                  />

                  <div className="bg-[#1a2744]/10 dark:bg-[#1a2744]/30 border border-[#3B82F6]/20 rounded-xl p-4 flex items-center gap-3">
                    <Info className="w-5 h-5 text-[#3B82F6] flex-shrink-0" />
                    <p className="text-sm text-muted-foreground">
                      هذا التحليل تقديري وليس رسمياً. للحصول على قرار إعلاني نهائي، استخدم "محلل الأعمال" لتحليل الموقع أو المتجر.
                    </p>
                  </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
}
