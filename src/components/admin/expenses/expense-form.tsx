'use client';

import * as React from 'react';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import {
  doc,
  collection,
  serverTimestamp,
  writeBatch,
  Timestamp,
  updateDoc,
  setDoc,
} from 'firebase/firestore';

import { useFirebase } from '@/firebase';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { Expense, ExpenseCategory } from '@/lib/types';
import { expenseFormSchema, type ExpenseFormValues } from '@/lib/schemas';
import { Spinner } from '@/components/spinner';
import { Label } from '@/components/ui/label';

type ExpenseWithId = Expense & { id: string };

interface ExpenseFormProps {
  expense?: ExpenseWithId;
  libraryId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const categories: ExpenseCategory[] = ['rent', 'utilities', 'supplies', 'salaries', 'other'];

export function ExpenseForm({ expense, libraryId, onSuccess, onCancel }: ExpenseFormProps) {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [description, setDescription] = React.useState('');
  const [amount, setAmount] = React.useState<number | string>('');
  const [category, setCategory] = React.useState<ExpenseCategory>('other');
  const [expenseDate, setExpenseDate] = React.useState<Date | undefined>(new Date());
  const [errors, setErrors] = React.useState<Partial<Record<keyof ExpenseFormValues, string>>>({});

  React.useEffect(() => {
    if (expense) {
      setDescription(expense.description || '');
      setAmount(expense.amount || '');
      setCategory(expense.category || 'other');
      setExpenseDate(expense.expenseDate ? expense.expenseDate.toDate() : new Date());
    } else {
      setDescription('');
      setAmount('');
      setCategory('other');
      setExpenseDate(new Date());
    }
  }, [expense]);

  const handleSubmit = async () => {
    if (!firestore || !user) {
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'You must be logged in to manage expenses.',
      });
      return;
    }

    setErrors({});
    const data = {
      description,
      amount: Number(amount),
      category,
      expenseDate: expenseDate || new Date(),
    };

    const validation = expenseFormSchema.safeParse(data);
    if (!validation.success) {
      const newErrors: Partial<Record<keyof ExpenseFormValues, string>> = {};
      validation.error.errors.forEach((err) => {
        const path = err.path[0] as keyof ExpenseFormValues;
        newErrors[path] = err.message;
      });
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    
    try {
      const actor = { id: user.uid, name: user.displayName || 'Admin' };
      const { expenseDate: validatedDate, ...expenseData } = validation.data;
  
      if (expense?.id) {
        // Update existing expense
        const expenseRef = doc(firestore, `libraries/${libraryId}/expenses/${expense.id}`);
        const batch = writeBatch(firestore);
        batch.update(expenseRef, {
          ...expenseData,
          expenseDate: Timestamp.fromDate(validatedDate),
          updatedAt: serverTimestamp(),
        });
    
        const logRef = doc(collection(firestore, `libraries/${libraryId}/activityLogs`));
        batch.set(logRef, {
          libraryId,
          user: actor,
          activityType: 'expense_updated',
          details: { expenseId: expense.id, newAmount: expenseData.amount },
          timestamp: serverTimestamp(),
        });
        await batch.commit();

      } else {
        // Create new expense
        const expenseRef = doc(collection(firestore, `libraries/${libraryId}/expenses`));
        const batch = writeBatch(firestore);
        batch.set(expenseRef, {
          ...expenseData,
          libraryId,
          expenseDate: Timestamp.fromDate(validatedDate),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
    
        const logRef = doc(collection(firestore, `libraries/${libraryId}/activityLogs`));
        batch.set(logRef, {
          libraryId,
          user: actor,
          activityType: 'expense_created',
          details: { amount: expenseData.amount, category: expenseData.category },
          timestamp: serverTimestamp(),
        });
        await batch.commit();
      }

      onSuccess();

    } catch (error) {
       toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: error instanceof Error ? error.message : "Could not save the expense.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          placeholder="e.g., Office Supplies"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isSubmitting}
        />
        {errors.description && <p className="text-sm font-medium text-destructive">{errors.description}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount">Amount (INR)</Label>
        <Input
          id="amount"
          type="number"
          placeholder="100.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
          disabled={isSubmitting}
        />
        {errors.amount && <p className="text-sm font-medium text-destructive">{errors.amount}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <Select
          onValueChange={(value: ExpenseCategory) => setCategory(value)}
          value={category}
          disabled={isSubmitting}
        >
          <SelectTrigger id="category">
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat} className="capitalize">{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.category && <p className="text-sm font-medium text-destructive">{errors.category}</p>}
      </div>

      <div className="space-y-2">
        <Label>Expense Date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant={"outline"}
              className={cn("w-full justify-start text-left font-normal", !expenseDate && "text-muted-foreground")}
              disabled={isSubmitting}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {expenseDate ? format(expenseDate, "PPP") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={expenseDate}
              onSelect={setExpenseDate}
              disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        {errors.expenseDate && <p className="text-sm font-medium text-destructive">{errors.expenseDate}</p>}
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="button" onClick={handleSubmit} disabled={isSubmitting || !user}>
          {isSubmitting ? (
            <>
              <Spinner className="mr-2 h-4 w-4" />
              Saving...
            </>
          ) : expense ? 'Save Changes' : 'Add Expense'}
        </Button>
      </div>
    </div>
  );
}
