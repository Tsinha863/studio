'use client';

import * as React from 'react';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import { User as UserIcon, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

import { useCollection, useFirebase } from '@/firebase';
import type { Seat, Student, SeatBooking } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { SeatBookingDialog } from './seat-booking-dialog';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

interface SeatingPlanProps {
  libraryId: string;
  roomId: string;
}

type SeatWithId = Seat & { id: string };
type StudentWithId = Student & { id: string };
type SeatBookingWithId = SeatBooking & { id: string };

const tierStyles = {
  available: {
    basic: 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-600',
    standard: 'bg-background hover:bg-accent/50 border-border',
    premium: 'bg-amber-100 hover:bg-amber-200 border-amber-300 text-amber-800',
  },
  booked: 'bg-primary text-primary-foreground hover:bg-primary/90',
};

export function SeatingPlan({ libraryId, roomId }: SeatingPlanProps) {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  
  const [selectedDate, setSelectedDate] = React.useState<Date>(new Date());
  const [selectedSeat, setSelectedSeat] = React.useState<SeatWithId | null>(null);
  const [isBookingDialogOpen, setIsBookingDialogOpen] = React.useState(false);

  // --- Data Fetching ---
  const seatsQuery = React.useMemo(() => {
    if (!firestore || !user || !roomId) return null;
    return query(collection(firestore, `libraries/${libraryId}/rooms/${roomId}/seats`));
  }, [firestore, user, libraryId, roomId]);
  const { data: seats, isLoading: isLoadingSeats } = useCollection<Seat>(seatsQuery);

  const bookingsQuery = React.useMemo(() => {
    if (!firestore || !user || !roomId) return null;
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    return query(
      collection(firestore, `libraries/${libraryId}/seatBookings`),
      where('roomId', '==', roomId),
      where('status', '==', 'active'),
      where('startTime', '<=', Timestamp.fromDate(endOfDay)),
      where('endTime', '>=', Timestamp.fromDate(startOfDay))
    );
  }, [firestore, user, libraryId, roomId, selectedDate]);
  const { data: bookings } = useCollection<SeatBooking>(bookingsQuery);

  // --- Memoized Data ---
  const bookingsBySeatId = React.useMemo(() => {
    const map = new Map<string, SeatBookingWithId[]>();
    bookings?.forEach(booking => {
      if (!map.has(booking.seatId)) {
        map.set(booking.seatId, []);
      }
      map.get(booking.seatId)?.push(booking as SeatBookingWithId);
    });
    return map;
  }, [bookings]);

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

  // --- Handlers ---
  const handleSeatClick = (seat: SeatWithId) => {
    setSelectedSeat(seat);
    setIsBookingDialogOpen(true);
  };
  
  const onDialogSuccess = () => {
    setIsBookingDialogOpen(false);
    setSelectedSeat(null);
  };

  // --- Render Logic ---
  if (isLoadingSeats) {
    return (
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-8 sm:gap-4 md:grid-cols-10 lg:grid-cols-12">
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
      <div className="mb-6">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant={"outline"}
              className={cn(
                "w-[240px] justify-start text-left font-normal",
                !selectedDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="grid grid-cols-4 gap-2 sm:grid-cols-8 sm:gap-4 md:grid-cols-10 lg:grid-cols-12">
        {sortedSeats.map((seat) => {
          const seatBookings = bookingsBySeatId.get(seat.id) ?? [];
          const isBooked = seatBookings.length > 0;
          
          const tooltipContent = seatBookings.length > 0
            ? seatBookings.map(b => (
                `Booked by ${b.studentName} from ${format(b.startTime.toDate(), 'MMM d, p')} to ${format(b.endTime.toDate(), 'MMM d, p')}`
              )).join(' | ')
            : 'Available';

          return (
            <Tooltip key={seat.id}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => handleSeatClick(seat)}
                  className={cn(
                    'flex h-14 w-14 flex-col items-center justify-center rounded-md border text-xs font-semibold transition-colors',
                    isBooked ? tierStyles.booked : tierStyles.available[seat.tier]
                  )}
                >
                  {isBooked ? <UserIcon className="h-5 w-5" /> : null}
                  <span className={cn("font-bold", isBooked ? 'text-sm' : 'text-lg')}>{seat.id}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-bold">Seat {seat.id}</p>
                <p>{tooltipContent}</p>
                <p className='capitalize'>Tier: {seat.tier}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      {selectedSeat && (
        <SeatBookingDialog
          isOpen={isBookingDialogOpen}
          onOpenChange={setIsBookingDialogOpen}
          seat={selectedSeat}
          bookingsForSeat={bookingsBySeatId.get(selectedSeat.id) ?? []}
          libraryId={libraryId}
          selectedDate={selectedDate}
          onSuccess={onDialogSuccess}
        />
      )}
    </TooltipProvider>
  );
}
