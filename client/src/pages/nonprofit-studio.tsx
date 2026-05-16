import { ChangeEvent, DragEvent, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Download,
  Loader2,
  Megaphone,
  Palette,
  PanelTop,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  Upload,
} from 'lucide-react';

import AppLayout from '@/components/layout/app-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const DESIGN_TYPES = [
  {
    value: 'store_post',
    label: 'بوست متجر',
    description: 'تصميم مربع بسيط لمنتجات المتجر',
    icon: ShoppingBag,
    aspectRatio: '1:1',
  },
  {
    value: 'marketing_post',
    label: 'بوست تسويقي',
    description: 'تصميم تفصيلي لحملات التبرع',
    icon: Megaphone,
    aspectRatio: '1:1',
  },
  {
    value: 'store_banner',
    label: 'بنر متجر',
    description: 'تصميم بإحساس أفقي للبنرات',
    icon: PanelTop,
    aspectRatio: '16:9',
  },
] as const;

const PROJECT_TYPES_AR = [
  { value: 'orphan_care', label: '👶 كفالة يتيم' },
  { value: 'water_hajj', label: '💧 سقيا حاج' },
  { value: 'meal_hajj', label: '🍱 وجبة حاج' },
  { value: 'home_restoration', label: '🏠 ترميم منزل' },
  { value: 'iftar', label: '🌙 إفطار صائم' },
  { value: 'mosque_building', label: '🕌 بناء مساجد' },
  { value: 'mosque_restoration', label: '🔨 ترميم مسجد' },
  { value: 'food_basket', label: '📦 سلة غذائية' },
  { value: 'crisis_relief', label: '💚 تفريج كربة' },
  { value: 'water_sebil', label: '💧 سقيا الماء' },
  { value: 'education_fees', label: '🎓 رسوم دراسية' },
  { value: 'wedding_help', label: '👰 تجهيز عرسان' },
  { value: 'medical_treatment', label: '⚕️ علاج مرضى' },
  { value: 'general_charity', label: '🌟 خير عام' },
] as const;

const steps = [
  { number: 1, label: 'اختيار' },
  { number: 2, label: 'رفع' },
  { number: 3, label: 'تفاصيل' },
  { number: 4, label: 'توليد' },
];

const generationMessages = [
  '🎨 جاري التواصل مع الذكاء الاصطناعي...',
  '✨ جاري توليد التصميم...',
  '🖼️ جاري إنهاء التفاصيل الإبداعية...',
  '⏰ قد يستغرق 20-40 ثانية، الرجاء الانتظار...',
];

type DesignType = (typeof DESIGN_TYPES)[number]['value'];
type ProjectType = (typeof PROJECT_TYPES_AR)[number]['value'];

interface BrandColors {
  primary: string;
  secondary: string;
  accent: string;
}

interface NonprofitDesign {
  id: number;
  designType?: DesignType | null;
  projectType?: ProjectType | string | null;
  projectName: string;
  highlightWord?: string | null;
  primaryColor?: string | null;
  logoUrl?: string | null;
  extractedColors?: string | null;
  imageUrl: string | null;
  status: string | null;
  createdAt: string | null;
}

const defaultColors: BrandColors = {
  primary: '#1B5E3F',
  secondary: '#D4AF37',
  accent: '#FFFFFF',
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
  });
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'حدث خطأ غير متوقع';
}

function getDesignLabel(value?: string | null): string {
  return DESIGN_TYPES.find((type) => type.value === value)?.label || 'تصميم جمعية';
}

function getProjectLabel(value?: string | null): string {
  return PROJECT_TYPES_AR.find((type) => type.value === value)?.label || 'خير عام';
}

function isValidHex(value: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(value);
}

export default function NonprofitStudio() {
  const [step, setStep] = useState(1);
  const [designType, setDesignType] = useState<DesignType | ''>('');
  const [projectName, setProjectName] = useState('');
  const [projectType, setProjectType] = useState<ProjectType>('orphan_care');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoPreview, setLogoPreview] = useState('');
  const [colors, setColors] = useState<BrandColors>(defaultColors);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generationMessage, setGenerationMessage] = useState(generationMessages[0]);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [currentDesignId, setCurrentDesignId] = useState<number | null>(null);
  const [history, setHistory] = useState<NonprofitDesign[]>([]);

  const progressValue = useMemo(() => (step / steps.length) * 100, [step]);

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    if (!generating) {
      setGenerationMessage(generationMessages[0]);
      return;
    }

    let index = 0;
    const interval = window.setInterval(() => {
      index = (index + 1) % generationMessages.length;
      setGenerationMessage(generationMessages[index]);
    }, 4000);

    return () => window.clearInterval(interval);
  }, [generating]);

  const fetchHistory = async () => {
    try {
      const response = await fetch('/api/nonprofit-studio/history', {
        credentials: 'include',
      });

      if (!response.ok) return;

      const data = await response.json();
      setHistory(data.designs || []);
    } catch (error) {
      console.error('Failed to fetch nonprofit designs:', error);
    }
  };

  const handleDesignSelect = (value: DesignType) => {
    setDesignType(value);
    setResultImage(null);
    setCurrentDesignId(null);
    setStep(2);
  };

  const updateColor = (key: keyof BrandColors, value: string) => {
    setColors((current) => ({
      ...current,
      [key]: value.toUpperCase(),
    }));
    setResultImage(null);
  };

  const uploadLogo = async (file: File) => {
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      toast.error('يرجى رفع شعار بصيغة PNG أو JPG فقط');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('حجم الشعار يجب ألا يتجاوز 5MB');
      return;
    }

    setUploadingLogo(true);
    setResultImage(null);
    setCurrentDesignId(null);

    try {
      const base64 = await fileToBase64(file);
      setLogoPreview(base64);

      const response = await fetch('/api/nonprofit-studio/upload-logo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ logo: base64 }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'فشل رفع الشعار');
      }

      setLogoUrl(data.logoUrl);
      setColors(data.colors || defaultColors);
      toast.success('تم رفع الشعار وتحليل الألوان');
    } catch (error) {
      toast.error(extractErrorMessage(error));
      setLogoPreview('');
      setLogoUrl('');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadLogo(file);
    }
    event.target.value = '';
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) {
      uploadLogo(file);
    }
  };

  const canGoToStep3 = Boolean(logoUrl) && Object.values(colors).every(isValidHex);
  const canGenerate = Boolean(designType && logoUrl && projectName.trim() && projectType)
    && Object.values(colors).every(isValidHex);

  const handleGenerate = async () => {
    if (!canGenerate) {
      toast.error('يرجى إكمال جميع البيانات والتأكد من صحة الألوان');
      return;
    }

    setGenerating(true);
    setResultImage(null);
    setCurrentDesignId(null);

    try {
      const response = await fetch('/api/nonprofit-studio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          designType,
          projectType,
          projectName,
          logoUrl,
          primaryColor: colors.primary,
          secondaryColor: colors.secondary,
          accentColor: colors.accent,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'فشل توليد التصميم');
      }

      setResultImage(data.imageUrl);
      setCurrentDesignId(data.designId);
      toast.success('تم توليد التصميم بنجاح');
      await fetchHistory();
    } catch (error) {
      toast.error(extractErrorMessage(error));
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = (designId: number | null) => {
    if (!designId) return;
    window.open(`/api/nonprofit-studio/download/${designId}`, '_blank');
  };

  const renderStepper = () => (
    <Card className="border-border/30 bg-card/50">
      <CardContent className="p-5">
        <div className="mb-4 grid grid-cols-4 gap-3">
          {steps.map((item) => {
            const isActive = item.number === step;
            const isDone = item.number < step;
            return (
              <button
                key={item.number}
                type="button"
                onClick={() => {
                  if (item.number < step) setStep(item.number);
                }}
                className="flex flex-col items-center gap-2"
                disabled={item.number > step}
              >
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm font-bold transition-colors ${
                    isDone
                      ? 'border-pink-500 bg-pink-500 text-white'
                      : isActive
                        ? 'border-purple-500 bg-purple-500 text-white'
                        : 'border-border bg-background text-muted-foreground'
                  }`}
                >
                  {isDone ? <Check className="h-4 w-4" /> : item.number}
                </span>
                <span className={`text-xs ${isActive ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
        <Progress value={progressValue} className="h-2" />
      </CardContent>
    </Card>
  );

  const renderStepOne = () => (
    <Card className="border-border/30 bg-card/50">
      <CardHeader>
        <CardTitle>1. اختر نوع التصميم</CardTitle>
        <CardDescription>حدد الاستخدام الأساسي للتصميم وسيتم تخصيص البرومت بناءً عليه.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3">
          {DESIGN_TYPES.map((type) => (
            <button key={type.value} type="button" onClick={() => handleDesignSelect(type.value)} className="text-right">
              <Card
                className={`h-full border-2 bg-background/40 transition-all hover:-translate-y-1 hover:border-pink-500/60 hover:shadow-lg ${
                  designType === type.value ? 'border-pink-500 ring-2 ring-pink-500/20' : 'border-border/30'
                }`}
              >
                <CardContent className="p-6">
                  <div className="mb-5 flex items-center justify-between">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg">
                      <type.icon className="h-7 w-7" strokeWidth={1.7} />
                    </div>
                    <Badge variant="secondary" className="bg-secondary/50">
                      {type.aspectRatio}
                    </Badge>
                  </div>
                  <h3 className="text-xl font-bold">{type.label}</h3>
                  <p className="mt-3 text-sm text-muted-foreground">{type.description}</p>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const renderStepTwo = () => (
    <Card className="border-border/30 bg-card/50">
      <CardHeader>
        <CardTitle>2. ارفع شعار الجمعية</CardTitle>
        <CardDescription>سيتم تحليل الشعار عبر GPT-4o Vision لاستخراج الألوان الأساسية تلقائياً.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <label
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
          className="flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-purple-500/30 bg-purple-500/5 p-6 text-center transition-colors hover:bg-purple-500/10"
        >
          <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleFileChange} />
          {uploadingLogo ? (
            <>
              <Loader2 className="mb-4 h-12 w-12 animate-spin text-pink-500" />
              <p className="text-lg font-semibold">🎨 جاري تحليل الألوان...</p>
              <p className="mt-2 text-sm text-muted-foreground">يتم رفع الشعار وتحليل هويته اللونية.</p>
            </>
          ) : logoPreview ? (
            <>
              <img src={logoPreview} alt="معاينة شعار الجمعية" className="mb-4 h-28 w-28 rounded-2xl object-contain bg-white p-3" />
              <p className="font-semibold">تم رفع الشعار</p>
              <p className="mt-1 text-sm text-muted-foreground">اضغط هنا لتغيير الشعار.</p>
            </>
          ) : (
            <>
              <Upload className="mb-4 h-12 w-12 text-pink-500" />
              <p className="text-lg font-semibold">اسحب الشعار هنا أو اضغط للرفع</p>
              <p className="mt-2 text-sm text-muted-foreground">PNG أو JPG فقط - الحد الأقصى 5MB</p>
            </>
          )}
        </label>

        {logoUrl && (
          <div className="space-y-4 rounded-2xl border border-border/30 bg-background/40 p-5">
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-pink-500" />
              <h3 className="font-semibold">الألوان المستخرجة</h3>
              <Badge className="bg-pink-500/15 text-pink-500 border border-pink-500/25">قابلة للتعديل</Badge>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {([
                ['primary', 'الأساسي'],
                ['secondary', 'الثانوي'],
                ['accent', 'التمييز'],
              ] as const).map(([key, label]) => (
                <div key={key} className="space-y-2">
                  <Label>{label}</Label>
                  <div className="flex items-center gap-3">
                    <span
                      className="h-10 w-10 rounded-full border border-border"
                      style={{ backgroundColor: colors[key] }}
                      aria-label={`اللون ${label}`}
                    />
                    <Input
                      value={colors[key]}
                      onChange={(event) => updateColor(key, event.target.value)}
                      dir="ltr"
                      className="bg-background/50"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <Button type="button" variant="outline" onClick={() => setStep(1)}>
            <ArrowRight className="ml-2 h-4 w-4" />
            السابق
          </Button>
          <Button
            type="button"
            disabled={!canGoToStep3 || uploadingLogo}
            onClick={() => setStep(3)}
            className="bg-gradient-to-l from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600"
          >
            التالي
            <ArrowLeft className="mr-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderStepThree = () => (
    <Card className="border-border/30 bg-card/50">
      <CardHeader>
        <CardTitle>3. تفاصيل المشروع</CardTitle>
        <CardDescription>اختر نوع المشروع واكتب اسم الحملة أو المنتج الخيري.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="projectName">اسم المشروع</Label>
          <Input
            id="projectName"
            value={projectName}
            onChange={(event) => {
              setProjectName(event.target.value);
              setResultImage(null);
            }}
            placeholder="مثال: كهاتين"
            className="bg-background/50"
            data-testid="input-project-name"
          />
        </div>

        <div className="space-y-2">
          <Label>نوع المشروع</Label>
          <Select
            value={projectType}
            onValueChange={(value) => {
              setProjectType(value as ProjectType);
              setResultImage(null);
            }}
          >
            <SelectTrigger className="bg-background/50" data-testid="select-project-type">
              <SelectValue placeholder="اختر نوع المشروع" />
            </SelectTrigger>
            <SelectContent>
              {PROJECT_TYPES_AR.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between gap-3">
          <Button type="button" variant="outline" onClick={() => setStep(2)}>
            <ArrowRight className="ml-2 h-4 w-4" />
            السابق
          </Button>
          <Button
            type="button"
            disabled={!projectName.trim()}
            onClick={() => setStep(4)}
            className="bg-gradient-to-l from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600"
          >
            التالي
            <ArrowLeft className="mr-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderStepFour = () => (
    <div className="space-y-6">
      <Card className="border-border/30 bg-card/50">
        <CardHeader>
          <CardTitle>4. المراجعة والتوليد</CardTitle>
          <CardDescription>راجع الخيارات ثم ولّد التصميم النهائي عبر gpt-image-1.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-border/30 bg-background/40 p-5">
              <p className="text-sm text-muted-foreground">نوع التصميم</p>
              <p className="mt-2 text-lg font-bold">{getDesignLabel(designType)}</p>
            </div>
            <div className="rounded-2xl border border-border/30 bg-background/40 p-5">
              <p className="text-sm text-muted-foreground">نوع المشروع</p>
              <p className="mt-2 text-lg font-bold">{getProjectLabel(projectType)}</p>
            </div>
            <div className="rounded-2xl border border-border/30 bg-background/40 p-5">
              <p className="text-sm text-muted-foreground">اسم المشروع</p>
              <p className="mt-2 text-lg font-bold">{projectName}</p>
            </div>
            <div className="rounded-2xl border border-border/30 bg-background/40 p-5">
              <p className="text-sm text-muted-foreground">الشعار والألوان</p>
              <div className="mt-3 flex items-center gap-3">
                {logoPreview && <img src={logoPreview} alt="شعار الجمعية" className="h-14 w-14 rounded-xl bg-white object-contain p-2" />}
                {Object.entries(colors).map(([key, value]) => (
                  <span
                    key={key}
                    className="h-8 w-8 rounded-full border border-border"
                    style={{ backgroundColor: value }}
                    title={value}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button type="button" variant="outline" onClick={() => setStep(3)}>
              <ArrowRight className="ml-2 h-4 w-4" />
              السابق
            </Button>
            <Button
              type="button"
              disabled={!canGenerate || generating}
              onClick={handleGenerate}
              className="bg-gradient-to-l from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600"
              data-testid="button-generate-design"
            >
              {generating ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جاري التوليد
                </>
              ) : (
                <>
                  <Sparkles className="ml-2 h-4 w-4" />
                  ✨ ولّد التصميم
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/30 bg-card/50">
        <CardHeader>
          <CardTitle>النتيجة</CardTitle>
          <CardDescription>صورة PNG مربعة 1024×1024 جاهزة للتحميل.</CardDescription>
        </CardHeader>
        <CardContent>
          {generating ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-purple-500/30 bg-purple-500/5 text-center">
              <Loader2 className="mb-5 h-12 w-12 animate-spin text-pink-500" />
              <p className="text-lg font-semibold">{generationMessage}</p>
              <p className="mt-3 max-w-md text-sm text-muted-foreground">
                يتم إنشاء التصميم كاملاً عبر gpt-image-1 بدون أي معالجة صور محلية.
              </p>
            </div>
          ) : resultImage ? (
            <div className="space-y-4">
              <div className="overflow-hidden rounded-2xl border border-border/40 bg-background/50">
                <img src={resultImage} alt="تصميم الجمعية الناتج" className="mx-auto aspect-square w-full max-w-2xl object-cover" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Button
                  type="button"
                  onClick={() => handleDownload(currentDesignId)}
                  className="bg-gradient-to-l from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600"
                >
                  <Download className="ml-2 h-4 w-4" />
                  تحميل PNG
                </Button>
                <Button type="button" variant="outline" onClick={handleGenerate}>
                  <RefreshCw className="ml-2 h-4 w-4" />
                  إعادة توليد
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-border/50 bg-background/30 text-center">
              <Sparkles className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-lg font-semibold">جاهز للتوليد</p>
              <p className="mt-2 text-sm text-muted-foreground">اضغط زر التوليد لعرض التصميم هنا.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <AppLayout>
      <div className="space-y-8" dir="rtl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg">
              <Palette className="h-6 w-6 text-white" strokeWidth={1.7} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="bg-gradient-to-l from-purple-500 to-pink-500 bg-clip-text text-3xl font-bold text-transparent lg:text-4xl">
                  استوديو تصاميم الجمعيات
                </h1>
                <Badge className="bg-pink-500/15 text-pink-500 border border-pink-500/25">مطوّر ✨</Badge>
              </div>
              <p className="mt-2 text-muted-foreground">
                أنشئ بوستات وبنرات احترافية بألوان شعار الجمعية وأنواع مشاريع خيرية جاهزة.
              </p>
            </div>
          </div>
        </div>

        {renderStepper()}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            {step === 1 && renderStepOne()}
            {step === 2 && renderStepTwo()}
            {step === 3 && renderStepThree()}
            {step === 4 && renderStepFour()}
          </div>

          <Card className="h-fit border-border/30 bg-card/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>آخر 10 تصاميم</CardTitle>
                  <CardDescription className="mt-2">تصاميمك المحفوظة مؤخراً.</CardDescription>
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={fetchHistory} aria-label="تحديث التصاميم">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/50 p-6 text-center text-sm text-muted-foreground">
                  لا توجد تصاميم محفوظة بعد.
                </div>
              ) : (
                <div className="space-y-4">
                  {history.map((design) => (
                    <div key={design.id} className="rounded-xl border border-border/30 bg-background/40 p-3">
                      {design.imageUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setResultImage(design.imageUrl);
                            setCurrentDesignId(design.id);
                            setStep(4);
                          }}
                          className="mb-3 block w-full overflow-hidden rounded-lg border border-border/30"
                        >
                          <img
                            src={design.imageUrl}
                            alt={design.projectName}
                            className="aspect-square w-full object-cover transition-transform hover:scale-[1.02]"
                          />
                        </button>
                      )}
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold">{design.projectName}</p>
                            <p className="text-xs text-muted-foreground">{getDesignLabel(design.designType)}</p>
                            <p className="text-xs text-muted-foreground">{getProjectLabel(design.projectType)}</p>
                          </div>
                          <span
                            className="mt-1 h-4 w-4 rounded-full border border-border"
                            style={{ backgroundColor: design.primaryColor || '#1B5E3F' }}
                            aria-label={`لون التصميم ${design.primaryColor || '#1B5E3F'}`}
                          />
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <Badge variant="secondary" className="bg-secondary/50">
                            {design.status === 'completed' ? 'مكتمل' : design.status || 'قيد المعالجة'}
                          </Badge>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={!design.imageUrl}
                            onClick={() => handleDownload(design.id)}
                          >
                            <Download className="ml-1 h-4 w-4" />
                            تحميل
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
