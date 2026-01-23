"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { firestore as db } from "@/firebase";
import { cn } from "@/lib/utils";

type Student = {
  id: string;
  name: string;
};

interface Props {
  libraryId: string | null;
  value: string | null;
  onChange: (student: { id: string; name: string } | null) => void;
}

export default function StudentSelect({
  libraryId,
  value,
  onChange,
}: Props) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 🔒 HARD GUARD — prevents unknown-collection
    if (!libraryId) {
      setStudents([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadStudents() {
      try {
        setLoading(true);

        const q = query(
          collection(db, "libraries", libraryId, "students"),
          where("status", "==", "active") // optional but recommended
        );

        const snap = await getDocs(q);

        if (cancelled) return;

        setStudents(
          snap.docs.map((doc) => ({
            id: doc.id,
            name: doc.data().name ?? "Unnamed Student",
          }))
        );
      } catch (err) {
        console.error("Failed to load students", err);
        setStudents([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadStudents();

    return () => {
      cancelled = true;
    };
  }, [libraryId]);

  /* ───────────────────────────── */

  if (loading) {
    return (
      <select disabled className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-muted px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 animate-pulse">
        <option>Loading students…</option>
      </select>
    );
  }

  if (!students.length) {
    return (
      <select disabled className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
        <option>No active students found</option>
      </select>
    );
  }

  return (
    <select
      className={cn("flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50")}
      value={value ?? ""}
      onChange={(e) => {
        const selectedId = e.target.value;
        const student = students.find((s) => s.id === selectedId) || null;
        onChange(student);
      }}
    >
      <option value="" disabled>
        Select a student…
      </option>

      {students.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
    </select>
  );
}
