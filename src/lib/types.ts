'use client';

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
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type TimeSlot = 'morning' | 'afternoon' | 'night';

export interface Student {
  id: string; // Custom ID, used as Firestore document ID.
  libraryId: string;
  userId?: string; // Optional link to a User account
  name: string;
  email: string;
  status: 'active' | 'at-risk' | 'inactive';
  assignments: {
    seatId: string;
    roomId: string;
    timeSlot: TimeSlot;
  }[];
  fibonacciStreak: number;
  paymentDue: number;
  lastInteractionAt: Timestamp;
  notes: Array<{ text: string; createdAt: Timestamp; authorId: string; authorName: string; }>;
  tags: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Payment {
  id: string; // Firestore document ID
  libraryId: string;
  studentId: string; // The custom student ID
  studentName: string;
  amount: number;
  paymentDate: Timestamp | null; // Null if not paid
  dueDate: Timestamp;
  status: 'paid' | 'pending' | 'overdue';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type ExpenseCategory = 'rent' | 'utilities' | 'supplies' | 'salaries' | 'other';

export interface Expense {
  id: string; // Firestore document ID
  libraryId: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  expenseDate: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Room {
  id: string;
  libraryId: string;
  name: string;
  capacity: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Represents a single seat within a room.
 * The document ID itself is the canonical, human-readable seat number (e.g., '1', '25').
 */
export interface Seat {
  id: string; // The document ID, which is the seat number.
  libraryId: string;
  roomId: string;
  tier: 'basic' | 'standard' | 'premium';
  assignments: {
    morning?: { studentId: string; studentName: string; };
    afternoon?: { studentId: string; studentName: string; };
    night?: { studentId: string; studentName: string; };
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Announcement {
  id: string;
  libraryId: string;
  title: string;
  content: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Suggestion {
  id: string;
  libraryId: string;
  studentId: string;
  content: string;
  status: 'new' | 'viewed' | 'in-progress' | 'resolved' | 'closed';
  createdAt: Timestamp;
  updatedAt: Timestamp;
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

export type PrintRequestStatus = 'Pending' | 'Approved' | 'Rejected';

export interface PrintRequest {
  id: string;
  libraryId: string;
  studentId: string;
  studentName: string;
  seatId: string | null;
  fileUrl: string;
  fileName: string;
  notes: string;
  status: PrintRequestStatus;
  rejectionReason?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
