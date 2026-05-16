import { FormEvent, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Download, Loader2, Palette, RefreshCw, Sparkles } from 'lucide-react';

import AppLayout from '@/components/layout/app-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const visualContexts = [
  { value: 'orphan_care', label: 'كفالة يتيم' },
  { value: 'water_sebil', label: 'سقيا الماء' },
  { value: 'food_basket', label: 'سلة غذائية' },
  { value: 'iftar_meal', label: 'إفطار صائم' },
  { value: 'mosque_service', label: 'خدمة المسجد' },
  { value: 'hajj_pilgrim', label: 'خدمة الحاج' },
  { value: 'general_charity', label: 'خير عام' },
];

const loadingMessages = [
  '🎨 جاري التواصل مع الذكاء الاصطناعي...',
  '✨ جاري توليد التصميم...',
  '🖼️ جاري إنهاء التفاصيل الإبداعية...',
  '⏰ قد يستغرق 20-40 ثانية، الرجاء الانتظار...',
];

interface NonprofitDesign {
  id: number;
  projectName: string;
  highlightWord: string;
  primaryColor: string;
  visualContext: string;
  imageUrl: string | null;
  status: string | null;
  createdAt: string | null;
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'حدث خطأ غير متوقع';
}

export default function NonprofitStudio() {
  const [projectName, setProjectName] = useState('');
  const [highlightWord, setHighlightWord] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#1B5E3F');
  const [visualContext, setVisualContext] = useState('orphan_care');
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(loadingMessages[0]);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [currentDesignId, setCurrentDesignId] = useState<number | null>(null);
  const [history, setHistory] = useState<NonprofitDesign[]>([]);
  const [highlightEdited, setHighlightEdited] = useState(false);

  useEffect(() => {
    if (highlightEdited) return;

    const words = projectName.trim().split(/\s+/).filter(Boolean);
    setHighlightWord(words.at(-1) || '');
  }, [highlightEdited, projectName]);

  useEffect(() => {
    if (!loading) {
      setLoadingMessage(loadingMessages[0]);
      return;
    }

    let index = 0;
    const interval = window.setInterval(() => {
      index = (index + 1) % loadingMessages.length;
      setLoadingMessage(loadingMessages[index]);
    }, 4000);

    return () => window.clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    fetchHistory();
  }, []);

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

  const handleGenerate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!projectName.trim() || !highlightWord.trim() || !primaryColor.trim() || !visualContext) {
      toast.error('يرجى تعبئة جميع الحقول المطلوبة');
      return;
    }

    if (!/^#[0-9A-Fa-f]{6}$/.test(primaryColor)) {
      toast.error('يرجى إدخال لون HEX صحيح مثل #1B5E3F');
      return;
    }

    setLoading(true);
    setResultImage(null);
    setCurrentDesignId(null);

    try {
      const response = await fetch('/api/nonprofit-studio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          projectName,
          highlightWord,
          primaryColor,
          visualContext,
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
      setLoading(false);
    }
  };

  const handleDownload = (designId: number | null) => {
    if (!designId) return;
    window.open(`/api/nonprofit-studio/download/${designId}`, '_blank');
  };

  return (
    <AppLayout>
      <div className="space-y-8" dir="rtl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg">
                <Palette className="h-6 w-6 text-white" strokeWidth={1.7} />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="bg-gradient-to-l from-purple-500 to-pink-500 bg-clip-text text-3xl font-bold text-transparent lg:text-4xl">
                    استوديو تصاميم الجمعيات
                  </h1>
                  <Badge className="bg-pink-500/15 text-pink-500 border border-pink-500/25">جديد ✨</Badge>
                </div>
                <p className="mt-2 text-muted-foreground">
                  ولّد بوستات متجر احترافية للجمعيات الخيرية باستخدام الذكاء الاصطناعي.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            <Card className="border-border/30 bg-card/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-pink-500" />
                  إعداد التصميم
                </CardTitle>
                <CardDescription>
                  أدخل عنوان الحملة والكلمة المميزة واللون الأساسي، وسيقوم النموذج بتوليد التصميم كاملاً.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-5" onSubmit={handleGenerate}>
                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="projectName">اسم المشروع / عنوان البوست</Label>
                      <Input
                        id="projectName"
                        value={projectName}
                        onChange={(event) => {
                          setProjectName(event.target.value);
                          setResultImage(null);
                        }}
                        placeholder="مثال: ساهم في كفالة يتيم"
                        className="bg-background/50"
                        data-testid="input-project-name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="highlightWord">الكلمة المميزة</Label>
                      <Input
                        id="highlightWord"
                        value={highlightWord}
                        onChange={(event) => {
                          setHighlightEdited(true);
                          setHighlightWord(event.target.value);
                          setResultImage(null);
                        }}
                        placeholder="مثال: يتيم"
                        className="bg-background/50"
                        data-testid="input-highlight-word"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="primaryColor">اللون الأساسي</Label>
                      <div className="flex gap-3">
                        <Input
                          id="primaryColor"
                          value={primaryColor}
                          onChange={(event) => {
                            setPrimaryColor(event.target.value);
                            setResultImage(null);
                          }}
                          placeholder="#1B5E3F"
                          className="bg-background/50"
                          dir="ltr"
                          data-testid="input-primary-color"
                        />
                        <Input
                          type="color"
                          value={primaryColor}
                          onChange={(event) => {
                            setPrimaryColor(event.target.value.toUpperCase());
                            setResultImage(null);
                          }}
                          className="h-10 w-14 cursor-pointer bg-background/50 p-1"
                          aria-label="اختر اللون الأساسي"
                        />
                      </div>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label>السياق البصري</Label>
                      <Select
                        value={visualContext}
                        onValueChange={(value) => {
                          setVisualContext(value);
                          setResultImage(null);
                        }}
                      >
                        <SelectTrigger className="bg-background/50" data-testid="select-visual-context">
                          <SelectValue placeholder="اختر السياق البصري" />
                        </SelectTrigger>
                        <SelectContent>
                          {visualContexts.map((context) => (
                            <SelectItem key={context.value} value={context.value}>
                              {context.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-l from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600"
                    data-testid="button-generate-design"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                        جاري التوليد
                      </>
                    ) : (
                      <>
                        <Sparkles className="ml-2 h-4 w-4" />
                        توليد التصميم
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="border-border/30 bg-card/50">
              <CardHeader>
                <CardTitle>النتيجة</CardTitle>
                <CardDescription>صورة PNG مربعة 1024×1024 جاهزة للتحميل.</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-purple-500/30 bg-purple-500/5 text-center">
                    <Loader2 className="mb-5 h-12 w-12 animate-spin text-pink-500" />
                    <p className="text-lg font-semibold">{loadingMessage}</p>
                    <p className="mt-3 max-w-md text-sm text-muted-foreground">
                      يتم إنشاء الصورة كاملة داخل نموذج gpt-image-1 دون أي معالجة محلية للصور.
                    </p>
                  </div>
                ) : resultImage ? (
                  <div className="space-y-4">
                    <div className="overflow-hidden rounded-2xl border border-border/40 bg-background/50">
                      <img
                        src={resultImage}
                        alt="تصميم الجمعية الناتج"
                        className="mx-auto aspect-square w-full max-w-2xl object-cover"
                      />
                    </div>
                    <Button
                      type="button"
                      onClick={() => handleDownload(currentDesignId)}
                      className="w-full bg-gradient-to-l from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600"
                    >
                      <Download className="ml-2 h-4 w-4" />
                      تحميل PNG
                    </Button>
                  </div>
                ) : (
                  <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-border/50 bg-background/30 text-center">
                    <Palette className="mb-4 h-12 w-12 text-muted-foreground" />
                    <p className="text-lg font-semibold">لم يتم توليد تصميم بعد</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      عبئ النموذج واضغط توليد التصميم لعرض الصورة هنا.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
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
                            <p className="text-xs text-muted-foreground">الكلمة المميزة: {design.highlightWord}</p>
                          </div>
                          <span
                            className="mt-1 h-4 w-4 rounded-full border border-border"
                            style={{ backgroundColor: design.primaryColor }}
                            aria-label={`لون التصميم ${design.primaryColor}`}
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
