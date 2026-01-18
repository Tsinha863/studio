'use client';

import * as React from 'react';
import { Firestore, doc, collection, runTransaction, query, where, getDocs, serverTimestamp, writeBatch, WriteBatch } from 'firebase/firestore';
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
  const [isComboboxOpen, setIsComboboxOpen] = React.useState(false);

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
        const studentDocRef = doc(firestore, `libraries/${libraryId}/students/${selectedStudentId}`);
        const seatDocRef = doc(firestore, `libraries/${libraryId}/rooms/${seat.roomId}/seats/${seat.id}`);
        
        const [studentDoc, seatDoc] = await Promise.all([
          transaction.get(studentDocRef),
          transaction.get(seatDoc),
        ]);

        if (!studentDoc.exists()) throw new Error('Student not found.');
        if (!seatDoc.exists()) throw new Error('Seat not found.');

        const studentData = studentDoc.data() as Student;
        const seatData = seatDoc.data();
        
        if (studentData.assignedSeatId) {
           throw new Error(`Student is already assigned to seat ${studentData.assignedSeatId}.`);
        }
        if (seatData.studentId) throw new Error('Seat is already assigned.');
        
        transaction.update(studentDocRef, {
          assignedSeatId: seatData.seatNumber,
          updatedAt: serverTimestamp(),
        });
        
        transaction.update(seatDocRef, {
          studentId: studentData.id,
          studentName: studentData.name,
          updatedAt: serverTimestamp(),
        });

        const logRef = doc(collection(firestore, `libraries/${libraryId}/activityLogs`));
        transaction.set(logRef, {
          libraryId,
          user: actor,
          activityType: 'seat_assigned',
          details: {
            studentName: studentData.name,
            seatNumber: seatData.seatNumber,
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

        if (!studentCustomId) return; // Seat is already unassigned
        
        const studentQuery = query(collection(firestore, `libraries/${libraryId}/students`), where('id', '==', studentCustomId), where('libraryId', '==', libraryId));
        const studentQuerySnapshot = await getDocs(studentQuery);

        if (!studentQuerySnapshot.empty) {
          const studentDocRef = studentQuerySnapshot.docs[0].ref;
          transaction.update(studentDocRef, {
            assignedSeatId: null,
            updatedAt: serverTimestamp(),
          });
        } else {
          console.warn(`Student with custom ID ${studentCustomId} not found, but unassigning seat.`);
        }

        transaction.update(seatRef, {
          studentId: null,
          studentName: null,
          updatedAt: serverTimestamp(),
        });

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
  const selectedStudentName = students.find(s => s.docId === selectedStudentId)?.name;

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
             <Popover open={isComboboxOpen} onOpenChange={setIsComboboxOpen}>
              <PopoverTrigger asChild>
                <Button
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
                    <CommandEmpty>No student found.</CommandEmpty>
                    <CommandGroup>
                      {availableStudents.map((student) => (
                        <CommandItem
                          key={student.docId}
                          value={student.name}
                          onSelect={() => {
                            setSelectedStudentId(student.docId);
                            setIsComboboxOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedStudentId === student.docId ? "opacity-100" : "opacity-0"
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
