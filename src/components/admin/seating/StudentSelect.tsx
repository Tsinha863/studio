"use client";

import { cn } from "@/lib/utils";

type Student = {
  id: string;
  name: string;
};

interface Props {
  students: Student[];
  loading: boolean;
  value: string | null;
  onChange: (student: { id: string; name: string } | null) => void;
}

export default function StudentSelect({
  students,
  loading,
  value,
  onChange,
}: Props) {
  const selectClassName = "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

  if (loading) {
    return (
      <select disabled className={cn(selectClassName, "animate-pulse")}>
        <option>Loading students…</option>
      </select>
    );
  }

  if (!students || students.length === 0) {
    return (
      <select disabled className={cn(selectClassName)}>
        <option>No active students found</option>
      </select>
    );
  }

  return (
    <select
      className={selectClassName}
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
