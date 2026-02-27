'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
    collectionGroup, 
    query, 
    where, 
    limit,
    getDocs,
    writeBatch,
    doc,
    serverTimestamp,
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

/**
 * Onboarding Portal: Joins a user to a library using a verified invite code.
 * Implements strict scoped queries and atomic provisioning.
 */
function JoinLibraryForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { firestore, user } = useFirebase();

  const form = useForm<InviteCodeFormValues>({
    resolver: zodResolver(inviteCodeSchema),
    defaultValues: { inviteCode: '' },
  });

  const { formState: { isSubmitting } } = form;

  const onSubmit = async (data: InviteCodeFormValues) => {
    if (!firestore || !user) {
        toast({ variant: 'destructive', title: 'Authentication Error' });
        return;
    }

    try {
        const userMappingSnap = await getDoc(doc(firestore, 'users', user.uid));
        if (userMappingSnap.exists() && userMappingSnap.data().libraryId) {
            toast({ title: "Already Provisioned", description: "This account is already associated with a library." });
            router.push('/loading');
            return;
        }

        let libraryId: string;
        let determinedRole: 'student' | 'libraryStaff';
        let inviteToUpdateRef: DocumentReference | null = null;
        
        // Demo Bypass
        if (data.inviteCode.toUpperCase() === 'DEMO-ADMIN') {
            libraryId = 'library1';
            determinedRole = 'libraryStaff';
        } else if (data.inviteCode.toUpperCase() === 'DEMO-STUDENT' || data.inviteCode.toUpperCase() === 'DEMO') {
            libraryId = 'library1';
            determinedRole = 'student';
        } else {
            // Secure Invite Lookup
            const invitesRef = collectionGroup(firestore, 'invites');
            const q = query(
                invitesRef, 
                where('inviteCode', '==', data.inviteCode.toUpperCase()), 
                where('used', '==', false),
                limit(1)
            );
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                throw new Error('This invite code is invalid, already used, or expired.');
            }

            const inviteDoc = querySnapshot.docs[0];
            const invite = inviteDoc.data() as Invite;
            
            if (invite.expiresAt.toDate() < new Date()) {
                throw new Error('This invitation has expired. Please request a new code.');
            }

            libraryId = invite.libraryId;
            determinedRole = invite.role;
            inviteToUpdateRef = inviteDoc.ref;
        }

        // Atomic Multi-tenant Provisioning
        const batch = writeBatch(firestore);

        if (inviteToUpdateRef) {
            batch.update(inviteToUpdateRef, { used: true, usedBy: user.uid });
        }

        // 1. Create top-level Rapid Role Mapping
        const userMappingRef = doc(firestore, 'users', user.uid);
        batch.set(userMappingRef, { 
            libraryId, 
            role: determinedRole, // CRITICAL: Mapping must include role
            createdAt: serverTimestamp() 
        });

        // 2. Create Library-Specific User Profile
        const userProfileRef = doc(firestore, `libraries/${libraryId}/users`, user.uid);
        batch.set(userProfileRef, {
            id: user.uid,
            name: user.displayName || 'New Member',
            email: user.email,
            role: determinedRole,
            libraryId: libraryId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        
        // 3. Conditional CRM Record (only for students)
        if (determinedRole === 'student') {
            const studentProfileRef = doc(firestore, `libraries/${libraryId}/students`, user.uid);
            batch.set(studentProfileRef, {
                id: user.uid,
                libraryId: libraryId,
                userId: user.uid,
                name: user.displayName || 'New Student',
                email: user.email,
                status: 'active',
                fibonacciStreak: 0,
                lastInteractionAt: serverTimestamp(),
                notes: [],
                tags: [],
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
        }

        await batch.commit();

        toast({ title: 'Welcome to CampusHub!', description: "Your profile has been provisioned successfully." });
        router.push('/loading');

    } catch (error) {
      toast({ 
        variant: 'destructive', 
        title: 'Onboarding Failed', 
        description: error instanceof Error ? error.message : 'An unexpected error occurred during setup.' 
      });
    }
  };

  return (
    <Card className="w-full max-w-sm border-0 shadow-2xl sm:border">
        <CardHeader className="text-center">
            <CardTitle className="text-2xl font-headline font-bold">Join Your Library</CardTitle>
            <CardDescription>Enter the secure invitation code provided by your administrator.</CardDescription>
        </CardHeader>
        <CardContent>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                    control={form.control}
                    name="inviteCode"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Invitation Code</FormLabel>
                        <FormControl>
                            <Input 
                                placeholder="XXXX-XXXX" 
                                className="text-center font-mono text-xl tracking-widest uppercase"
                                {...field} 
                                disabled={isSubmitting} 
                            />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <Button type="submit" className="w-full h-11" disabled={isSubmitting}>
                        {isSubmitting ? <Spinner className="mr-2 h-4 w-4" /> : null}
                        Complete Onboarding
                    </Button>
                </form>
            </Form>
        </CardContent>
    </Card>
  );
}

export default function JoinLibraryPage() {
    return (
        <main className="flex min-h-screen w-full items-center justify-center bg-slate-50 p-4">
           <JoinLibraryForm />
        </main>
    )
}
