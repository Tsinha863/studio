'use client';

import * as React from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Download, Printer, FileImage, FileText } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from './ui/dropdown-menu';
import { Spinner } from './spinner';
import { useToast } from '@/hooks/use-toast';

interface ReceiptDialogProps {
  isOpen: boolean;
  onClose: () => void;
  receiptText?: string;
  studentName?: string;
}

export function ReceiptDialog({
  isOpen,
  onClose,
  receiptText,
  studentName,
}: ReceiptDialogProps) {
  const receiptRef = React.useRef<HTMLPreElement>(null);
  const [isExporting, setIsExporting] = React.useState(false);
  const { toast } = useToast();

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write('<html><head><title>Payment Receipt</title>');
      printWindow.document.write('<style>body { font-family: monospace; white-space: pre-wrap; margin: 20px; }</style>');
      printWindow.document.write('</head><body>');
      // Using innerHTML to preserve formatting from the <pre> tag
      const receiptContent = receiptRef.current?.innerHTML || '';
      printWindow.document.write(receiptContent);
      printWindow.document.write('</body></html>');
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleExport = async (format: 'pdf' | 'png') => {
    if (!receiptRef.current) return;
    setIsExporting(true);

    try {
        const canvas = await html2canvas(receiptRef.current, {
            backgroundColor: '#ffffff', // Ensure a solid background
            scale: 2, // Improve resolution
        });
        const imgData = canvas.toDataURL('image/png');

        // Sanitize the filename to prevent any potential path traversal issues.
        const safeStudentName = (studentName || 'student')
            .replace(/[^a-zA-Z0-9\s-]/g, '') // Allow only safe characters
            .trim()
            .replace(/\s+/g, '_'); // Replace spaces with underscores
        const fileName = `receipt-${safeStudentName}-${Date.now()}`;

        if (format === 'pdf') {
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'px',
                // Set format to the size of the captured canvas
                format: [canvas.width, canvas.height]
            });
            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
            pdf.save(`${fileName}.pdf`);
        } else {
            const link = document.createElement('a');
            link.download = `${fileName}.png`;
            link.href = imgData;
            link.click();
        }
    } catch(e) {
        console.error("Export failed", e);
        toast({ variant: 'destructive', title: 'Export Failed', description: 'Could not generate the file.' });
    } finally {
        setIsExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Payment Receipt</DialogTitle>
          <DialogDescription>
            A simulated receipt for {studentName}'s recent payment.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-72 w-full rounded-md border">
            {/* The ref is attached here to the element we want to capture */}
            <pre ref={receiptRef} className="text-sm whitespace-pre-wrap font-code bg-white p-4 text-black">
                {receiptText}
            </pre>
        </ScrollArea>
        <DialogFooter className='sm:justify-between flex-wrap gap-2'>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={handlePrint}>
                <Printer className="mr-2" />
                Print
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" disabled={isExporting}>
                  {isExporting ? <Spinner className="mr-2"/> : <Download className="mr-2" />}
                  {isExporting ? 'Exporting...' : 'Export'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleExport('pdf')}>
                  <FileText className="mr-2" />
                  Download as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('png')}>
                  <FileImage className="mr-2" />
                  Download as Image (PNG)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <Button type="button" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
