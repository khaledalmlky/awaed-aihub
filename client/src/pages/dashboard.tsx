import { Link } from 'wouter';
import { useAuth, getRoleLabel } from '@/lib/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Lightbulb,
  PenTool,
  BarChart3,
  Calendar,
  BookOpen,
  TrendingUp,
  Users,
  Target,
  Zap,
  Globe,
  Loader2,
} from 'lucide-react';
import { motion } from 'framer-motion';
import AppLayout from '@/components/layout/app-layout';
import { useQuery } from '@tanstack/react-query';

const tools = [
  {
    title: 'Business Analyzer',
    titleAr: 'محلل الأعمال',
    description: 'تحليل ذكي شامل للمواقع والمتاجر الإلكترونية',
    icon: Globe,
    href: '/business-analyzer',
    color: 'from-emerald-500 to-teal-500',
    badge: 'ابدأ من هنا',
    isMain: true,
  },
  {
    title: 'Campaign Inspirator',
    titleAr: 'مُلهم الحملات',
    description: 'توليد أفكار الحملات التسويقية بالذكاء الاصطناعي',
    icon: Lightbulb,
    href: '/campaign-brain',
    color: 'from-amber-500 to-orange-500',
    badge: 'أفكار إبداعية',
  },
  {
    title: 'Content Studio',
    titleAr: 'استوديو المحتوى',
    description: 'كتابة محتوى عربي احترافي للتسويق',
    icon: PenTool,
    href: '/content-studio',
    color: 'from-pink-500 to-rose-500',
    badge: 'محتوى تسويقي',
  },
  {
    title: 'Channel Analyzer',
    titleAr: 'محلل القنوات',
    description: 'تحليل تقديري ذكي لحسابات التواصل الاجتماعي',
    icon: BarChart3,
    href: '/smart-analyzer',
    color: 'from-violet-500 to-purple-500',
    badge: 'تحليل القنوات',
  },
  {
    title: 'Campaign Planner',
    titleAr: 'مخطط الحملات',
    description: 'تخطيط الميزانيات والمؤشرات والجداول',
    icon: Calendar,
    href: '/campaign-planner',
    color: 'from-blue-500 to-cyan-500',
    badge: 'تخطيط',
  },
  {
    title: 'Performance Analyzer',
    titleAr: 'تحليل أداء الحملات',
    description: 'تحليل شامل لأداء حملاتك عبر المنصات المختلفة',
    icon: TrendingUp,
    href: '/performance-analyzer',
    color: 'from-sky-400 to-indigo-500',
    badge: 'جديد',
  },
];


const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function Dashboard() {
  const { user, isAdmin } = useAuth();

  const { data: dashboardStats, isLoading: statsLoading } = useQuery<{
    totalUsers: number;
    totalBusinessAnalyses: number;
    totalChannelAnalyses: number;
    totalCampaignPerformances: number;
    totalAIRequests: number;
  }>({
    queryKey: ['/api/dashboard/stats'],
    enabled: isAdmin,
  });

  const stats = dashboardStats ? [
    { label: 'أعضاء الفريق', value: String(dashboardStats.totalUsers), icon: Users },
    { label: 'تحليلات الأعمال', value: String(dashboardStats.totalBusinessAnalyses), icon: Globe },
    { label: 'تحليلات القنوات', value: String(dashboardStats.totalChannelAnalyses), icon: BarChart3 },
    { label: 'طلبات الذكاء الاصطناعي', value: String(dashboardStats.totalAIRequests), icon: Zap },
  ] : [];

  const filteredTools = tools;

  return (
    <AppLayout>
      <div className="space-y-10 lg:space-y-14">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold">مرحباً، {user?.name}</h1>
            <p className="text-muted-foreground mt-3 text-lg">
              منصة التحليل وصناعة القرار التسويقي
            </p>
          </div>
          <Badge className="bg-accent/20 text-accent border border-accent/30 hover:bg-accent/30 text-base px-5 py-2">
            {getRoleLabel(user?.role || 'team')}
          </Badge>
        </div>

        {isAdmin && (
          <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 lg:gap-8"
          >
            {statsLoading ? (
              <div className="col-span-full flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-accent" />
              </div>
            ) : stats.map((stat) => (
              <motion.div key={stat.label} variants={item}>
                <Card className="bg-card/50 border-border/30 card-transition hover:border-accent/30">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-muted-foreground">{stat.label}</p>
                        <p className="text-3xl font-bold mt-2">{stat.value}</p>
                      </div>
                      <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center">
                        <stat.icon className="w-7 h-7 text-accent" strokeWidth={1.5} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}

        <div>
          <h2 className="text-2xl font-semibold mb-8">الأدوات الرئيسية</h2>
          <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8"
          >
            {filteredTools.map((tool) => (
              <motion.div key={tool.href} variants={item}>
                <Link href={tool.href}>
                  <Card 
                    className={`bg-card/50 cursor-pointer card-transition hover:shadow-xl hover:shadow-accent/5 group h-full ${
                      tool.isMain 
                        ? 'border-2 border-[var(--accent-primary)] ring-2 ring-[var(--accent-primary)]/20' 
                        : 'border-border/30 hover:border-accent/30'
                    }`}
                    data-testid={`card-tool-${tool.href.replace('/', '')}`}
                  >
                    <CardHeader className="pb-3 p-6">
                      <div className="flex items-start justify-between">
                        <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${tool.color} flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform`}>
                          <tool.icon className="w-7 h-7 text-white" strokeWidth={1.5} />
                        </div>
                        <Badge 
                          variant="secondary" 
                          className={`text-xs px-3 py-1 ${
                            tool.isMain 
                              ? 'bg-[var(--accent-primary)] text-white font-bold' 
                              : 'bg-secondary/50'
                          }`}
                        >
                          {tool.badge}
                        </Badge>
                      </div>
                      <CardTitle className="text-lg mt-5">{tool.titleAr}</CardTitle>
                      <p className="text-sm text-accent font-medium">{tool.title}</p>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <CardDescription className="text-sm">
                        {tool.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {isAdmin && (
          <div>
            <h2 className="text-2xl font-semibold mb-8">إدارة النظام</h2>
            <motion.div 
              variants={container}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8"
            >
              <motion.div variants={item}>
                <Link href="/admin/users">
                  <Card 
                    className="bg-card/50 cursor-pointer card-transition hover:shadow-xl hover:shadow-accent/5 group h-full border-border/30 hover:border-accent/30"
                    data-testid="card-admin-users"
                  >
                    <CardHeader className="pb-3 p-6">
                      <div className="flex items-start justify-between">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                          <Users className="w-7 h-7 text-white" strokeWidth={1.5} />
                        </div>
                        <Badge 
                          variant="secondary" 
                          className="text-xs px-3 py-1 bg-secondary/50"
                        >
                          مدير فقط
                        </Badge>
                      </div>
                      <CardTitle className="text-lg mt-5">إدارة المستخدمين</CardTitle>
                      <p className="text-sm text-accent font-medium">User Management</p>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <CardDescription className="text-sm">
                        إضافة أعضاء الفريق وإدارة صلاحياتهم وكلمات مرورهم
                      </CardDescription>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            </motion.div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
