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

interface CreateRoomFormProps {
  libraryId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function CreateRoomForm({ libraryId, onSuccess, onCancel }: CreateRoomFormProps) {
  const { firestore, user, isUserLoading } = useFirebase();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [name, setName] = React.useState('');
  const [capacity, setCapacity] = React.useState<number | string>(10);
  const [errors, setErrors] = React.useState<Partial<Record<keyof RoomFormValues, string>>>({});

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    console.log("CREATE ROOM CLICKED"); 

    console.log("USER:", user);
    console.log("LIBRARY ID:", libraryId);

    if (!user || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'User not authenticated or library not ready. Please try again.',
      });
      return;
    }

    setErrors({});

    const data = {
      name,
      capacity: Number(capacity),
    };

    const validation = roomFormSchema.safeParse(data);
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

      // 1. Create the room document
      const roomRef = doc(collection(firestore, `libraries/${libraryId}/rooms`));
      batch.set(roomRef, {
        ...validation.data,
        libraryId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // 2. Create the seat documents within the room's subcollection
      const seatsColRef = collection(firestore, `libraries/${libraryId}/rooms/${roomRef.id}/seats`);
      for (let i = 1; i <= validation.data.capacity; i++) {
        const seatRef = doc(seatsColRef);
        batch.set(seatRef, {
          seatNumber: i.toString(),
          roomId: roomRef.id,
          libraryId,
          tier: 'standard', // Default tier
          studentId: null,
          studentName: null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      // 3. Create activity log
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

      toast({
        title: 'Room Created',
        description: 'The new room and its seats have been created.',
      });
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
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="roomName">Room Name</Label>
        <Input
          id="roomName"
          placeholder="e.g., Main Hall"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isSubmitting}
        />
        {errors.name && <p className="text-sm font-medium text-destructive">{errors.name}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="capacity">Seat Capacity</Label>
        <Input
          id="capacity"
          type="number"
          placeholder="20"
          value={capacity}
          onChange={(e) => setCapacity(e.target.value === '' ? '' : Number(e.target.value))}
          disabled={isSubmitting}
          min="1"
        />
        {errors.capacity && <p className="text-sm font-medium text-destructive">{errors.capacity}</p>}
      </div>
      
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="button" onClick={handleSubmit} disabled={isSubmitting || isUserLoading || !user}>
          {isSubmitting ? (
            <>
              <Spinner className="mr-2 h-4 w-4" />
              Creating...
            </>
          ) : 'Create Room'}
        </Button>
      </div>
    </div>
  );
}
