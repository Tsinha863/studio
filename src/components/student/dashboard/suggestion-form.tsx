'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/spinner';
import { addSuggestion } from '@/lib/actions/suggestions';
import { Skeleton } from '@/components/ui/skeleton';

interface SuggestionFormProps {
  studentId?: string;
  libraryId: string;
  isLoading: boolean;
}

const formSchema = z.object({
  content: z.string().min(10, {
    message: 'Suggestion must be at least 10 characters long.',
  }).max(500, {
    message: 'Suggestion must not be longer than 500 characters.',
  }),
});

type FormValues = z.infer<typeof formSchema>;

export function SuggestionForm({ studentId, libraryId, isLoading: isLoadingStudent }: SuggestionFormProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      content: '',
    },
  });

  const onSubmit = async (data: FormValues) => {
    if (!firestore || !studentId) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Cannot submit suggestion. Please try again later.',
      });
      return;
    }
    
    setIsSubmitting(true);
    const result = await addSuggestion(firestore, libraryId, studentId, data.content);
    setIsSubmitting(false);

    if (result.success) {
      toast({
        title: 'Suggestion Submitted',
        description: 'Thank you for your feedback!',
      });
      form.reset();
    } else {
      toast({
        variant: 'destructive',
        title: 'Submission Failed',
        description: result.error || 'An unexpected error occurred.',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Suggestion Box</CardTitle>
        <CardDescription>Have an idea? We&apos;d love to hear it.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent>
            {isLoadingStudent ? (
                <div className="space-y-2">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-10 w-24" />
                </div>
            ) : (
                <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                    <FormItem>
                        <FormControl>
                        <Textarea
                            placeholder="Tell us how we can improve..."
                            className="resize-none"
                            {...field}
                        />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSubmitting || isLoadingStudent}>
              {isSubmitting && <Spinner className="mr-2 h-4 w-4" />}
              Submit Suggestion
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
