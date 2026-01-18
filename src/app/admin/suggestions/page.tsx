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
} from 'firebase/firestore';

import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import type { Suggestion, Student } from '@/lib/types';
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

const SuggestionsDataTable = dynamic(
  () => import('@/components/admin/suggestions/data-table').then(mod => mod.SuggestionsDataTable),
  { ssr: false }
);

// TODO: Replace with actual logged-in user's library
const HARDCODED_LIBRARY_ID = 'library1';

type AlertState = {
  isOpen: boolean;
  suggestionId?: string;
};

type SuggestionWithId = Suggestion & { id: string };

export default function SuggestionsPage() {
  const { toast } = useToast();
  const { firestore, user } = useFirebase();
  const [alertState, setAlertState] = React.useState<AlertState>({ isOpen: false });

  // --- Data Fetching ---
  const suggestionsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, `libraries/${HARDCODED_LIBRARY_ID}/suggestions`),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, user]);

  const studentsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, `libraries/${HARDCODED_LIBRARY_ID}/students`);
  }, [firestore, user]);

  const { data: suggestions, isLoading: isLoadingSuggestions } = useCollection<Suggestion>(suggestionsQuery);
  const { data: students, isLoading: isLoadingStudents } = useCollection<Student>(studentsQuery);

  // --- Data Processing ---
  const suggestionsWithDetails = React.useMemo(() => {
    if (!suggestions || !students) return [];
    const studentMap = new Map(students.map((s) => [s.id, s.name]));
    return suggestions.map((s) => ({
      ...s,
      studentName: studentMap.get(s.studentId) || 'Unknown Student',
    }));
  }, [suggestions, students]);

  // --- Handlers ---
  const handleStatusChange = async (suggestionId: string, status: Suggestion['status']) => {
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to perform this action.'});
      return;
    }

    try {
      const batch = writeBatch(firestore);
      const actor = { id: user.uid, name: user.displayName || 'Admin' };

      const suggestionRef = doc(firestore, `libraries/${HARDCODED_LIBRARY_ID}/suggestions/${suggestionId}`);
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
  
      await batch.commit();
      toast({
        title: 'Status Updated',
        description: "The suggestion's status has been changed.",
      });
    } catch (error) {
      console.error("UPDATE SUGGESTION STATUS ERROR:", error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Could not update the status.',
      });
    }
  };

  const openDeleteAlert = (suggestionId: string) =>
    setAlertState({ isOpen: true, suggestionId });
  const closeDeleteAlert = () => setAlertState({ isOpen: false, suggestionId: undefined });

  const handleDelete = async () => {
    if (!alertState.suggestionId || !user || !firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'User not authenticated or suggestion not found.'});
      return;
    }

    try {
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
  
      await batch.commit();

      toast({
        title: 'Suggestion Deleted',
        description: 'The suggestion has been removed.',
      });
    } catch (error) {
      console.error("DELETE SUGGESTION ERROR:", error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Could not delete the suggestion.',
      });
    } finally {
      closeDeleteAlert();
    }
  };

  const memoizedColumns = React.useMemo(
    () => suggestionColumns({ onStatusChange: handleStatusChange, onDelete: openDeleteAlert }),
    []
  );

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
        <CardContent className="p-0">
          <SuggestionsDataTable
            columns={memoizedColumns}
            data={suggestionsWithDetails}
            isLoading={isLoadingSuggestions || isLoadingStudents}
          />
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
            <AlertDialogCancel onClick={closeDeleteAlert}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
