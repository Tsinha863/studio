'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Trash2 } from 'lucide-react';
import { format, setHours, setMinutes } from 'date-fns';
import {
  collection,
  writeBatch,
  serverTimestamp,
  doc,
  query,
  where,
  getDocs,
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
import type { Seat, Student, SeatBooking } from '@/lib/types';
import { Spinner } from '@/components/spinner';
import { FirestorePermissionError } from '@/firebase/errors';
import { createSeatBooking, type BookingDuration } from '@/lib/booking-engine';


type SeatWithId = Seat & { id: string };
type StudentWithId = Student & { id: string };
type SeatBookingWithId = SeatBooking & { id: string };

interface SeatBookingDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  seat: SeatWithId;
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
    { label: 'Custom Months', value: 'custom' },
];


export function SeatBookingDialog({
  isOpen,
  onOpenChange,
  seat,
  bookingsForSeat,
  libraryId,
  selectedDate,
  onSuccess,
}: SeatBookingDialogProps) {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  
  const [students, setStudents] = React.useState<{id: string, name: string}[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = React.useState(false);
  const [selectedStudent, setSelectedStudent] = React.useState<{ id: string; name: string } | null>(null);
  const [isComboboxOpen, setIsComboboxOpen] = React.useState(false);
  
  const [startTime, setStartTime] = React.useState('09:00');
  const [duration, setDuration] = React.useState('4h');
  const [customMonths, setCustomMonths] = React.useState<number | string>(1);
  
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isCancelling, setIsCancelling] = React.useState<string | false>(false);

  React.useEffect(() => {
    if (!firestore || !libraryId || !isOpen) return;

    const fetchStudents = async () => {
      setIsLoadingStudents(true);
      try {
        const studentsRef = collection(firestore, `libraries/${libraryId}/students`);
        const q = query(studentsRef, where('status', '==', 'active'));
        const querySnapshot = await getDocs(q);
        const studentList = querySnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name as string }));
        setStudents(studentList);
      } catch (e) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load students.' });
      } finally {
        setIsLoadingStudents(false);
      }
    };

    fetchStudents();
  }, [firestore, libraryId, isOpen, toast]);


  const handleBooking = async () => {
    if (!firestore || !user || !selectedStudent) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select a student.' });
      return;
    }

    setIsSubmitting(true);
    
    let bookingDuration: BookingDuration;
    if (duration === 'fullday') {
        bookingDuration = { type: 'daily' };
    } else if (duration.endsWith('h')) {
        bookingDuration = { type: 'hourly', hours: parseInt(duration.replace('h', ''), 10) as 4 | 6 | 12 | 24 };
    } else if (duration === 'custom') {
        const months = Number(customMonths);
        if (isNaN(months) || months < 1) {
            toast({ variant: 'destructive', title: 'Invalid Custom Duration', description: 'Please enter a valid number of months.' });
            setIsSubmitting(false);
            return;
        }
        bookingDuration = { type: 'monthly', months };
    } else if (duration.endsWith('m')) {
        bookingDuration = { type: 'monthly', months: parseInt(duration.replace('m', ''), 10) };
    } else if (duration.endsWith('y')) {
        bookingDuration = { type: 'yearly' };
    } else {
        toast({ variant: 'destructive', title: 'Invalid Duration' });
        setIsSubmitting(false);
        return;
    }

    let startDateTime: Date;
    const isLongBooking = duration.endsWith('m') || duration.endsWith('y') || duration === 'fullday' || duration === 'custom';
    
    if (isLongBooking) {
        startDateTime = setMinutes(setHours(selectedDate, 9), 0);
    } else {
        const [hours, minutes] = startTime.split(':').map(Number);
        startDateTime = setMinutes(setHours(selectedDate, hours), minutes);
    }

    try {
      await createSeatBooking(firestore, {
        libraryId,
        roomId: seat.roomId,
        seatId: seat.id,
        studentId: selectedStudent.id,
        studentName: selectedStudent.name,
        startTime: startDateTime,
        duration: bookingDuration,
        seatTier: seat.tier,
      });
      
      toast({ title: 'Seat Booked!', description: `Seat ${seat.id} booked for ${selectedStudent.name}.` });
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

    if (booking.linkedPaymentId) {
        const paymentRef = doc(firestore, `libraries/${libraryId}/payments`, booking.linkedPaymentId);
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
        setSelectedStudent(null);
        setStartTime('09:00');
        setDuration('4h');
        setCustomMonths(1);
    }
  }, [isOpen]);

  const isLongDuration = duration.endsWith('m') || duration.endsWith('y') || duration === 'fullday' || duration === 'custom';
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
                                <Button variant="outline" role="combobox" className="w-full justify-between" disabled={isActionDisabled || isLoadingStudents}>
                                    {isLoadingStudents
                                        ? 'Loading students...'
                                        : selectedStudent
                                        ? selectedStudent.name
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
                                    {students.map((student) => (
                                        <CommandItem
                                            key={student.id}
                                            value={student.name}
                                            onSelect={() => {
                                                setSelectedStudent(selectedStudent?.id === student.id ? null : student);
                                                setIsComboboxOpen(false);
                                            }}
                                        >
                                            <Check className={cn("mr-2 h-4 w-4", selectedStudent?.id === student.id ? "opacity-100" : "opacity-0")} />
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
                     {duration === 'custom' && (
                        <div className="space-y-2">
                            <Label htmlFor="customMonths">Number of Months</Label>
                            <Input id="customMonths" type="number" value={customMonths} onChange={(e) => setCustomMonths(e.target.value)} min="1" disabled={isActionDisabled} />
                        </div>
                    )}
                 </div>
            </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isActionDisabled}>Close</Button>
          </DialogClose>
          <Button type="button" onClick={handleBooking} disabled={isActionDisabled || !selectedStudent}>
            {isSubmitting && <Spinner className="mr-2" />}
            {isSubmitting ? 'Booking...' : 'Create Booking'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
