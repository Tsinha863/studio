'use client';

import * as React from 'react';
import {
  collection,
  query,
  orderBy
} from 'firebase/firestore';

import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import type { Seat, Student } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AssignSeatDialog } from './assign-seat-dialog';

interface SeatingPlanProps {
  libraryId: string;
  roomId: string;
}

type SeatWithStudent = Seat & { student?: Student };

export function SeatingPlan({ libraryId, roomId }: SeatingPlanProps) {
  const { firestore, user } = useFirebase();

  // Dialog state
  const [selectedSeat, setSelectedSeat] = React.useState<Seat | null>(null);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = React.useState(false);

  // Fetch seats for the current room
  const seatsQuery = useMemoFirebase(() => {
    if (!firestore || !user || !roomId) return null;
    return query(
      collection(firestore, `libraries/${libraryId}/rooms/${roomId}/seats`),
      orderBy('createdAt', 'asc') // Sort by creation time to keep order stable
    );
  }, [firestore, user, libraryId, roomId]);

  const { data: seats, isLoading: isLoadingSeats } = useCollection<Omit<Seat, 'docId'>>(seatsQuery);

  // Fetch all students to populate the assignment dropdown
  const studentsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, `libraries/${libraryId}/students`);
  }, [firestore, user, libraryId]);

  const { data: students, isLoading: isLoadingStudents } = useCollection<Omit<Student, 'docId'>>(studentsQuery);
  
  const studentsWithDocId = React.useMemo(() => {
    return students?.map(s => ({ ...s, docId: s.id })) ?? [];
  }, [students]);

  const handleSeatClick = (seat: Seat) => {
    setSelectedSeat(seat);
    setIsAssignDialogOpen(true);
  };
  
  const onDialogSuccess = () => {
    setIsAssignDialogOpen(false);
    setSelectedSeat(null);
  }

  if (isLoadingSeats) {
    return (
        <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-4">
            {Array.from({ length: 20 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-12 rounded-md" />
            ))}
        </div>
    );
  }

  if (!seats || seats.length === 0) {
    return <p className="text-muted-foreground">No seats found for this room. Create some seats to get started.</p>;
  }

  return (
    <TooltipProvider>
      <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-4">
        {seats.map((seat) => (
          <Tooltip key={seat.id}>
            <TooltipTrigger asChild>
              <button
                onClick={() => handleSeatClick({ ...seat, docId: seat.id })}
                className={cn(
                  'flex h-12 w-12 items-center justify-center rounded-md border text-sm font-semibold transition-colors',
                  seat.studentId
                    ? 'bg-primary/20 border-primary/50 text-primary-foreground hover:bg-primary/30'
                    : 'bg-background hover:bg-accent hover:text-accent-foreground'
                )}
              >
                {seat.seatNumber}
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Seat {seat.seatNumber}</p>
              {seat.studentName ? (
                <p>Assigned to: {seat.studentName}</p>
              ) : (
                <p>Status: Available</p>
              )}
              <p className='capitalize'>Tier: {seat.tier}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
      {selectedSeat && (
        <AssignSeatDialog
          isOpen={isAssignDialogOpen}
          onOpenChange={setIsAssignDialogOpen}
          seat={selectedSeat}
          students={studentsWithDocId}
          libraryId={libraryId}
          onSuccess={onDialogSuccess}
        />
      )}
    </TooltipProvider>
  );
}
