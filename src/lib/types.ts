'use client';

import { Timestamp } from "firebase/firestore";
import type { BookingDuration as EngineBookingDuration } from './booking-engine';

export type BookingDuration = EngineBookingDuration;

export interface Library {
    id: string;
    name: string;
    address: string;
    ownerId: string;
    contactEmail?: string;
    contactPhone?: string;
    timezone?: string;
    billingCycle?: 'monthly' | 'yearly';
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface User {
  id: string;
  libraryId: string;
  role: 'libraryOwner' | 'student';
  name: string;
  email: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Student {
  id: string;
  libraryId: string;
  userId?: string; // Optional link to a User account
  name: string;
  email: string;
  status: 'active' | 'at-risk' | 'inactive';
  fibonacciStreak: number;
  lastInteractionAt: Timestamp;
  notes: Array<{ text: string; createdAt: Timestamp; authorId: string; authorName: string; }>;
  tags: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Bill {
  id: string;
  libraryId: string;
  studentId: string;
  studentName: string;
  bookingId?: string;
  paymentId?: string;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  taxes: number;
  totalAmount: number;
  status: 'Due' | 'Paid' | 'Overdue' | 'Cancelled';
  issuedAt: Timestamp;
  dueDate: Timestamp;
  paidAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Payment {
  id: string;
  libraryId: string;
  studentId: string;
  billId: string;
  amount: number;
  paymentDate: Timestamp;
  method: 'Admin' | 'Cash' | 'Online';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type ExpenseCategory = 'rent' | 'utilities' | 'supplies' | 'salaries' | 'other';

export interface Expense {
  id: string;
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
  id: string;
  libraryId: string;
  roomId: string;
  tier: 'basic' | 'standard' | 'premium';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface SeatBooking {
  id: string;
  libraryId: string;
  roomId: string;
  seatId: string;
  studentId: string;
  studentName: string;
  startTime: Timestamp;
  endTime: Timestamp;
  duration: BookingDuration;
  seatTier: 'basic' | 'standard' | 'premium';
  status: 'active' | 'completed' | 'cancelled';
  linkedBillId: string;
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
  studentName?: string;
  content: string;
  status: 'new' | 'viewed' | 'in-progress' | 'resolved' | 'closed';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ActivityLog {
  id: string;
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

export interface Invite {
    id: string;
    libraryId: string;
    role: 'student';
    email?: string;
    inviteCode: string;
    expiresAt: Timestamp;
    used: boolean;
    usedBy?: string;
    createdBy: string;
    createdAt: Timestamp;
}

export interface OwnershipTransfer {
    id: string;
    libraryId: string;
    fromOwnerId: string;
    toUserId: string;
    toUserName: string;
    status: 'pending' | 'accepted' | 'cancelled';
    createdAt: Timestamp;
    expiresAt: Timestamp;
    resolvedAt?: Timestamp;
}
