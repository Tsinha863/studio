'use client';

import * as React from 'react';
import { Firestore, doc, collection, runTransaction, query, where, getDocs, serverTimestamp, writeBatch, WriteBatch } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Seat, Student } from '@/lib/types';
import { Spinner } from '@/components/spinner';

interface AssignSeatDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  seat: Seat;
  students: Student[];
  libraryId: string;
  onSuccess: () => void;
}

export function AssignSeatDialog({
  isOpen,
  onOpenChange,
  seat,
  students,
  libraryId,
  onSuccess,
}: AssignSeatDialogProps) {
  const { firestore, user, isUserLoading } = useFirebase();
  const { toast } = useToast();
  const [selectedStudentId, setSelectedStudentId] = React.useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const availableStudents = React.useMemo(() => {
    // Show students who are not assigned a seat
    return students.filter(s => !s.assignedSeatId);
  }, [students]);

  const handleAssign = async () => {
    console.log("ASSIGN SEAT CLICKED");
    console.log("USER:", user);
    console.log("LIBRARY ID:", libraryId);
    console.log("SELECTED STUDENT ID:", selectedStudentId);

    if (!firestore || !user || !selectedStudentId) {
      toast({
        variant: 'destructive',
        title: 'Action Failed',
        description: 'User not authenticated or no student selected.',
      });
      return;
    }
    setIsSubmitting(true);

    try {
      const actor = { id: user.uid, name: user.displayName || 'Admin' };

      await runTransaction(firestore, async (transaction) => {
        const seatRef = doc(firestore, `libraries/${libraryId}/rooms/${seat.roomId}/seats/${seat.id}`);
        const studentRef = doc(firestore, `libraries/${libraryId}/students/${selectedStudentId}`);

        const seatDoc = await transaction.get(seatRef);
        const studentDoc = await transaction.get(studentRef);

        if (!seatDoc.exists()) throw new Error('Seat not found.');
        if (!studentDoc.exists()) throw new Error('Student not found.');

        if (seatDoc.data().studentId) throw new Error('Seat is already assigned.');

        const studentData = studentDoc.data() as Student;
        if (studentData.assignedSeatId) {
           throw new Error(`Student is already assigned to seat ${studentData.assignedSeatId}.`);
        }
        
        transaction.update(seatRef, {
          studentId: studentData.id, // Custom student ID
          studentName: studentData.name,
          updatedAt: serverTimestamp(),
        });

        transaction.update(studentRef, {
          assignedSeatId: seatDoc.data().seatNumber,
          updatedAt: serverTimestamp(),
        });

        const logRef = doc(collection(firestore, `libraries/${libraryId}/activityLogs`));
        transaction.set(logRef, {
          libraryId,
          user: actor,
          activityType: 'seat_assigned',
          details: {
            studentName: studentData.name,
            seatNumber: seatDoc.data().seatNumber,
            roomId: seat.roomId,
          },
          timestamp: serverTimestamp(),
        });
      });

      toast({ title: 'Seat Assigned', description: `Seat ${seat.seatNumber} has been assigned.` });
      onSuccess();

    } catch (error) {
      console.error("ASSIGN SEAT ERROR:", error);
      toast({
        variant: 'destructive',
        title: 'Error Assigning Seat',
        description: error instanceof Error ? error.message : 'An unknown error occurred.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnassign = async () => {
    console.log("UNASSIGN SEAT CLICKED");
    console.log("USER:", user);
    console.log("LIBRARY ID:", libraryId);

    if (!firestore || !user) {
        toast({
            variant: 'destructive',
            title: 'Authentication Error',
            description: 'User is not authenticated. Please log in and try again.',
        });
        return;
    }
    setIsSubmitting(true);
    
    try {
      const actor = { id: user.uid, name: user.displayName || 'Admin' };
      
      await runTransaction(firestore, async (transaction) => {
        const seatRef = doc(firestore, `libraries/${libraryId}/rooms/${seat.roomId}/seats/${seat.id}`);
        const seatDoc = await transaction.get(seatRef);

        if (!seatDoc.exists()) throw new Error('Seat not found.');
        
        const seatData = seatDoc.data();
        const studentCustomId = seatData.studentId;

        if (!studentCustomId) {
          // Seat is already unassigned, no-op.
          return;
        }
        
        // Find student document by its custom ID field
        const studentQuery = query(collection(firestore, `libraries/${libraryId}/students`), where('id', '==', studentCustomId));
        const studentQuerySnapshot = await getDocs(studentQuery);

        if (studentQuerySnapshot.empty) {
          // Student might have been deleted, proceed with unassigning seat anyway
          console.warn(`Student with custom ID ${studentCustomId} not found, but unassigning seat.`);
        } else {
          const studentDocRef = studentQuerySnapshot.docs[0].ref;
          // Unassign seat from student
          transaction.update(studentDocRef, {
            assignedSeatId: null,
            updatedAt: serverTimestamp(),
          });
        }

        // Unassign student from seat
        transaction.update(seatRef, {
          studentId: null,
          studentName: null,
          updatedAt: serverTimestamp(),
        });

        // 4. Log activity
        const logRef = doc(collection(firestore, `libraries/${libraryId}/activityLogs`));
        transaction.set(logRef, {
          libraryId,
          user: actor,
          activityType: 'seat_unassigned',
          details: {
            studentName: seatData.studentName,
            seatNumber: seatData.seatNumber,
            roomId: seat.roomId,
          },
          timestamp: serverTimestamp(),
        });
      });
      
      toast({ title: 'Seat Unassigned', description: `Seat ${seat.seatNumber} is now available.` });
      onSuccess();
    } catch (error) {
      console.error("UNASSIGN SEAT ERROR:", error);
      toast({
        variant: 'destructive',
        title: 'Error Unassigning Seat',
        description: error instanceof Error ? error.message : 'An unknown error occurred.',
      });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  React.useEffect(() => {
    if (!isOpen) {
        setSelectedStudentId(undefined);
        setIsSubmitting(false);
    }
  }, [isOpen]);

  const isActionDisabled = isSubmitting || isUserLoading || !user;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Seat {seat.seatNumber}</DialogTitle>
          <DialogDescription>
            {seat.studentId
              ? `This seat is currently assigned to ${seat.studentName}.`
              : 'Assign this seat to a student.'}
          </DialogDescription>
        </DialogHeader>
        
        {seat.studentId ? (
          <div className='py-4'>
            <p>Would you like to make this seat available?</p>
          </div>
        ) : (
          <div className="py-4">
            <Select onValueChange={setSelectedStudentId} value={selectedStudentId} disabled={isActionDisabled}>
              <SelectTrigger>
                <SelectValue placeholder="Select a student to assign" />
              </SelectTrigger>
              <SelectContent>
                {availableStudents.length > 0 ? (
                  availableStudents.map(student => (
                    <SelectItem key={student.docId} value={student.docId!}>
                      {student.name} ({student.id})
                    </SelectItem>
                  ))
                ) : (
                  <div className="p-4 text-sm text-muted-foreground">No available students.</div>
                )}
              </SelectContent>
            </Select>
          </div>
        )}

        <DialogFooter>
          {seat.studentId ? (
            <Button variant="destructive" onClick={handleUnassign} disabled={isActionDisabled}>
              {isSubmitting && <Spinner className="mr-2" />}
              {isSubmitting ? 'Unassigning...' : 'Unassign Seat'}
            </Button>
          ) : (
            <Button onClick={handleAssign} disabled={isActionDisabled || !selectedStudentId}>
              {isSubmitting && <Spinner className="mr-2" />}
              {isSubmitting ? 'Assigning...' : 'Assign Seat'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
