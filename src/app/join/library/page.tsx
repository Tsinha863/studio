'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { FirebaseError } from 'firebase/app';
import { 
    collectionGroup, 
    query, 
    where, 
    getDocs,
    writeBatch,
    doc,
    serverTimestamp,
    Timestamp,
    getDoc,
    type DocumentReference,
} from 'firebase/firestore';

import { inviteCodeSchema, type InviteCodeFormValues } from '@/lib/schemas';
import type { Invite } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase';
import { Spinner } from '@/components/spinner';


function JoinLibraryForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { auth, firestore, user } = useFirebase();

  const form = useForm<InviteCodeFormValues>({
    resolver: zodResolver(inviteCodeSchema),
    defaultValues: { inviteCode: '' },
  });

  const { formState: { isSubmitting } } = form;

  const onSubmit = async (data: InviteCodeFormValues) => {
    if (!auth || !firestore || !user) {
        toast({ variant: 'destructive', title: 'Authentication Error' });
        return;
    }

    try {
        const userMappingSnap = await getDoc(doc(firestore, 'users', user.uid));
        if (userMappingSnap.exists()) {
            toast({ title: "Already Joined", description: "Your account is already part of a library." });
            router.push('/loading');
            return;
        }

        let libraryId: string;
        let inviteToUpdateRef: DocumentReference | null = null;
        
        if (data.inviteCode.toUpperCase() === 'DEMO') {
            libraryId = 'library1';
        } else {
            const invitesRef = collectionGroup(firestore, 'invites');
            const q = query(invitesRef, where('inviteCode', '==', data.inviteCode), where('used', '==', false));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                throw new Error('Invalid or already used invite code.');
            }

            const inviteDoc = querySnapshot.docs[0];
            const invite = inviteDoc.data() as Invite;
            
            if (invite.expiresAt.toDate() < new Date()) {
                throw new Error('This invite code has expired.');
            }
            libraryId = invite.libraryId;
            inviteToUpdateRef = inviteDoc.ref;
        }

        // Atomically join the library
        const batch = writeBatch(firestore);

        if (inviteToUpdateRef) {
            batch.update(inviteToUpdateRef, { used: true, usedBy: user.uid });
        }

        const userMappingRef = doc(firestore, 'users', user.uid);
        batch.set(userMappingRef, { libraryId });

        const userProfileRef = doc(firestore, `libraries/${libraryId}/users`, user.uid);
        batch.set(userProfileRef, {
            id: user.uid,
            name: user.displayName,
            email: user.email,
            role: 'student',
            libraryId: libraryId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        
        const studentProfileRef = doc(firestore, `libraries/${libraryId}/students`, user.uid);
        batch.set(studentProfileRef, {
            id: user.uid,
            libraryId: libraryId,
            userId: user.uid,
            name: user.displayName,
            email: user.email,
            status: 'active',
            fibonacciStreak: 0,
            lastInteractionAt: serverTimestamp(),
            notes: [],
            tags: [],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });

        await batch.commit();

        toast({ title: 'Success!', description: "You've successfully joined the library." });
        router.push('/loading');

    } catch (error) {
      let title = 'Join Failed';
      let description = error instanceof Error ? error.message : 'An unexpected error occurred.';
      if (error instanceof FirebaseError) {
        description = error.message;
      }
      toast({ variant: 'destructive', title, description });
    }
  };

  return (
    <Card className="w-full max-w-sm">
        <CardHeader>
            <CardTitle>Join a Library</CardTitle>
            <CardDescription>Enter the invite code provided by your administrator.</CardDescription>
        </CardHeader>
        <CardContent>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                    control={form.control}
                    name="inviteCode"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Invite Code</FormLabel>
                        <FormControl>
                            <Input placeholder="Enter code..." {...field} disabled={isSubmitting} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                        {isSubmitting && <Spinner className="mr-2" />}
                        Join Library
                    </Button>
                </form>
            </Form>
        </CardContent>
    </Card>
  );
}

export default function JoinLibraryPage() {
    return (
        <main className="flex min-h-screen w-full items-center justify-center bg-muted/40 p-4">
           <JoinLibraryForm />
        </main>
    )
}
