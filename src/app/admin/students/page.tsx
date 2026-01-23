'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { PlusCircle, Archive } from 'lucide-react';
import {
  collection,
  query,
  runTransaction,
  doc,
  serverTimestamp,
  where,
  getDocs,
  Timestamp,
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
  type VisibilityState,
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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirebase, errorEmitter } from '@/firebase';
import type { Student } from '@/lib/types';
import { columns as studentColumns } from '@/components/admin/students/columns';
import { Spinner } from '@/components/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { FirestorePermissionError } from '@/firebase/errors';

const DataTable = dynamic(() => import('@/components/ui/data-table').then(mod => mod.DataTable), { 
    ssr: false,
    loading: () => <div className="rounded-md border"><Skeleton className="h-96 w-full" /></div>
});

const StudentForm = dynamic(() => import('@/components/admin/students/student-form').then(mod => mod.StudentForm), { 
    ssr: false, 
    loading: () => <div className="h-[380px] flex items-center justify-center"><Spinner /></div> 
});


type StudentWithId = Student & { id: string };

type ModalState = {
  isOpen: boolean;
  student?: StudentWithId;
};

type AlertState = {
  isOpen: boolean;
  studentId?: string;
  studentName?: string;
};

export default function StudentsPage() {
  const { toast } = useToast();
  const { firestore, user, libraryId } = useFirebase();

  const [modalState, setModalState] = React.useState<ModalState>({ isOpen: false });
  const [alertState, setAlertState] = React.useState<AlertState>({ isOpen: false });
  const [showInactive, setShowInactive] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});

  const studentsQuery = React.useMemo(() => {
    if (!firestore || !libraryId) return null;
    const constraints = [];
    if (!showInactive) {
        constraints.push(where('status', 'in', ['active', 'at-risk']));
    }
    return query(
      collection(firestore, `libraries/${libraryId}/students`),
      ...constraints
    );
  }, [firestore, libraryId, showInactive]);

  const { data: students, isLoading, error } = useCollection<Student>(studentsQuery);

  const openModal = React.useCallback((student?: StudentWithId) => setModalState({ isOpen: true, student }), []);

  const openDeleteAlert = React.useCallback((student: StudentWithId) =>
    setAlertState({ isOpen: true, studentId: student.id, studentName: student.name }), []);

  const memoizedColumns = React.useMemo(
    () => studentColumns({ openModal, openDeleteAlert }), 
    [openModal, openDeleteAlert]
  );

  const table = useReactTable({
    data: students,
    columns: memoizedColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
  });

  const closeModal = () => setModalState({ isOpen: false, student: undefined });

  const closeDeleteAlert = () =>
    setAlertState({ isOpen: false, studentId: undefined, studentName: undefined });

  const handleDeleteStudent = async () => {
    if (!alertState.studentId || !user || !firestore || !libraryId) return;
    
    setIsDeleting(true);

    try {
        const bookingsQuery = query(
            collection(firestore, `libraries/${libraryId}/seatBookings`),
            where('studentId', '==', alertState.studentId),
            where('endTime', '>=', Timestamp.now())
        );
        const bookingsSnapshot = await getDocs(bookingsQuery);
        
        await runTransaction(firestore, async (transaction) => {
          const studentRef = doc(firestore, `libraries/${libraryId}/students/${alertState.studentId!}`);
          const studentDoc = await transaction.get(studentRef);

          if (!studentDoc.exists()) {
            throw new Error("Student not found.");
          }
          
          bookingsSnapshot.docs.forEach(bookingDoc => {
              transaction.delete(bookingDoc.ref);
          });

          transaction.update(studentRef, {
            status: 'inactive',
            updatedAt: serverTimestamp(),
            lastInteractionAt: serverTimestamp(),
          });

          const logRef = doc(collection(firestore, `libraries/${libraryId}/activityLogs`));
          transaction.set(logRef, {
            libraryId: libraryId,
            user: { id: user.uid, name: user.displayName || 'Admin' },
            activityType: 'student_archived',
            details: { studentId: alertState.studentId, studentName: studentDoc.data().name },
            timestamp: serverTimestamp(),
          });
        });

        toast({
            title: 'Student Archived',
            description: `${alertState.studentName} has been marked as inactive and their future bookings have been cancelled.`,
        });
        closeDeleteAlert();
    } catch(serverError) {
      const studentRef = doc(firestore, `libraries/${libraryId}/students/${alertState.studentId!}`);
      const permissionError = new FirestorePermissionError({
        path: studentRef.path,
        operation: 'update',
      });
      errorEmitter.emit('permission-error', permissionError);
    } finally {
        setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-headline">
            Student Management
          </h1>
          <p className="text-muted-foreground">
            View, add, edit, and manage all students in your library.
          </p>
        </div>
        <Button type="button" onClick={() => openModal()}>
          <PlusCircle className="mr-2" />
          Add Student
        </Button>
      </div>
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Input
              placeholder="Filter by name or email..."
              value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
              onChange={(event) =>
                table.getColumn('name')?.setFilterValue(event.target.value)
              }
              className="w-full sm:max-w-sm"
            />
            <div className="flex items-center space-x-2">
                <Archive className="h-5 w-5 text-muted-foreground" />
                <Label htmlFor="show-inactive">Show Inactive Students</Label>
                <Switch
                    id="show-inactive"
                    checked={showInactive}
                    onCheckedChange={setShowInactive}
                />
            </div>
          </div>
          
          {error && <p className="text-sm font-medium text-destructive">Error: {error.message}</p>}

          <DataTable
            table={table}
            columns={memoizedColumns}
            isLoading={isLoading}
            noResultsMessage="No students found."
          />

          <DataTablePagination table={table} />
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <Dialog open={modalState.isOpen} onOpenChange={(isOpen) => !isOpen && closeModal()}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {modalState.student ? 'Edit Student' : 'Add New Student'}
            </DialogTitle>
            <DialogDescription>
              {modalState.student
                ? "Update the student's details below."
                : 'Fill in the form to add a new student.'}
            </DialogDescription>
          </DialogHeader>
          <StudentForm
            student={modalState.student}
            libraryId={libraryId}
            onSuccess={() => {
              closeModal();
              toast({
                title: modalState.student ? 'Student Updated' : 'Student Added',
                description: `The student details have been successfully ${modalState.student ? 'updated' : 'saved'}.`
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
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will set the student{' '}
              <span className="font-semibold">{alertState.studentName}</span> to inactive and cancel all their future bookings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteStudent} disabled={isDeleting}>
              {isDeleting && <Spinner className="mr-2" />}
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
