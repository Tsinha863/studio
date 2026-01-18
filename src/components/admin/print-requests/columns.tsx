'use client';

import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { Download, ThumbsDown, ThumbsUp } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTableColumnHeader } from '@/components/admin/students/data-table-header';
import type { PrintRequest, PrintRequestStatus } from '@/lib/types';
import { Spinner } from '@/components/spinner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type ColumnsConfig = {
  onApprove: (requestId: string) => void;
  onReject: (requestId: string) => void;
  processingId: string | null;
};

const statusColors: Record<PrintRequestStatus, 'default' | 'secondary' | 'destructive' | 'success'> = {
    Pending: 'secondary',
    Approved: 'success',
    Rejected: 'destructive',
};

export const columns = ({ onApprove, onReject, processingId }: ColumnsConfig): ColumnDef<PrintRequest>[] => [
  {
    accessorKey: 'createdAt',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Date" />
    ),
    cell: ({ row }) => {
      const date = row.original.createdAt.toDate();
      return <span>{format(date, 'MMM d, yyyy, h:mm a')}</span>;
    },
  },
  {
    accessorKey: 'studentName',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Student" />
    ),
    cell: ({ row }) => (
        <div>
            <div className="font-medium">{row.original.studentName}</div>
            <div className="text-sm text-muted-foreground">Seat: {row.original.seatId || 'N/A'}</div>
        </div>
    )
  },
  {
    accessorKey: 'fileName',
    header: 'File',
    cell: ({ row }) => (
      <Button type="button" variant="link" asChild className="p-0 h-auto font-medium">
        <a
          href={row.original.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Download className="mr-2 h-4 w-4" />
          {row.original.fileName}
        </a>
      </Button>
    ),
  },
  {
    accessorKey: 'notes',
    header: 'Notes',
     cell: ({ row }) => {
        const notes = row.original.notes;
        return <div className="max-w-xs truncate">{notes || <span className='text-muted-foreground'>N/A</span>}</div>
    }
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const status = row.original.status;
      const variant = statusColors[status] || 'default';

      if (status === 'Rejected' && row.original.rejectionReason) {
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Badge variant={variant} className="capitalize">{status}</Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>{row.original.rejectionReason}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      }
      return <Badge variant={variant} className="capitalize">{status}</Badge>;
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const request = row.original;
      const isProcessing = processingId === request.id;
      const isActionable = request.status === 'Pending';

      if (!isActionable) {
        return null;
      }

      return (
        <div className="flex justify-end gap-2">
            {isProcessing ? (
                <div className="flex items-center justify-center w-full h-full">
                    <Spinner />
                </div>
            ) : (
                <>
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => onApprove(request.id)}
                        disabled={!!processingId}
                    >
                        <ThumbsUp className="mr-2 h-4 w-4" />
                        Approve
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => onReject(request.id)}
                        disabled={!!processingId}
                    >
                         <ThumbsDown className="mr-2 h-4 w-4" />
                        Reject
                    </Button>
                </>
            )}
        </div>
      );
    },
  },
];
