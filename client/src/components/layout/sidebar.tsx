import { Link, useLocation } from 'wouter';
import { useAuth, getRoleLabel } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Globe,
  Lightbulb,
  PenTool,
  BarChart3,
  Calendar,
  LogOut,
  Home,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import AwaedLogo from '@/components/awaed-logo';

const navigation = [
  { name: 'لوحة التحكم', href: '/', icon: LayoutDashboard, toolId: null },
  { name: 'محلل الأعمال', href: '/business-analyzer', icon: Globe, isMain: true, toolId: 'business_analyzer' },
  { name: 'محلل القنوات', href: '/smart-analyzer', icon: BarChart3, toolId: 'smart_analyzer' },
  { name: 'مُلهم الحملات', href: '/campaign-brain', icon: Lightbulb, toolId: 'campaign_brain' },
  { name: 'استوديو المحتوى', href: '/content-studio', icon: PenTool, toolId: 'content_studio' },
  { name: 'مخطط الحملات', href: '/campaign-planner', icon: Calendar, toolId: 'campaign_planner' },
];

const adminNavigation = [
  { name: 'إدارة المستخدمين', href: '/admin/users', icon: Users },
];

export default function Sidebar() {
  const [location] = useLocation();
  const { user, logout, isAdmin, canAccessTool } = useAuth();

  const filteredNav = navigation.filter(item => {
    if (item.toolId && !canAccessTool(item.toolId)) return false;
    return true;
  });

  return (
    <motion.aside 
      initial={{ x: 50, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="w-72 h-screen bg-sidebar flex flex-col fixed right-0 top-0 z-40 border-l border-sidebar"
      style={{ backgroundColor: 'var(--sidebar-bg)', borderColor: 'var(--sidebar-border)' }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-[rgba(59,130,246,0.05)] via-transparent to-transparent pointer-events-none dark:from-[rgba(59,130,246,0.03)] dark:to-[rgba(26,39,68,0.1)]" />

      <div className="px-6 py-8 relative">
        <div className="flex items-center justify-between gap-3">
          <Link href="/">
            <motion.div 
              className="w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-all hover:bg-[rgba(59,130,246,0.1)]"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="الصفحة الرئيسية"
            >
              <Home className="w-5 h-5" style={{ color: 'var(--accent)' }} strokeWidth={1.5} />
            </motion.div>
          </Link>
          <Link href="/">
            <motion.div 
              className="flex-1 flex justify-center cursor-pointer"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <AwaedLogo size="xl" animate={false} />
            </motion.div>
          </Link>
          <div className="w-10" />
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 overflow-y-auto relative">
        <ul className="space-y-1.5">
          {filteredNav.map((item) => {
            const isActive = location === item.href;
            return (
              <li key={item.href}>
                <Link href={item.href}>
                  <div
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer relative group',
                      isActive
                        ? 'bg-[rgba(59,130,246,0.12)]'
                        : 'hover:bg-[rgba(59,130,246,0.06)]'
                    )}
                    style={{ color: 'var(--sidebar-foreground)' }}
                    data-testid={`nav-${item.href.replace('/', '') || 'dashboard'}`}
                  >
                    {isActive && (
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-7 rounded-l-full" style={{ backgroundColor: 'var(--accent)' }} />
                    )}
                    <div className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center transition-all',
                      isActive 
                        ? '' 
                        : 'bg-[rgba(59,130,246,0.08)]'
                    )}
                    style={{ backgroundColor: isActive ? 'var(--accent)' : undefined }}
                    >
                      <item.icon className="w-5 h-5" style={{ color: isActive ? '#1a2744' : 'var(--accent)' }} strokeWidth={1.5} />
                    </div>
                    <span className={cn('flex-1', isActive ? 'font-semibold' : '')}>{item.name}</span>
                    {item.isMain && (
                      <Badge className="text-[9px] px-2 py-0.5 border-0 font-bold" style={{ backgroundColor: 'var(--accent)', color: '#0a1628' }}>
                        ابدأ
                      </Badge>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>

        {isAdmin && (
          <>
            <div className="my-4 px-4">
              <div className="h-px bg-gradient-to-l from-transparent via-[rgba(59,130,246,0.2)] to-transparent" />
            </div>
            <p className="text-xs px-4 mb-2 opacity-50" style={{ color: 'var(--sidebar-foreground)' }}>إعدادات النظام</p>
            <ul className="space-y-1.5">
              {adminNavigation.map((item) => {
                const isActive = location === item.href;
                return (
                  <li key={item.href}>
                    <Link href={item.href}>
                      <div
                        className={cn(
                          'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer relative group',
                          isActive
                            ? 'bg-[rgba(59,130,246,0.12)]'
                            : 'hover:bg-[rgba(59,130,246,0.06)]'
                        )}
                        style={{ color: 'var(--sidebar-foreground)' }}
                        data-testid={`nav-admin-${item.href.split('/').pop()}`}
                      >
                        {isActive && (
                          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-7 rounded-l-full" style={{ backgroundColor: 'var(--accent)' }} />
                        )}
                        <div className={cn(
                          'w-10 h-10 rounded-xl flex items-center justify-center transition-all',
                          isActive 
                            ? '' 
                            : 'bg-[rgba(59,130,246,0.08)]'
                        )}
                        style={{ backgroundColor: isActive ? 'var(--accent)' : undefined }}
                        >
                          <item.icon className="w-5 h-5" style={{ color: isActive ? '#1a2744' : 'var(--accent)' }} strokeWidth={1.5} />
                        </div>
                        <span className={cn('flex-1', isActive ? 'font-semibold' : '')}>{item.name}</span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </nav>

      <div className="px-4 py-6 relative">
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-3">
          <Avatar className="w-11 h-11 border-2" style={{ borderColor: 'rgba(59,130,246,0.5)' }}>
            <AvatarFallback className="text-sm font-bold" style={{ backgroundColor: 'var(--accent)', color: '#0a1628' }}>
              {user?.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--sidebar-foreground)' }}>{user?.name}</p>
            <p className="text-xs" style={{ color: 'var(--accent)' }}>{getRoleLabel(user?.role || 'team')}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 hover:text-red-400 hover:bg-red-500/10 rounded-xl py-3 text-sm"
          style={{ color: 'var(--sidebar-foreground)', opacity: 0.6 }}
          onClick={logout}
          data-testid="button-logout"
        >
          <LogOut className="w-5 h-5" strokeWidth={1.5} />
          تسجيل الخروج
        </Button>
      </div>
    </motion.aside>
  );
}
