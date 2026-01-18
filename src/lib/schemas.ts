'use client';

import { z } from 'zod';

export const studentFormSchema = z.object({
  id: z.string().min(1, 'Student ID is required.'),
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  email: z.string().email('Please enter a valid email address.'),
  status: z.enum(['active', 'at-risk', 'inactive']),
});

export type StudentFormValues = z.infer<typeof studentFormSchema>;

export const expenseFormSchema = z.object({
  description: z.string().min(3, 'Description must be at least 3 characters.'),
  amount: z.coerce.number().positive('Amount must be a positive number.'),
  category: z.enum(['rent', 'utilities', 'supplies', 'salaries', 'other']),
  expenseDate: z.date(),
});

export type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

export const roomFormSchema = z.object({
  name: z.string().min(1, 'Room name is required.'),
  capacity: z.coerce.number().int().min(1, 'Capacity must be at least 1.'),
  tier: z.enum(['basic', 'standard', 'premium']),
});

export type RoomFormValues = z.infer<typeof roomFormSchema>;

export const announcementFormSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters.'),
  content: z.string().min(10, 'Content must be at least 10 characters.'),
});

export type AnnouncementFormValues = z.infer<typeof announcementFormSchema>;

export const suggestionStatusSchema = z.object({
    status: z.enum(['new', 'viewed', 'in-progress', 'resolved', 'closed']),
});

export type SuggestionStatusValues = z.infer<typeof suggestionStatusSchema>;
