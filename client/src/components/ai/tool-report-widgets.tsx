import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, CheckCircle2, ClipboardCopy, LucideIcon, Sparkles } from 'lucide-react';

interface ToolModeTabsProps {
  value: 'quick' | 'detailed';
  onValueChange: (value: 'quick' | 'detailed') => void;
  hasAnalyses?: boolean;
}

export function ToolModeTabs({ value, onValueChange, hasAnalyses = true }: ToolModeTabsProps) {
  return (
    <div className="space-y-3 text-right" dir="rtl">
      <Tabs value={value} onValueChange={(v) => onValueChange(v as 'quick' | 'detailed')} dir="rtl">
        <TabsList className="grid w-full grid-cols-2 bg-card/70">
          <TabsTrigger value="quick" className="text-right">
            تحليل سريع
          </TabsTrigger>
          <TabsTrigger value="detailed" className="text-right" disabled={!hasAnalyses}>
            تحليل مفصل (يتطلب موقع)
          </TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="flex flex-row-reverse items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-amber-800 dark:text-amber-200">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
        <p className="text-sm">
          تحليل سريع يعتمد على البيانات اللي تدخلها فقط. للتحليل الأعمق، استخدم 'تحليل مفصل' بعد تحليل موقعك.
        </p>
      </div>
      {!hasAnalyses && (
        <p className="text-sm text-muted-foreground">
          لا توجد تحليلات مواقع محفوظة حالياً. يمكنك المتابعة في التحليل السريع.
        </p>
      )}
    </div>
  );
}

interface ExecutiveSummaryProps {
  icon: LucideIcon;
  title: string;
  summary: string;
  badge: string;
  children?: ReactNode;
}

export function ExecutiveSummary({ icon: Icon, title, summary, badge, children }: ExecutiveSummaryProps) {
  return (
    <Card className="overflow-hidden border-0 bg-gradient-to-l from-blue-500 to-purple-600 text-white shadow-xl" dir="rtl">
      <CardContent className="p-6 text-right">
        <div className="flex flex-row-reverse items-start justify-between gap-4">
          <div className="flex flex-row-reverse items-start gap-4">
            <div className="rounded-2xl bg-white/20 p-4">
              <Icon className="h-10 w-10" strokeWidth={1.6} />
            </div>
            <div className="space-y-2">
              <div className="flex flex-row-reverse flex-wrap items-center gap-2">
                <h2 className="text-2xl font-bold">{title}</h2>
                <Badge className="bg-white/20 text-white hover:bg-white/25">{badge}</Badge>
              </div>
              <p className="max-w-2xl text-lg leading-8 text-white/90">{summary}</p>
            </div>
          </div>
          {children}
        </div>
      </CardContent>
    </Card>
  );
}

interface StatCardItem {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  tone?: 'blue' | 'green' | 'amber' | 'purple' | 'red';
}

const statTone: Record<NonNullable<StatCardItem['tone']>, string> = {
  blue: 'from-blue-500/10 to-cyan-500/10 border-blue-500/20 text-blue-400',
  green: 'from-emerald-500/10 to-teal-500/10 border-emerald-500/20 text-emerald-400',
  amber: 'from-amber-500/10 to-orange-500/10 border-amber-500/20 text-amber-400',
  purple: 'from-purple-500/10 to-pink-500/10 border-purple-500/20 text-purple-400',
  red: 'from-red-500/10 to-rose-500/10 border-red-500/20 text-red-400',
};

export function ReportStatGrid({ items }: { items: StatCardItem[] }) {
  return (
    <div className="grid grid-cols-3 gap-4 md:grid-cols-4" dir="rtl">
      {items.map((item, index) => {
        const Icon = item.icon;
        return (
          <div
            key={index}
            className={`rounded-xl border bg-gradient-to-br p-4 text-right ${statTone[item.tone || 'blue']}`}
          >
            <div className="mb-2 flex flex-row-reverse items-center gap-2 text-sm">
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{item.value}</div>
          </div>
        );
      })}
    </div>
  );
}

export function SectionCard({
  icon: Icon,
  title,
  children,
  tone = 'blue',
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
  tone?: NonNullable<StatCardItem['tone']>;
}) {
  return (
    <Card className="border-border/40 bg-card/60" dir="rtl">
      <CardContent className="space-y-4 p-5 text-right">
        <h3 className={`flex flex-row-reverse items-center gap-2 text-lg font-semibold ${statTone[tone].split(' ').at(-1)}`}>
          <Icon className="h-5 w-5" />
          {title}
        </h3>
        {children}
      </CardContent>
    </Card>
  );
}

export function IconList({
  items,
  type = 'positive',
}: {
  items?: string[];
  type?: 'positive' | 'negative' | 'warning';
}) {
  if (!items?.length) return null;
  const Icon = type === 'positive' ? CheckCircle2 : AlertTriangle;
  const color = type === 'positive' ? 'text-emerald-500' : type === 'negative' ? 'text-red-500' : 'text-amber-500';

  return (
    <ul className="space-y-2 pr-6 text-right" dir="rtl">
      {items.map((item, index) => (
        <li key={index} className="flex flex-row-reverse items-start gap-2">
          <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${color}`} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function NextStepsTimeline({ steps, onCopy }: { steps?: string[]; onCopy?: () => void }) {
  if (!steps?.length) return null;
  return (
    <SectionCard icon={Sparkles} title="الخطوات التالية" tone="green">
      <div className="space-y-3" dir="rtl">
        {steps.map((step, index) => (
          <div key={index} className="flex flex-row-reverse items-start gap-3 rounded-lg bg-muted/30 p-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-sm font-bold text-emerald-500">
              {index + 1}
            </span>
            <div className="text-right">
              <p className="font-medium">{step}</p>
              <p className="text-xs text-muted-foreground">{index === 0 ? 'خلال 24 ساعة' : `${index + 1} أيام`}</p>
            </div>
          </div>
        ))}
        {onCopy && (
          <Button onClick={onCopy} variant="outline" className="flex flex-row-reverse gap-2">
            <ClipboardCopy className="h-4 w-4" />
            نسخ الخطة
          </Button>
        )}
      </div>
    </SectionCard>
  );
}
