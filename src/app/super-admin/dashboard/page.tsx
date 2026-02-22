
'use client';

import * as React from 'react';
import { collection, query, getCountFromServer } from 'firebase/firestore';
import { Users, Building2, BarChart3, Activity } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { KpiCard } from '@/components/admin/dashboard/kpi-card';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function SuperAdminDashboard() {
  const firestore = useFirestore();
  const [stats, setStats] = React.useState({ libraries: 0, users: 0 });
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchStats() {
      try {
        const libCount = await getCountFromServer(collection(firestore, 'libraries'));
        const userCount = await getCountFromServer(collection(firestore, 'users'));
        setStats({
          libraries: libCount.data().count,
          users: userCount.data().count,
        });
      } catch (e) {
        console.error("Failed to fetch platform stats", e);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [firestore]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline">Platform Overview</h1>
        <p className="text-muted-foreground">Monitor the health and growth of the CampusHub ecosystem.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Libraries"
          value={stats.libraries.toString()}
          change="active institutions"
          icon={<Building2 />}
          isLoading={loading}
        />
        <KpiCard
          title="Total Platform Users"
          value={stats.users.toString()}
          change="across all roles"
          icon={<Users />}
          isLoading={loading}
        />
        <KpiCard
          title="Platform Uptime"
          value="99.9%"
          change="last 30 days"
          icon={<Activity />}
          isLoading={false}
        />
        <KpiCard
          title="Avg. Engagement"
          value="84%"
          change="+2% from last month"
          icon={<BarChart3 />}
          isLoading={false}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>System Announcements</CardTitle>
            <CardDescription>Global notices for all library administrators.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
                <div className="rounded-lg border p-4 bg-muted/50">
                    <h4 className="font-semibold text-sm">v2.0 Rollout Complete</h4>
                    <p className="text-xs text-muted-foreground mt-1">Multi-role RBAC is now active across all instances.</p>
                </div>
                <div className="rounded-lg border p-4">
                    <h4 className="font-semibold text-sm">Scheduled Maintenance</h4>
                    <p className="text-xs text-muted-foreground mt-1">Database optimization scheduled for Sunday at 02:00 UTC.</p>
                </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Platform Health</CardTitle>
            <CardDescription>Regional service status.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm">
                <span>South Asia (Mumbai)</span>
                <span className="text-success font-medium">Operational</span>
            </div>
            <div className="flex items-center justify-between text-sm">
                <span>Storage Services</span>
                <span className="text-success font-medium">Operational</span>
            </div>
            <div className="flex items-center justify-between text-sm">
                <span>AI Billing Engine</span>
                <span className="text-success font-medium">Operational</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
