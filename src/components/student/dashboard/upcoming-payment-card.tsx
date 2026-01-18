'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { IndianRupee } from 'lucide-react';
import type { Payment } from '@/lib/types';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface UpcomingPaymentCardProps {
  payment?: Payment;
  isLoading: boolean;
}

export function UpcomingPaymentCard({ payment, isLoading }: UpcomingPaymentCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Upcoming Payment</CardTitle>
        <IndianRupee className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <>
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="mt-2 h-4 w-3/4" />
          </>
        ) : payment ? (
          <>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(payment.amount)}
              <Badge variant={payment.status === 'overdue' ? 'destructive' : 'secondary'} className="ml-2 capitalize">
                {payment.status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Due on {format(payment.dueDate.toDate(), 'MMM d, yyyy')}
            </p>
            <Button size="sm" className='mt-4'>Pay Now</Button>
          </>
        ) : (
          <>
            <div className="text-2xl font-bold">All Clear!</div>
            <p className="text-xs text-muted-foreground">No upcoming payments due.</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
