'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Trash2 } from 'lucide-react';
import { format, setHours, setMinutes, addHours, addMonths, addYears } from 'date-fns';
import {
  collection,
  runTransaction,
  serverTimestamp,
  doc,
  query,
  where,
  getDocs,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';

import { useFirebase, errorEmitter } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import type { Seat, Student, SeatBooking, Payment, SeatBooking } from '@/lib/types';
import { Spinner } from '@/components/spinner';
import { FirestorePermissionError } from '@/firebase/errors';

type SeatWithId = Seat & { id: string };
type StudentWithId = Student & { id: string };
type SeatBookingWithId = SeatBooking & { id: string };

interface SeatBookingDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  seat: SeatWithId;
  students: StudentWithId[];
  bookingsForSeat: SeatBookingWithId[];
  libraryId: string;
  selectedDate: Date;
  onSuccess: () => void;
}

const durationOptions = [
    { label: '4 Hours', value: '4h' },
    { label: '6 Hours', value: '6h' },
    { label: '12 Hours', value: '12h' },
    { label: '24 Hours', value: '24h' },
    { label: 'Full Day (9am-9pm)', value: 'fullday' },
    { label: '1 Month', value: '1m' },
    { label: '3 Months', value: '3m' },
    { label: '6 Months', value: '6m' },
    { label: '1 Year', value: '1y' },
];

const pricing = {
    hourly: { basic: 20, standard: 30, premium: 40 },
    daily: { basic: 200, standard: 300, premium: 400 },
    monthly: { basic: 4000, standard: 5000, premium: 6000 },
}

const calculatePrice = (tier: Seat['tier'], type: SeatBooking['bookingType'], meta: SeatBooking['durationMeta']) => {
    if (type === 'hourly' && meta.hours) {
        return pricing.hourly[tier] * meta.hours;
    }
    if (type === 'daily') {
        return pricing.daily[tier];
    }
    if (type === 'monthly' && meta.months) {
        return pricing.monthly[tier] * meta.months;
    }
    if (type === 'yearly' && meta.months) {
         return (pricing.monthly[tier] * meta.months) * 0.9; // 10% discount for yearly
    }
    return 0;
};


export function SeatBookingDialog({
  isOpen,
  onOpenChange,
  seat,
  students,
  bookingsForSeat,
  libraryId,
  selectedDate,
  onSuccess,
}: SeatBookingDialogProps) {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  
  const [selectedStudentId, setSelectedStudentId] = React.useState<string | undefined>();
  const [startTime, setStartTime] = React.useState('09:00');
  const [duration, setDuration] = React.useState('4h');
  
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isCancelling, setIsCancelling] = React.useState<string | false>(false);
  const [isComboboxOpen, setIsComboboxOpen] = React.useState(false);

  const activeStudents = React.useMemo(() => students.filter(s => s.status !== 'inactive'), [students]);

  const handleBooking = async () => {
    if (!firestore || !user || !selectedStudentId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select a student.' });
      return;
    }
    const studentToAssign = students.find(s => s.id === selectedStudentId);
    if (!studentToAssign) return;

    setIsSubmitting(true);
    
    let bookingType: SeatBooking['bookingType'] = 'hourly';
    let durationMeta: SeatBooking['durationMeta'] = {};

    let startDateTime: Date;
    const isLongBooking = duration.endsWith('m') || duration.endsWith('y') || duration === 'fullday';
    
    if (isLongBooking) {
        startDateTime = setMinutes(setHours(selectedDate, 9), 0);
    } else {
        const [hours, minutes] = startTime.split(':').map(Number);
        startDateTime = setMinutes(setHours(selectedDate, hours), minutes);
    }

    let endDateTime: Date;

    if (duration === 'fullday') {
        bookingType = 'daily';
        endDateTime = setMinutes(setHours(selectedDate, 21), 0);
    } else if (duration.endsWith('h')) {
        bookingType = 'hourly';
        const d = parseInt(duration.replace('h', ''), 10);
        durationMeta.hours = d;
        endDateTime = addHours(startDateTime, d);
    } else if (duration.endsWith('m')) {
        bookingType = 'monthly';
        const d = parseInt(duration.replace('m', ''), 10);
        durationMeta.months = d;
        endDateTime = addMonths(startDateTime, d);
    } else if (duration.endsWith('y')) {
        bookingType = 'yearly';
        const d = parseInt(duration.replace('y', ''), 10);
        durationMeta.months = d * 12;
        endDateTime = addYears(startDateTime, d);
    } else {
        toast({ variant: 'destructive', title: 'Invalid Duration', description: 'Please select a valid booking duration.' });
        setIsSubmitting(false);
        return;
    }

    try {
      const bookingsRef = collection(firestore, `libraries/${libraryId}/seatBookings`);
      
      const seatOverlapQuery = query(bookingsRef, 
          where('seatId', '==', seat.id),
          where('roomId', '==', seat.roomId),
          where('status', '==', 'active'),
          where('endTime', '>', Timestamp.fromDate(startDateTime))
      );
      const seatOverlapSnapshot = await getDocs(seatOverlapQuery);
      const seatConflicts = seatOverlapSnapshot.docs.filter(doc => doc.data().startTime.toDate() < endDateTime);
      if (seatConflicts.length > 0) {
          throw new Error(`This seat is already booked from ${format(seatConflicts[0].data().startTime.toDate(), 'p')} to ${format(seatConflicts[0].data().endTime.toDate(), 'p')}.`);
      }

      const studentOverlapQuery = query(bookingsRef,
          where('studentId', '==', selectedStudentId),
          where('status', '==', 'active'),
          where('endTime', '>', Timestamp.fromDate(startDateTime))
      );
      const studentOverlapSnapshot = await getDocs(studentOverlapQuery);
      const studentConflicts = studentOverlapSnapshot.docs.filter(doc => doc.data().startTime.toDate() < endDateTime);
      if (studentConflicts.length > 0) {
          const conflict = studentConflicts[0].data();
          throw new Error(`${studentToAssign.name} already has a booking for seat ${conflict.seatId} from ${format(conflict.startTime.toDate(), 'p')} to ${format(conflict.endTime.toDate(), 'p')}.`);
      }
      
      await runTransaction(firestore, async (transaction) => {
        const newBookingRef = doc(bookingsRef);
        const paymentsRef = collection(firestore, `libraries/${libraryId}/payments`);
        const newPaymentRef = doc(paymentsRef);

        const bookingPayload: Omit<SeatBooking, 'id'> = {
            libraryId,
            roomId: seat.roomId,
            seatId: seat.id,
            studentId: selectedStudentId,
            studentName: studentToAssign.name,
            startTime: Timestamp.fromDate(startDateTime),
            endTime: Timestamp.fromDate(endDateTime),
            status: 'active',
            bookingType,
            durationMeta,
            linkedPaymentId: newPaymentRef.id,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };

        const paymentAmount = calculatePrice(seat.tier, bookingType, durationMeta);
        const paymentPayload: Omit<Payment, 'id'> = {
            libraryId,
            studentId: selectedStudentId,
            studentName: studentToAssign.name,
            bookingId: newBookingRef.id,
            amount: paymentAmount,
            status: 'pending',
            dueDate: Timestamp.fromDate(startDateTime),
            paymentDate: null,
            method: 'Online',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };

        transaction.set(newBookingRef, bookingPayload);
        transaction.set(newPaymentRef, paymentPayload);

        const logRef = doc(collection(firestore, `libraries/${libraryId}/activityLogs`));
        transaction.set(logRef, {
            libraryId,
            user: { id: user.uid, name: user.displayName || 'Admin' },
            activityType: 'seat_assigned',
            details: {
                studentName: studentToAssign.name,
                seatId: seat.id,
                roomId: seat.roomId,
                startTime: Timestamp.fromDate(startDateTime),
                endTime: Timestamp.fromDate(endDateTime),
                amount: paymentAmount,
            },
            timestamp: serverTimestamp(),
        });
      });
      
      toast({ title: 'Seat Booked!', description: `Seat ${seat.id} booked for ${studentToAssign.name}.` });
      onSuccess();
    } catch (serverError) {
       if (serverError instanceof FirebaseError && serverError.code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({
          path: `libraries/${libraryId}/seatBookings`,
          operation: 'create',
        });
        errorEmitter.emit('permission-error', permissionError);
      } else {
        toast({
            variant: 'destructive',
            title: 'Booking Failed',
            description: serverError instanceof Error ? serverError.message : 'An unknown error occurred.',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelBooking = async (booking: SeatBookingWithId) => {
    if (!firestore || !user) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to perform this action.' });
      return;
    }
    
    setIsCancelling(booking.id);
    
    const batch = writeBatch(firestore);
    const bookingRef = doc(firestore, `libraries/${libraryId}/seatBookings`, booking.id);
    batch.update(bookingRef, { status: 'cancelled', updatedAt: serverTimestamp() });

    // Also cancel the linked payment if it exists and is not paid
    if (booking.linkedPaymentId) {
        const paymentRef = doc(firestore, `libraries/${libraryId}/payments`, booking.linkedPaymentId);
        // We can't query inside a batch, so we just set the update. 
        // A more complex system might use a cloud function to check status before cancelling.
        // For now, we assume we can cancel it. A better check could be done in a transaction.
        batch.update(paymentRef, { status: 'cancelled', updatedAt: serverTimestamp() });
    }

    const logRef = doc(collection(firestore, `libraries/${libraryId}/activityLogs`));
    batch.set(logRef, {
      libraryId,
      user: { id: user.uid, name: user.displayName || 'Admin' },
      activityType: 'booking_cancelled',
      details: { bookingId: booking.id, studentName: booking.studentName },
      timestamp: serverTimestamp(),
    });

    try {
      await batch.commit();
      toast({ title: 'Booking Cancelled', description: 'The seat booking and associated payment have been cancelled.' });
      onSuccess();
    } catch(serverError) {
      if (serverError instanceof FirebaseError && serverError.code === 'permission-denied') {
          const permissionError = new FirestorePermissionError({
              path: bookingRef.path,
              operation: 'update',
          });
          errorEmitter.emit('permission-error', permissionError);
      } else {
          toast({
              variant: 'destructive',
              title: 'Cancellation Failed',
              description: serverError instanceof Error ? serverError.message : 'Could not cancel the booking.',
          });
      }
    } finally {
      setIsCancelling(false);
    }
  };
  
  React.useEffect(() => {
    if (!isOpen) {
        setSelectedStudentId(undefined);
        setStartTime('09:00');
        setDuration('4h');
    }
  }, [isOpen]);

  const isLongDuration = duration.endsWith('m') || duration.endsWith('y') || duration === 'fullday';
  const isActionDisabled = isSubmitting || !!isCancelling;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage Bookings for Seat {seat.id}</DialogTitle>
          <DialogDescription>
            On {format(selectedDate, 'MMMM d, yyyy')}. Tier: <span className='capitalize font-medium'>{seat.tier}</span>
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-6 py-4">
            <div>
                <h3 className="text-sm font-semibold mb-2">Existing Bookings</h3>
                {bookingsForSeat.length > 0 ? (
                    <ul className="space-y-2">
                        {bookingsForSeat.map(booking => (
                            <li key={booking.id} className="flex items-center justify-between text-sm p-2 rounded-md bg-muted">
                                <div>
                                    <span className="font-medium">{booking.studentName}</span>
                                    <span className="text-muted-foreground ml-2">
                                        {format(booking.startTime.toDate(), 'MMM d, p')} - {format(booking.endTime.toDate(), 'MMM d, p')}
                                    </span>
                                </div>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleCancelBooking(booking)} disabled={isActionDisabled}>
                                  {isCancelling === booking.id ? <Spinner className="h-4 w-4" /> : <Trash2 className="h-4 w-4"/>}
                                </Button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-muted-foreground">No active bookings for this seat today.</p>
                )}
            </div>

            <Separator />
            
            <div>
                 <h3 className="text-sm font-semibold mb-3">Create New Booking</h3>
                 <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>Student</Label>
                        <Popover open={isComboboxOpen} onOpenChange={setIsComboboxOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" role="combobox" className="w-full justify-between" disabled={isActionDisabled}>
                                    {selectedStudentId
                                        ? students.find((student) => student.id === selectedStudentId)?.name
                                        : "Select a student..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                <Command>
                                <CommandInput placeholder="Search student..." />
                                <CommandList>
                                    <CommandEmpty>No available students found.</CommandEmpty>
                                    <CommandGroup>
                                    {activeStudents.map((student) => (
                                        <CommandItem
                                            key={student.id}
                                            value={student.id}
                                            onSelect={(currentValue) => {
                                                setSelectedStudentId(currentValue === selectedStudentId ? undefined : currentValue);
                                                setIsComboboxOpen(false);
                                            }}
                                        >
                                            <Check className={cn("mr-2 h-4 w-4", selectedStudentId === student.id ? "opacity-100" : "opacity-0")} />
                                            {student.name}
                                        </CommandItem>
                                    ))}
                                    </CommandGroup>
                                </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2">
                            <Label htmlFor="startTime">Start Time</Label>
                            <Input id="startTime" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} disabled={isActionDisabled || isLongDuration}/>
                         </div>
                         <div className="space-y-2">
                            <Label htmlFor="duration">Duration</Label>
                            <Select value={duration} onValueChange={(val) => setDuration(val)} disabled={isActionDisabled}>
                                <SelectTrigger id="duration">
                                    <SelectValue placeholder="Select duration" />
                                </SelectTrigger>
                                <SelectContent>
                                    {durationOptions.map(opt => (
                                        <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                         </div>
                    </div>
                 </div>
            </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isActionDisabled}>Close</Button>
          </DialogClose>
          <Button type="button" onClick={handleBooking} disabled={isActionDisabled || !selectedStudentId}>
            {isSubmitting && <Spinner className="mr-2" />}
            {isSubmitting ? 'Booking...' : 'Create Booking'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

