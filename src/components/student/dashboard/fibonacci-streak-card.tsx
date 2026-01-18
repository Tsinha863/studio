'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Gem } from 'lucide-react';

interface FibonacciStreakCardProps {
  streak: number;
  isLoading: boolean;
}

const STREAK_GOAL = 12; // e.g., 12 months for a yearly reward

export function FibonacciStreakCard({ streak, isLoading }: FibonacciStreakCardProps) {
  const progress = (streak / STREAK_GOAL) * 100;
  const monthsToGo = STREAK_GOAL - streak;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Payment Streak</CardTitle>
            <Gem className="h-4 w-4 text-muted-foreground" />
        </div>
        <CardDescription>Pay on time to earn rewards!</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
            <>
                <Skeleton className="h-8 w-1/2 mb-2" />
                <Skeleton className="h-4 w-full mb-1" />
                <Skeleton className="h-4 w-3/4" />
            </>
        ) : (
            <>
                <div className="text-2xl font-bold">{streak} months</div>
                <p className="text-xs text-muted-foreground">
                {monthsToGo > 0 ? `${monthsToGo} more for your next reward` : "You've reached the goal!"}
                </p>
                <Progress value={progress} className="mt-4" />
            </>
        )}
      </CardContent>
    </Card>
  );
}
