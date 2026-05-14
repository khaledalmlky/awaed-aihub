import { useMemo, useState } from 'react';
import AppLayout from '@/components/layout/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertTriangle,
  BarChart3,
  Calculator,
  CheckCircle2,
  DollarSign,
  RotateCcw,
  Target,
  TrendingUp,
} from 'lucide-react';
import { motion } from 'framer-motion';

type Rating = 'قوي' | 'متوسط' | 'ضعيف';

interface CalculatorInputs {
  adSpend: string;
  revenue: string;
  conversions: string;
  clicks: string;
  averageOrderValue: string;
  grossMargin: string;
  targetRoas: string;
}

const initialInputs: CalculatorInputs = {
  adSpend: '',
  revenue: '',
  conversions: '',
  clicks: '',
  averageOrderValue: '',
  grossMargin: '35',
  targetRoas: '3',
};

const parseNumber = (value: string) => {
  const normalized = value.replace(/,/g, '').trim();
  if (!normalized) return 0;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

const formatNumber = (value: number, options?: Intl.NumberFormatOptions) =>
  value.toLocaleString('ar-SA', {
    maximumFractionDigits: 2,
    ...options,
  });

const formatCurrency = (value: number) => `${formatNumber(value)} ريال`;

const clamp = (value: number, min = 0, max = 100) => Math.min(Math.max(value, min), max);

export default function RoasCalculator() {
  const [inputs, setInputs] = useState<CalculatorInputs>(initialInputs);

  const metrics = useMemo(() => {
    const adSpend = parseNumber(inputs.adSpend);
    const revenue = parseNumber(inputs.revenue);
    const conversions = parseNumber(inputs.conversions);
    const clicks = parseNumber(inputs.clicks);
    const averageOrderValue = parseNumber(inputs.averageOrderValue);
    const grossMargin = parseNumber(inputs.grossMargin);
    const targetRoas = parseNumber(inputs.targetRoas);
    const marginRate = grossMargin > 0 ? grossMargin / 100 : 0;

    const roas = adSpend > 0 ? revenue / adSpend : 0;
    const cpa = conversions > 0 ? adSpend / conversions : 0;
    const conversionRate = clicks > 0 && conversions > 0 ? (conversions / clicks) * 100 : 0;
    const grossProfit = revenue * marginRate;
    const netProfit = grossProfit - adSpend;
    const breakEvenRoas = grossMargin > 0 ? 100 / grossMargin : 0;
    const requiredRevenue = targetRoas > 0 ? adSpend * targetRoas : 0;
    const revenueGap = Math.max(requiredRevenue - revenue, 0);
    const maxProfitableCpa = averageOrderValue > 0 && marginRate > 0 ? averageOrderValue * marginRate : 0;
    const targetProgress = targetRoas > 0 ? clamp((roas / targetRoas) * 100) : 0;
    const breakEvenProgress = breakEvenRoas > 0 ? clamp((roas / breakEvenRoas) * 100) : 0;

    let rating: Rating = 'ضعيف';
    if (adSpend > 0 && revenue > 0) {
      if (roas >= Math.max(targetRoas, breakEvenRoas) && netProfit >= 0) {
        rating = 'قوي';
      } else if (breakEvenRoas > 0 && roas >= breakEvenRoas) {
        rating = 'متوسط';
      }
    }

    const recommendations: string[] = [];
    if (adSpend === 0 || revenue === 0) {
      recommendations.push('أدخل الصرف والإيراد للحصول على قراءة دقيقة للعائد.');
    } else if (rating === 'قوي') {
      recommendations.push('الأداء يتجاوز نقطة التعادل والهدف الحالي. اختبر زيادة الميزانية تدريجياً بنسبة 15-20%.');
    } else if (rating === 'متوسط') {
      recommendations.push('الحملة رابحة مبدئياً لكنها أقل من الهدف. حسّن صفحة الهبوط أو العروض قبل توسيع الصرف.');
    } else {
      recommendations.push('الحملة تحت نقطة التعادل. أوقف التوسع وراجع الاستهداف والرسائل قبل ضخ ميزانية إضافية.');
    }

    if (conversions > 0 && maxProfitableCpa > 0 && cpa > maxProfitableCpa) {
      recommendations.push('تكلفة التحويل أعلى من الحد الربحي للطلب. خفّض CPA أو ارفع متوسط قيمة الطلب.');
    }

    if (clicks > 0 && conversions > 0 && conversionRate < 1) {
      recommendations.push('معدل التحويل أقل من 1%. افحص سرعة الصفحة، وضوح العرض، وخطوات إتمام الطلب.');
    }

    if (revenueGap > 0) {
      recommendations.push(`تحتاج إلى ${formatCurrency(revenueGap)} إيراد إضافي للوصول إلى ROAS المستهدف.`);
    }

    return {
      adSpend,
      revenue,
      conversions,
      clicks,
      averageOrderValue,
      grossMargin,
      targetRoas,
      roas,
      cpa,
      conversionRate,
      grossProfit,
      netProfit,
      breakEvenRoas,
      requiredRevenue,
      revenueGap,
      maxProfitableCpa,
      targetProgress,
      breakEvenProgress,
      rating,
      recommendations,
    };
  }, [inputs]);

  const updateInput = (field: keyof CalculatorInputs, value: string) => {
    setInputs((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const hasCoreInputs = metrics.adSpend > 0 && metrics.revenue > 0;
  const ratingColor = metrics.rating === 'قوي'
    ? 'text-emerald-500'
    : metrics.rating === 'متوسط'
      ? 'text-amber-500'
      : 'text-red-500';

  return (
    <AppLayout>
      <div className="space-y-10 lg:space-y-14">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-xl">
            <Calculator className="w-8 h-8 text-white" strokeWidth={1.5} />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl lg:text-4xl font-bold">حاسبة العائد الإعلاني</h1>
              <Badge className="bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">جديد</Badge>
            </div>
            <p className="text-muted-foreground text-lg mt-2">
              احسب ROAS و CPA ونقطة التعادل قبل توسيع ميزانية الحملات
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="xl:col-span-1">
            <Card className="glass border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-accent" />
                  مدخلات الحملة
                </CardTitle>
                <CardDescription>
                  أدخل الأرقام المتاحة. الحقول الاختيارية تحسّن دقة التوصيات.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="ad-spend">الصرف الإعلاني *</Label>
                  <Input
                    id="ad-spend"
                    inputMode="decimal"
                    placeholder="مثال: 5000"
                    value={inputs.adSpend}
                    onChange={(event) => updateInput('adSpend', event.target.value)}
                    className="h-12 text-left"
                    dir="ltr"
                    data-testid="input-roas-ad-spend"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="revenue">الإيراد المنسوب للحملة *</Label>
                  <Input
                    id="revenue"
                    inputMode="decimal"
                    placeholder="مثال: 18000"
                    value={inputs.revenue}
                    onChange={(event) => updateInput('revenue', event.target.value)}
                    className="h-12 text-left"
                    dir="ltr"
                    data-testid="input-roas-revenue"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="conversions">عدد التحويلات</Label>
                    <Input
                      id="conversions"
                      inputMode="decimal"
                      placeholder="مثال: 42"
                      value={inputs.conversions}
                      onChange={(event) => updateInput('conversions', event.target.value)}
                      className="h-12 text-left"
                      dir="ltr"
                      data-testid="input-roas-conversions"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="clicks">عدد النقرات</Label>
                    <Input
                      id="clicks"
                      inputMode="decimal"
                      placeholder="مثال: 2100"
                      value={inputs.clicks}
                      onChange={(event) => updateInput('clicks', event.target.value)}
                      className="h-12 text-left"
                      dir="ltr"
                      data-testid="input-roas-clicks"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="aov">متوسط قيمة الطلب</Label>
                    <Input
                      id="aov"
                      inputMode="decimal"
                      placeholder="مثال: 250"
                      value={inputs.averageOrderValue}
                      onChange={(event) => updateInput('averageOrderValue', event.target.value)}
                      className="h-12 text-left"
                      dir="ltr"
                      data-testid="input-roas-aov"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gross-margin">هامش الربح %</Label>
                    <Input
                      id="gross-margin"
                      inputMode="decimal"
                      value={inputs.grossMargin}
                      onChange={(event) => updateInput('grossMargin', event.target.value)}
                      className="h-12 text-left"
                      dir="ltr"
                      data-testid="input-roas-margin"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="target-roas">ROAS المستهدف</Label>
                  <Input
                    id="target-roas"
                    inputMode="decimal"
                    value={inputs.targetRoas}
                    onChange={(event) => updateInput('targetRoas', event.target.value)}
                    className="h-12 text-left"
                    dir="ltr"
                    data-testid="input-roas-target"
                  />
                </div>

                <Button
                  variant="outline"
                  className="w-full h-11 rounded-xl"
                  onClick={() => setInputs(initialInputs)}
                  data-testid="button-roas-reset"
                >
                  <RotateCcw className="w-4 h-4" />
                  إعادة ضبط
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="xl:col-span-2 space-y-6">
            {!hasCoreInputs && (
              <Alert className="border-amber-500/30 bg-amber-500/10">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <AlertTitle>ابدأ بإدخال الصرف والإيراد</AlertTitle>
                <AlertDescription>
                  الحاسبة تعرض قراءة أولية الآن، وتصبح التوصيات أدق بعد إضافة التحويلات والهامش.
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <Card className="bg-card/50 border-border/30">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">ROAS</p>
                      <p className="text-3xl font-bold mt-2">{formatNumber(metrics.roas)}x</p>
                    </div>
                    <TrendingUp className="w-7 h-7 text-emerald-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 border-border/30">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">CPA</p>
                      <p className="text-3xl font-bold mt-2">{metrics.cpa ? formatCurrency(metrics.cpa) : 'غير محدد'}</p>
                    </div>
                    <DollarSign className="w-7 h-7 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 border-border/30">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">صافي الربح</p>
                      <p className={`text-3xl font-bold mt-2 ${metrics.netProfit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {formatCurrency(metrics.netProfit)}
                      </p>
                    </div>
                    <BarChart3 className="w-7 h-7 text-violet-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 border-border/30">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">التقييم</p>
                      <p className={`text-3xl font-bold mt-2 ${ratingColor}`}>{metrics.rating}</p>
                    </div>
                    <CheckCircle2 className={`w-7 h-7 ${ratingColor}`} />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="glass border-0">
              <CardHeader>
                <CardTitle>مقارنة الأهداف</CardTitle>
                <CardDescription>
                  تقارن الحاسبة العائد الحالي مع ROAS المستهدف ونقطة التعادل المحسوبة من هامش الربح.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>التقدم نحو ROAS المستهدف ({formatNumber(metrics.targetRoas)}x)</span>
                    <span className="font-semibold">{formatNumber(metrics.targetProgress)}%</span>
                  </div>
                  <Progress value={metrics.targetProgress} className="h-3" />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>التقدم نحو نقطة التعادل ({formatNumber(metrics.breakEvenRoas)}x)</span>
                    <span className="font-semibold">{formatNumber(metrics.breakEvenProgress)}%</span>
                  </div>
                  <Progress value={metrics.breakEvenProgress} className="h-3" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="rounded-xl bg-background/60 border border-border/30 p-4">
                    <p className="text-sm text-muted-foreground">الإيراد المطلوب للهدف</p>
                    <p className="text-xl font-bold mt-2">{formatCurrency(metrics.requiredRevenue)}</p>
                  </div>
                  <div className="rounded-xl bg-background/60 border border-border/30 p-4">
                    <p className="text-sm text-muted-foreground">فجوة الإيراد</p>
                    <p className="text-xl font-bold mt-2">{formatCurrency(metrics.revenueGap)}</p>
                  </div>
                  <div className="rounded-xl bg-background/60 border border-border/30 p-4">
                    <p className="text-sm text-muted-foreground">CPA الربحي الأقصى</p>
                    <p className="text-xl font-bold mt-2">
                      {metrics.maxProfitableCpa ? formatCurrency(metrics.maxProfitableCpa) : 'غير محدد'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass border-0">
              <CardHeader>
                <CardTitle>توصيات التنفيذ</CardTitle>
                <CardDescription>
                  قراءة مختصرة تساعدك على اتخاذ قرار التوسيع أو التحسين.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {metrics.recommendations.map((recommendation) => (
                    <li key={recommendation} className="flex items-start gap-3 rounded-xl bg-background/50 border border-border/30 p-4">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span>{recommendation}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </AppLayout>
  );
}
