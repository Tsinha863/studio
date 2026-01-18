'use client';

import { z } from 'zod';

export const studentFormSchema = z.object({
  id: z.string().min(1, 'Student ID is required.'),
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  email: z.string().email('Please enter a valid email address.'),
  paymentStatus: z.enum(['paid', 'pending', 'overdue']),
  assignedSeatId: z.string().optional(),
});

export type StudentFormValues = z.infer<typeof studentFormSchema>;
