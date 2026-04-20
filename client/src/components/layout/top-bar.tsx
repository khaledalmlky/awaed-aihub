import ThemeToggle from '@/components/theme-toggle';
import { useAuth } from '@/lib/auth-context';
import { Bell, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AwaedLogo from '@/components/awaed-logo';

interface TopBarProps {
  title?: string;
  subtitle?: string;
}

export default function TopBar({ title, subtitle }: TopBarProps) {
  const { user } = useAuth();

  return (
    <div className="h-18 border-b bg-card/95 backdrop-blur-xl flex items-center justify-between px-8 sticky top-0 z-30 transition-colors duration-300" style={{ borderColor: 'var(--border)', minHeight: '72px' }}>
      <div className="flex items-center gap-6">
        <AwaedLogo size="md" animate={false} />
        {title && (
          <div className="border-r pr-5" style={{ borderColor: 'var(--border)' }}>
            <h2 className="font-bold text-lg text-foreground">{title}</h2>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-4">
        <div className="relative hidden md:block">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="بحث سريع..."
            className="w-60 h-9 pr-10 bg-surface border-border focus:border-[#3B82F6]/40 rounded-lg text-sm"
            data-testid="input-search"
          />
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          className="relative w-9 h-9 rounded-lg bg-surface border border-border hover:border-[#3B82F6]/30 transition-colors"
          data-testid="button-notifications"
        >
          <Bell className="w-4 h-4 text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--accent)' }} />
        </Button>
        
        <ThemeToggle />
      </div>
    </div>
  );
}
