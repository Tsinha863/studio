'use client';

import * as React from 'react';
import { Firestore, doc, collection, runTransaction, serverTimestamp } from 'firebase/firestore';
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
import type { Seat, Student } from '@/lib/types';
import { Spinner } from '@/components/spinner';

interface AssignSeatDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  seat: Seat;
  students: (Student & { id: string })[];
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
  const [isComboboxOpen, setIsComboboxOpen] = React.useState(false);

  const availableStudents = React.useMemo(() => {
    return students.filter(s => !s.assignedSeatId && s.status !== 'inactive');
  }, [students]);

  const handleAssign = async () => {
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
      await runTransaction(firestore, async (transaction) => {
        const studentDocRef = doc(firestore, `libraries/${libraryId}/students/${selectedStudentId}`);
        const seatDocRef = doc(firestore, `libraries/${libraryId}/rooms/${seat.roomId}/seats/${seat.id}`);
        
        const [studentDoc, seatDoc] = await Promise.all([
          transaction.get(studentDocRef),
          transaction.get(seatDoc),
        ]);

        if (!studentDoc.exists()) throw new Error('Student not found.');
        if (!seatDoc.exists()) throw new Error('Seat not found.');

        const studentData = studentDoc.data() as Student;
        const seatData = seatDoc.data() as Seat;
        
        if (studentData.assignedSeatId) {
           throw new Error(`Student is already assigned to seat ${studentData.assignedSeatLabel}.`);
        }
        if (seatData.studentId) throw new Error('Seat is already assigned.');
        
        // Update student with seat info
        transaction.update(studentDocRef, {
          assignedSeatId: seat.id,
          assignedRoomId: seat.roomId,
          assignedSeatLabel: seat.id, // The seat ID is the label
          updatedAt: serverTimestamp(),
          lastInteractionAt: serverTimestamp(),
        });
        
        // Update seat with student info
        transaction.update(seatDocRef, {
          studentId: studentDoc.id,
          studentName: studentData.name,
          updatedAt: serverTimestamp(),
        });

        // Create activity log
        const logRef = doc(collection(firestore, `libraries/${libraryId}/activityLogs`));
        transaction.set(logRef, {
          libraryId,
          user: { id: user.uid, name: user.displayName || 'Admin' },
          activityType: 'seat_assigned',
          details: {
            studentName: studentData.name,
            seatNumber: seat.id,
            roomId: seat.roomId,
          },
          timestamp: serverTimestamp(),
        });
      });

      toast({ title: 'Seat Assigned', description: `Seat ${seat.id} has been assigned.` });
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
    if (!firestore || !user) {
      toast({ variant: 'destructive', title: 'Authentication Error' });
      return;
    }
    setIsSubmitting(true);
    
    try {
      await runTransaction(firestore, async (transaction) => {
        const seatRef = doc(firestore, `libraries/${libraryId}/rooms/${seat.roomId}/seats/${seat.id}`);
        const seatDoc = await transaction.get(seatRef);

        if (!seatDoc.exists()) throw new Error('Seat not found.');
        
        const seatData = seatDoc.data() as Seat;
        const studentIdToUnassign = seatData.studentId;

        if (!studentIdToUnassign) return; // Seat is already unassigned
        
        const studentRef = doc(firestore, `libraries/${libraryId}/students`, studentIdToUnassign);
        const studentDoc = await transaction.get(studentRef);

        // Update student record only if they exist
        if (studentDoc.exists()) {
          transaction.update(studentRef, {
            assignedSeatId: null,
            assignedRoomId: null,
            assignedSeatLabel: null,
            updatedAt: serverTimestamp(),
            lastInteractionAt: serverTimestamp(),
          });
        }

        // Always unassign the seat
        transaction.update(seatRef, {
          studentId: null,
          studentName: null,
          updatedAt: serverTimestamp(),
        });

        // Create activity log
        const logRef = doc(collection(firestore, `libraries/${libraryId}/activityLogs`));
        transaction.set(logRef, {
          libraryId,
          user: { id: user.uid, name: user.displayName || 'Admin' },
          activityType: 'seat_unassigned',
          details: {
            studentName: seatData.studentName,
            seatNumber: seat.id,
            roomId: seat.roomId,
          },
          timestamp: serverTimestamp(),
        });
      });
      
      toast({ title: 'Seat Unassigned', description: `Seat ${seat.id} is now available.` });
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
          <DialogTitle>Manage Seat {seat.id}</DialogTitle>
          <DialogDescription>
            {seat.studentId
              ? `This seat is currently assigned to ${seat.studentName}.`
              : 'Assign this seat to an active student.'}
          </DialogDescription>
        </DialogHeader>
        
        {seat.studentId ? (
          <div className='py-4'>
            <p>Would you like to make this seat available?</p>
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
                    <CommandEmpty>No available students found.</CommandEmpty>
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
          {seat.studentId ? (
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

    