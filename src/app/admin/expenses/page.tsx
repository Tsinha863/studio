'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { PlusCircle } from 'lucide-react';
import {
  collection,
  query,
  orderBy,
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
import { deleteExpense } from '@/lib/actions/expenses';

const ExpensesDataTable = dynamic(
  () => import('@/components/admin/expenses/data-table').then(mod => mod.ExpensesDataTable),
  { ssr: false }
);

type ModalState = {
  isOpen: boolean;
  expense?: Expense;
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

  const expensesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, `libraries/${HARDCODED_LIBRARY_ID}/expenses`),
      orderBy('expenseDate', 'desc')
    );
  }, [firestore, user]);

  const { data: expenses, isLoading } = useCollection<Omit<Expense, 'id'>>(expensesQuery);
  
  const expensesWithDocId = React.useMemo(() => {
    return expenses?.map(e => ({ ...e, docId: e.id })) ?? [];
  }, [expenses]);

  const openModal = (expense?: Expense) => setModalState({ isOpen: true, expense });
  const closeModal = () => setModalState({ isOpen: false, expense: undefined });

  const openDeleteAlert = (expense: Expense) =>
    setAlertState({ isOpen: true, expenseId: expense.docId });
  const closeDeleteAlert = () =>
    setAlertState({ isOpen: false, expenseId: undefined });

  const handleDeleteExpense = async () => {
    if (!alertState.expenseId || !user || !firestore) return;

    const result = await deleteExpense(
      firestore,
      HARDCODED_LIBRARY_ID,
      alertState.expenseId,
      { id: user.uid, name: user.displayName || 'Admin' }
    );

    if (result.success) {
      toast({
        title: 'Expense Deleted',
        description: 'The expense has been removed from the system.',
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: result.error || 'Could not delete the expense.',
      });
    }
    closeDeleteAlert();
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
        <Button onClick={() => openModal()}>
          <PlusCircle className="mr-2" />
          Add Expense
        </Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <ExpensesDataTable
            columns={memoizedColumns}
            data={expensesWithDocId}
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
            <AlertDialogAction onClick={handleDeleteExpense}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
