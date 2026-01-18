import { Timestamp } from "firebase/firestore";

export interface User {
  id: string;
  libraryId: string;
  role: 'admin' | 'student';
  profile: {
    name: string;
    email: string;
    avatarUrl?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Student {
  id: string; // Custom ID
  docId?: string; // Firestore document ID
  libraryId: string;
  userId?: string; // Optional link to a User account
  name: string;
  email: string;
  status: 'active' | 'inactive' | 'graduated';
  paymentStatus: 'paid' | 'pending' | 'overdue';
  assignedSeatId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Payment {
  id: string;
  libraryId: string;
  studentId: string;
  amount: number;
  paymentDate: Date;
  status: 'paid' | 'pending' | 'overdue';
  createdAt: Date;
  updatedAt: Date;
}

export interface Expense {
  id: string;
  libraryId: string;
  description: string;
  amount: number;
  category: 'utilities' | 'supplies' | 'maintenance' | 'staff' | 'other';
  expenseDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Room {
  id: string;
  libraryId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Seat {
  id: string;
  libraryId: string;
  roomId: string;
  seatNumber: string;
  tier: 'basic' | 'standard' | 'premium';
  assignedStudentId?: string;
  timeSlot?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Announcement {
  id: string;
  libraryId: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Suggestion {
  id: string;
  libraryId: string;
  studentId: string;
  content: string;
  status: 'new' | 'viewed' | 'in-progress' | 'resolved' | 'closed';
  createdAt: Date;
  updatedAt: Date;
}

export interface ActivityLog {
  id?: string;
  libraryId: string;
  activityType: string;
  user: {
    id: string;
    name: string;
  };
  timestamp: Timestamp;
  details: Record<string, any>;
}
