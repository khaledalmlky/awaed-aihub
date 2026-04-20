import { ReactNode } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Redirect, useLocation } from 'wouter';
import AppHeader from './app-header';
import { motion } from 'framer-motion';
import AwaedLogo from '@/components/awaed-logo';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

export default function AppLayout({ children, title, subtitle }: AppLayoutProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const [location] = useLocation();
  const isHomePage = location === '/';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 transition-colors duration-300">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <AwaedLogo size="xl" animate={false} />
        </motion.div>
        <div className="flex items-center gap-2">
          <motion.div 
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: 'var(--accent)' }}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0 }}
          />
          <motion.div 
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: 'var(--accent)' }}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
          />
          <motion.div 
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: 'var(--accent)' }}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
          />
        </div>
        <p className="text-sm text-muted-foreground">جاري التحميل...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <AppHeader />
      <motion.main 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="min-h-screen"
      >
        <div className="p-6 lg:p-10 xl:p-12">
          <div className="max-w-[1400px] mx-auto">
            {!isHomePage && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.history.back()}
                className="mb-6 gap-2 text-muted-foreground hover:text-foreground"
                data-testid="button-back"
              >
                <ArrowRight className="w-4 h-4" />
                رجوع
              </Button>
            )}
            {children}
          </div>
        </div>
      </motion.main>
    </div>
  );
}
