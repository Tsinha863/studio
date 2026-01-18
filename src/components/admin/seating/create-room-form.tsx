'use client';

import * as React from 'react';
import { useFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { roomFormSchema, type RoomFormValues } from '@/lib/schemas';
import { createRoomAndSeats } from '@/lib/actions/seating';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    if (!firestore || !user) {
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'User is not authenticated. Please log in and try again.',
      });
      setIsSubmitting(false);
      return;
    }

    const actor = { id: user.uid, name: user.displayName || 'Admin' };
    const result = await createRoomAndSeats(firestore, libraryId, validation.data, actor);

    setIsSubmitting(false);

    if (result.success) {
      onSuccess();
    } else {
      toast({
        variant: 'destructive',
        title: 'An error occurred',
        description: result.error || 'The operation failed. Please try again.',
      });
    }
  };

  const isFormDisabled = isSubmitting || isUserLoading || !user;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="roomName">Room Name</Label>
        <Input
          id="roomName"
          placeholder="e.g., Main Hall"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isFormDisabled}
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
          disabled={isFormDisabled}
          min="1"
        />
        {errors.capacity && <p className="text-sm font-medium text-destructive">{errors.capacity}</p>}
      </div>
      
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isFormDisabled}>
          Cancel
        </Button>
        <Button type="submit" disabled={isFormDisabled}>
          {isSubmitting ? (
            <>
              <Spinner className="mr-2 h-4 w-4" />
              Creating...
            </>
          ) : 'Create Room'}
        </Button>
      </div>
    </form>
  );
}
