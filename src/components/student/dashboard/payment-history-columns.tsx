'use client';

import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';

import { Badge } from '@/components/ui/badge';
import type { Payment } from '@/lib/types';
import { DataTableColumnHeader } from '@/components/admin/students/data-table-header';

export const columns: ColumnDef<Payment>[] = [
  {
    accessorKey: 'dueDate',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Due Date" />
    ),
    cell: ({ row }) => {
      const date = row.original.dueDate.toDate();
      return <span>{format(date, 'MMM d, yyyy')}</span>;
    },
  },
  {
    accessorKey: 'paymentDate',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Paid On" />
    ),
    cell: ({ row }) => {
      const date = row.original.paymentDate?.toDate();
      return date ? <span>{format(date, 'MMM d, yyyy')}</span> : <span className="text-muted-foreground">N/A</span>;
    },
  },
  {
    accessorKey: 'amount',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Amount" />
    ),
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('amount'));
      const formatted = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
      }).format(amount);
      return <div className="font-medium">{formatted}</div>;
    },
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const status = row.original.status;
      const variant =
        status === 'paid'
          ? 'success'
          : status === 'pending'
          ? 'secondary'
          : 'destructive';
      return <Badge variant={variant} className="capitalize">{status}</Badge>;
    },
  },
];
