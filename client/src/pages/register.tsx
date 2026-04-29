import { useMemo, useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import ThemeToggle from "@/components/theme-toggle";
import AwaedLogo from "@/components/awaed-logo";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();

  const phoneError = useMemo(() => {
    if (!phone) return "";
    if (!/^\d+$/.test(phone)) return "رقم الجوال يجب أن يحتوي على أرقام فقط";
    if (phone.length < 10 || phone.length > 15) return "رقم الجوال يجب أن يكون بين 10 و 15 رقم";
    return "";
  }, [phone]);

  const passwordError = useMemo(() => {
    if (!password) return "";
    if (password.length < 8) return "كلمة المرور يجب أن تكون 8 أحرف على الأقل";
    return "";
  }, [password]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (phoneError) {
      setError(phoneError);
      return;
    }
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, password }),
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setLocation("/pending-approval");
        return;
      }

      setError(data.error || "تعذر إنشاء الحساب، حاول مرة أخرى");
    } catch (_err) {
      setError("تعذر الاتصال بالخادم، تأكد من اتصالك بالإنترنت");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-background transition-colors duration-300">
      <div className="absolute top-6 left-6 z-50">
        <ThemeToggle />
      </div>

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(59,130,246,0.08),transparent)] dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(59,130,246,0.12),transparent)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(26,39,68,0.1),transparent)] dark:bg-[radial-gradient(ellipse_at_bottom,rgba(26,54,93,0.3),transparent)]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[440px] relative z-10"
      >
        <Card className="bg-card border-border shadow-xl dark:shadow-[0_20px_60px_rgba(0,0,0,0.5),0_0_80px_rgba(59,130,246,0.04)] rounded-2xl overflow-hidden transition-colors duration-300">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#3B82F6]/40 to-transparent" />

          <CardContent className="p-8 sm:p-10">
            <motion.div
              className="flex flex-col items-center mb-8"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
            >
              <div className="mb-5">
                <AwaedLogo size="xl" animate={false} />
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-[#3B82F6] tracking-wide">
                إنشاء حساب جديد
              </h1>
              <div className="w-16 h-1 bg-gradient-to-r from-[#3B82F6] to-[#1a2744] rounded-full mt-3" />
            </motion.div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/25 text-red-500 dark:text-red-400 text-sm"
                >
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  {error}
                </motion.div>
              )}

              <div className="space-y-2">
                <Label htmlFor="name" className="text-foreground/80 text-sm font-medium">
                  الاسم
                </Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="اسمك الكامل"
                  className="bg-surface border-border text-foreground placeholder:text-muted-foreground/60 focus:border-[#3B82F6] focus:ring-[#3B82F6]/20 h-12 rounded-xl transition-all"
                  data-testid="input-name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground/80 text-sm font-medium">
                  البريد الإلكتروني
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@awaed.com"
                  className="bg-surface border-border text-foreground placeholder:text-muted-foreground/60 focus:border-[#3B82F6] focus:ring-[#3B82F6]/20 h-12 rounded-xl transition-all"
                  data-testid="input-email"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-foreground/80 text-sm font-medium">
                  رقم الجوال
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, ""))}
                  placeholder="05xxxxxxxx"
                  className="bg-surface border-border text-foreground placeholder:text-muted-foreground/60 focus:border-[#3B82F6] focus:ring-[#3B82F6]/20 h-12 rounded-xl transition-all"
                  data-testid="input-phone"
                  inputMode="numeric"
                  pattern="^\d{10,15}$"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground/80 text-sm font-medium">
                  كلمة المرور
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="bg-surface border-border text-foreground placeholder:text-muted-foreground/60 focus:border-[#3B82F6] focus:ring-[#3B82F6]/20 h-12 rounded-xl transition-all pl-10"
                    data-testid="input-password"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 btn-primary text-base rounded-xl"
                data-testid="button-register"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                    جارٍ التسجيل...
                  </>
                ) : (
                  <>
                    <ArrowLeft className="w-5 h-5 ml-2" />
                    تسجيل
                  </>
                )}
              </Button>

              <p className="text-center text-muted-foreground text-sm">
                لديك حساب؟{" "}
                <Link
                  href="/login"
                  className="text-[#3B82F6] font-semibold hover:opacity-90 transition-opacity"
                >
                  سجّل الدخول
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-muted-foreground/60 text-xs mt-6">
          معيار عوائد © 2026 | منصة التحليل وصناعة القرار التسويقي
        </p>
      </motion.div>
    </div>
  );
}

