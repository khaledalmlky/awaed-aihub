import { useState, useEffect } from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Loader2,
    Download,
    Palette,
    Sparkles,
    RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

const VISUAL_CONTEXTS = [
  { value: "orphan_care", label: "كفالة يتيم" },
  { value: "water_sebil", label: "سقيا الماء" },
  { value: "food_basket", label: "سلة غذائية" },
  { value: "iftar_meal", label: "إفطار صائم" },
  { value: "mosque_service", label: "خدمة المسجد" },
  { value: "hajj_pilgrim", label: "خدمة الحاج" },
  { value: "general_charity", label: "خير عام" },
  ];

const LOADING_MESSAGES = [
    "🎨 جاري التواصل مع الذكاء الاصطناعي...",
    "✨ جاري توليد التصميم...",
    "🖼️ جاري إنهاء التفاصيل الإبداعية...",
    "⏰ قد يستغرق 20-40 ثانية، الرجاء الانتظار...",
  ];

interface Design {
    id: number;
    projectName: string;
    imageUrl: string;
    createdAt: string;
}

export default function NonprofitStudio() {
    const [projectName, setProjectName] = useState("");
    const [highlightWord, setHighlightWord] = useState("");
    const [primaryColor, setPrimaryColor] = useState("#1B5E3F");
    const [visualContext, setVisualContext] = useState("orphan_care");

  const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0]);
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [currentDesignId, setCurrentDesignId] = useState<number | null>(null);
    const [history, setHistory] = useState<Design[]>([]);

  useEffect(() => {
        if (projectName && !highlightWord) {
                const words = projectName.trim().split(" ");
                if (words.length > 0) {
                          setHighlightWord(words[words.length - 1]);
                }
        }
  }, [projectName]);

  useEffect(() => {
        if (!loading) return;
        let index = 0;
        const interval = setInterval(() => {
                index = (index + 1) % LOADING_MESSAGES.length;
                setLoadingMessage(LOADING_MESSAGES[index]);
        }, 4000);
        return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
        fetchHistory();
  }, []);

  const fetchHistory = async () => {
        try {
                const res = await fetch("/api/nonprofit-studio/history", {
                          credentials: "include",
                });
                if (res.ok) {
                          const data = await res.json();
                          setHistory(data.designs || []);
                }
        } catch (e) {
                console.error("Failed to fetch history", e);
        }
  };

  const handleGenerate = async () => {
        if (!projectName || !highlightWord || !primaryColor || !visualContext) {
                toast.error("الرجاء تعبئة جميع الحقول");
                return;
        }

        if (!/^#[0-9A-Fa-f]{6}$/.test(primaryColor)) {
                toast.error("صيغة اللون غير صحيحة");
                return;
        }

        setLoading(true);
        setResultImage(null);

        try {
                const res = await fetch("/api/nonprofit-studio/generate", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          credentials: "include",
                          body: JSON.stringify({
                                      projectName,
                                      highlightWord,
                                      primaryColor,
                                      visualContext,
                          }),
                });

          const data = await res.json();

          if (!res.ok) {
                    throw new Error(data.error || data.message || "فشل التوليد");
          }

          setResultImage(data.imageUrl);
                setCurrentDesignId(data.designId);
                toast.success("تم توليد التصميم بنجاح! 🎉");
                fetchHistory();
        } catch (error: any) {
                toast.error(error.message || "حدث خطأ أثناء التوليد");
        } finally {
                setLoading(false);
        }
  };

  const handleDownload = (id: number) => {
        window.open(`/api/nonprofit-studio/download/${id}`, "_blank");
  };

  return (
        <div dir="rtl" className="container mx-auto p-6 max-w-7xl">
              <div className="mb-8 text-center">
                      <div className="inline-flex items-center gap-3 mb-3 flex-wrap justify-center">
                                <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl">
                                            <Palette className="w-8 h-8 text-white" />
                                </div>div>
                                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                                            استوديو تصاميم الجمعيات
                                </h1>h1>
                                <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-semibold">
                                            ✨ جديد
                                </span>span>
                      </div>div>
                      <p className="text-gray-600">
                                ولّد بوستات احترافية للجمعيات الخيرية بالذكاء الاصطناعي
                      </p>p>
              </div>div>
        
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <Card className="lg:col-span-2">
                                <CardHeader>
                                            <CardTitle>تفاصيل التصميم</CardTitle>CardTitle>
                                            <CardDescription>
                                                          أدخل معلومات المشروع لتوليد التصميم
                                            </CardDescription>CardDescription>
                                </CardHeader>CardHeader>
                                <CardContent className="space-y-5">
                                            <div>
                                                          <Label htmlFor="projectName" className="mb-2 block">
                                                                          اسم المشروع
                                                          </Label>Label>
                                                          <Input
                                                                            id="projectName"
                                                                            placeholder="مثال: كفالة اليتيم"
                                                                            value={projectName}
                                                                            onChange={(e) => setProjectName(e.target.value)}
                                                                            disabled={loading}
                                                                            dir="rtl"
                                                                          />
                                            </div>div>
                                
                                            <div>
                                                          <Label htmlFor="highlightWord" className="mb-2 block">
                                                                          الكلمة المميزة
                                                          </Label>Label>
                                                          <Input
                                                                            id="highlightWord"
                                                                            placeholder="مثال: اليتيم"
                                                                            value={highlightWord}
                                                                            onChange={(e) => setHighlightWord(e.target.value)}
                                                                            disabled={loading}
                                                                            dir="rtl"
                                                                          />
                                                          <p className="text-xs text-gray-500 mt-1">
                                                                          عادةً تكون آخر كلمة في اسم المشروع
                                                          </p>p>
                                            </div>div>
                                
                                            <div>
                                                          <Label htmlFor="primaryColor" className="mb-2 block">
                                                                          اللون الأساسي للجمعية
                                                          </Label>Label>
                                                          <div className="flex gap-2 items-center">
                                                                          <Input
                                                                                              id="primaryColor"
                                                                                              type="color"
                                                                                              value={primaryColor}
                                                                                              onChange={(e) => setPrimaryColor(e.target.value)}
                                                                                              disabled={loading}
                                                                                              className="w-20 h-10 cursor-pointer p-1"
                                                                                            />
                                                                          <Input
                                                                                              type="text"
                                                                                              value={primaryColor}
                                                                                              onChange={(e) => setPrimaryColor(e.target.value)}
                                                                                              disabled={loading}
                                                                                              placeholder="#1B5E3F"
                                                                                              className="font-mono flex-1"
                                                                                              dir="ltr"
                                                                                            />
                                                          </div>div>
                                            </div>div>
                                
                                            <div>
                                                          <Label htmlFor="visualContext" className="mb-2 block">
                                                                          السياق البصري للمشروع
                                                          </Label>Label>
                                                          <Select
                                                                            value={visualContext}
                                                                            onValueChange={setVisualContext}
                                                                            disabled={loading}
                                                                          >
                                                                          <SelectTrigger dir="rtl">
                                                                                            <SelectValue placeholder="اختر السياق" />
                                                                          </SelectTrigger>SelectTrigger>
                                                                          <SelectContent>
                                                                            {VISUAL_CONTEXTS.map((ctx) => (
                                                                                                <SelectItem key={ctx.value} value={ctx.value}>
                                                                                                  {ctx.label}
                                                                                                  </SelectItem>SelectItem>
                                                                                              ))}
                                                                          </SelectContent>SelectContent>
                                                          </Select>Select>
                                            </div>div>
                                
                                            <Button
                                                            onClick={handleGenerate}
                                                            disabled={loading || !projectName || !highlightWord}
                                                            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                                                            size="lg"
                                                          >
                                              {loading ? (
                                                                            <>
                                                                                              <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                                                                                              جاري التوليد...
                                                                            </>>
                                                                          ) : (
                                                                            <>
                                                                                              <Sparkles className="w-5 h-5 ml-2" />
                                                                                              ولّد التصميم
                                                                            </>>
                                                                          )}
                                            </Button>Button>
                                
                                  {loading && (
                        <div className="text-center text-sm text-gray-600 animate-pulse py-2">
                          {loadingMessage}
                        </div>div>
                                            )}
                                
                                  {resultImage && !loading && (
                        <div className="mt-6 space-y-3">
                                        <div className="rounded-lg overflow-hidden border-2 border-purple-200">
                                                          <img
                                                                                src={resultImage}
                                                                                alt="التصميم المولّد"
                                                                                className="w-full"
                                                                              />
                                        </div>div>
                                        <div className="flex gap-2 flex-col sm:flex-row">
                                                          <Button
                                                                                onClick={() =>
                                                                                                        currentDesignId && handleDownload(currentDesignId)
                                                                                  }
                                                                                className="flex-1"
                                                                              >
                                                                              <Download className="w-4 h-4 ml-2" />
                                                                              تحميل بجودة عالية
                                                          </Button>Button>
                                                          <Button
                                                                                onClick={handleGenerate}
                                                                                variant="outline"
                                                                                className="flex-1"
                                                                              >
                                                                              <RefreshCw className="w-4 h-4 ml-2" />
                                                                              توليد مرة أخرى
                                                          </Button>Button>
                                        </div>div>
                        </div>div>
                                            )}
                                </CardContent>CardContent>
                      </Card>Card>
              
                      <Card>
                                <CardHeader>
                                            <CardTitle className="text-lg">آخر التصاميم</CardTitle>CardTitle>
                                            <CardDescription>أحدث 10 تصاميم</CardDescription>CardDescription>
                                </CardHeader>CardHeader>
                                <CardContent>
                                  {history.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-8">
                                        لا توجد تصاميم بعد
                        </p>p>
                      ) : (
                        <div className="space-y-3 max-h-[600px] overflow-y-auto">
                          {history.map((design) => (
                                            <div
                                                                  key={design.id}
                                                                  className="flex gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                                                                  onClick={() => handleDownload(design.id)}
                                                                >
                                              {design.imageUrl && (
                                                                                        <img
                                                                                                                  src={design.imageUrl}
                                                                                                                  alt={design.projectName}
                                                                                                                  className="w-16 h-16 object-cover rounded shrink-0"
                                                                                                                />
                                                                                      )}
                                                                <div className="flex-1 min-w-0">
                                                                                      <p className="font-semibold text-sm truncate">
                                                                                        {design.projectName}
                                                                                        </p>p>
                                                                                      <p className="text-xs text-gray-500">
                                                                                        {new Date(design.createdAt).toLocaleDateString("ar-SA")}
                                                                                        </p>p>
                                                                </div>div>
                                            </div>div>
                                          ))}
                        </div>div>
                                            )}
                                </CardContent>CardContent>
                      </Card>Card>
              </div>div>
        </div>div>
      );
}</></></div>
