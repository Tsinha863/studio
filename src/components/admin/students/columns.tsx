
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
import type { useToast } from '@/hooks/use-toast';

type StudentWithId = Student & { id: string };

type ColumnsConfig = {
  openModal: (student: StudentWithId) => void;
  openDeleteAlert: (student: StudentWithId) => void;
  toast: ReturnType<typeof useToast>['toast'];
};

export const columns = ({ openModal, openDeleteAlert, toast }: ColumnsConfig): ColumnDef<StudentWithId>[] => [
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
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const status = row.original.status;
      const variant =
        status === 'active'
          ? 'success'
          : status === 'at-risk'
          ? 'destructive'
          : 'secondary';
      return <Badge variant={variant} className="capitalize">{status}</Badge>;
    },
    filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
    }
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
            <DropdownMenuItem
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(student.id);
                  toast({
                    title: 'Student ID Copied',
                    description: 'The ID has been copied to your clipboard.',
                  });
                } catch (err) {
                  toast({
                    variant: 'destructive',
                    title: 'Copy Failed',
                    description: 'Could not copy the ID to the clipboard.',
                  });
                }
              }}
            >
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
              Set Inactive
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
