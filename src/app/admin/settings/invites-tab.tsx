'use client';
import * as React from 'react';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useFirebase, useCollection, errorEmitter } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Copy } from 'lucide-react';
import { Spinner } from '@/components/spinner';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/ui/data-table';
import type { Invite } from '@/lib/types';
import { columns as inviteColumns } from './invite-columns';
import { FirestorePermissionError } from '@/firebase/errors';

function generateInviteCode(length = 8) {
  const chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function InvitesTab() {
  const { firestore, user, libraryId } = useFirebase();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [newInviteCode, setNewInviteCode] = React.useState<string | null>(null);

  const invitesQuery = React.useMemo(() => {
    if (!firestore || !libraryId) return null;
    return collection(firestore, `libraries/${libraryId}/invites`);
  }, [firestore, libraryId]);

  const { data: invites, isLoading } = useCollection<Invite>(invitesQuery);

  const handleGenerateInvite = async () => {
    if (!firestore || !user || !libraryId) return;
    setIsGenerating(true);

    const code = generateInviteCode();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

    const payload = {
        libraryId,
        inviteCode: code,
        role: 'student' as const,
        expiresAt: Timestamp.fromDate(expiresAt),
        used: false,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
    };
    
    try {
        const invitesCol = collection(firestore, `libraries/${libraryId}/invites`);
        await addDoc(invitesCol, payload);
        setNewInviteCode(code);
        toast({ title: 'Invite Generated', description: `New invite code ${code} has been created.` });
    } catch(serverError) {
      const permissionError = new FirestorePermissionError({
        path: `libraries/${libraryId}/invites`,
        operation: 'create',
        requestResourceData: payload,
      });
      errorEmitter.emit('permission-error', permissionError);
    } finally {
        setIsGenerating(false);
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
        <CardTitle>Student Invites</CardTitle>
        <CardDescription>Generate and manage invite codes for new students to join your library.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-lg font-medium mb-2">Generate New Invite</h3>
          <div className="flex items-center gap-2">
            <Button onClick={handleGenerateInvite} disabled={isGenerating}>
              {isGenerating ? <Spinner className="mr-2" /> : <PlusCircle className="mr-2" />}
              {isGenerating ? 'Generating...' : 'Generate 7-Day Invite Code'}
            </Button>
            {newInviteCode && (
                 <div className="flex items-center gap-2 rounded-md border bg-muted px-3 py-2">
                    <span className="font-mono font-semibold text-primary">{newInviteCode}</span>
                    <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => copyToClipboard(newInviteCode)}>
                        <Copy className="h-4 w-4" />
                    </Button>
                </div>
            )}
          </div>
        </div>
        <div>
            <h3 className="text-lg font-medium mb-2">Existing Invites</h3>
            <DataTable columns={inviteColumns} data={invites} isLoading={isLoading} noResultsMessage="No invites found." />
        </div>
      </CardContent>
    </Card>
  );
}
