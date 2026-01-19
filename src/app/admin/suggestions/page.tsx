
'use client';

import * as React from 'react';
import {
  collection,
  query,
  orderBy,
  writeBatch,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
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
import { useCollection, useFirebase, useMemoFirebase, errorEmitter } from '@/firebase';
import type { Suggestion } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/ui/data-table';
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
import { Spinner } from '@/components/spinner';
import { FirestorePermissionError } from '@/firebase/errors';

type AlertState = {
  isOpen: boolean;
  suggestionId?: string;
};

// TODO: Replace with actual logged-in user's library
const HARDCODED_LIBRARY_ID = 'library1';

export default function SuggestionsPage() {
  const { toast } = useToast();
  const { firestore, user } = useFirebase();
  const [alertState, setAlertState] = React.useState<AlertState>({ isOpen: false });

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);

  // --- Data Fetching ---
  const suggestionsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, `libraries/${HARDCODED_LIBRARY_ID}/suggestions`),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, user]);

  const { data: suggestions, isLoading: isLoadingSuggestions } = useCollection<Suggestion>(suggestionsQuery);
  
  // --- Data Processing ---
  const suggestionsWithDetails = React.useMemo(() => {
    if (!suggestions) return [];
    return suggestions.map((s) => ({
      ...s,
      // studentName is now denormalized on the suggestion document.
      studentName: s.studentName || 'Unknown Student',
    }));
  }, [suggestions]);

  const memoizedColumns = React.useMemo(
    () => suggestionColumns({ onStatusChange: handleStatusChange, onDelete: openDeleteAlert }),
    []
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

  // --- Handlers ---
  const handleStatusChange = async (suggestionId: string, status: Suggestion['status']) => {
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to perform this action.'});
      return;
    }

    toast({
      title: 'Status Updated',
      description: "The suggestion's status has been changed.",
    });

    const suggestionRef = doc(firestore, `libraries/${HARDCODED_LIBRARY_ID}/suggestions/${suggestionId}`);
    const batch = writeBatch(firestore);
    const actor = { id: user.uid, name: user.displayName || 'Admin' };
    
    batch.update(suggestionRef, {
      status,
      updatedAt: serverTimestamp(),
    });

    const logRef = doc(collection(firestore, `libraries/${HARDCODED_LIBRARY_ID}/activityLogs`));
    batch.set(logRef, {
      libraryId: HARDCODED_LIBRARY_ID,
      user: actor,
      activityType: 'suggestion_status_updated',
      details: { suggestionId, newStatus: status },
      timestamp: serverTimestamp(),
    });

    batch.commit().catch((serverError) => {
      console.error("UPDATE SUGGESTION STATUS ERROR:", serverError);
      const permissionError = new FirestorePermissionError({
        path: suggestionRef.path,
        operation: 'update',
        requestResourceData: { status },
      });
      errorEmitter.emit('permission-error', permissionError);
    });
  };

  const openDeleteAlert = (suggestionId: string) =>
    setAlertState({ isOpen: true, suggestionId });
  const closeDeleteAlert = () => setAlertState({ isOpen: false, suggestionId: undefined });

  const handleDelete = async () => {
    if (!alertState.suggestionId || !user || !firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'User not authenticated or suggestion not found.'});
      return;
    }

    // Optimistic UI update
    closeDeleteAlert();
    toast({
      title: 'Suggestion Deleted',
      description: 'The suggestion has been removed.',
    });

    const batch = writeBatch(firestore);
    const actor = { id: user.uid, name: user.displayName || 'Admin' };
    const suggestionRef = doc(firestore, `libraries/${HARDCODED_LIBRARY_ID}/suggestions/${alertState.suggestionId}`);
    
    batch.delete(suggestionRef);

    const logRef = doc(collection(firestore, `libraries/${HARDCODED_LIBRARY_ID}/activityLogs`));
    batch.set(logRef, {
      libraryId: HARDCODED_LIBRARY_ID,
      user: actor,
      activityType: 'suggestion_deleted',
      details: { suggestionId: alertState.suggestionId },
      timestamp: serverTimestamp(),
    });

    batch.commit().catch((serverError) => {
      console.error("DELETE SUGGESTION ERROR:", serverError);
      const permissionError = new FirestorePermissionError({
        path: suggestionRef.path,
        operation: 'delete',
      });
      errorEmitter.emit('permission-error', permissionError);
    });
  };

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
          <div className="rounded-md border">
            <DataTable
              table={table}
              columns={memoizedColumns}
              data={suggestionsWithDetails}
              isLoading={isLoadingSuggestions}
              noResultsMessage="No suggestions found."
            />
          </div>
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
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

    
