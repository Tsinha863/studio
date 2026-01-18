'use client';

import { Skeleton } from "@/components/ui/skeleton";

interface WelcomeHeaderProps {
    studentName?: string;
    isLoading: boolean;
}

export function WelcomeHeader({ studentName, isLoading }: WelcomeHeaderProps) {
    return (
        <div>
            {isLoading ? (
                <>
                    <Skeleton className="h-8 w-48 mb-2" />
                    <Skeleton className="h-5 w-64" />
                </>
            ) : (
                <>
                    <h1 className="text-2xl font-bold tracking-tight font-headline">
                        Welcome back, {studentName || 'Student'}!
                    </h1>
                    <p className="text-muted-foreground">
                        Here&apos;s a summary of your account activity.
                    </p>
                </>
            )}
      </div>
    )
}
