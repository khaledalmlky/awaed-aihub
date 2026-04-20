import { useTheme } from '@/lib/theme-context';
import { Button } from '@/components/ui/button';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="relative w-9 h-9 rounded-lg bg-surface border border-border hover:border-[#3B82F6]/30 transition-all duration-300 overflow-hidden"
      data-testid="button-theme-toggle"
    >
      <div
        className="absolute transition-all duration-400"
        style={{
          transform: theme === 'dark' ? 'rotate(0deg) scale(1)' : 'rotate(180deg) scale(0)',
          opacity: theme === 'dark' ? 1 : 0,
        }}
      >
        <Moon className="w-4 h-4" style={{ color: 'var(--accent)' }} />
      </div>
      <div
        className="absolute transition-all duration-400"
        style={{
          transform: theme === 'light' ? 'rotate(0deg) scale(1)' : 'rotate(-180deg) scale(0)',
          opacity: theme === 'light' ? 1 : 0,
        }}
      >
        <Sun className="w-4 h-4" style={{ color: 'var(--accent)' }} />
      </div>
      <span className="sr-only">تبديل الثيم</span>
    </Button>
  );
}
