'use client';

import * as React from 'react';
import { z } from 'zod';
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
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/spinner';
import { addSuggestion } from '@/lib/actions/suggestions';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';

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
  const { firestore, user, isUserLoading } = useFirebase();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [content, setContent] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);

    const validation = formSchema.safeParse({ content });
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    if (!firestore || !studentId || !user) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Cannot submit suggestion. Please make sure you are logged in.',
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
        const result = await addSuggestion(firestore, libraryId, studentId, content);
        if (result.success) {
          toast({
            title: 'Suggestion Submitted',
            description: 'Thank you for your feedback!',
          });
          setContent('');
        } else {
          toast({
            variant: 'destructive',
            title: 'Submission Failed',
            description: result.error || 'An unexpected error occurred.',
          });
        }
    } catch (error) {
        console.error("Suggestion form submission error:", error);
        toast({
            variant: "destructive",
            title: "An unexpected error occurred",
            description: error instanceof Error ? error.message : "Please check the console for details."
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  const isFormDisabled = isSubmitting || isLoadingStudent || isUserLoading || !user;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Suggestion Box</CardTitle>
        <CardDescription>Have an idea? We&apos;d love to hear it.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoadingStudent ? (
            <div className="space-y-2">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-10 w-24" />
            </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="suggestion" className="sr-only">Suggestion</Label>
            <Textarea
                id="suggestion"
                placeholder="Tell us how we can improve..."
                className="resize-none"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                disabled={isFormDisabled}
            />
            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button type="button" onClick={handleSubmit} disabled={isFormDisabled}>
          {isSubmitting && <Spinner className="mr-2 h-4 w-4" />}
          Submit Suggestion
        </Button>
      </CardFooter>
    </Card>
  );
}
