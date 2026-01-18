'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { collection, query, orderBy, writeBatch, doc, serverTimestamp, updateDoc } from 'firebase/firestore';

import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import type { PrintRequest } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { columns as printRequestColumns } from '@/components/admin/print-requests/columns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const PrintRequestDataTable = dynamic(
  () => import('@/components/admin/print-requests/data-table').then(mod => mod.PrintRequestDataTable),
  { ssr: false }
);

// TODO: Replace with actual logged-in user's library
const HARDCODED_LIBRARY_ID = 'library1';

type RejectionDialogState = {
  isOpen: boolean;
  requestId?: string;
}

export default function PrintRequestsPage() {
  const { toast } = useToast();
  const { firestore, user } = useFirebase();
  const [processingId, setProcessingId] = React.useState<string | null>(null);
  const [rejectionDialog, setRejectionDialog] = React.useState<RejectionDialogState>({ isOpen: false });
  const [rejectionReason, setRejectionReason] = React.useState('');


  const requestsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, `libraries/${HARDCODED_LIBRARY_ID}/printRequests`),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, user]);

  const { data: requests, isLoading } = useCollection<PrintRequest>(requestsQuery);

  const handleStatusUpdate = async (requestId: string, newStatus: 'Approved' | 'Rejected', reason?: string) => {
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
      return;
    }
    setProcessingId(requestId);
    
    try {
        const batch = writeBatch(firestore);
        const actor = { id: user.uid, name: user.displayName || 'Admin' };
        
        const requestRef = doc(firestore, `libraries/${HARDCODED_LIBRARY_ID}/printRequests`, requestId);
        
        const updateData: any = {
            status: newStatus,
            updatedAt: serverTimestamp(),
        };
        if (newStatus === 'Rejected' && reason) {
            updateData.rejectionReason = reason;
        }

        batch.update(requestRef, updateData);

        const logRef = doc(collection(firestore, `libraries/${HARDCODED_LIBRARY_ID}/activityLogs`));
        batch.set(logRef, {
            libraryId: HARDCODED_LIBRARY_ID,
            user: actor,
            activityType: newStatus === 'Approved' ? 'print_request_approved' : 'print_request_rejected',
            details: { requestId, reason: reason || null },
            timestamp: serverTimestamp(),
        });
        
        await batch.commit();

        toast({
            title: `Request ${newStatus}`,
            description: 'The print request has been updated.',
        });

    } catch (error) {
        console.error("PRINT REQUEST STATUS UPDATE ERROR:", error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: error instanceof Error ? error.message : 'Could not update the request.',
        });
    } finally {
        setProcessingId(null);
        setRejectionDialog({ isOpen: false });
        setRejectionReason('');
    }
  };

  const openRejectionDialog = (requestId: string) => {
    setRejectionDialog({ isOpen: true, requestId });
  };

  const handleConfirmRejection = () => {
    if (rejectionDialog.requestId) {
        handleStatusUpdate(rejectionDialog.requestId, 'Rejected', rejectionReason);
    }
  };

  const memoizedColumns = React.useMemo(
    () => printRequestColumns({ onApprove: (id) => handleStatusUpdate(id, 'Approved'), onReject: openRejectionDialog, processingId }),
    [processingId]
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight font-headline">
          Print Requests
        </h1>
        <p className="text-muted-foreground">
          Manage document printing requests from students.
        </p>
      </div>
      <Card>
        <CardContent className="p-0">
          <PrintRequestDataTable
            columns={memoizedColumns}
            data={requests || []}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>
      <AlertDialog open={rejectionDialog.isOpen} onOpenChange={(open) => !open && setRejectionDialog({ isOpen: false })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Print Request</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for rejecting this request. This will be visible to the student.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label htmlFor="rejectionReason" className="sr-only">Rejection Reason</Label>
            <Textarea 
                id="rejectionReason"
                placeholder="e.g., File is corrupted, incorrect format..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRejection}>Confirm Rejection</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
