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

export interface Student {
  id: string; // Custom ID, used as Firestore document ID. Immutable.
  docId: string; // Firestore document ID
  libraryId: string;
  userId?: string; // Optional link to a User account
  name: string;
  email: string;
  status: 'active' | 'at-risk' | 'inactive';
  assignedSeatId?: string | null; // Firestore Document ID of the Seat
  assignedRoomId?: string | null; // Firestore Document ID of the Room
  assignedSeatLabel?: string | null; // Denormalized human-readable seat number
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
  docId?: string; // Firestore document ID
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
  docId?: string;
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
  studentId?: string | null; // This is the Student's Firestore Document ID
  studentName?: string | null; // Denormalized for quick display
  timeSlot?: string;
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

    