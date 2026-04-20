import { motion } from 'framer-motion';
import { ArrowLeft, Lightbulb, PenTool } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'wouter';

interface AnalysisActionBarProps {
  suggestedAction: string;
  analysisContext?: Record<string, any>;
  showCampaignBrain?: boolean;
  showContentStudio?: boolean;
}

export function AnalysisActionBar({ 
  suggestedAction, 
  analysisContext,
  showCampaignBrain = true,
  showContentStudio = true 
}: AnalysisActionBarProps) {
  const contextParam = analysisContext ? `?context=${encodeURIComponent(JSON.stringify(analysisContext))}` : '';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <Card className="bg-gradient-to-l from-accent/10 to-transparent border-accent/30">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                <Lightbulb className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">بناءً على هذا التحليل، الإجراء الأنسب هو:</p>
                <p className="font-medium text-foreground">{suggestedAction}</p>
              </div>
            </div>
            
            <div className="flex gap-3 w-full md:w-auto">
              {showCampaignBrain && (
                <Link href={`/campaign-brain${contextParam}`}>
                  <Button 
                    variant="outline" 
                    className="flex-1 md:flex-none border-accent/50 hover:bg-accent/10"
                    data-testid="action-campaign-brain"
                  >
                    <Lightbulb className="w-4 h-4 ml-2" />
                    ملهم الحملات
                  </Button>
                </Link>
              )}
              {showContentStudio && (
                <Link href={`/content-studio${contextParam}`}>
                  <Button 
                    variant="outline" 
                    className="flex-1 md:flex-none border-accent/50 hover:bg-accent/10"
                    data-testid="action-content-studio"
                  >
                    <PenTool className="w-4 h-4 ml-2" />
                    استوديو المحتوى
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
