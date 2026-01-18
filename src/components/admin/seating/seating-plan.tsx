'use client';

import * as React from 'react';
import { collection, query } from 'firebase/firestore';
import { User as UserIcon } from 'lucide-react';

import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import type { Seat, Student, TimeSlot } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AssignSeatDialog } from './assign-seat-dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

interface SeatingPlanProps {
  libraryId: string;
  roomId: string;
}

type DisplayMode = TimeSlot | 'fullDay';

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
  const { toast } = useToast();
  
  const [displayMode, setDisplayMode] = React.useState<DisplayMode>('fullDay');
  const [selectedSeat, setSelectedSeat] = React.useState<Seat | null>(null);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = React.useState(false);

  const seatsQuery = useMemoFirebase(() => {
    if (!firestore || !user || !roomId) return null;
    return query(
      collection(firestore, `libraries/${libraryId}/rooms/${roomId}/seats`)
    );
  }, [firestore, user, libraryId, roomId]);

  const { data: seats, isLoading: isLoadingSeats } = useCollection<Omit<Seat, 'id'>>(seatsQuery);

  const studentsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, `libraries/${libraryId}/students`);
  }, [firestore, user, libraryId]);

  const { data: students, isLoading: isLoadingStudents } = useCollection<Omit<Student, 'id' | 'docId'>>(studentsQuery);
  
  const handleSeatClick = (seat: Seat) => {
    if (displayMode === 'fullDay') {
        const assignmentInfo = [
            seat.assignments?.morning && `Morning: ${seat.assignments.morning.studentName}`,
            seat.assignments?.afternoon && `Afternoon: ${seat.assignments.afternoon.studentName}`,
            seat.assignments?.night && `Night: ${seat.assignments.night.studentName}`,
        ].filter(Boolean);

        toast({
            title: `Seat ${seat.id}`,
            description: assignmentInfo.length > 0 ? assignmentInfo.join(' | ') : 'Available all day.',
        });
        return;
    }
    setSelectedSeat(seat);
    setIsAssignDialogOpen(true);
  };
  
  const onDialogSuccess = () => {
    setIsAssignDialogOpen(false);
    setSelectedSeat(null);
  }

  const sortedSeats = React.useMemo(() => {
    return seats?.sort((a, b) => {
      const numA = parseInt(a.id, 10);
      const numB = parseInt(b.id, 10);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      return a.id.localeCompare(b.id);
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
      <Tabs value={displayMode} onValueChange={(value) => setDisplayMode(value as DisplayMode)} className="w-full">
        <TabsList className="mb-6 grid w-full grid-cols-4">
          <TabsTrigger value="morning">Morning</TabsTrigger>
          <TabsTrigger value="afternoon">Afternoon</TabsTrigger>
          <TabsTrigger value="night">Night</TabsTrigger>
          <TabsTrigger value="fullDay">Full Day</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-4">
        {sortedSeats.map((seat) => {
           const isAssignedForCurrentSlot = displayMode !== 'fullDay' && seat.assignments?.[displayMode];
           const isAssignedAtAll = seat.assignments?.morning || seat.assignments?.afternoon || seat.assignments?.night;
           const showAsAssigned = displayMode === 'fullDay' ? isAssignedAtAll : isAssignedForCurrentSlot;

           const tooltipDescription = [
                seat.assignments?.morning && `Morning: ${seat.assignments.morning.studentName}`,
                seat.assignments?.afternoon && `Afternoon: ${seat.assignments.afternoon.studentName}`,
                seat.assignments?.night && `Night: ${seat.assignments.night.studentName}`,
            ].filter(Boolean).join(' | ') || 'Status: Available';

          return (
            <Tooltip key={seat.id}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => handleSeatClick(seat)}
                  className={cn(
                    'flex h-14 w-14 flex-col items-center justify-center rounded-md border text-xs font-semibold transition-colors',
                    showAsAssigned
                      ? tierStyles.assigned
                      : tierStyles.available[seat.tier]
                  )}
                >
                  {showAsAssigned ? (
                    <UserIcon className="h-5 w-5" />
                  ) : (
                    <span className="text-lg font-bold">{seat.id}</span>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-bold">Seat {seat.id}</p>
                <p>{tooltipDescription}</p>
                <p className='capitalize'>Tier: {seat.tier}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
      {selectedSeat && displayMode !== 'fullDay' && (
        <AssignSeatDialog
          isOpen={isAssignDialogOpen}
          onOpenChange={setIsAssignDialogOpen}
          seat={selectedSeat}
          students={students || []}
          libraryId={libraryId}
          onSuccess={onDialogSuccess}
          timeSlot={displayMode}
        />
      )}
    </TooltipProvider>
  );
}
