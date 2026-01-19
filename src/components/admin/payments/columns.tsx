'use client';

import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTableColumnHeader } from '@/components/admin/students/data-table-header';
import { Spinner } from '@/components/spinner';
import type { Payment } from '@/lib/types';

type PaymentWithId = Payment & { id: string };

type ColumnsConfig = {
  handleMarkAsPaid: (payment: PaymentWithId) => void;
  isPaying: string | false;
};

export const columns = ({ handleMarkAsPaid, isPaying }: ColumnsConfig): ColumnDef<PaymentWithId>[] => [
  {
    accessorKey: 'studentName',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Student" />
    ),
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
    accessorKey: 'dueDate',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Due Date" />
    ),
    cell: ({ row }) => {
      const date = row.original.dueDate.toDate();
      return <span>{format(date, 'MMM d, yyyy')}</span>;
    },
    filterFn: (row, id, value) => {
      if (!value) return true;
      const rowDate = (row.getValue(id) as Timestamp).toDate();
      const filterDate = value as Date;
      // compare date part only
      return rowDate.getFullYear() === filterDate.getFullYear() &&
             rowDate.getMonth() === filterDate.getMonth() &&
             rowDate.getDate() === filterDate.getDate();
    },
  },
    {
    accessorKey: 'paymentDate',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Payment Date" />
    ),
    cell: ({ row }) => {
      const date = row.original.paymentDate?.toDate();
      return date ? <span>{format(date, 'MMM d, yyyy')}</span> : <span className="text-muted-foreground">N/A</span>;
    },
    filterFn: (row, id, value) => {
      const val = row.getValue(id) as Timestamp | null;
      if (!value) return true;
      if (!val) return false;
      const rowDate = val.toDate();
      const filterDate = value as Date;
      return rowDate.getFullYear() === filterDate.getFullYear() &&
             rowDate.getMonth() === filterDate.getMonth() &&
             rowDate.getDate() === filterDate.getDate();
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
    filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
    }
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const payment = row.original;
      const isCurrentPaymentProcessing = isPaying === payment.id;

      return (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => handleMarkAsPaid(payment)}
          disabled={payment.status === 'paid' || !!isPaying}
        >
          {isCurrentPaymentProcessing && <Spinner className="mr-2 h-4 w-4" />}
          {payment.status === 'paid' ? 'Paid' : 'Mark as Paid'}
        </Button>
      );
    },
  },
];
