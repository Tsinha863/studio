'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { Student } from '@/lib/types';
import { Armchair } from 'lucide-react';

interface AssignedSeatCardProps {
  assignments: Student['assignments'];
  isLoading: boolean;
}

export function AssignedSeatCard({ assignments, isLoading }: AssignedSeatCardProps) {
  const firstAssignment = assignments && assignments.length > 0 ? assignments[0] : null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">My Seat</CardTitle>
        <Armchair className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <>
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="mt-2 h-4 w-1/4" />
          </>
        ) : firstAssignment ? (
          <>
            <div className="text-2xl font-bold">{firstAssignment.seatId}</div>
            <p className="text-xs text-muted-foreground capitalize">{firstAssignment.timeSlot} Slot</p>
          </>
        ) : (
          <>
            <div className="text-2xl font-bold">Not Assigned</div>
            <p className="text-xs text-muted-foreground">Contact admin for assignment</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
