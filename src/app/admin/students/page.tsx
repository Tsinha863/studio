'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { PlusCircle } from 'lucide-react';
import {
  collection,
  query,
  runTransaction,
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
import type { Student } from '@/lib/types';
import { StudentForm } from '@/components/admin/students/student-form';
import { columns as studentColumns } from '@/components/admin/students/columns';

const StudentDataTable = dynamic(
  () => import('@/components/admin/students/data-table').then((mod) => mod.StudentDataTable),
  { ssr: false }
);

type ModalState = {
  isOpen: boolean;
  student?: Student;
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

  const studentsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, `libraries/${HARDCODED_LIBRARY_ID}/students`)
    );
  }, [firestore, user]);

  const { data: students, isLoading } = useCollection<Omit<Student, 'docId'>>(studentsQuery);
  
  const studentsWithDocId = React.useMemo(() => {
    return students?.map(s => ({ ...s, docId: s.id })) ?? [];
  }, [students]);

  const openModal = (student?: Student) => setModalState({ isOpen: true, student });
  const closeModal = () => setModalState({ isOpen: false, student: undefined });

  const openDeleteAlert = (student: Student) =>
    setAlertState({ isOpen: true, studentId: student.docId, studentName: student.name });
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
    
    try {
      await runTransaction(firestore, async (transaction) => {
        const studentRef = doc(firestore, `libraries/${HARDCODED_LIBRARY_ID}/students/${alertState.studentId}`);
        const studentDoc = await transaction.get(studentRef);
  
        if (!studentDoc.exists()) throw new Error("Student not found.");
        
        const studentData = studentDoc.data() as Student;
  
        // 1. Update student to inactive
        transaction.update(studentRef, {
          status: 'inactive',
          assignedSeatId: null,
          assignedRoomId: null,
          assignedSeatLabel: null,
          updatedAt: serverTimestamp(),
          lastInteractionAt: serverTimestamp(),
        });
  
        // 2. If a seat was assigned, unassign it atomically.
        if (studentData.assignedSeatId && studentData.assignedRoomId) {
          const seatRef = doc(firestore, `libraries/${HARDCODED_LIBRARY_ID}/rooms/${studentData.assignedRoomId}/seats/${studentData.assignedSeatId}`);
          transaction.update(seatRef, {
            studentId: null,
            studentName: null,
            updatedAt: serverTimestamp(),
          });
        }
  
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
        description: `${alertState.studentName} has been marked as inactive.`,
      });

    } catch (error) {
      console.error("DELETE STUDENT ERROR:", error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Could not update the student status.',
      });
    } finally {
      closeDeleteAlert();
    }
  };

  const memoizedColumns = React.useMemo(() => studentColumns({ openModal, openDeleteAlert }), []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-headline">
            Student Management
          </h1>
          <p className="text-muted-foreground">
            View, add, edit, and manage all students in your library.
          </p>
        </div>
        <Button onClick={() => openModal()}>
          <PlusCircle className="mr-2" />
          Add Student
        </Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <StudentDataTable
            columns={memoizedColumns}
            data={studentsWithDocId ?? []}
            isLoading={isLoading}
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
            <AlertDialogAction onClick={handleDeleteStudent}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
