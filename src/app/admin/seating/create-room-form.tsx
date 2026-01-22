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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Seat } from '@/lib/types';

interface CreateRoomFormProps {
  libraryId: string;
  onSuccess: () => void;
}

const tiers: Seat['tier'][] = ['basic', 'standard', 'premium'];

export function CreateRoomForm({ libraryId, onSuccess }: CreateRoomFormProps) {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [name, setName] = React.useState('');
  const [capacity, setCapacity] = React.useState<number | string>(20);
  const [tier, setTier] = React.useState<Seat['tier']>('standard');
  const [errors, setErrors] = React.useState<Partial<Record<keyof RoomFormValues, string>>>({});

  const handleSubmit = async () => {
    if (!user || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'You must be logged in to create a room.',
      });
      return;
    }

    setErrors({});
    const validation = roomFormSchema.safeParse({ name, capacity: Number(capacity), tier });

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
      const validatedData = validation.data;
      const batch = writeBatch(firestore);
      const actor = { id: user.uid, name: user.displayName || 'Admin' };
      const roomRef = doc(collection(firestore, `libraries/${libraryId}/rooms`));
  
      batch.set(roomRef, {
        name: validatedData.name,
        capacity: validatedData.capacity,
        libraryId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
  
      const seatsColRef = collection(firestore, `libraries/${libraryId}/rooms/${roomRef.id}/seats`);
      for (let i = 1; i <= validatedData.capacity; i++) {
        const seatRef = doc(seatsColRef, i.toString());
        batch.set(seatRef, {
          roomId: roomRef.id,
          libraryId,
          tier: validatedData.tier,
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
          name: validatedData.name,
          capacity: validatedData.capacity,
        },
        timestamp: serverTimestamp(),
      });
      
      await batch.commit();
      
      onSuccess();
      // Reset form on success
      setName('');
      setCapacity(20);
      setTier('standard');
      setErrors({});

    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Room Creation Failed',
        description: error instanceof Error ? error.message : "The room could not be created."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-wrap items-end gap-4">
        <div className="flex-grow space-y-2" style={{minWidth: '200px'}}>
            <Label htmlFor="roomName">Room Name</Label>
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
             {errors.capacity && <p className="text-sm font-medium text-destructive w-full">{errors.capacity}</p>}
        </div>

        <div className="space-y-2">
            <Label htmlFor="tier">Seat Tier</Label>
            <Select onValueChange={(value: Seat['tier']) => setTier(value)} value={tier} disabled={isSubmitting}>
                <SelectTrigger id="tier" className="w-[120px]">
                    <SelectValue placeholder="Select tier" />
                </SelectTrigger>
                <SelectContent>
                    {tiers.map((t) => (
                        <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
        
        <Button type="button" onClick={handleSubmit} disabled={isSubmitting || !user}>
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
    </div>
  );
}
