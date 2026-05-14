import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Download,
  ImageIcon,
  Loader2,
  Palette,
  RefreshCw,
  Sparkles,
  Upload,
} from 'lucide-react';

import AppLayout from '@/components/layout/app-layout';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface UploadedLogo {
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}

interface NonprofitDesign {
  id: number;
  type: string;
  projectName: string;
  highlightWord: string;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  imageUrl: string | null;
  backgroundUrl: string | null;
  status: string | null;
  errorMessage: string | null;
  createdAt: string | null;
}

interface HistoryResponse {
  designs: NonprofitDesign[];
}

const loadingMessages = [
  'جاري إنشاء الخلفية...',
  'جاري دمج الشعار...',
  'جاري إضافة العنوان...',
];

function getLastWord(value: string): string {
  const words = value.trim().split(/\s+/).filter(Boolean);
  return words[words.length - 1] || '';
}

function formatDate(value: string | null): string {
  if (!value) return 'الآن';
  return new Date(value).toLocaleDateString('ar-SA', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function readError(response: Response, fallback: string): Promise<string> {
  try {
    const data = await response.json();
    return data.error || fallback;
  } catch {
    return fallback;
  }
}

export default function NonprofitStudio() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  const [projectName, setProjectName] = useState('');
  const [highlightWord, setHighlightWord] = useState('');
  const [highlightTouched, setHighlightTouched] = useState(false);
  const [designType, setDesignType] = useState('store_post');
  const [uploadedLogo, setUploadedLogo] = useState<UploadedLogo | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingIndex, setLoadingIndex] = useState(0);
  const [generatedDesign, setGeneratedDesign] = useState<NonprofitDesign | null>(null);
  const [error, setError] = useState<string | null>(null);

  const historyQuery = useQuery<HistoryResponse>({
    queryKey: ['/api/nonprofit-studio/history'],
  });

  useEffect(() => {
    if (!isGenerating) {
      setLoadingIndex(0);
      return;
    }

    const timer = window.setInterval(() => {
      setLoadingIndex((current) => (current + 1) % loadingMessages.length);
    }, 1800);

    return () => window.clearInterval(timer);
  }, [isGenerating]);

  useEffect(() => {
    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
    };
  }, [logoPreview]);

  const handleProjectNameChange = (value: string) => {
    setProjectName(value);
    if (!highlightTouched) {
      setHighlightWord(getLastWord(value));
    }
  };

  const handleHighlightChange = (value: string) => {
    setHighlightTouched(true);
    setHighlightWord(value);
  };

  const handleLogoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploadedLogo(null);
    setIsUploading(true);

    if (logoPreview) {
      URL.revokeObjectURL(logoPreview);
    }
    setLogoPreview(URL.createObjectURL(file));

    const formData = new FormData();
    formData.append('logo', file);

    try {
      const response = await fetch('/api/nonprofit-studio/upload-logo', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await readError(response, 'تعذر رفع الشعار'));
      }

      const data = await response.json();
      setUploadedLogo(data);
      toast({
        title: 'تم استخراج الألوان',
        description: 'تم رفع الشعار واستخراج لوحة الألوان بنجاح',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'تعذر رفع الشعار';
      setError(message);
      toast({ title: 'خطأ', description: message, variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleGenerate = async () => {
    if (!uploadedLogo) {
      setError('يرجى رفع شعار الجمعية أولاً');
      return;
    }

    if (!projectName.trim()) {
      setError('يرجى إدخال اسم المشروع');
      return;
    }

    if (!highlightWord.trim()) {
      setError('يرجى إدخال الكلمة المميزة');
      return;
    }

    setError(null);
    setGeneratedDesign(null);
    setIsGenerating(true);

    try {
      const response = await fetch('/api/nonprofit-studio/generate', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: designType,
          projectName: projectName.trim(),
          highlightWord: highlightWord.trim(),
          logoUrl: uploadedLogo.logoUrl,
          primaryColor: uploadedLogo.primaryColor,
          secondaryColor: uploadedLogo.secondaryColor,
        }),
      });

      if (!response.ok) {
        throw new Error(await readError(response, 'تعذر توليد التصميم'));
      }

      const data = await response.json();
      setGeneratedDesign(data.design);
      await queryClient.invalidateQueries({ queryKey: ['/api/nonprofit-studio/history'] });
      toast({
        title: 'تم توليد التصميم',
        description: 'الصورة جاهزة للمعاينة والتحميل بجودة عالية',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'تعذر توليد التصميم';
      setError(message);
      toast({ title: 'خطأ', description: message, variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = (id: number) => {
    window.location.href = `/api/nonprofit-studio/download/${id}`;
  };

  const colors = uploadedLogo
    ? [
        { label: 'Primary', value: uploadedLogo.primaryColor },
        { label: 'Secondary', value: uploadedLogo.secondaryColor },
        { label: 'Accent', value: uploadedLogo.accentColor },
      ]
    : [];

  const history = historyQuery.data?.designs ?? [];

  return (
    <AppLayout>
      <div dir="rtl" className="space-y-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">
                🎨 استوديو تصاميم الجمعيات
              </h1>
              <Badge className="bg-emerald-500/15 text-emerald-600 border border-emerald-500/25 hover:bg-emerald-500/20">
                جديد ✨
              </Badge>
              <Badge variant="outline">تجريبي</Badge>
            </div>
            <p className="text-lg text-muted-foreground">
              ولّد بوستات احترافية للمتجر الإلكتروني بضغطة زر
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-700 dark:text-emerald-300">
            المرحلة الحالية: بوست متجر 1080×1080 PNG
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <Card className="border-border/40 bg-card/70">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5 text-emerald-500" />
                  بيانات التصميم
                </CardTitle>
                <CardDescription>
                  ارفع شعار الجمعية ثم أدخل اسم المشروع لتوليد بوست المتجر بأسلوب Half-Highlight.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-3">
                  <Label>شعار الجمعية</Label>
                  <button
                    type="button"
                    onClick={() => uploadInputRef.current?.click()}
                    className="flex min-h-44 w-full items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/30 p-6 transition hover:border-emerald-500/60 hover:bg-emerald-500/5"
                  >
                    {logoPreview ? (
                      <div className="flex flex-col items-center gap-4">
                        <img
                          src={logoPreview}
                          alt="معاينة شعار الجمعية"
                          className="max-h-24 max-w-56 rounded-xl bg-white p-3 shadow-sm"
                        />
                        <span className="text-sm text-muted-foreground">
                          {isUploading ? 'جاري رفع الشعار واستخراج الألوان...' : 'اضغط لتغيير الشعار'}
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        <Upload className="h-10 w-10" />
                        <span className="font-medium">ارفع شعار الجمعية</span>
                        <span className="text-sm">PNG أو JPG أو WEBP أو SVG</span>
                      </div>
                    )}
                  </button>
                  <Input
                    ref={uploadInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="hidden"
                    onChange={handleLogoChange}
                  />
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div className="grid gap-3">
                    <Label>نوع التصميم</Label>
                    <Select value={designType} onValueChange={setDesignType}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر نوع التصميم" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="store_post">بوست متجر (1080×1080)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-3">
                    <Label>اسم المشروع</Label>
                    <Input
                      value={projectName}
                      onChange={(event) => handleProjectNameChange(event.target.value)}
                      placeholder="كفالة اليتيم"
                    />
                  </div>
                </div>

                <div className="grid gap-3">
                  <Label>الكلمة المميزة</Label>
                  <Input
                    value={highlightWord}
                    onChange={(event) => handleHighlightChange(event.target.value)}
                    placeholder="اليتيم"
                  />
                  <p className="text-sm text-muted-foreground">
                    الكلمة اللي تبغاها مميزة في التصميم. نقترح تلقائياً آخر كلمة من اسم المشروع.
                  </p>
                </div>

                <div className="rounded-2xl border border-border/50 bg-muted/20 p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">الألوان المستخرجة</h3>
                      <p className="text-sm text-muted-foreground">تُستخدم للطبقة اللونية وبلوك التمييز.</p>
                    </div>
                    {isUploading && <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />}
                  </div>
                  {colors.length > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-3">
                      {colors.map((color) => (
                        <div key={color.label} className="flex items-center gap-3 rounded-xl bg-background/70 p-3">
                          <span
                            className="h-10 w-10 rounded-full border border-border shadow-inner"
                            style={{ backgroundColor: color.value }}
                          />
                          <div>
                            <p className="text-sm font-medium">{color.label}</p>
                            <p className="font-mono text-xs text-muted-foreground">{color.value}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">ستظهر الألوان هنا بعد رفع الشعار.</p>
                  )}
                </div>

                <Button
                  onClick={handleGenerate}
                  disabled={isUploading || isGenerating}
                  size="lg"
                  className="w-full gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  {isGenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                  ✨ ولّد التصميم
                </Button>
              </CardContent>
            </Card>

            {(isGenerating || generatedDesign) && (
              <Card className="border-border/40 bg-card/70">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5 text-emerald-500" />
                    النتيجة
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isGenerating ? (
                    <div className="flex min-h-96 flex-col items-center justify-center gap-5 rounded-3xl border border-dashed border-border bg-muted/20">
                      <Loader2 className="h-12 w-12 animate-spin text-emerald-500" />
                      <div className="text-center">
                        <p className="text-lg font-semibold">{loadingMessages[loadingIndex]}</p>
                        <p className="mt-2 text-sm text-muted-foreground">قد تستغرق الصورة عدة لحظات حسب ضغط نماذج الصور.</p>
                      </div>
                    </div>
                  ) : generatedDesign?.imageUrl ? (
                    <div className="space-y-5">
                      <div className="overflow-hidden rounded-3xl border border-border bg-muted/20">
                        <img
                          src={generatedDesign.imageUrl}
                          alt={`تصميم ${generatedDesign.projectName}`}
                          className="mx-auto aspect-square w-full max-w-3xl object-contain"
                        />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Button onClick={() => handleDownload(generatedDesign.id)} size="lg" className="gap-2">
                          <Download className="h-5 w-5" />
                          ⬇️ تحميل بجودة عالية
                        </Button>
                        <Button onClick={handleGenerate} size="lg" variant="outline" className="gap-2">
                          <RefreshCw className="h-5 w-5" />
                          🔄 توليد مرة أخرى
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            )}
          </div>

          <Card className="h-fit border-border/40 bg-card/70">
            <CardHeader>
              <CardTitle>آخر التصاميم</CardTitle>
              <CardDescription>آخر 10 تصاميم تم توليدها من حسابك.</CardDescription>
            </CardHeader>
            <CardContent>
              {historyQuery.isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
                </div>
              ) : history.length > 0 ? (
                <div className="space-y-3">
                  {history.map((design) => (
                    <div key={design.id} className="flex gap-3 rounded-2xl border border-border/50 bg-muted/20 p-3">
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted">
                        {design.imageUrl ? (
                          <img src={design.imageUrl} alt={design.projectName} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <ImageIcon className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{design.projectName}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(design.createdAt)}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <Badge variant={design.status === 'completed' ? 'secondary' : 'outline'} className="text-xs">
                            {design.status === 'completed' ? 'مكتمل' : design.status === 'failed' ? 'فشل' : 'قيد التوليد'}
                          </Badge>
                          {design.imageUrl && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 gap-1 px-2 text-xs"
                              onClick={() => handleDownload(design.id)}
                            >
                              <Download className="h-3.5 w-3.5" />
                              تحميل
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  لا توجد تصاميم حتى الآن. ابدأ برفع شعار الجمعية وتوليد أول بوست.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
