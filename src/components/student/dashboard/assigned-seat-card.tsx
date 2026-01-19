'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { SeatBooking } from '@/lib/types';
import { Armchair } from 'lucide-react';
import { format } from 'date-fns';

interface AssignedSeatCardProps {
  bookings: SeatBooking[];
  isLoading: boolean;
}

export function AssignedSeatCard({ bookings, isLoading }: AssignedSeatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">My Upcoming Bookings</CardTitle>
        <Armchair className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="mt-2 h-4 w-1/4" />
          </div>
        ) : bookings && bookings.length > 0 ? (
            <ul className="space-y-3">
                {bookings.slice(0, 2).map((booking, index) => (
                    <li key={`${booking.seatId}-${booking.id}-${index}`}>
                        <div className="text-2xl font-bold">Seat {booking.seatId}</div>
                        <p className="text-xs text-muted-foreground">
                            {format(booking.startTime.toDate(), 'MMM d, p')} - {format(booking.endTime.toDate(), 'p')}
                        </p>
                    </li>
                ))}
                {bookings.length > 2 && (
                    <p className="text-xs text-muted-foreground pt-1">...and {bookings.length - 2} more.</p>
                )}
            </ul>
        ) : (
          <>
            <div className="text-2xl font-bold">No Bookings</div>
            <p className="text-xs text-muted-foreground">You have no upcoming seat bookings.</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
