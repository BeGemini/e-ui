'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import {
  buildExportFilename,
  downloadBlob,
  type ExportFormat,
} from '@/lib/sentence-export';
import type { MySentence } from '@/lib/types';

interface ExportMenuProps {
  title: string;
  sentences: MySentence[];
  includeOriginal: boolean;
  disabled: boolean;
}

/** "Export" dropdown: builds a Word or PDF file in the browser ("what you see is what you export"). */
export default function ExportMenu({ title, sentences, includeOriginal, disabled }: ExportMenuProps) {
  const { toast } = useToast();
  const [exporting, setExporting] = useState<ExportFormat | null>(null);

  const handleExport = async (format: ExportFormat) => {
    if (exporting) return;
    setExporting(format);
    try {
      // Literal paths so the bundler splits docx / react-pdf into separate async chunks.
      const mod =
        format === 'docx'
          ? await import('@/lib/sentence-export/build-docx')
          : await import('@/lib/sentence-export/build-pdf');
      const exportedAt = new Date();
      const blob = await mod.build({ title, exportedAt, includeOriginal, sentences });
      downloadBlob(blob, buildExportFilename(title, format, exportedAt));
    } catch (error) {
      console.error('Export failed:', error);
      toast({ title: 'Export failed. Please try again.', variant: 'destructive' });
    } finally {
      setExporting(null);
    }
  };

  const isBusy = exporting !== null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" disabled={disabled || isBusy} aria-busy={isBusy}>
            <Download />
            {isBusy ? 'Exporting…' : 'Export'}
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport('docx')}>Word (.docx)</DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('pdf')}>PDF</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
