'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { collection, query, orderBy, writeBatch, doc, serverTimestamp, updateDoc } from 'firebase/firestore';

import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import type { PrintRequest } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { columns as printRequestColumns } from '@/components/admin/print-requests/columns';

const PrintRequestDataTable = dynamic(
  () => import('@/components/admin/print-requests/data-table').then(mod => mod.PrintRequestDataTable),
  { ssr: false }
);

// TODO: Replace with actual logged-in user's library
const HARDCODED_LIBRARY_ID = 'library1';

export default function PrintRequestsPage() {
  const { toast } = useToast();
  const { firestore, user } = useFirebase();
  const [processingId, setProcessingId] = React.useState<string | null>(null);

  const requestsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, `libraries/${HARDCODED_LIBRARY_ID}/printRequests`),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, user]);

  const { data: requests, isLoading } = useCollection<PrintRequest>(requestsQuery);

  const handleStatusUpdate = async (requestId: string, newStatus: 'Approved' | 'Rejected') => {
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
      return;
    }
    setProcessingId(requestId);
    
    try {
        const batch = writeBatch(firestore);
        const actor = { id: user.uid, name: user.displayName || 'Admin' };
        
        const requestRef = doc(firestore, `libraries/${HARDCODED_LIBRARY_ID}/printRequests`, requestId);
        batch.update(requestRef, {
            status: newStatus,
            updatedAt: serverTimestamp(),
        });

        const logRef = doc(collection(firestore, `libraries/${HARDCODED_LIBRARY_ID}/activityLogs`));
        batch.set(logRef, {
            libraryId: HARDCODED_LIBRARY_ID,
            user: actor,
            activityType: newStatus === 'Approved' ? 'print_request_approved' : 'print_request_rejected',
            details: { requestId },
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
    }
  };

  const memoizedColumns = React.useMemo(
    () => printRequestColumns({ onStatusUpdate: handleStatusUpdate, processingId }),
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
    </div>
  );
}
