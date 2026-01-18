'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Armchair } from 'lucide-react';

interface AssignedSeatCardProps {
  seatId?: string | null;
  isLoading: boolean;
}

export function AssignedSeatCard({ seatId, isLoading }: AssignedSeatCardProps) {
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
        ) : seatId ? (
          <>
            <div className="text-2xl font-bold">{seatId}</div>
            <p className="text-xs text-muted-foreground">Main Hall</p>
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
