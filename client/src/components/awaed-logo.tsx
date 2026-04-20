import { motion } from 'framer-motion';
import logoLight from '@assets/awaed-logo.png_1768379037731.png';
import logoDark from '@assets/71fc7861-27cb-447d-b23f-345070ce670a_1768379764303.png';

interface AwaedLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'sidebar';
  animate?: boolean;
  className?: string;
}

export default function AwaedLogo({ 
  size = 'md', 
  animate = true,
  className = '',
}: AwaedLogoProps) {
  const sizeClasses = {
    sm: 'h-14',
    md: 'h-20',
    lg: 'h-28',
    xl: 'h-44',
    sidebar: 'h-20',
  };

  const Component = animate ? motion.img : 'img';
  const animationProps = animate ? {
    initial: { opacity: 0, y: -5 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3 },
  } : {};

  return (
    <>
      <Component 
        src={logoLight} 
        alt="معيار عوائد"
        className={`${sizeClasses[size]} w-auto object-contain dark:hidden ${className}`}
        {...animationProps}
      />
      <Component 
        src={logoDark} 
        alt="معيار عوائد"
        className={`${sizeClasses[size]} w-auto object-contain hidden dark:block ${className}`}
        {...animationProps}
      />
    </>
  );
}
