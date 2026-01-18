import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function StudentsPage() {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Students</CardTitle>
          <CardDescription>Manage your students here.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Student management interface coming soon.</p>
        </CardContent>
      </Card>
    </div>
  );
}
