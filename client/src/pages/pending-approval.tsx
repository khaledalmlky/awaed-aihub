import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import ThemeToggle from "@/components/theme-toggle";
import AwaedLogo from "@/components/awaed-logo";

export default function PendingApproval() {
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
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center bg-[#3B82F6]/10 border border-[#3B82F6]/20">
                <Clock className="w-10 h-10 text-[#3B82F6]" />
              </div>
            </motion.div>

            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-foreground mb-3">طلبك قيد المراجعة</h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                شكراً لتسجيلك في معيار عوائد. سيتم مراجعة طلبك من قبل الإدارة وإشعارك بالموافقة قريباً.
              </p>
            </div>

            <Button asChild className="w-full h-12 btn-primary text-base rounded-xl" data-testid="button-back-to-login">
              <Link href="/login">
                <ArrowLeft className="w-5 h-5 ml-2" />
                العودة لتسجيل الدخول
              </Link>
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-muted-foreground/60 text-xs mt-6">
          معيار عوائد © 2026 | منصة التحليل وصناعة القرار التسويقي
        </p>
      </motion.div>
    </div>
  );
}

