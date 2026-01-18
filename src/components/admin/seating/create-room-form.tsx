'use client';

import * as React from 'react';
import {
  doc,
  collection,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { roomFormSchema, type RoomFormValues } from '@/lib/schemas';
import { Spinner } from '@/components/spinner';
import { Label } from '@/components/ui/label';
import { PlusCircle } from 'lucide-react';

interface CreateRoomFormProps {
  libraryId: string;
  onSuccess: () => void;
}

export function CreateRoomForm({ libraryId, onSuccess }: CreateRoomFormProps) {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [name, setName] = React.useState('');
  const [capacity, setCapacity] = React.useState<number | string>(20);
  const [errors, setErrors] = React.useState<Partial<Record<keyof Omit<RoomFormValues, 'tier'>, string>>>({});

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'You must be logged in to create a room.',
      });
      return;
    }

    setErrors({});
    const validation = roomFormSchema.safeParse({ name, capacity: Number(capacity), tier: 'standard' });

    if (!validation.success) {
      const newErrors: Partial<Record<keyof RoomFormValues, string>> = {};
      validation.error.errors.forEach((err) => {
        const path = err.path[0] as keyof RoomFormValues;
        newErrors[path] = err.message;
      });
      setErrors(newErrors);
      return;
    }
    
    setIsSubmitting(true);
    try {
      const actor = { id: user.uid, name: user.displayName || 'Admin' };
      const batch = writeBatch(firestore);

      const roomRef = doc(collection(firestore, `libraries/${libraryId}/rooms`));
      batch.set(roomRef, {
        name: validation.data.name,
        capacity: validation.data.capacity,
        libraryId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const seatsColRef = collection(firestore, `libraries/${libraryId}/rooms/${roomRef.id}/seats`);
      for (let i = 1; i <= validation.data.capacity; i++) {
        const seatRef = doc(seatsColRef, i.toString());
        batch.set(seatRef, {
          roomId: roomRef.id,
          libraryId,
          tier: 'standard', // Tier is defaulted to standard for simplicity
          assignments: {},
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      const logRef = doc(collection(firestore, `libraries/${libraryId}/activityLogs`));
      batch.set(logRef, {
        libraryId,
        user: actor,
        activityType: 'room_created',
        details: {
          roomId: roomRef.id,
          name: validation.data.name,
          capacity: validation.data.capacity,
        },
        timestamp: serverTimestamp(),
      });

      await batch.commit();
      
      // Reset form on success
      setName('');
      setCapacity(20);
      setErrors({});
      onSuccess();

    } catch (error) {
      console.error("CREATE ROOM ERROR:", error);
      toast({
        variant: 'destructive',
        title: 'Failed to Create Room',
        description: error instanceof Error ? error.message : 'An unknown error occurred.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-4">
        <div className="flex-grow space-y-2" style={{minWidth: '200px'}}>
            <Label htmlFor="roomName" className="sr-only">Room Name</Label>
            <Input
                id="roomName"
                placeholder="Enter room name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSubmitting}
                aria-label="Room Name"
            />
            {errors.name && <p className="text-sm font-medium text-destructive">{errors.name}</p>}
        </div>

        <div className="space-y-2">
            <Label htmlFor="capacity">Seats</Label>
            <Input
                id="capacity"
                type="number"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value === '' ? '' : Number(e.target.value))}
                disabled={isSubmitting}
                min="1"
                className="w-24"
            />
        </div>
        
        <Button type="submit" disabled={isSubmitting || !user}>
          {isSubmitting ? (
            <>
              <Spinner className="mr-2 h-4 w-4" />
              Adding...
            </>
          ) : (
            <>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Room
            </>
          )}
        </Button>
        {errors.capacity && <p className="text-sm font-medium text-destructive w-full">{errors.capacity}</p>}
    </form>
  );
}
