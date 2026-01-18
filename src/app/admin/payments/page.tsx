import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function PaymentsPage() {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Payments</CardTitle>
          <CardDescription>Manage your payments here.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Payment management interface coming soon.</p>
        </CardContent>
      </Card>
    </div>
  );
}
