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
  deleteField,
  where,
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
import type { Student } from '@/lib/types';
import { StudentForm } from '@/components/admin/students/student-form';
import { columns as studentColumns } from '@/components/admin/students/columns';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/spinner';

const StudentDataTable = dynamic(
  () => import('@/components/admin/students/data-table').then((mod) => mod.StudentDataTable),
  { ssr: false }
);

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

// TODO: Replace with actual logged-in user's library
const HARDCODED_LIBRARY_ID = 'library1';

export default function StudentsPage() {
  const { toast } = useToast();
  const { firestore, user } = useFirebase();

  const [modalState, setModalState] = React.useState<ModalState>({ isOpen: false });
  const [alertState, setAlertState] = React.useState<AlertState>({ isOpen: false });
  const [showInactive, setShowInactive] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const studentsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    const constraints = [];
    if (!showInactive) {
        constraints.push(where('status', 'in', ['active', 'at-risk']));
    }
    return query(
      collection(firestore, `libraries/${HARDCODED_LIBRARY_ID}/students`),
      ...constraints
    );
  }, [firestore, user, showInactive]);

  const { data: students, isLoading } = useCollection<Student>(studentsQuery);

  const openModal = (student?: StudentWithId) => setModalState({ isOpen: true, student });
  const closeModal = () => setModalState({ isOpen: false, student: undefined });

  const openDeleteAlert = (student: StudentWithId) =>
    setAlertState({ isOpen: true, studentId: student.id, studentName: student.name });
  const closeDeleteAlert = () =>
    setAlertState({ isOpen: false, studentId: undefined, studentName: undefined });

  const handleDeleteStudent = async () => {
    if (!alertState.studentId || !user || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'User not authenticated or student not found.',
      });
      return;
    }
    
    setIsDeleting(true);
    try {
      await runTransaction(firestore, async (transaction) => {
        const studentRef = doc(firestore, `libraries/${HARDCODED_LIBRARY_ID}/students/${alertState.studentId}`);
        const studentDoc = await transaction.get(studentRef);
  
        if (!studentDoc.exists()) throw new Error("Student not found.");
        
        const studentData = studentDoc.data() as Student;
  
        // 1. Unassign student from any seats
        if (studentData.assignments && studentData.assignments.length > 0) {
            for (const assignment of studentData.assignments) {
                const seatRef = doc(firestore, `libraries/${HARDCODED_LIBRARY_ID}/rooms/${assignment.roomId}/seats/${assignment.seatId}`);
                transaction.update(seatRef, {
                    [`assignments.${assignment.timeSlot}`]: deleteField()
                });
            }
        }
  
        // 2. Update student to inactive and clear assignments
        transaction.update(studentRef, {
          status: 'inactive',
          assignments: [],
          updatedAt: serverTimestamp(),
          lastInteractionAt: serverTimestamp(),
        });
  
        // 3. Create activity log for the soft delete.
        const logRef = doc(collection(firestore, `libraries/${HARDCODED_LIBRARY_ID}/activityLogs`));
        transaction.set(logRef, {
          libraryId: HARDCODED_LIBRARY_ID,
          user: { id: user.uid, name: user.displayName || 'Admin' },
          activityType: 'student_deleted',
          details: { studentId: alertState.studentId, studentName: studentData.name },
          timestamp: serverTimestamp(),
        });
      });

      toast({
        title: 'Student Set to Inactive',
        description: `${alertState.studentName} has been marked as inactive and unassigned from all seats.`,
      });

    } catch (error) {
      console.error("DELETE STUDENT ERROR:", error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Could not update the student status.',
      });
    } finally {
      setIsDeleting(false);
      closeDeleteAlert();
    }
  };

  const memoizedColumns = React.useMemo(() => studentColumns({ openModal, openDeleteAlert }), []);

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
        <CardContent className="p-0">
          <StudentDataTable
            columns={memoizedColumns}
            data={students || []}
            isLoading={isLoading}
            toolbarContent={
                <div className="flex items-center space-x-2">
                    <Archive className="h-5 w-5 text-muted-foreground" />
                    <Label htmlFor="show-inactive">Show Inactive Students</Label>
                    <Switch
                        id="show-inactive"
                        checked={showInactive}
                        onCheckedChange={setShowInactive}
                    />
                </div>
            }
          />
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
            libraryId={HARDCODED_LIBRARY_ID}
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
              <span className="font-semibold">{alertState.studentName}</span> to inactive and unassign them from any seats.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeDeleteAlert}>Cancel</AlertDialogCancel>
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
