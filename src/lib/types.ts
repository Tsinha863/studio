
'use client';

import { Timestamp } from "firebase/firestore";
import type { BookingDuration as EngineBookingDuration } from './booking-engine';

export type BookingDuration = EngineBookingDuration;

export type UserRole = 'admin' | 'libraryOwner' | 'libraryStaff' | 'student';

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
  libraryId?: string;
  role: UserRole;
  name: string;
  email: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Student {
  id: string;
  libraryId: string;
  userId?: string;
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

export interface Invite {
    id: string;
    libraryId: string;
    role: 'student' | 'libraryStaff';
    email?: string;
    inviteCode: string;
    expiresAt: Timestamp;
    used: boolean;
    usedBy?: string;
    createdBy: string;
    createdAt: Timestamp;
}

export interface Room {
  id: string;
  libraryId: string;
  name: string;
  capacity: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

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

export interface PrintRequest {
  id: string;
  libraryId: string;
  studentId: string;
  studentName: string;
  seatId: string | null;
  fileUrl: string;
  fileName: string;
  notes: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  rejectionReason?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Expense {
  id: string;
  libraryId: string;
  description: string;
  amount: number;
  category: 'rent' | 'utilities' | 'supplies' | 'salaries' | 'other';
  expenseDate: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
