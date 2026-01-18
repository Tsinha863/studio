'use client';

import * as React from 'react';
import { PlusCircle } from 'lucide-react';
import {
  collection,
  query,
  orderBy,
} from 'firebase/firestore';

import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import type { Room } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreateRoomForm } from '@/components/admin/seating/create-room-form';
import { useToast } from '@/hooks/use-toast';
import { SeatingPlan } from '@/components/admin/seating/seating-plan';

// TODO: Replace with actual logged-in user's library
const HARDCODED_LIBRARY_ID = 'library1';

export default function SeatingPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  const roomsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, `libraries/${HARDCODED_LIBRARY_ID}/rooms`),
      orderBy('createdAt', 'desc')
    );
  }, [firestore]);

  const { data: rooms, isLoading: isLoadingRooms } = useCollection<Omit<Room, 'docId'>>(roomsQuery);

  const onRoomCreated = () => {
    setIsModalOpen(false);
    toast({ title: 'Room Created', description: 'The room and its seats have been successfully created.' });
  };

  return (
    <div className="flex flex-col gap-6">
       <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-headline">
            Seating Management
          </h1>
          <p className="text-muted-foreground">
            Manage rooms and student seat assignments.
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <PlusCircle className="mr-2" />
          Create Room
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 md:p-6">
        {isLoadingRooms ? (
            <p>Loading rooms...</p>
        ) : rooms && rooms.length > 0 ? (
          <Tabs defaultValue={rooms[0].id} className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {rooms.map(room => (
                <TabsTrigger key={room.id} value={room.id}>{room.name}</TabsTrigger>
              ))}
            </TabsList>
            {rooms.map(room => (
              <TabsContent key={room.id} value={room.id} className="mt-6">
                <SeatingPlan libraryId={HARDCODED_LIBRARY_ID} roomId={room.id} />
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 text-center py-10">
            <h3 className="text-xl font-semibold">No Rooms Found</h3>
            <p className="text-muted-foreground">Get started by creating your first room.</p>
            <Button onClick={() => setIsModalOpen(true)}>
              <PlusCircle className="mr-2" />
              Create Room
            </Button>
          </div>
        )}
        </CardContent>
      </Card>

      {/* Add Room Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Room</DialogTitle>
            <DialogDescription>
              Define the name and seating capacity for the new room.
            </DialogDescription>
          </DialogHeader>
          <CreateRoomForm
            libraryId={HARDCODED_LIBRARY_ID}
            onSuccess={onRoomCreated}
            onCancel={() => setIsModalOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
