'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { PlusCircle } from 'lucide-react';
import {
  collection,
  query,
  orderBy,
  writeBatch,
  doc,
  serverTimestamp,
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

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Input } from '@/components/ui/input';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirebase, useMemoFirebase, errorEmitter } from '@/firebase';
import type { Expense } from '@/lib/types';
import { columns as expenseColumns } from '@/components/admin/expenses/columns';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/spinner';
import { LIBRARY_ID } from '@/lib/config';
import { FirestorePermissionError } from '@/firebase/errors';

const DataTable = dynamic(() => import('@/components/ui/data-table').then(mod => mod.DataTable), { 
    ssr: false,
    loading: () => <div className="rounded-md border"><Skeleton className="h-96 w-full" /></div>
});

const ExpenseForm = dynamic(() => import('@/components/admin/expenses/expense-form').then(mod => mod.ExpenseForm), { 
    ssr: false,
    loading: () => <div className="h-[450px] flex items-center justify-center"><Spinner /></div>
});


type ExpenseWithId = Expense & { id: string };

type ModalState = {
  isOpen: boolean;
  expense?: ExpenseWithId;
};

type AlertState = {
  isOpen: boolean;
  expenseId?: string;
};

export default function ExpensesPage() {
  const { toast } = useToast();
  const { firestore, user } = useFirebase();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [modalState, setModalState] = React.useState<ModalState>({ isOpen: false });
  const [alertState, setAlertState] = React.useState<AlertState>({ isOpen: false });
  
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);

  const expensesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, `libraries/${LIBRARY_ID}/expenses`),
      orderBy('expenseDate', 'desc')
    );
  }, [firestore, user]);

  const { data: expenses, isLoading, error } = useCollection<Expense>(expensesQuery);
  
  const openModal = React.useCallback((expense?: ExpenseWithId) => setModalState({ isOpen: true, expense }), []);
  
  const openDeleteAlert = React.useCallback((expense: ExpenseWithId) =>
    setAlertState({ isOpen: true, expenseId: expense.id }), []);
  
  const memoizedColumns = React.useMemo(
    () => expenseColumns({ openModal, openDeleteAlert }), 
    [openModal, openDeleteAlert]);
  
  const table = useReactTable({
    data: expenses || [],
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

  const closeModal = () => setModalState({ isOpen: false, expense: undefined });

  const closeDeleteAlert = () =>
    setAlertState({ isOpen: false, expenseId: undefined });

  const handleDeleteExpense = () => {
    if (!alertState.expenseId || !user || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'User not authenticated or expense not found.',
      });
      return;
    }
    
    setIsSubmitting(true);

    const batch = writeBatch(firestore);
    const actor = { id: user.uid, name: user.displayName || 'Admin' };
    const expenseRef = doc(firestore, `libraries/${LIBRARY_ID}/expenses/${alertState.expenseId}`);
    
    batch.delete(expenseRef);

    const logRef = doc(collection(firestore, `libraries/${LIBRARY_ID}/activityLogs`));
    batch.set(logRef, {
      libraryId: LIBRARY_ID,
      user: actor,
      activityType: 'expense_deleted',
      details: { expenseId: alertState.expenseId },
      timestamp: serverTimestamp(),
    });

    batch.commit()
      .then(() => {
        toast({
          title: 'Expense Deleted',
          description: 'The expense has been removed from the system.',
        });
      })
      .catch((serverError) => {
        if (serverError instanceof FirebaseError && serverError.code === 'permission-denied') {
          const permissionError = new FirestorePermissionError({
            path: expenseRef.path,
            operation: 'delete',
          });
          errorEmitter.emit('permission-error', permissionError);
        }
        toast({
          variant: 'destructive',
          title: 'Deletion Failed',
          description: serverError instanceof Error ? serverError.message : 'Could not delete the expense.',
        });
      })
      .finally(() => {
        setIsSubmitting(false);
        closeDeleteAlert();
      });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-headline">
            Expense Management
          </h1>
          <p className="text-muted-foreground">
            Track and manage all library expenses.
          </p>
        </div>
        <Button type="button" onClick={() => openModal()}>
          <PlusCircle className="mr-2" />
          Add Expense
        </Button>
      </div>
      <Card>
        <CardContent className="p-4 space-y-4">
           <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              placeholder="Filter by description..."
              value={(table.getColumn('description')?.getFilterValue() as string) ?? ''}
              onChange={(event) =>
                table.getColumn('description')?.setFilterValue(event.target.value)
              }
              className="w-full sm:max-w-sm"
            />
          </div>
           {error && <p className="text-sm font-medium text-destructive">Error loading expenses: {error.message}</p>}
          <DataTable
            table={table}
            columns={memoizedColumns}
            isLoading={isLoading}
            noResultsMessage="No expenses found."
          />
          <DataTablePagination table={table} />
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <Dialog open={modalState.isOpen} onOpenChange={(isOpen) => !isOpen && closeModal()}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {modalState.expense ? 'Edit Expense' : 'Add New Expense'}
            </DialogTitle>
            <DialogDescription>
              {modalState.expense
                ? "Update the expense details below."
                : 'Fill in the form to add a new expense.'}
            </DialogDescription>
          </DialogHeader>
          <ExpenseForm
            expense={modalState.expense}
            libraryId={LIBRARY_ID}
            onSuccess={() => {
              closeModal();
              toast({
                title: modalState.expense ? 'Expense Updated' : 'Expense Added',
                description: `The expense has been successfully ${modalState.expense ? 'updated' : 'saved'}.`
              });
            }}
            onCancel={closeModal}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={alertState.isOpen} onOpenChange={(isOpen) => !isOpen && closeDeleteAlert()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the expense record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteExpense} disabled={isSubmitting}>
              {isSubmitting && <Spinner className="mr-2" />}
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
