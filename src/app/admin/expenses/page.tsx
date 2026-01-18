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

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
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
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import type { Expense } from '@/lib/types';
import { ExpenseForm } from '@/components/admin/expenses/expense-form';
import { columns as expenseColumns } from '@/components/admin/expenses/columns';
import { Spinner } from '@/components/spinner';

const ExpensesDataTable = dynamic(
  () => import('@/components/admin/expenses/data-table').then(mod => mod.ExpensesDataTable),
  { ssr: false }
);

type ExpenseWithId = Expense & { id: string };

type ModalState = {
  isOpen: boolean;
  expense?: ExpenseWithId;
};

type AlertState = {
  isOpen: boolean;
  expenseId?: string;
};

// TODO: Replace with actual logged-in user's library
const HARDCODED_LIBRARY_ID = 'library1';

export default function ExpensesPage() {
  const { toast } = useToast();
  const { firestore, user } = useFirebase();

  const [modalState, setModalState] = React.useState<ModalState>({ isOpen: false });
  const [alertState, setAlertState] = React.useState<AlertState>({ isOpen: false });
  const [isDeleting, setIsDeleting] = React.useState(false);

  const expensesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, `libraries/${HARDCODED_LIBRARY_ID}/expenses`),
      orderBy('expenseDate', 'desc')
    );
  }, [firestore, user]);

  const { data: expenses, isLoading } = useCollection<Expense>(expensesQuery);
  
  const openModal = (expense?: ExpenseWithId) => setModalState({ isOpen: true, expense });
  const closeModal = () => setModalState({ isOpen: false, expense: undefined });

  const openDeleteAlert = (expense: ExpenseWithId) =>
    setAlertState({ isOpen: true, expenseId: expense.id });
  const closeDeleteAlert = () =>
    setAlertState({ isOpen: false, expenseId: undefined });

  const handleDeleteExpense = async () => {
    if (!alertState.expenseId || !user || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'User not authenticated or expense not found.',
      });
      return;
    }

    setIsDeleting(true);
    try {
      const batch = writeBatch(firestore);
      const actor = { id: user.uid, name: user.displayName || 'Admin' };

      const expenseRef = doc(firestore, `libraries/${HARDCODED_LIBRARY_ID}/expenses/${alertState.expenseId}`);
      batch.delete(expenseRef);
  
      const logRef = doc(collection(firestore, `libraries/${HARDCODED_LIBRARY_ID}/activityLogs`));
      batch.set(logRef, {
        libraryId: HARDCODED_LIBRARY_ID,
        user: actor,
        activityType: 'expense_deleted',
        details: { expenseId: alertState.expenseId },
        timestamp: serverTimestamp(),
      });
  
      await batch.commit();

      toast({
        title: 'Expense Deleted',
        description: 'The expense has been removed from the system.',
      });
    } catch (error) {
      console.error("DELETE EXPENSE ERROR:", error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Could not delete the expense.',
      });
    } finally {
      setIsDeleting(false);
      closeDeleteAlert();
    }
  };

  const memoizedColumns = React.useMemo(() => expenseColumns({ openModal, openDeleteAlert }), []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
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
        <CardContent className="p-0">
          <ExpensesDataTable
            columns={memoizedColumns}
            data={expenses || []}
            isLoading={isLoading}
          />
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
            libraryId={HARDCODED_LIBRARY_ID}
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
            <AlertDialogCancel onClick={closeDeleteAlert}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteExpense} disabled={isDeleting}>
              {isDeleting && <Spinner className="mr-2" />}
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
