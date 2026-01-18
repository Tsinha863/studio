'use client';

import * as React from 'react';
import {
  collection,
  query,
  orderBy
} from 'firebase/firestore';
import { User as UserIcon } from 'lucide-react';

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

const tierStyles = {
  available: {
    basic: 'bg-gray-100 hover:bg-gray-200 border-gray-300 text-gray-600',
    standard: 'bg-background hover:bg-accent/50 border-border',
    premium: 'bg-purple-100 hover:bg-purple-200 border-purple-300 text-purple-800',
  },
  assigned: 'bg-primary text-primary-foreground hover:bg-primary/90',
}

export function SeatingPlan({ libraryId, roomId }: SeatingPlanProps) {
  const { firestore, user } = useFirebase();

  const [selectedSeat, setSelectedSeat] = React.useState<Seat | null>(null);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = React.useState(false);

  const seatsQuery = useMemoFirebase(() => {
    if (!firestore || !user || !roomId) return null;
    return query(
      collection(firestore, `libraries/${libraryId}/rooms/${roomId}/seats`),
      orderBy('seatNumber', 'asc')
    );
  }, [firestore, user, libraryId, roomId]);

  const { data: seats, isLoading: isLoadingSeats } = useCollection<Omit<Seat, 'docId'>>(seatsQuery);

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

  const sortedSeats = React.useMemo(() => {
    return seats?.sort((a, b) => {
      const numA = parseInt(a.seatNumber, 10);
      const numB = parseInt(b.seatNumber, 10);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      return a.seatNumber.localeCompare(b.seatNumber);
    }) ?? [];
  }, [seats]);

  if (isLoadingSeats) {
    return (
        <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-4">
            {Array.from({ length: 20 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-14 rounded-md" />
            ))}
        </div>
    );
  }

  if (!seats || seats.length === 0) {
    return <p className="text-muted-foreground text-center py-8">No seats found for this room.</p>;
  }

  return (
    <TooltipProvider>
      <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-4">
        {sortedSeats.map((seat) => (
          <Tooltip key={seat.id}>
            <TooltipTrigger asChild>
              <button
                onClick={() => handleSeatClick({ ...seat, docId: seat.id })}
                className={cn(
                  'flex h-14 w-14 flex-col items-center justify-center rounded-md border text-xs font-semibold transition-colors',
                  seat.studentId
                    ? tierStyles.assigned
                    : tierStyles.available[seat.tier]
                )}
              >
                {seat.studentId ? (
                  <UserIcon className="h-5 w-5" />
                ) : (
                  <span className="text-lg font-bold">{seat.seatNumber}</span>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-bold">Seat {seat.seatNumber}</p>
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
