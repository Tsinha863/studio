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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { announcementFormSchema, type AnnouncementFormValues } from '@/lib/schemas';
import { addAnnouncement } from '@/lib/actions/announcements';

interface AnnouncementFormProps {
  libraryId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function AnnouncementForm({ libraryId, onSuccess, onCancel }: AnnouncementFormProps) {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);

  const form = useForm<AnnouncementFormValues>({
    resolver: zodResolver(announcementFormSchema),
    defaultValues: {
      title: '',
      content: '',
    },
  });

  const onSubmit = async (data: AnnouncementFormValues) => {
    setIsLoading(true);
    if (!firestore || !user) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not connect to the database. Please try again.',
      });
      setIsLoading(false);
      return;
    }

    const actor = { id: user.uid, name: user.displayName || 'Admin' };
    const result = await addAnnouncement(firestore, libraryId, data, actor);

    setIsLoading(false);

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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Library Closure Notice" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Content</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="The library will be closed on..."
                  className="min-h-[120px]"
                  {...field}
                  disabled={isLoading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Creating...' : 'Create Announcement'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
