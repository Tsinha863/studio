
'use client';
import * as React from 'react';
import dynamic from 'next/dynamic';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import {
  Activity,
  IndianRupee,
  Users,
  CreditCard,
  Download,
} from 'lucide-react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  Timestamp
} from 'firebase/firestore';

import { useCollection, useFirebase } from '@/firebase';
import { KpiCard } from '@/components/admin/dashboard/kpi-card';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import type { Payment, Student, Expense, ActivityLog } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/spinner';
import { useToast } from '@/hooks/use-toast';
import { LIBRARY_ID } from '@/lib/config';

const IncomeExpenseChart = dynamic(() => import('@/components/admin/dashboard/income-expense-chart').then(mod => mod.IncomeExpenseChart), { 
    ssr: false,
    loading: () => <Skeleton className="h-[250px] w-full" /> 
});
const RecentStudents = dynamic(() => import('@/components/admin/dashboard/recent-students').then(mod => mod.RecentStudents), { 
    ssr: false,
    loading: () => <Skeleton className="h-[300px] w-full" /> 
});
const ActivityFeed = dynamic(() => import('@/components/admin/dashboard/activity-feed').then(mod => mod.ActivityFeed), { 
    ssr: false,
    loading: () => <Skeleton className="h-[300px] w-full" /> 
});
const ExpenseBreakdownChart = dynamic(() => import('@/components/admin/dashboard/expense-breakdown-chart').then(mod => mod.ExpenseBreakdownChart), { 
    ssr: false,
    loading: () => <Skeleton className="mx-auto aspect-square h-[250px] rounded-full" />
});


export default function DashboardPage() {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const reportRef = React.useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = React.useState(false);

  // --- Data Fetching ---
  const allStudentsQuery = React.useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, `libraries/${LIBRARY_ID}/students`));
  }, [firestore, user]);
  const { data: allStudents, isLoading: isLoadingAllStudents } = useCollection<Student>(allStudentsQuery);

  const recentStudentsQuery = React.useMemo(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, `libraries/${LIBRARY_ID}/students`),
      orderBy('createdAt', 'desc'),
      limit(5)
    );
  }, [firestore, user]);
  const { data: recentStudents, isLoading: isLoadingRecentStudents } = useCollection<Student>(recentStudentsQuery);

  const activityLogsQuery = React.useMemo(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, `libraries/${LIBRARY_ID}/activityLogs`),
      orderBy('timestamp', 'desc'),
      limit(5)
    );
  }, [firestore, user]);
  const { data: activityLogs, isLoading: isLoadingActivityLogs } = useCollection<ActivityLog>(activityLogsQuery);
  
  const sixMonthsAgoTimestamp = React.useMemo(() => {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    return Timestamp.fromDate(sixMonthsAgo);
  }, []);

  const paymentsQuery = React.useMemo(() => {
    if (!firestore || !user) return null;
    return query(
        collection(firestore, `libraries/${LIBRARY_ID}/payments`),
        where('paymentDate', '>=', sixMonthsAgoTimestamp)
    );
  }, [firestore, user, sixMonthsAgoTimestamp]);
  const { data: payments, isLoading: isLoadingPayments } = useCollection<Payment>(paymentsQuery);

  const expensesQuery = React.useMemo(() => {
      if (!firestore || !user) return null;
      return query(
          collection(firestore, `libraries/${LIBRARY_ID}/expenses`),
          where('expenseDate', '>=', sixMonthsAgoTimestamp)
      );
  }, [firestore, user, sixMonthsAgoTimestamp]);
  const { data: expenses, isLoading: isLoadingExpenses } = useCollection<Expense>(expensesQuery);

  const isKpiLoading = isLoadingPayments || isLoadingExpenses || isLoadingAllStudents;

  // --- Data Processing for Charts & KPIs ---
  const incomeExpenseData = React.useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        return { month: d.toLocaleString('default', { month: 'short' }), income: 0, expenses: 0 };
    }).reverse();

    payments?.forEach(p => {
        const paymentDate = p.paymentDate?.toDate();
        if (paymentDate) {
            const month = paymentDate.toLocaleString('default', { month: 'short' });
            const monthData = months.find(m => m.month === month);
            if (monthData && p.status === 'paid') {
                monthData.income += p.amount;
            }
        }
    });

    expenses?.forEach(e => {
        const expenseDate = e.expenseDate.toDate();
        const month = expenseDate.toLocaleString('default', { month: 'short' });
        const monthData = months.find(m => m.month === month);
        if (monthData) {
            monthData.expenses += e.amount;
        }
    });

    return months;
  }, [payments, expenses]);

  const totalRevenue = React.useMemo(() => payments?.filter(p => p.status === 'paid').reduce((acc, p) => acc + p.amount, 0) || 0, [payments]);
  const totalExpenses = React.useMemo(() => expenses?.reduce((acc, e) => acc + e.amount, 0) || 0, [expenses]);
  const activeStudentCount = React.useMemo(() => allStudents?.filter(s => s.status === 'active').length || 0, [allStudents]);
  
  const newStudentsThisMonth = React.useMemo(() => {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    return allStudents?.filter(s => s.createdAt.toDate() >= startOfMonth).length || 0;
  }, [allStudents]);

  const handleExportReport = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);

    try {
        const canvas = await html2canvas(reportRef.current, {
            scale: 2,
        });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'px',
            format: [canvas.width, canvas.height]
        });
        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save(`dashboard-report-${Date.now()}.pdf`);
    } catch (error) {
        toast({
            variant: 'destructive',
            title: 'Export Failed',
            description: 'Could not generate the report PDF.',
        });
    } finally {
        setIsExporting(false);
    }
  };


  return (
    <div className="flex flex-col gap-6" ref={reportRef}>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-headline">
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground">
            Here&apos;s a summary of your library&apos;s activity.
          </p>
        </div>
        <Button type="button" onClick={handleExportReport} disabled={isExporting}>
            {isExporting ? <Spinner className="mr-2"/> : <Download className="mr-2" />}
            {isExporting ? 'Exporting...' : 'Export Report'}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Revenue"
          value={new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(totalRevenue)}
          change="last 6 months"
          icon={<IndianRupee />}
          isLoading={isKpiLoading}
        />
        <KpiCard
          title="Total Expenses"
          value={new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(totalExpenses)}
          change="last 6 months"
          icon={<CreditCard />}
          isLoading={isKpiLoading}
        />
        <KpiCard
          title="Active Students"
          value={`${activeStudentCount}`}
          change={`${allStudents?.filter(s => s.status === 'at-risk').length || 0} at-risk`}
          icon={<Users />}
          isLoading={isKpiLoading}
        />
        <KpiCard
          title="New Students"
          value={`+${newStudentsThisMonth}`}
          change="this month"
          icon={<Activity />}
          isLoading={isKpiLoading}
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
            <RecentStudents students={recentStudents || []} isLoading={isLoadingRecentStudents} />
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
            <ActivityFeed logs={activityLogs || []} isLoading={isLoadingActivityLogs} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
