'use client';

import * as React from 'react';
import { doc, collection, runTransaction, serverTimestamp, deleteField } from 'firebase/firestore';
import { Check, ChevronsUpDown } from 'lucide-react';

import { useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import type { Seat, Student, TimeSlot } from '@/lib/types';
import { Spinner } from '@/components/spinner';

interface AssignSeatDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  seat: Seat;
  students: (Student & { id: string })[];
  libraryId: string;
  timeSlot: TimeSlot;
  onSuccess: () => void;
}

export function AssignSeatDialog({
  isOpen,
  onOpenChange,
  seat,
  students,
  libraryId,
  timeSlot,
  onSuccess,
}: AssignSeatDialogProps) {
  const { firestore, user, isUserLoading } = useFirebase();
  const { toast } = useToast();
  const [selectedStudentId, setSelectedStudentId] = React.useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isComboboxOpen, setIsComboboxOpen] = React.useState(false);
  
  const currentAssignment = seat.assignments?.[timeSlot];

  const availableStudents = React.useMemo(() => {
    const studentsWithAssignmentInSlot = new Set(
        students
            .filter(s => s.assignments?.some(a => a.timeSlot === timeSlot))
            .map(s => s.id)
    );
    return students.filter(s => !studentsWithAssignmentInSlot.has(s.id) && s.status !== 'inactive');
  }, [students, timeSlot]);

  const handleAssign = async () => {
    if (!firestore || !user || !selectedStudentId) {
      toast({
        variant: 'destructive',
        title: 'Action Failed',
        description: 'User not authenticated or no student selected.',
      });
      return;
    }
    const studentToAssign = students.find(s => s.id === selectedStudentId);
    if (!studentToAssign) {
        toast({ variant: 'destructive', title: 'Student not found' });
        return;
    }

    setIsSubmitting(true);

    try {
      await runTransaction(firestore, async (transaction) => {
        const studentDocRef = doc(firestore, `libraries/${libraryId}/students/${selectedStudentId}`);
        const seatDocRef = doc(firestore, `libraries/${libraryId}/rooms/${seat.roomId}/seats/${seat.id}`);
        
        const [studentDoc, seatDoc] = await Promise.all([
          transaction.get(studentDocRef),
          transaction.get(seatDocRef),
        ]);

        if (!studentDoc.exists()) throw new Error('Student not found.');
        if (!seatDoc.exists()) throw new Error('Seat not found.');

        const studentData = studentDoc.data() as Student;
        const seatData = seatDoc.data() as Seat;
        
        if (seatData.assignments?.[timeSlot]) {
           throw new Error(`Seat ${seat.id} is already assigned for ${timeSlot}.`);
        }
        if (studentData.assignments?.some(a => a.timeSlot === timeSlot)) {
            throw new Error(`${studentToAssign.name} already has an assignment for ${timeSlot}.`);
        }
        
        const newStudentAssignments = [...(studentData.assignments || []), { seatId: seat.id, roomId: seat.roomId, timeSlot }];
        
        transaction.update(studentDocRef, { assignments: newStudentAssignments, lastInteractionAt: serverTimestamp() });
        transaction.update(seatDocRef, { 
            [`assignments.${timeSlot}`]: { studentId: studentToAssign.id, studentName: studentToAssign.name },
            updatedAt: serverTimestamp(),
        });

        const logRef = doc(collection(firestore, `libraries/${libraryId}/activityLogs`));
        transaction.set(logRef, {
          libraryId,
          user: { id: user.uid, name: user.displayName || 'Admin' },
          activityType: 'seat_assigned',
          details: {
            studentName: studentToAssign.name,
            seatNumber: seat.id,
            roomId: seat.roomId,
            timeSlot,
          },
          timestamp: serverTimestamp(),
        });
      });

      toast({ title: 'Seat Assigned', description: `Seat ${seat.id} (${timeSlot}) has been assigned.` });
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
    if (!firestore || !user || !currentAssignment) {
      toast({ variant: 'destructive', title: 'Error', description: 'No assignment to remove.' });
      return;
    }
    const studentIdToUnassign = currentAssignment.studentId;
    setIsSubmitting(true);
    
    try {
      await runTransaction(firestore, async (transaction) => {
        const seatRef = doc(firestore, `libraries/${libraryId}/rooms/${seat.roomId}/seats/${seat.id}`);
        const studentRef = doc(firestore, `libraries/${libraryId}/students`, studentIdToUnassign);
        
        const [seatDoc, studentDoc] = await Promise.all([
            transaction.get(seatRef),
            transaction.get(studentRef)
        ]);

        if (!seatDoc.exists()) throw new Error('Seat not found.');
        
        // Update student record
        if (studentDoc.exists()) {
          const studentData = studentDoc.data() as Student;
          const newStudentAssignments = studentData.assignments?.filter(a => 
            !(a.seatId === seat.id && a.roomId === seat.roomId && a.timeSlot === timeSlot)
          ) || [];
          transaction.update(studentRef, { assignments: newStudentAssignments, lastInteractionAt: serverTimestamp() });
        }

        // Update seat record
        transaction.update(seatRef, {
          [`assignments.${timeSlot}`]: deleteField(),
          updatedAt: serverTimestamp(),
        });

        // Create activity log
        const logRef = doc(collection(firestore, `libraries/${libraryId}/activityLogs`));
        transaction.set(logRef, {
          libraryId,
          user: { id: user.uid, name: user.displayName || 'Admin' },
          activityType: 'seat_unassigned',
          details: {
            studentName: currentAssignment.studentName,
            seatNumber: seat.id,
            roomId: seat.roomId,
            timeSlot,
          },
          timestamp: serverTimestamp(),
        });
      });
      
      toast({ title: 'Seat Unassigned', description: `Seat ${seat.id} (${timeSlot}) is now available.` });
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
  const selectedStudentName = students.find(s => s.id === selectedStudentId)?.name;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Seat {seat.id} - <span className="capitalize">{timeSlot}</span></DialogTitle>
          <DialogDescription>
            {currentAssignment
              ? `This seat is assigned to ${currentAssignment.studentName} for the ${timeSlot}.`
              : `Assign this seat for the ${timeSlot}.`}
          </DialogDescription>
        </DialogHeader>
        
        {currentAssignment ? (
          <div className='py-4'>
            <p>Would you like to make this seat available for the {timeSlot} slot?</p>
          </div>
        ) : (
          <div className="py-4">
             <Popover open={isComboboxOpen} onOpenChange={setIsComboboxOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={isComboboxOpen}
                  className="w-full justify-between"
                  disabled={isActionDisabled}
                >
                  {selectedStudentId ? selectedStudentName : "Select a student..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput placeholder="Search student..." />
                  <CommandList>
                    <CommandEmpty>No available students found for this slot.</CommandEmpty>
                    <CommandGroup>
                      {availableStudents.map((student) => (
                        <CommandItem
                          key={student.id}
                          value={student.name}
                          onSelect={() => {
                            setSelectedStudentId(student.id);
                            setIsComboboxOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedStudentId === student.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {student.name} ({student.id})
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        )}

        <DialogFooter>
          {currentAssignment ? (
            <Button type="button" variant="destructive" onClick={handleUnassign} disabled={isActionDisabled}>
              {isSubmitting && <Spinner className="mr-2" />}
              {isSubmitting ? 'Unassigning...' : 'Unassign Seat'}
            </Button>
          ) : (
            <Button type="button" onClick={handleAssign} disabled={isActionDisabled || !selectedStudentId}>
              {isSubmitting && <Spinner className="mr-2" />}
              {isSubmitting ? 'Assigning...' : 'Assign Seat'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
