import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import ThemeToggle from '@/components/theme-toggle';
import AwaedLogo from '@/components/awaed-logo';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { theme } = useTheme();
  const [, setLocation] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    const success = await login(email, password);
    if (success) {
      setLocation('/');
    } else {
      setError('بيانات الدخول غير صحيحة');
    }
    setIsLoading(false);
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
              <h1 className="text-4xl font-black text-[#3B82F6] tracking-wide">
                معيار عوائد
              </h1>
              <div className="w-16 h-1 bg-gradient-to-r from-[#3B82F6] to-[#1a2744] rounded-full mt-3"></div>
            </motion.div>

            <div className="text-center mb-7">
              <h1 className="text-2xl font-bold text-foreground mb-2">مرحباً بك</h1>
              <p className="text-muted-foreground text-sm">
                منصة التحليل وصناعة القرار التسويقي
              </p>
            </div>

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
                <Label htmlFor="password" className="text-foreground/80 text-sm font-medium">
                  كلمة المرور
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-surface border-border text-foreground placeholder:text-muted-foreground/60 focus:border-[#3B82F6] focus:ring-[#3B82F6]/20 h-12 rounded-xl transition-all"
                  data-testid="input-password"
                  required
                />
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 btn-primary text-base rounded-xl"
                data-testid="button-login"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                    جاري الدخول...
                  </>
                ) : (
                  <>
                    <ArrowLeft className="w-5 h-5 ml-2" />
                    تسجيل الدخول
                  </>
                )}
              </Button>
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
