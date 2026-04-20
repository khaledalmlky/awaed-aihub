import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IconBadgeProps {
  icon: LucideIcon;
  variant?: 'default' | 'gold' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const variantStyles = {
  default: 'bg-[rgba(59,130,246,0.1)] text-[var(--accent)]',
  gold: 'bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg',
  success: 'bg-emerald-500/15 text-emerald-500',
  warning: 'bg-amber-500/15 text-amber-500',
  danger: 'bg-red-500/15 text-red-500',
  info: 'bg-blue-500/15 text-blue-500',
};

const sizeStyles = {
  sm: 'w-10 h-10',
  md: 'w-12 h-12',
  lg: 'w-14 h-14',
};

const iconSizes = {
  sm: 'w-5 h-5',
  md: 'w-6 h-6',
  lg: 'w-7 h-7',
};

export default function IconBadge({ 
  icon: Icon, 
  variant = 'default', 
  size = 'md',
  className 
}: IconBadgeProps) {
  return (
    <div className={cn(
      'rounded-xl flex items-center justify-center flex-shrink-0',
      variantStyles[variant],
      sizeStyles[size],
      className
    )}>
      <Icon className={iconSizes[size]} strokeWidth={1.5} />
    </div>
  );
}
