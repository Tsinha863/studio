'use client';

import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import type { Suggestion } from '@/lib/types';
import { DataTableColumnHeader } from '../students/data-table-header';

type SuggestionWithId = Suggestion & { id: string };
type SuggestionWithStudent = SuggestionWithId & { studentName: string };
type SuggestionStatus = Suggestion['status'];

const statusColors: Record<SuggestionStatus, 'default' | 'secondary' | 'destructive' | 'success'> = {
  new: 'default',
  viewed: 'secondary',
  'in-progress': 'secondary',
  resolved: 'success',
  closed: 'destructive',
};

type ColumnsConfig = {
  onStatusChange: (suggestionId: string, status: SuggestionStatus) => void;
  onDelete: (suggestionId: string) => void;
};

export const columns = ({ onStatusChange, onDelete }: ColumnsConfig): ColumnDef<SuggestionWithStudent>[] => [
  {
    accessorKey: 'createdAt',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Date" />
    ),
    cell: ({ row }) => {
      const date = row.original.createdAt.toDate();
      return (
        <div className="text-muted-foreground">
          {formatDistanceToNow(date, { addSuffix: true })}
        </div>
      );
    },
  },
  {
    accessorKey: 'studentName',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Student" />
    ),
    cell: ({ row }) => {
      return (
        <div className="font-medium">{row.original.studentName}</div>
      );
    },
  },
  {
    accessorKey: 'content',
    header: 'Suggestion',
    cell: ({ row }) => {
        return <div className="max-w-md">{row.original.content}</div>
    }
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const suggestion = row.original;
      return (
        <Select
          value={suggestion.status}
          onValueChange={(value: SuggestionStatus) =>
            onStatusChange(suggestion.id, value)
          }
        >
          <SelectTrigger className="w-[140px] capitalize">
            <SelectValue placeholder="Set status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="viewed">Viewed</SelectItem>
            <SelectItem value="in-progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      );
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const suggestion = row.original;

      return (
        <div className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0" type="button">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onDelete(suggestion.id)}
              >
                Delete Suggestion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
