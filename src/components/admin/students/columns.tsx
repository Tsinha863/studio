'use client';

import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal } from 'lucide-react';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import type { Student } from '@/lib/types';
import { DataTableColumnHeader } from './data-table-header';

type ColumnsConfig = {
  openModal: (student: Student) => void;
  openDeleteAlert: (student: Student) => void;
};

export const columns = ({ openModal, openDeleteAlert }: ColumnsConfig): ColumnDef<Student>[] => [
  {
    accessorKey: 'id',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Student ID" />
    ),
  },
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => {
      return (
        <div className="flex flex-col">
          <span className="font-medium">{row.original.name}</span>
          <span className="text-sm text-muted-foreground">{row.original.email}</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'paymentStatus',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Payment Status" />
    ),
    cell: ({ row }) => {
      const status = row.original.paymentStatus;
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
    accessorKey: 'assignedSeatId',
    header: 'Assigned Seat',
    cell: ({ row }) => {
      return row.original.assignedSeatId || <span className="text-muted-foreground">N/A</span>;
    },
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Date Joined" />
    ),
    cell: ({ row }) => {
      const date = row.original.createdAt.toDate();
      return <span>{format(date, 'MMM d, yyyy')}</span>;
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const student = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(student.id)}>
              Copy student ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => openModal(student)}>
              Edit Student
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => openDeleteAlert(student)}
            >
              Delete Student
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
