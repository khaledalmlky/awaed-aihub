import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle } from 'lucide-react';

interface LoadingStep {
  id: string;
  label: string;
}

const LOADING_STEPS: LoadingStep[] = [
  { id: 'reading', label: 'قراءة المدخلات' },
  { id: 'building', label: 'بناء التقييم' },
  { id: 'formulating', label: 'صياغة التوصية' },
];

interface AnalysisLoadingProps {
  currentStep: number;
}

export function AnalysisLoading({ currentStep }: AnalysisLoadingProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-6" data-testid="analysis-loading">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        className="w-16 h-16 rounded-full border-4 border-accent/20 border-t-accent"
      />
      
      <div className="flex flex-col items-center space-y-4 w-full max-w-xs">
        {LOADING_STEPS.map((step, index) => {
          const isComplete = currentStep > index;
          const isCurrent = currentStep === index;
          
          return (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.3 }}
              className={`flex items-center gap-3 w-full ${
                isComplete ? 'text-emerald-500' : isCurrent ? 'text-accent' : 'text-muted-foreground'
              }`}
            >
              {isComplete ? (
                <CheckCircle className="w-5 h-5" />
              ) : isCurrent ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <div className="w-5 h-5 rounded-full border-2 border-current opacity-30" />
              )}
              <span className={`text-sm ${isCurrent ? 'font-medium' : ''}`}>{step.label}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
