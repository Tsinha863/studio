import {
  Activity,
  IndianRupee,
  Users,
  CreditCard,
  Plus,
} from 'lucide-react';
import { KpiCard } from '@/components/admin/dashboard/kpi-card';
import { PaymentsChart } from '@/components/admin/dashboard/payments-chart';
import { IncomeExpenseChart } from '@/components/admin/dashboard/income-expense-chart';
import { RecentStudents } from '@/components/admin/dashboard/recent-students';
import { ActivityFeed } from '@/components/admin/dashboard/activity-feed';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import {
  kpiData,
  paymentsData,
  incomeExpenseData,
  recentStudentsData,
  activityLogsData,
} from '@/lib/dummy-data';

export default function DashboardPage() {
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
        <div className="flex items-center gap-2">
          <Button variant="outline">Export</Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Add New
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Revenue"
          value={`₹${kpiData.totalRevenue.toLocaleString()}`}
          change="+20.1% from last month"
          icon={<IndianRupee />}
        />
        <KpiCard
          title="Total Expenses"
          value={`₹${kpiData.totalExpenses.toLocaleString()}`}
          change="+18.1% from last month"
          icon={<CreditCard />}
        />
        <KpiCard
          title="Active Students"
          value={`+${kpiData.activeStudents.toLocaleString()}`}
          change="+2 since last month"
          icon={<Users />}
        />
        <KpiCard
          title="New Students (Month)"
          value={`+${kpiData.newStudents.toLocaleString()}`}
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
            <CardTitle>Payment Status</CardTitle>
            <CardDescription>
              A breakdown of recent student payment statuses.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PaymentsChart data={paymentsData} />
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
            <RecentStudents students={recentStudentsData} />
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
            <ActivityFeed logs={activityLogsData} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
