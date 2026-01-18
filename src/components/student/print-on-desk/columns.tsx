'use client';

import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { Download } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import type { PrintRequest, PrintRequestStatus } from '@/lib/types';
import { DataTableColumnHeader } from '@/components/admin/students/data-table-header';
import { Button } from '@/components/ui/button';

const statusColors: Record<PrintRequestStatus, 'default' | 'secondary' | 'destructive' | 'success'> = {
    Pending: 'secondary',
    Approved: 'success',
    Rejected: 'destructive',
};

export const columns: ColumnDef<PrintRequest>[] = [
  {
    accessorKey: 'createdAt',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Date" />
    ),
    cell: ({ row }) => {
      const date = row.original.createdAt.toDate();
      return <span>{format(date, 'MMM d, yyyy')}</span>;
    },
  },
  {
    accessorKey: 'fileName',
    header: 'File',
    cell: ({ row }) => {
      return (
        <a
          href={row.original.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-primary hover:underline"
        >
          {row.original.fileName}
        </a>
      );
    },
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
];
