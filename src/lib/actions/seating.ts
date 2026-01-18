'use server';

import {
  Firestore,
  doc,
  collection,
  serverTimestamp,
  writeBatch,
  runTransaction,
  query,
  where,
  getDocs,
  getDoc,
  WriteBatch,
} from 'firebase/firestore';
import type { RoomFormValues } from '../schemas';
import type { Student } from '../types';

type ActionResponse = {
  success: boolean;
  error?: string;
};

type Actor = {
  id: string;
  name: string;
};

const activityLogsCol = (db: Firestore, libraryId: string) =>
  collection(db, `libraries/${libraryId}/activityLogs`);

// Helper to add activity log to a batch
const addLogToBatch = (
  batch: WriteBatch,
  db: Firestore,
  libraryId: string,
  actor: Actor,
  activityType: string,
  details: Record<string, any>
) => {
  const logRef = doc(activityLogsCol(db, libraryId));
  batch.set(logRef, {
    libraryId,
    user: actor,
    activityType,
    details,
    timestamp: serverTimestamp(),
  });
};

export async function createRoomAndSeats(
  db: Firestore,
  libraryId: string,
  data: RoomFormValues,
  actor: Actor
): Promise<ActionResponse> {
  try {
    const batch = writeBatch(db);

    // 1. Create the room document
    const roomRef = doc(collection(db, `libraries/${libraryId}/rooms`));
    batch.set(roomRef, {
      ...data,
      libraryId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // 2. Create the seat documents within the room's subcollection
    const seatsColRef = collection(db, `libraries/${libraryId}/rooms/${roomRef.id}/seats`);
    for (let i = 1; i <= data.capacity; i++) {
      const seatRef = doc(seatsColRef);
      batch.set(seatRef, {
        seatNumber: i.toString(),
        roomId: roomRef.id,
        libraryId,
        tier: 'standard', // Default tier
        studentId: null,
        studentName: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    // 3. Create activity log
    addLogToBatch(batch, db, libraryId, actor, 'room_created', {
      roomId: roomRef.id,
      name: data.name,
      capacity: data.capacity,
    });

    await batch.commit();
    return { success: true };
  } catch (e: any) {
    console.error('Error creating room and seats:', e);
    return { success: false, error: e.message || 'An unknown error occurred.' };
  }
}

export async function assignSeat(
  db: Firestore,
  libraryId: string,
  roomId: string,
  seatId: string,
  studentDocId: string, // The Firestore document ID of the student
  actor: Actor
): Promise<ActionResponse> {
  try {
    await runTransaction(db, async (transaction) => {
      // 1. Define references
      const seatRef = doc(db, `libraries/${libraryId}/rooms/${roomId}/seats/${seatId}`);
      const studentRef = doc(db, `libraries/${libraryId}/students/${studentDocId}`);

      // 2. Read documents
      const seatDoc = await transaction.get(seatRef);
      const studentDoc = await transaction.get(studentRef);

      if (!seatDoc.exists()) throw new Error('Seat not found.');
      if (!studentDoc.exists()) throw new Error('Student not found.');

      if (seatDoc.data().studentId) throw new Error('Seat is already assigned.');

      const studentData = studentDoc.data() as Student;
      if (studentData.assignedSeatId) {
         // Optionally, unassign the old seat first, but for now we'll just throw.
         throw new Error(`Student is already assigned to seat ${studentData.assignedSeatId}.`);
      }

      // 3. Perform writes
      // Assign seat to student
      transaction.update(seatRef, {
        studentId: studentData.id, // Custom student ID
        studentName: studentData.name,
        updatedAt: serverTimestamp(),
      });

      // Assign student to seat
      transaction.update(studentRef, {
        assignedSeatId: seatDoc.data().seatNumber,
        updatedAt: serverTimestamp(),
      });

      // 4. Log activity (within transaction)
      const logRef = doc(activityLogsCol(db, libraryId));
      transaction.set(logRef, {
        libraryId,
        user: actor,
        activityType: 'seat_assigned',
        details: {
          studentName: studentData.name,
          seatNumber: seatDoc.data().seatNumber,
          roomId: roomId,
        },
        timestamp: serverTimestamp(),
      });
    });

    return { success: true };
  } catch (e: any) {
    console.error('Error assigning seat:', e);
    return { success: false, error: e.message || 'An unknown error occurred.' };
  }
}

export async function unassignSeat(
  db: Firestore,
  libraryId: string,
  roomId: string,
  seatId: string,
  actor: Actor
): Promise<ActionResponse> {
  try {
    await runTransaction(db, async (transaction) => {
      // 1. Define references
      const seatRef = doc(db, `libraries/${libraryId}/rooms/${roomId}/seats/${seatId}`);
      
      // 2. Read seat document
      const seatDoc = await transaction.get(seatRef);
      if (!seatDoc.exists()) throw new Error('Seat not found.');
      
      const seatData = seatDoc.data();
      const studentCustomId = seatData.studentId;

      if (!studentCustomId) {
        // Seat is already unassigned, no-op.
        return;
      }
      
      // Find student document by its custom ID field
      const studentQuery = query(collection(db, `libraries/${libraryId}/students`), where('id', '==', studentCustomId));
      const studentQuerySnapshot = await getDocs(studentQuery);

      if (studentQuerySnapshot.empty) {
        // Student might have been deleted, proceed with unassigning seat anyway
        console.warn(`Student with custom ID ${studentCustomId} not found, but unassigning seat.`);
      } else {
        const studentDocRef = studentQuerySnapshot.docs[0].ref;
        // Unassign seat from student
        transaction.update(studentDocRef, {
          assignedSeatId: null,
          updatedAt: serverTimestamp(),
        });
      }

      // Unassign student from seat
      transaction.update(seatRef, {
        studentId: null,
        studentName: null,
        updatedAt: serverTimestamp(),
      });

      // 4. Log activity
      const logRef = doc(activityLogsCol(db, libraryId));
      transaction.set(logRef, {
        libraryId,
        user: actor,
        activityType: 'seat_unassigned',
        details: {
          studentName: seatData.studentName,
          seatNumber: seatData.seatNumber,
          roomId: roomId,
        },
        timestamp: serverTimestamp(),
      });
    });

    return { success: true };
  } catch (e: any) {
    console.error('Error unassigning seat:', e);
    return { success: false, error: e.message || 'An unknown error occurred.' };
  }
}
