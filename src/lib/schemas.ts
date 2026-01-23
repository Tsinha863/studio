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

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

export const printRequestFormSchema = z.object({
  file: z
    .instanceof(File, { message: 'A file is required.' })
    .refine((file) => file.size <= MAX_FILE_SIZE, 'Max file size is 5MB.')
    .refine(
      (file) => ACCEPTED_FILE_TYPES.includes(file.type),
      'Only .pdf, .jpg, .png, and .webp formats are supported.'
    ),
  notes: z.string().max(200, 'Notes must be 200 characters or less.').optional(),
});

export type PrintRequestFormValues = z.infer<typeof printRequestFormSchema>;

export const signupSchema = z
  .object({
    name: z
      .string()
      .min(2, { message: 'Name must be at least 2 characters long.' }),
    email: z.string().email({ message: 'Please enter a valid email address.' }),
    password: z
      .string()
      .min(8, { message: 'Password must be at least 8 characters long.' }),
    confirmPassword: z.string(),
    role: z.enum(['student', 'libraryOwner'], {
      required_error: 'You must select a role.',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export type SignupFormValues = z.infer<typeof signupSchema>;
