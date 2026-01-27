'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import {
  collection,
  query,
  orderBy,
} from 'firebase/firestore';

import { useCollection, useFirebase } from '@/firebase';
import type { Room } from '@/lib/types';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreateRoomForm } from './create-room-form';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

const SeatingPlan = dynamic(() => import('@/components/admin/seating/seating-plan').then(mod => mod.SeatingPlan), { 
  ssr: false,
  loading: () => <Skeleton className="h-48 w-full rounded-lg" />
});

export default function SeatingPage() {
  const { firestore, libraryId } = useFirebase();
  const { toast } = useToast();

  const roomsQuery = React.useMemo(() => {
    if (!firestore || !libraryId) return null;
    return query(
      collection(firestore, `libraries/${libraryId}/rooms`),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, libraryId]);
  const { data: rooms, isLoading: isLoadingRooms } = useCollection<Room>(roomsQuery);

  const onRoomCreated = () => {
    toast({ title: 'Room Created', description: 'The new room has been added.' });
  };

  return (
    <div className="flex flex-col gap-6">
       <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-headline">
            Seat Management
          </h1>
          <p className="text-muted-foreground">
            Create new rooms and manage student seat assignments.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Room Management</CardTitle>
        </CardHeader>
        <CardContent>
          {libraryId && (
            <CreateRoomForm
              libraryId={libraryId}
              onSuccess={onRoomCreated}
            />
          )}
        </CardContent>
      </Card>


      <Card>
        <CardContent className="p-4 md:p-6">
        {isLoadingRooms ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
        ) : rooms && rooms.length > 0 && libraryId ? (
          <Tabs defaultValue={rooms[0].id} className="w-full">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
              {rooms.map(room => (
                <TabsTrigger key={room.id} value={room.id}>{room.name}</TabsTrigger>
              ))}
            </TabsList>
            {rooms.map(room => (
              <TabsContent key={room.id} value={room.id} className="mt-6">
                <SeatingPlan libraryId={libraryId} roomId={room.id} />
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 text-center py-10">
            <h3 className="text-lg font-medium text-muted-foreground">No rooms added yet.</h3>
            <p className="text-sm text-muted-foreground">Create your first room to manage seats and time slots.</p>
          </div>
        )}
        </CardContent>
      </Card>
    </div>
  );
}
