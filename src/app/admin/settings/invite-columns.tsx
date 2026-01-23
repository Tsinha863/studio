'use client';
import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Invite } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Copy, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const CodeCell = ({ code }: { code: string }) => {
    const { toast } = useToast();
    const copyToClipboard = () => {
        navigator.clipboard.writeText(code).then(() => {
            toast({ title: 'Copied to clipboard!', description: code });
        });
    };
    return (
        <div className="flex items-center gap-2 font-mono">
            <span>{code}</span>
            <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={copyToClipboard}>
                <Copy className="h-4 w-4" />
            </Button>
        </div>
    )
}

export const columns: ColumnDef<Invite>[] = [
  {
    accessorKey: 'inviteCode',
    header: 'Invite Code',
    cell: ({ row }) => <CodeCell code={row.original.inviteCode} />
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
        const invite = row.original;
        const now = new Date();
        const expiresAt = invite.expiresAt.toDate();
        
        if (invite.used) {
            return <Badge variant="success"><CheckCircle className="mr-1 h-3 w-3" /> Used</Badge>;
        }
        if (now > expiresAt) {
            return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" /> Expired</Badge>;
        }
        return <Badge variant="secondary"><AlertTriangle className="mr-1 h-3 w-3" /> Active</Badge>;
    }
  },
  {
    accessorKey: 'expiresAt',
    header: 'Expires At',
    cell: ({ row }) => format(row.original.expiresAt.toDate(), 'MMM d, yyyy, h:mm a'),
  },
    {
    accessorKey: 'usedBy',
    header: 'Used By',
    cell: ({ row }) => row.original.usedBy || <span className="text-muted-foreground">N/A</span>,
  },
  {
    accessorKey: 'createdAt',
    header: 'Created At',
    cell: ({ row }) => format(row.original.createdAt.toDate(), 'MMM d, yyyy'),
  },
];
