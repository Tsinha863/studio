'use client';

import {
  collection,
  doc,
  getDocs,
  query,
  where,
  Timestamp,
  runTransaction,
  serverTimestamp,
  type Firestore,
} from "firebase/firestore";
import { SeatBooking, Bill, Payment } from "./types";

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */

export type BookingDuration =
  | { type: "hourly"; hours: 4 | 6 | 12 | 24 }
  | { type: "daily" }
  | { type: "monthly"; months: number }
  | { type: "yearly" };

export interface CreateBookingInput {
  libraryId: string;
  roomId: string;
  seatId: string;
  studentId: string;
  studentName: string;
  startTime: Date;
  duration: BookingDuration;
  seatTier: "basic" | "standard" | "premium";
}

/* ─────────────────────────────────────────────
   CORE ENGINE
───────────────────────────────────────────── */

export async function createSeatBooking(db: Firestore, input: CreateBookingInput) {
  const {
    libraryId,
    roomId,
    seatId,
    studentId,
    studentName,
    startTime,
    duration,
    seatTier,
  } = input;

  if (!libraryId || !roomId || !seatId || !studentId) {
    throw new Error("Invalid booking context. Missing required IDs.");
  }

  const start = Timestamp.fromDate(startTime);
  const end = calculateEndTime(startTime, duration);

  const bookingsRef = collection(db, "libraries", libraryId, "seatBookings");
  const billsRef = collection(db, "libraries", libraryId, "bills");

  await runTransaction(db, async (tx) => {
    // 1. CHECK FOR CONFLICTS
    const seatConflictQuery = query(bookingsRef, where("seatId", "==", seatId), where("status", "==", "active"));
    const seatSnap = await getDocs(seatConflictQuery);
    seatSnap.forEach((doc) => {
      const b = doc.data();
      const existingStart = b.startTime.toMillis();
      const existingEnd = b.endTime.toMillis();
      if (start.toMillis() < existingEnd && end.getTime() > existingStart) {
        throw new Error(`Seat is already booked from ${new Date(existingStart).toLocaleTimeString()} to ${new Date(existingEnd).toLocaleTimeString()}`);
      }
    });

    const studentConflictQuery = query(bookingsRef, where("studentId", "==", studentId), where("status", "==", "active"));
    const studentSnap = await getDocs(studentConflictQuery);
    studentSnap.forEach((doc) => {
      const b = doc.data();
      if (start.toMillis() < b.endTime.toMillis() && end.getTime() > b.startTime.toMillis()) {
        throw new Error(`${studentName} already has another booking during this time.`);
      }
    });

    // 2. CREATE BOOKING & BILL
    const bookingRef = doc(bookingsRef);
    const billRef = doc(billsRef);

    const price = calculatePrice(duration, seatTier);
    const lineItems = [{
        description: `Seat ${seatId} Booking (${formatDuration(duration)})`,
        quantity: 1,
        unitPrice: price,
        total: price
    }];

    // Set Bill
    tx.set(billRef, {
        id: billRef.id,
        libraryId,
        studentId,
        studentName,
        bookingId: bookingRef.id,
        lineItems,
        subtotal: price,
        taxes: 0,
        totalAmount: price,
        status: "Due",
        issuedAt: serverTimestamp(),
        dueDate: start,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    } as Omit<Bill, 'paidAt' | 'paymentId'>);

    // Set Booking
    tx.set(bookingRef, {
      id: bookingRef.id,
      libraryId,
      roomId,
      seatId,
      studentId,
      studentName,
      startTime: start,
      endTime: Timestamp.fromDate(end),
      duration,
      seatTier,
      status: "active",
      linkedBillId: billRef.id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    } as SeatBooking);
  });
}

/* ─────────────────────────────────────────────
   HELPERS (PURE LOGIC)
───────────────────────────────────────────── */

function calculateEndTime(start: Date, duration: BookingDuration): Date {
  const d = new Date(start);
  switch (duration.type) {
    case "hourly":
      d.setHours(d.getHours() + duration.hours);
      return d;
    case "daily":
        d.setHours(21,0,0,0); // 9 PM
        return d;
    case "monthly":
      d.setMonth(d.getMonth() + duration.months);
      return d;
    case "yearly":
      d.setFullYear(d.getFullYear() + 1);
      return d;
  }
}

function calculatePrice(duration: BookingDuration, tier: "basic" | "standard" | "premium"): number {
    const pricing = {
        hourly: { basic: 20, standard: 30, premium: 40 },
        daily: { basic: 200, standard: 300, premium: 400 },
        monthly: { basic: 4000, standard: 5000, premium: 6000 },
    }
  
    switch (duration.type) {
        case "hourly":
            if (duration.hours === 24) return pricing.daily[tier];
            return pricing.hourly[tier] * duration.hours;
        case "daily":
            return pricing.daily[tier];
        case "monthly":
            return pricing.monthly[tier] * duration.months;
        case "yearly":
            return pricing.monthly[tier] * 12 * 0.9; // 10% discount for yearly
  }
}

function formatDuration(duration: BookingDuration): string {
    switch (duration.type) {
        case 'hourly': return `${duration.hours} Hours`;
        case 'daily': return 'Full Day';
        case 'monthly': return `${duration.months} Month(s)`;
        case 'yearly': return '1 Year';
    }
}
