import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function SeatingPage() {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Seating</CardTitle>
          <CardDescription>Manage your seating arrangements here.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Seating management interface coming soon.</p>
        </CardContent>
      </Card>
    </div>
  );
}
