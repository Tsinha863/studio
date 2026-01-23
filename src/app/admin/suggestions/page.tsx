'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import {
  collection,
  query,
  orderBy,
  writeBatch,
  doc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
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

import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirebase, errorEmitter } from '@/firebase';
import type { Suggestion } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { columns as suggestionColumns } from '@/components/admin/suggestions/columns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/spinner';
import { LIBRARY_ID } from '@/lib/config';
import { FirestorePermissionError } from '@/firebase/errors';

const DataTable = dynamic(() => import('@/components/ui/data-table').then(mod => mod.DataTable), { 
    ssr: false,
    loading: () => <div className="rounded-md border"><Skeleton className="h-96 w-full" /></div>
});

type AlertState = {
  isOpen: boolean;
  suggestionId?: string;
};

export default function SuggestionsPage() {
  const { toast } = useToast();
  const { firestore, user } = useFirebase();
  const [alertState, setAlertState] = React.useState<AlertState>({ isOpen: false });
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);

  const suggestionsQuery = React.useMemo(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, `libraries/${LIBRARY_ID}/suggestions`),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, user]);
  const { data: suggestions, isLoading: isLoadingSuggestions, error } = useCollection<Suggestion>(suggestionsQuery);
  
  const suggestionsWithDetails = React.useMemo(() => {
    return suggestions.map((s) => ({
      ...s,
      studentName: s.studentName || 'Unknown Student',
    }));
  }, [suggestions]);

  const handleStatusChange = React.useCallback(async (suggestionId: string, status: Suggestion['status']) => {
    if (!user || !firestore) return;

    const suggestionRef = doc(firestore, `libraries/${LIBRARY_ID}/suggestions/${suggestionId}`);
    const payload = {
      status,
      updatedAt: serverTimestamp(),
    };
    
    try {
        await updateDoc(suggestionRef, payload);
        toast({
          title: 'Status Updated',
          description: "The suggestion's status has been changed.",
        });
    } catch(serverError) {
      const permissionError = new FirestorePermissionError({
        path: suggestionRef.path,
        operation: 'update',
        requestResourceData: payload,
      });
      errorEmitter.emit('permission-error', permissionError);
    }
  }, [user, firestore, toast]);

  const openDeleteAlert = React.useCallback((suggestionId: string) =>
    setAlertState({ isOpen: true, suggestionId }), []);

  const closeDeleteAlert = () => setAlertState({ isOpen: false, suggestionId: undefined });

  const handleDelete = async () => {
    if (!alertState.suggestionId || !user || !firestore) return;
    
    setIsSubmitting(true);

    const suggestionRef = doc(firestore, `libraries/${LIBRARY_ID}/suggestions/${alertState.suggestionId}`);
    const batch = writeBatch(firestore);
    const actor = { id: user.uid, name: user.displayName || 'Admin' };
    
    batch.delete(suggestionRef);

    const logRef = doc(collection(firestore, `libraries/${LIBRARY_ID}/activityLogs`));
    batch.set(logRef, {
      libraryId: LIBRARY_ID,
      user: actor,
      activityType: 'suggestion_deleted',
      details: { suggestionId: alertState.suggestionId },
      timestamp: serverTimestamp(),
    });

    try {
        await batch.commit();
        toast({
          title: 'Suggestion Deleted',
          description: 'The suggestion has been removed.',
        });
        closeDeleteAlert();
    } catch(serverError) {
      const permissionError = new FirestorePermissionError({
        path: suggestionRef.path,
        operation: 'delete',
      });
      errorEmitter.emit('permission-error', permissionError);
    } finally {
        setIsSubmitting(false);
    }
  };

  const memoizedColumns = React.useMemo(
    () => suggestionColumns({ onStatusChange: handleStatusChange, onDelete: openDeleteAlert }),
    [handleStatusChange, openDeleteAlert]
  );

  const table = useReactTable({
    data: suggestionsWithDetails,
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-headline">
            Student Suggestions
          </h1>
          <p className="text-muted-foreground">
            Review and manage feedback submitted by students.
          </p>
        </div>
      </div>
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              placeholder="Filter by content..."
              value={(table.getColumn('content')?.getFilterValue() as string) ?? ''}
              onChange={(event) =>
                table.getColumn('content')?.setFilterValue(event.target.value)
              }
              className="w-full sm:max-w-sm"
            />
          </div>
          {error && <p className="text-sm font-medium text-destructive">Error loading suggestions: {error.message}</p>}
          <DataTable
            table={table}
            columns={memoizedColumns}
            data={suggestionsWithDetails}
            isLoading={isLoadingSuggestions}
            noResultsMessage="No suggestions found."
          />
          <DataTablePagination table={table} />
        </CardContent>
      </Card>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={alertState.isOpen} onOpenChange={(isOpen) => !isOpen && closeDeleteAlert()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this
              suggestion.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting && <Spinner className="mr-2" />}
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
