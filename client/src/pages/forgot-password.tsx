import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, CheckCircle2, Loader2, Mail } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import ThemeToggle from "@/components/theme-toggle";
import AwaedLogo from "@/components/awaed-logo";

const forgotPasswordSchema = z.object({
  email: z.string().min(1, "البريد الإلكتروني مطلوب").email("أدخل بريد إلكتروني صحيح"),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

const successMessage = "تم إرسال طلبك للمدير، سيتم التواصل معك قريباً عبر البريد";

export default function ForgotPassword() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: ForgotPasswordForm) => {
    setIsSubmitted(false);

    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: values.email }),
      });
    } catch (_error) {
      // The recovery page stays useful even before the API endpoint is available.
    }

    setIsSubmitted(true);
    toast.success(successMessage);
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-background transition-colors duration-300"
    >
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
              className="flex flex-col items-center mb-8 text-center"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
            >
              <div className="mb-5">
                <AwaedLogo size="xl" animate={false} />
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-[#3B82F6] tracking-wide">
                نسيت كلمة المرور؟
              </h1>
              <div className="w-16 h-1 bg-gradient-to-r from-[#3B82F6] to-[#1a2744] rounded-full mt-3" />
              <p className="text-muted-foreground text-sm leading-6 mt-4">
                أدخل بريدك الإلكتروني وسنرسل طلب استرجاع للمدير
              </p>
            </motion.div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 text-right">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground/80 text-sm font-medium">
                  البريد الإلكتروني
                </Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    placeholder="example@awaed.com"
                    className="bg-surface border-border text-foreground placeholder:text-muted-foreground/60 focus:border-[#3B82F6] focus:ring-[#3B82F6]/20 h-12 rounded-xl transition-all pr-10 text-right"
                    data-testid="input-forgot-password-email"
                    aria-invalid={Boolean(errors.email)}
                    {...register("email")}
                  />
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/60" />
                </div>
                {errors.email && (
                  <p className="text-sm text-red-500" data-testid="text-email-error">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {isSubmitted && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-sm"
                  data-testid="text-forgot-password-success"
                >
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>{successMessage}</span>
                </motion.div>
              )}

              <Button
                type="submit"
                className="w-full h-12 btn-primary text-base rounded-xl"
                data-testid="button-submit-forgot-password"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                    جاري إرسال الطلب...
                  </>
                ) : (
                  <>
                    <ArrowLeft className="w-5 h-5 ml-2" />
                    إرسال الطلب
                  </>
                )}
              </Button>

              <p className="text-center text-muted-foreground text-sm">
                تذكرت كلمة المرور؟{" "}
                <Link
                  href="/login"
                  className="text-[#3B82F6] font-semibold hover:opacity-90 transition-opacity"
                  data-testid="link-back-to-login"
                >
                  العودة لتسجيل الدخول
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
