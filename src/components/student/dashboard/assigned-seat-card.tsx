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
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">My Seats</CardTitle>
        <Armchair className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="mt-2 h-4 w-1/4" />
          </div>
        ) : assignments && assignments.length > 0 ? (
            <ul className="space-y-3">
                {assignments.map((assignment, index) => (
                    <li key={`${assignment.seatId}-${assignment.timeSlot}-${index}`}>
                        <div className="text-2xl font-bold">{assignment.seatId}</div>
                        <p className="text-xs text-muted-foreground capitalize">{assignment.timeSlot} Slot</p>
                    </li>
                ))}
            </ul>
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
