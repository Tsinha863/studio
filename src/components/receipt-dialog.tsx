'use client';

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
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write('<html><head><title>Payment Receipt</title>');
      printWindow.document.write('<style>body { font-family: monospace; white-space: pre-wrap; }</style>');
      printWindow.document.write('</head><body>');
      printWindow.document.write(receiptText || '');
      printWindow.document.write('</body></html>');
      printWindow.document.close();
      printWindow.print();
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
        <ScrollArea className="h-72 w-full rounded-md border p-4">
            <pre className="text-sm whitespace-pre-wrap font-code">
                {receiptText}
            </pre>
        </ScrollArea>
        <DialogFooter className='sm:justify-between'>
          <Button variant="outline" onClick={handlePrint}>
            Print
          </Button>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
