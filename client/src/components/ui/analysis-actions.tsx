import { Button } from '@/components/ui/button';
import { Copy, FileDown, Check } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface AnalysisActionsProps {
  data: any;
  title: string;
}

export function AnalysisActions({ data, title }: AnalysisActionsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const textContent = JSON.stringify(data, null, 2);
    navigator.clipboard.writeText(textContent);
    setCopied(true);
    toast.success('تم النسخ بنجاح');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportPDF = () => {
    const content = document.getElementById('analysis-result');
    if (!content) return;

    window.print();
  };

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleCopy}
        className="gap-2"
        data-testid="button-copy"
      >
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        {copied ? 'تم النسخ' : 'نسخ النتائج'}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleExportPDF}
        className="gap-2"
        data-testid="button-export-pdf"
      >
        <FileDown className="w-4 h-4" />
        تصدير PDF
      </Button>
    </div>
  );
}
