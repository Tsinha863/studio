'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg text-center">
        <CardHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
          <CardTitle className="mt-4 text-2xl font-bold">Something went wrong</CardTitle>
          <CardDescription>
            We encountered an unexpected error. Please try again or go back to the previous page.
          </CardDescription>
        </CardHeader>
        <CardContent>
            {process.env.NODE_ENV === 'development' && (
                 <div className="mt-4 rounded-md border bg-muted p-4 text-left text-sm">
                    <p className="font-semibold text-destructive">Error Details:</p>
                    <pre className="mt-2 whitespace-pre-wrap font-mono text-xs text-destructive">
                        <code>{error.message}</code>
                    </pre>
                 </div>
            )}
        </CardContent>
        <CardFooter className="flex justify-center gap-4">
          <Button variant="outline" onClick={() => router.back()}>
            Go Back
          </Button>
          <Button onClick={() => reset()}>
            Try Again
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
