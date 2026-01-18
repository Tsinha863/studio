import type { Payment, Expense, Student, ActivityLog } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export const kpiData = {
  totalRevenue: 4050.50,
  totalExpenses: 1275.00,
  activeStudents: 78,
  newStudents: 5,
};

export const paymentsData: Payment[] = [
  { id: '1', amount: 50, status: 'paid' },
  { id: '2', amount: 50, status: 'paid' },
  { id: '3', amount: 50, status: 'pending' },
  { id: '4', amount: 50, status: 'paid' },
  { id: '5', amount: 50, status: 'overdue' },
  { id: '6', amount: 50, status: 'paid' },
  { id: '7', amount: 50, status: 'paid' },
].map(p => ({
  ...p,
  libraryId: 'demo-library',
  studentId: `student-${p.id}`,
  paymentDate: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
}));

export const incomeExpenseData = [
  { month: "Jan", income: 2000, expenses: 800 },
  { month: "Feb", income: 2500, expenses: 1000 },
  { month: "Mar", income: 2200, expenses: 1100 },
  { month: "Apr", income: 2800, expenses: 1200 },
  { month: "May", income: 3200, expenses: 1300 },
  { month: "Jun", income: 3500, expenses: 1500 },
];

export const recentStudentsData: Student[] = [
  {
    id: '1',
    name: 'Olivia Martin',
    email: 'olivia.martin@email.com',
  },
  {
    id: '2',
    name: 'Jackson Lee',
    email: 'jackson.lee@email.com',
  },
  {
    id: '3',
    name: 'Isabella Nguyen',
    email: 'isabella.nguyen@email.com',
  },
  {
    id: '4',
    name: 'William Kim',
    email: 'william.kim@email.com',
  },
  {
    id: '5',
    name: 'Sofia Davis',
    email: 'sofia.davis@email.com',
  },
].map((s, index) => ({
  ...s,
  libraryId: 'demo-library',
  status: 'active',
  fibonacciStreak: index,
  createdAt: new Date(new Date().setDate(new Date().getDate() - index)),
  updatedAt: new Date(),
}));

export const activityLogsData: ActivityLog[] = [
    {
        id: "1",
        action: "Payment Received",
        user: { id: "user-1", name: "Admin" },
        timestamp: new Date(Date.now() - 3600000 * 0.5),
        details: { studentName: "Olivia Martin", amount: "₹50.00" }
    },
    {
        id: "2",
        action: "New Student Added",
        user: { id: "user-1", name: "Admin" },
        timestamp: new Date(Date.now() - 3600000 * 1),
        details: { studentName: "Sofia Davis" }
    },
    {
        id: "3",
        action: "Seat Assigned",
        user: { id: "user-1", name: "Admin" },
        timestamp: new Date(Date.now() - 3600000 * 2.5),
        details: { studentName: "Jackson Lee", seat: "A12" }
    },
    {
        id: "4",
        action: "Expense Recorded",
        user: { id: "user-1", name: "Admin" },
        timestamp: new Date(Date.now() - 3600000 * 4),
        details: { category: "Supplies", amount: "₹120.00" }
    },
    {
        id: "5",
        action: "Announcement Posted",
        user: { id: "user-1", name: "Admin" },
        timestamp: new Date(Date.now() - 3600000 * 6),
        details: { title: "Library Hour Changes" }
    }
].map(log => ({ ...log, libraryId: "demo-library" }));
