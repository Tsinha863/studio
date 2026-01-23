'use client';
import * as React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useFirebase, useCollection, useDoc } from '@/firebase';
import type { User, Library } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { doc, runTransaction, serverTimestamp, collection, addDoc, Timestamp } from 'firebase/firestore';
import { Spinner } from '@/components/spinner';

export function DangerZoneTab() {
    const { firestore, user, libraryId } = useFirebase();
    const { toast } = useToast();
    const [selectedAdmin, setSelectedAdmin] = React.useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const libraryRef = React.useMemo(() => {
        if (!firestore || !libraryId) return null;
        return doc(firestore, 'libraries', libraryId);
    }, [firestore, libraryId]);
    const { data: library, isLoading: isLoadingLibrary } = useDoc<Library>(libraryRef);

    const adminsQuery = React.useMemo(() => {
        if (!firestore || !libraryId || !user) return null;
        // Query for other admins in the same library
        return collection(firestore, `libraries/${libraryId}/users`);
    }, [firestore, libraryId, user]);
    const { data: allUsers, isLoading: isLoadingAdmins } = useCollection<User>(adminsQuery);
    
    const otherAdmins = React.useMemo(() => allUsers.filter(u => u.role === 'libraryOwner' && u.id !== user?.uid), [allUsers, user]);

    const isOwner = library?.ownerId === user?.uid;

    const handleTransfer = async () => {
        if (!firestore || !user || !libraryId || !selectedAdmin || !isOwner) {
            toast({ variant: 'destructive', title: 'Error', description: 'You are not the owner or no admin is selected.'});
            return;
        }

        setIsSubmitting(true);
        const targetAdmin = otherAdmins.find(a => a.id === selectedAdmin);
        if (!targetAdmin) return;

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 1); // Expires in 24 hours
        
        try {
            await addDoc(collection(firestore, `libraries/${libraryId}/ownershipTransfers`), {
                libraryId,
                fromOwnerId: user.uid,
                toUserId: targetAdmin.id,
                toUserName: targetAdmin.name,
                status: 'pending',
                createdAt: serverTimestamp(),
                expiresAt: Timestamp.fromDate(expiresAt),
            });

            toast({ title: 'Transfer Initiated', description: `An ownership request has been sent to ${targetAdmin.name}. It will expire in 24 hours.`});
            setSelectedAdmin(null);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Transfer Failed', description: error instanceof Error ? error.message : 'Could not initiate transfer.'});
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <Card className="border-destructive">
            <CardHeader>
                <CardTitle>Danger Zone</CardTitle>
                <CardDescription>These actions are irreversible. Please proceed with caution.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <h3 className="font-semibold text-lg">Transfer Ownership</h3>
                <p className="text-sm text-muted-foreground">
                    Transfer ownership of this library to another administrator. You will lose owner privileges but will remain an admin. This action requires the other user to accept the transfer.
                </p>
                {!isOwner ? (
                    <p className="text-sm font-medium text-destructive">Only the current library owner can initiate a transfer.</p>
                ) : (
                    <div className="flex items-center gap-4">
                        <Select onValueChange={setSelectedAdmin} disabled={isSubmitting || isLoadingAdmins}>
                            <SelectTrigger className="w-[280px]">
                                <SelectValue placeholder="Select an admin..." />
                            </SelectTrigger>
                            <SelectContent>
                                {isLoadingAdmins ? <SelectItem value="loading" disabled>Loading...</SelectItem> :
                                otherAdmins.length > 0 ? otherAdmins.map(admin => (
                                    <SelectItem key={admin.id} value={admin.id}>{admin.name} ({admin.email})</SelectItem>
                                )) : <SelectItem value="no-admins" disabled>No other admins found.</SelectItem>
                                }
                            </SelectContent>
                        </Select>

                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" disabled={!selectedAdmin || isSubmitting}>
                                    Initiate Transfer
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will send an ownership transfer request. If they accept, you will no longer be the owner of this library. This cannot be undone.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleTransfer} disabled={isSubmitting}>
                                    {isSubmitting && <Spinner className="mr-2" />}
                                    I understand, initiate transfer
                                </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
