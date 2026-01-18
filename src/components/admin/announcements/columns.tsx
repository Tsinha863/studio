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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Announcement } from '@/lib/types';
import { DataTableColumnHeader } from '../students/data-table-header';

type ColumnsConfig = {
  openDeleteAlert: (announcement: Announcement) => void;
};

export const columns = ({ openDeleteAlert }: ColumnsConfig): ColumnDef<Announcement>[] => [
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
    accessorKey: 'title',
    header: 'Title',
    cell: ({ row }) => {
        return <div className="font-medium">{row.original.title}</div>;
    }
  },
  {
    accessorKey: 'content',
    header: 'Content',
    cell: ({ row }) => {
        const content = row.original.content;
        return <div className="max-w-xs truncate">{content}</div>
    }
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const announcement = row.original;

      return (
        <div className="text-right">
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
                className="text-destructive"
                onClick={() => openDeleteAlert(announcement)}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
