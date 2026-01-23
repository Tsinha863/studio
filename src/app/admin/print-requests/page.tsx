'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { collection, query, orderBy, writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table';

import { useCollection, useFirebase, errorEmitter } from '@/firebase';
import type { PrintRequest } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
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
import { Spinner } from '@/components/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { LIBRARY_ID } from '@/lib/config';
import { FirestorePermissionError } from '@/firebase/errors';

const DataTable = dynamic(() => import('@/components/ui/data-table').then(mod => mod.DataTable), { 
    ssr: false,
    loading: () => <div className="rounded-md border"><Skeleton className="h-96 w-full" /></div>
});


type RejectionDialogState = {
  isOpen: boolean;
  requestId?: string;
}

export default function PrintRequestsPage() {
  const { toast } = useToast();
  const { firestore, user } = useFirebase();
  const [rejectionDialog, setRejectionDialog] = React.useState<RejectionDialogState>({ isOpen: false });
  const [rejectionReason, setRejectionReason] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);

  const requestsQuery = React.useMemo(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, `libraries/${LIBRARY_ID}/printRequests`),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, user]);
  const { data: requests, isLoading, error } = useCollection<PrintRequest>(requestsQuery);

  const handleStatusUpdate = React.useCallback(async (requestId: string, newStatus: 'Approved' | 'Rejected', reason?: string) => {
    if (!user || !firestore) return;
    
    setIsSubmitting(true);
    
    const requestRef = doc(firestore, `libraries/${LIBRARY_ID}/printRequests`, requestId);
    const batch = writeBatch(firestore);
    const actor = { id: user.uid, name: user.displayName || 'Admin' };
    
    const updateData: any = {
        status: newStatus,
        updatedAt: serverTimestamp(),
    };
    if (newStatus === 'Rejected' && reason) {
        updateData.rejectionReason = reason;
    }

    batch.update(requestRef, updateData);

    const logRef = doc(collection(firestore, `libraries/${LIBRARY_ID}/activityLogs`));
    batch.set(logRef, {
        libraryId: LIBRARY_ID,
        user: actor,
        activityType: newStatus === 'Approved' ? 'print_request_approved' : 'print_request_rejected',
        details: { requestId, reason: reason || null },
        timestamp: serverTimestamp(),
    });
    
    try {
        await batch.commit();
        toast({
            title: `Request ${newStatus}`,
            description: 'The print request has been updated.',
        });
    } catch(serverError) {
      const permissionError = new FirestorePermissionError({
        path: requestRef.path,
        operation: 'update',
        requestResourceData: updateData,
      });
      errorEmitter.emit('permission-error', permissionError);
    } finally {
        setIsSubmitting(false);
        if (newStatus === 'Rejected') {
            setRejectionDialog({ isOpen: false });
            setRejectionReason('');
        }
    }
  }, [user, firestore, toast]);

  const approveRequest = React.useCallback((requestId: string) => {
    handleStatusUpdate(requestId, 'Approved');
  }, [handleStatusUpdate]);

  const openRejectionDialog = React.useCallback((requestId: string) => {
    setRejectionDialog({ isOpen: true, requestId });
  }, []);

  const memoizedColumns = React.useMemo(
    () => printRequestColumns({ onApprove: approveRequest, onReject: openRejectionDialog }),
    [approveRequest, openRejectionDialog]
  );
  
  const table = useReactTable({
    data: requests || [],
    columns: memoizedColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
  });

  const handleConfirmRejection = () => {
    if (rejectionDialog.requestId) {
        handleStatusUpdate(rejectionDialog.requestId, 'Rejected', rejectionReason);
    }
  };

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
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              placeholder="Filter by student name..."
              value={(table.getColumn('studentName')?.getFilterValue() as string) ?? ''}
              onChange={(event) =>
                table.getColumn('studentName')?.setFilterValue(event.target.value)
              }
              className="w-full sm:max-w-sm"
            />
          </div>
          {error && <p className="text-sm font-medium text-destructive">Error loading print requests: {error.message}</p>}
          <DataTable
            table={table}
            columns={memoizedColumns}
            data={requests || []}
            isLoading={isLoading}
            noResultsMessage="No pending requests."
          />
          <DataTablePagination table={table} />
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
                disabled={isSubmitting}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRejection} disabled={isSubmitting}>
              {isSubmitting && <Spinner className="mr-2" />}
              Confirm Rejection
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
