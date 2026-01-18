'use client';
import * as React from 'react';
import dynamic from 'next/dynamic';
import {
  Activity,
  IndianRupee,
  Users,
  CreditCard,
} from 'lucide-react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  Timestamp
} from 'firebase/firestore';

import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { KpiCard } from '@/components/admin/dashboard/kpi-card';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import type { Payment, Student, Expense, ActivityLog } from '@/lib/types';
import { kpiData as staticKpiData } from '@/lib/dummy-data';
import { Skeleton } from '@/components/ui/skeleton';

const IncomeExpenseChart = dynamic(() => import('@/components/admin/dashboard/income-expense-chart').then(mod => mod.IncomeExpenseChart), { 
    ssr: false,
    loading: () => <Skeleton className="h-[250px] w-full" /> 
});
const RecentStudents = dynamic(() => import('@/components/admin/dashboard/recent-students').then(mod => mod.RecentStudents), { ssr: false });
const ActivityFeed = dynamic(() => import('@/components/admin/dashboard/activity-feed').then(mod => mod.ActivityFeed), { ssr: false });
const ExpenseBreakdownChart = dynamic(() => import('@/components/admin/dashboard/expense-breakdown-chart').then(mod => mod.ExpenseBreakdownChart), { 
    ssr: false,
    loading: () => <Skeleton className="mx-auto aspect-square h-[250px] rounded-full" />
});


// TODO: Replace with actual logged-in user's library
const HARDCODED_LIBRARY_ID = 'library1';

export default function DashboardPage() {
  const { firestore } = useFirebase();

  // --- Data Fetching ---
  const studentsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, `libraries/${HARDCODED_LIBRARY_ID}/students`),
      orderBy('createdAt', 'desc'),
      limit(5)
    );
  }, [firestore]);

  const activityQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, `libraries/${HARDCODED_LIBRARY_ID}/activityLogs`),
      orderBy('timestamp', 'desc'),
      limit(5)
    );
  }, [firestore]);
  
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const sixMonthsAgoTimestamp = Timestamp.fromDate(sixMonthsAgo);

  const paymentsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
        collection(firestore, `libraries/${HARDCODED_LIBRARY_ID}/payments`),
        where('createdAt', '>=', sixMonthsAgoTimestamp)
    );
  }, [firestore]);

  const expensesQuery = useMemoFirebase(() => {
      if (!firestore) return null;
      return query(
          collection(firestore, `libraries/${HARDCODED_LIBRARY_ID}/expenses`),
          where('createdAt', '>=', sixMonthsAgoTimestamp)
      );
  }, [firestore]);


  const { data: recentStudents } = useCollection<Omit<Student, 'docId'>>(studentsQuery);
  const { data: activityLogs } = useCollection<ActivityLog>(activityQuery);
  const { data: payments } = useCollection<Payment>(paymentsQuery);
  const { data: expenses } = useCollection<Expense>(expensesQuery);

  // --- Data Processing for Charts ---
  const incomeExpenseData = React.useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        return { month: d.toLocaleString('default', { month: 'short' }), income: 0, expenses: 0 };
    }).reverse();

    payments?.forEach(p => {
        const month = p.createdAt.toDate().toLocaleString('default', { month: 'short' });
        const monthData = months.find(m => m.month === month);
        if (monthData && p.status === 'paid') {
            monthData.income += p.amount;
        }
    });

    expenses?.forEach(e => {
        const month = e.createdAt.toDate().toLocaleString('default', { month: 'short' });
        const monthData = months.find(m => m.month === month);
        if (monthData) {
            monthData.expenses += e.amount;
        }
    });

    return months;
  }, [payments, expenses]);

  const totalRevenue = React.useMemo(() => payments?.filter(p => p.status === 'paid').reduce((acc, p) => acc + p.amount, 0) || 0, [payments]);
  const totalExpenses = React.useMemo(() => expenses?.reduce((acc, e) => acc + e.amount, 0) || 0, [expenses]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-headline">
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground">
            Here&apos;s a summary of your library&apos;s activity.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Revenue"
          value={`₹${totalRevenue.toLocaleString()}`}
          change="last 6 months"
          icon={<IndianRupee />}
        />
        <KpiCard
          title="Total Expenses"
          value={`₹${totalExpenses.toLocaleString()}`}
          change="last 6 months"
          icon={<CreditCard />}
        />
        <KpiCard
          title="Active Students"
          value={`+${staticKpiData.activeStudents.toLocaleString()}`}
          change="+2 since last month"
          icon={<Users />}
        />
        <KpiCard
          title="New Students (Month)"
          value={`+${staticKpiData.newStudents.toLocaleString()}`}
          change="5 this month"
          icon={<Activity />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Income vs. Expenses</CardTitle>
            <CardDescription>
              A summary of your income and expenses for the last 6 months.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <IncomeExpenseChart data={incomeExpenseData} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Expense Breakdown</CardTitle>
            <CardDescription>
                A breakdown of your expenses by category for the last 6 months.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ExpenseBreakdownChart data={expenses || []} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Recent Students</CardTitle>
            <CardDescription>
              Here are the students who joined recently.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RecentStudents students={recentStudents || []} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Activity Feed</CardTitle>
            <CardDescription>
              A log of the most recent activities in the system.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityFeed logs={activityLogs || []} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
