'use server';

/**
 * @fileOverview A simulated receipt generator for student payments.
 *
 * - generateSimulatedReceipt - A function that handles the receipt generation process.
 * - GenerateSimulatedReceiptInput - The input type for the generateSimulatedReceipt function.
 * - GenerateSimulatedReceiptOutput - The return type for the generateSimulatedReceipt function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateSimulatedReceiptInputSchema = z.object({
  studentName: z.string().describe('The name of the student.'),
  paymentAmount: z.number().describe('The amount paid by the student.'),
  paymentDate: z.string().describe('The date the payment was made (YYYY-MM-DD).'),
  fibonacciStreak: z.number().describe('The student\u2019s current Fibonacci streak.'),
  studentStatus: z.string().describe('The current status of the student (e.g., active, inactive).'),
  paymentId: z.string().describe('The payment ID'),
});
export type GenerateSimulatedReceiptInput = z.infer<typeof GenerateSimulatedReceiptInputSchema>;

const GenerateSimulatedReceiptOutputSchema = z.object({
  receiptText: z.string().describe('The simulated receipt text.'),
});
export type GenerateSimulatedReceiptOutput = z.infer<typeof GenerateSimulatedReceiptOutputSchema>;

export async function generateSimulatedReceipt(input: GenerateSimulatedReceiptInput): Promise<GenerateSimulatedReceiptOutput> {
  return generateSimulatedReceiptFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateSimulatedReceiptPrompt',
  input: {schema: GenerateSimulatedReceiptInputSchema},
  output: {schema: GenerateSimulatedReceiptOutputSchema},
  prompt: `You are an accounting and finance expert for a student library.

  Your job is to generate a simulated receipt that acknowledges a payment from a student.
  The receipt should clearly state the student's name, the amount paid, the date of payment, their fibonacci streak, their student status, and the payment ID.
  The receipt should also congratulate them on their current fibonacci streak, and encourage them to maintain it.

  Here are the details:
  Student Name: {{{studentName}}}
  Payment Amount: {{{paymentAmount}}}
  Payment Date: {{{paymentDate}}}
  Fibonacci Streak: {{{fibonacciStreak}}}
  Student Status: {{{studentStatus}}}
  Payment ID: {{{paymentId}}}

  Please generate a simulated receipt based on the above information.
`,
});

const generateSimulatedReceiptFlow = ai.defineFlow(
  {
    name: 'generateSimulatedReceiptFlow',
    inputSchema: GenerateSimulatedReceiptInputSchema,
    outputSchema: GenerateSimulatedReceiptOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
