
'use client';
import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Invite } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Copy, CheckCircle, XCircle, AlertTriangle, User, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const CodeCell = ({ code }: { code: string }) => {
    const { toast } = useToast();
    const copyToClipboard = () => {
        navigator.clipboard.writeText(code).then(() => {
            toast({ title: 'Copied!', description: code });
        });
    };
    return (
        <div className="flex items-center gap-2 font-mono font-bold">
            <span>{code}</span>
            <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={copyToClipboard}>
                <Copy className="h-3 w-3" />
            </Button>
        </div>
    )
}

export const columns: ColumnDef<Invite>[] = [
  {
    accessorKey: 'inviteCode',
    header: 'Code',
    cell: ({ row }) => <CodeCell code={row.original.inviteCode} />
  },
  {
    accessorKey: 'role',
    header: 'Role',
    cell: ({ row }) => {
        const role = row.original.role;
        return (
            <div className="flex items-center gap-2">
                {role === 'libraryStaff' ? <Shield className="h-3 w-3 text-primary" /> : <User className="h-3 w-3 text-muted-foreground" />}
                <span className="capitalize text-sm font-medium">{role === 'libraryStaff' ? 'Staff' : 'Student'}</span>
            </div>
        )
    }
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
        const invite = row.original;
        const now = new Date();
        const expiresAt = invite.expiresAt.toDate();
        
        if (invite.used) return <Badge variant="success">Used</Badge>;
        if (now > expiresAt) return <Badge variant="destructive">Expired</Badge>;
        return <Badge variant="outline" className="text-primary border-primary">Active</Badge>;
    }
  },
  {
    accessorKey: 'expiresAt',
    header: 'Expires',
    cell: ({ row }) => format(row.original.expiresAt.toDate(), 'MMM d, h:mm a'),
  },
  {
    accessorKey: 'createdAt',
    header: 'Created',
    cell: ({ row }) => format(row.original.createdAt.toDate(), 'MMM d, yyyy'),
  },
];
