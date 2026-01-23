'use server';

/**
 * @fileOverview A professional bill generator for student libraries.
 *
 * - generateBillText - A function that handles the bill text generation process.
 * - GenerateBillTextInput - The input type for the generateBillText function.
 * - GenerateBillTextOutput - The return type for the generateBillText function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateBillTextInputSchema = z.object({
  bill: z.object({
      id: z.string().describe("The unique identifier for the bill."),
      studentName: z.string().describe("The name of the student being billed."),
      issuedAt: z.string().describe("The ISO 8601 date string when the bill was issued."),
      totalAmount: z.number().describe("The total amount of the bill."),
      lineItems: z.array(z.object({
          description: z.string(),
          quantity: z.number(),
          unitPrice: z.number(),
          total: z.number(),
      })).describe("An array of line items on the bill."),
  }),
  library: z.object({
      name: z.string().describe("The name of the library issuing the bill."),
  })
});

export type GenerateBillTextInput = z.infer<typeof GenerateBillTextInputSchema>;

const GenerateBillTextOutputSchema = z.object({
  billText: z.string().describe('The formatted, professional bill text, suitable for printing.'),
});
export type GenerateBillTextOutput = z.infer<typeof GenerateBillTextOutputSchema>;

export async function generateBillText(input: GenerateBillTextInput): Promise<GenerateBillTextOutput> {
  return generateBillTextFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateBillTextPrompt',
  input: {schema: GenerateBillTextInputSchema},
  output: {schema: GenerateBillTextOutputSchema},
  prompt: `You are a professional billing system. Your job is to generate a formatted bill receipt for a student library.
The bill should be clean, well-structured, and suitable for printing or sharing as a PDF. Use monospaced-friendly characters for alignment.
The output MUST be only the bill text, with no extra commentary.

It must contain:
- The library's name.
- A clear "INVOICE" or "BILL" title.
- Bill ID and Issue Date.
- "Bill To" section with the student's name.
- A table of line items with Description, Qty, Unit Price, and Total.
- Subtotal, Taxes (if any, otherwise omit), and a final Total Amount.
- A clear "Status" indicator (e.g., "PAID").

Here are the details:
Library Name: {{{library.name}}}
Bill Details:
{{{JSONstringify bill}}}

Generate the bill text now.
`,
});

const generateBillTextFlow = ai.defineFlow(
  {
    name: 'generateBillTextFlow',
    inputSchema: GenerateBillTextInputSchema,
    outputSchema: GenerateBillTextOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
