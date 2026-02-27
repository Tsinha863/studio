
'use client';
import * as React from 'react';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useFirebase, useCollection, errorEmitter } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Copy, UserPlus, ShieldPlus } from 'lucide-react';
import { Spinner } from '@/components/spinner';
import { DataTable } from '@/components/ui/data-table';
import type { Invite } from '@/lib/types';
import { columns as inviteColumns } from './invite-columns';
import { FirestorePermissionError } from '@/firebase/errors';

export function InvitesTab() {
  const { firestore, user, libraryId } = useFirebase();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = React.useState<string | null>(null);
  const [newInviteCode, setNewInviteCode] = React.useState<string | null>(null);

  const invitesQuery = React.useMemo(() => {
    if (!firestore || !libraryId) return null;
    return collection(firestore, `libraries/${libraryId}/invites`);
  }, [firestore, libraryId]);

  const { data: invites, isLoading } = useCollection<Invite>(invitesQuery);

  const handleGenerateInvite = async (role: 'student' | 'libraryStaff') => {
    if (!firestore || !user || !libraryId) return;
    setIsGenerating(role);

    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const payload = {
        libraryId,
        inviteCode: code,
        role,
        expiresAt: Timestamp.fromDate(expiresAt),
        used: false,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
    };
    
    try {
        const invitesCol = collection(firestore, `libraries/${libraryId}/invites`);
        await addDoc(invitesCol, payload);
        setNewInviteCode(code);
        toast({ title: 'Invite Generated', description: `New ${role === 'student' ? 'student' : 'staff'} code ${code} created.` });
    } catch(serverError) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: `libraries/${libraryId}/invites`,
        operation: 'create',
        requestResourceData: payload,
      }));
    } finally {
        setIsGenerating(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
        toast({ title: 'Copied to clipboard!', description: text });
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Member Onboarding</CardTitle>
        <CardDescription>Generate secure invite codes for students and staff.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <Button 
            variant="outline" 
            className="h-24 flex flex-col gap-2" 
            onClick={() => handleGenerateInvite('student')}
            disabled={!!isGenerating}
          >
            {isGenerating === 'student' ? <Spinner /> : <UserPlus className="h-6 w-6" />}
            <span>Invite Student</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-24 flex flex-col gap-2 border-primary/50 text-primary" 
            onClick={() => handleGenerateInvite('libraryStaff')}
            disabled={!!isGenerating}
          >
            {isGenerating === 'libraryStaff' ? <Spinner /> : <ShieldPlus className="h-6 w-6" />}
            <span>Invite Manager/Staff</span>
          </Button>
        </div>

        {newInviteCode && (
            <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/20 animate-in fade-in slide-in-from-top-4">
                <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Newly Generated Code</span>
                    <span className="text-2xl font-mono font-bold text-primary">{newInviteCode}</span>
                </div>
                <Button onClick={() => copyToClipboard(newInviteCode)}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Code
                </Button>
            </div>
        )}

        <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
                Active Invitations
            </h3>
            <DataTable columns={inviteColumns} data={invites} isLoading={isLoading} noResultsMessage="No invites pending." />
        </div>
      </CardContent>
    </Card>
  );
}
