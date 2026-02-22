
'use client';

import * as React from 'react';
import { collection, query, where, getCountFromServer } from 'firebase/firestore';
import { Users, Armchair, Printer, Lightbulb } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { KpiCard } from '@/components/admin/dashboard/kpi-card';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function StaffDashboard() {
  const { firestore, libraryId } = useFirebase();
  const [stats, setStats] = React.useState({ students: 0, pendingPrints: 0, suggestions: 0 });
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!firestore || !libraryId) return;
    
    async function fetchStaffStats() {
      try {
        const studentRef = collection(firestore, `libraries/${libraryId}/students`);
        const printRef = collection(firestore, `libraries/${libraryId}/printRequests`);
        const suggRef = collection(firestore, `libraries/${libraryId}/suggestions`);

        const [sCount, pCount, suCount] = await Promise.all([
          getCountFromServer(query(studentRef, where('status', '==', 'active'))),
          getCountFromServer(query(printRef, where('status', '==', 'Pending'))),
          getCountFromServer(query(suggRef, where('status', '==', 'new'))),
        ]);

        setStats({
          students: sCount.data().count,
          pendingPrints: pCount.data().count,
          suggestions: suCount.data().count,
        });
      } catch (e) {
        console.error("Staff stats failed", e);
      } finally {
        setLoading(false);
      }
    }
    fetchStaffStats();
  }, [firestore, libraryId]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight font-headline">Operational Dashboard</h1>
        <p className="text-muted-foreground">Manage the daily flow of students and requests.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Active Students"
          value={stats.students.toString()}
          change="currently registered"
          icon={<Users />}
          isLoading={loading}
        />
        <KpiCard
          title="Live Occupancy"
          value="72%"
          change="seats currently in use"
          icon={<Armchair />}
          isLoading={false}
        />
        <KpiCard
          title="Pending Prints"
          value={stats.pendingPrints.toString()}
          change="awaiting approval"
          icon={<Printer />}
          isLoading={loading}
        />
        <KpiCard
          title="New Feedback"
          value={stats.suggestions.toString()}
          change="recent suggestions"
          icon={<Lightbulb />}
          isLoading={loading}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Staff Reminders</CardTitle>
            <CardDescription>Daily operational checklist.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
                <li className="flex items-center gap-3 text-sm p-3 rounded-md bg-muted/50 border">
                    <input type="checkbox" className="h-4 w-4" />
                    <span>Check printer paper and toner levels</span>
                </li>
                <li className="flex items-center gap-3 text-sm p-3 rounded-md bg-muted/50 border">
                    <input type="checkbox" className="h-4 w-4" />
                    <span>Verify seating assignments for evening shift</span>
                </li>
                <li className="flex items-center gap-3 text-sm p-3 rounded-md bg-muted/50 border">
                    <input type="checkbox" className="h-4 w-4" />
                    <span>Review pending suggestions from the morning</span>
                </li>
            </ul>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Support Links</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <button className="text-left text-sm text-primary hover:underline">Internal Staff Wiki</button>
            <button className="text-left text-sm text-primary hover:underline">Contact System Admin</button>
            <button className="text-left text-sm text-primary hover:underline">Report Facility Issue</button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
