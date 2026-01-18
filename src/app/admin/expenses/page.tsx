import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function ExpensesPage() {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Expenses</CardTitle>
          <CardDescription>Manage your expenses here.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Expense management interface coming soon.</p>
        </CardContent>
      </Card>
    </div>
  );
}
