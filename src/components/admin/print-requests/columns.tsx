'use client';

import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { Check, Download, MoreHorizontal, ThumbsDown, ThumbsUp, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTableColumnHeader } from '@/components/admin/students/data-table-header';
import type { PrintRequest, PrintRequestStatus } from '@/lib/types';
import { Spinner } from '@/components/spinner';

type ColumnsConfig = {
  onStatusUpdate: (requestId: string, newStatus: 'Approved' | 'Rejected') => void;
  processingId: string | null;
};

const statusColors: Record<PrintRequestStatus, 'default' | 'secondary' | 'destructive' | 'success'> = {
    Pending: 'secondary',
    Approved: 'success',
    Rejected: 'destructive',
};

export const columns = ({ onStatusUpdate, processingId }: ColumnsConfig): ColumnDef<PrintRequest>[] => [
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
      <Button variant="link" asChild className="p-0 h-auto font-medium">
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
                <Spinner />
            ) : (
                <>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onStatusUpdate(request.id, 'Approved')}
                        disabled={!!processingId}
                    >
                        <ThumbsUp className="mr-2 h-4 w-4" />
                        Approve
                    </Button>
                    <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => onStatusUpdate(request.id, 'Rejected')}
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
