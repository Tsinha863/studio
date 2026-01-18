'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFirebase } from '@/firebase';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { roomFormSchema, type RoomFormValues } from '@/lib/schemas';
import { createRoomAndSeats } from '@/lib/actions/seating';
import { Spinner } from '@/components/spinner';

interface CreateRoomFormProps {
  libraryId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function CreateRoomForm({ libraryId, onSuccess, onCancel }: CreateRoomFormProps) {
  const { firestore, user, isUserLoading } = useFirebase();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<RoomFormValues>({
    resolver: zodResolver(roomFormSchema),
    defaultValues: {
      name: '',
      capacity: 10,
    },
  });

  const onSubmit = async (data: RoomFormValues) => {
    setIsSubmitting(true);
    if (!firestore || !user) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not connect to the database. Please try again.',
      });
      setIsSubmitting(false);
      return;
    }

    const actor = { id: user.uid, name: user.displayName || 'Admin' };
    const result = await createRoomAndSeats(firestore, libraryId, data, actor);

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

  const isFormDisabled = isSubmitting || isUserLoading;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Room Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Main Hall" {...field} disabled={isFormDisabled} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="capacity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Seat Capacity</FormLabel>
              <FormControl>
                <Input type="number" placeholder="20" {...field} disabled={isFormDisabled} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
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
    </Form>
  );
}
