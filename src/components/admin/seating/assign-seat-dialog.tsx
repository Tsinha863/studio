'use client';

import * as React from 'react';
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
import { assignSeat, unassignSeat } from '@/lib/actions/seating';
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
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const [selectedStudentId, setSelectedStudentId] = React.useState<string | undefined>();
  const [isLoading, setIsLoading] = React.useState(false);

  const availableStudents = React.useMemo(() => {
    // Show students who are not assigned a seat
    return students.filter(s => !s.assignedSeatId);
  }, [students]);

  const handleAssign = async () => {
    if (!firestore || !user || !selectedStudentId) return;
    setIsLoading(true);

    const actor = { id: user.uid, name: user.displayName || 'Admin' };
    const result = await assignSeat(firestore, libraryId, seat.roomId, seat.id, selectedStudentId, actor);
    
    setIsLoading(false);
    if (result.success) {
      toast({ title: 'Seat Assigned', description: `Seat ${seat.seatNumber} has been assigned.` });
      onSuccess();
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.error });
    }
  };

  const handleUnassign = async () => {
    if (!firestore || !user) return;
    setIsLoading(true);
    
    const actor = { id: user.uid, name: user.displayName || 'Admin' };
    const result = await unassignSeat(firestore, libraryId, seat.roomId, seat.id, actor);

    setIsLoading(false);
    if (result.success) {
      toast({ title: 'Seat Unassigned', description: `Seat ${seat.seatNumber} is now available.` });
      onSuccess();
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.error });
    }
  };
  
  React.useEffect(() => {
    if (!isOpen) {
        setSelectedStudentId(undefined);
    }
  }, [isOpen]);

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
            <Select onValueChange={setSelectedStudentId} value={selectedStudentId}>
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
            <Button variant="destructive" onClick={handleUnassign} disabled={isLoading}>
              {isLoading && <Spinner className="mr-2" />}
              Unassign Seat
            </Button>
          ) : (
            <Button onClick={handleAssign} disabled={isLoading || !selectedStudentId}>
              {isLoading && <Spinner className="mr-2" />}
              Assign Seat
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
