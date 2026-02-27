'use client';

import {
  collection,
  doc,
  query,
  where,
  Timestamp,
  runTransaction,
  serverTimestamp,
  type Firestore,
} from "firebase/firestore";
import { SeatBooking, Bill, Seat } from "./types";

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

/**
 * Robust, transaction-safe booking engine.
 * Prevents overbooking and ensures price consistency based on seat-specific overrides.
 */
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
  const seatRef = doc(db, `libraries/${libraryId}/rooms/${roomId}/seats/${seatId}`);

  await runTransaction(db, async (tx) => {
    // 1. Authoritative Conflict Check
    const seatConflictQuery = query(
      bookingsRef, 
      where("seatId", "==", seatId), 
      where("status", "==", "active"),
      where("endTime", ">", start)
    );
    const seatSnap = await tx.get(seatConflictQuery);
    for (const doc of seatSnap.docs) {
      const b = doc.data() as SeatBooking;
      if (b.startTime.toDate() < end) {
        throw new Error(`Seat is already booked from ${b.startTime.toDate().toLocaleTimeString()} to ${b.endTime.toDate().toLocaleTimeString()}`);
      }
    }

    const studentConflictQuery = query(
        bookingsRef, 
        where("studentId", "==", studentId), 
        where("status", "==", "active"),
        where("endTime", ">", start)
    );
    const studentSnap = await tx.get(studentConflictQuery);
    for (const doc of studentSnap.docs) {
        const b = doc.data() as SeatBooking;
        if (b.startTime.toDate() < end) {
            throw new Error(`${studentName} already has another active booking during this window.`);
        }
    }

    // 2. Fetch Pricing Data
    const seatDoc = await tx.get(seatRef);
    const seatData = seatDoc.data() as Seat;
    
    // Resolve price: Custom Seat Override -> Library Tier Default -> System Minimum
    const price = calculatePrice(duration, seatTier, seatData?.customPricing);

    // 3. Commit Atomic Records
    const bookingRef = doc(bookingsRef);
    const billRef = doc(billsRef);

    const lineItems = [{
        description: `Seat ${seatId} Booking (${formatDuration(duration)})`,
        quantity: 1,
        unitPrice: price,
        total: price
    }];

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
    });

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
    });
  });
}

function calculateEndTime(start: Date, duration: BookingDuration): Date {
  const d = new Date(start);
  switch (duration.type) {
    case "hourly":
      d.setHours(d.getHours() + duration.hours);
      return d;
    case "daily":
        d.setHours(21,0,0,0); // Standard facility close: 9 PM
        return d;
    case "monthly":
      d.setMonth(d.getMonth() + duration.months);
      return d;
    case "yearly":
      d.setFullYear(d.getFullYear() + 1);
      return d;
  }
}

function calculatePrice(
    duration: BookingDuration, 
    tier: "basic" | "standard" | "premium", 
    customOverrides?: Record<string, number>
): number {
    // Priority 1: Seat-specific overrides
    if (customOverrides) {
        if (duration.type === 'hourly' && customOverrides.hourly) return customOverrides.hourly * duration.hours;
        if (duration.type === 'daily' && customOverrides.daily) return customOverrides.daily;
        if (duration.type === 'monthly' && customOverrides.monthly) return customOverrides.monthly * duration.months;
    }

    // Priority 2: Library-wide tier defaults
    const pricing = {
        hourly: { basic: 25, standard: 40, premium: 60 },
        daily: { basic: 250, standard: 400, premium: 600 },
        monthly: { basic: 4500, standard: 6000, premium: 8500 },
    };
  
    switch (duration.type) {
        case "hourly":
            return pricing.hourly[tier] * duration.hours;
        case "daily":
            return pricing.daily[tier];
        case "monthly":
            return pricing.monthly[tier] * duration.months;
        case "yearly":
            return pricing.monthly[tier] * 12 * 0.85; // 15% annual loyalty discount
  }
}

function formatDuration(duration: BookingDuration): string {
    switch (duration.type) {
        case 'hourly': return `${duration.hours} Hours`;
        case 'daily': return 'Full Day Access';
        case 'monthly': return `${duration.months} Month(s)`;
        case 'yearly': return 'Annual Membership';
    }
}
