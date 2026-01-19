'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Trash2, XIcon } from 'lucide-react';
import { format, setHours, setMinutes } from 'date-fns';
import {
  collection,
  runTransaction,
  serverTimestamp,
  doc,
  query,
  where,
  getDocs,
  Timestamp,
  deleteDoc,
} from 'firebase/firestore';

import { useFirebase } from '@/firebase';
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
import type { Seat, Student, SeatBooking } from '@/lib/types';
import { Spinner } from '@/components/spinner';

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
  { label: '4 Hours', value: 4 },
  { label: '6 Hours', value: 6 },
  { label: '12 Hours', value: 12 },
  { label: 'Full Day (9am-9pm)', value: 24 }, // Special case
];

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
  const [duration, setDuration] = React.useState(4);
  
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isCancelling, setIsCancelling] = React.useState<string | null>(null);
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

    const [hours, minutes] = startTime.split(':').map(Number);
    let startDateTime = setMinutes(setHours(selectedDate, hours), minutes);
    let endDateTime = new Date(startDateTime.getTime() + duration * 60 * 60 * 1000);

    if (duration === 24) { // Full day case
        startDateTime = setMinutes(setHours(selectedDate, 9), 0);
        endDateTime = setMinutes(setHours(selectedDate, 21), 0);
    }
    
    try {
      await runTransaction(firestore, async (transaction) => {
        const bookingsRef = collection(firestore, `libraries/${libraryId}/seatBookings`);
        
        // 1. Check for overlapping bookings for the same SEAT
        const seatOverlapQuery = query(bookingsRef, 
            where('seatId', '==', seat.id),
            where('roomId', '==', seat.roomId),
            where('endTime', '>', Timestamp.fromDate(startDateTime))
        );
        const seatOverlapSnapshot = await getDocs(seatOverlapQuery);
        const seatConflicts = seatOverlapSnapshot.docs.filter(doc => doc.data().startTime.toDate() < endDateTime);
        if (seatConflicts.length > 0) {
            throw new Error(`This seat is already booked from ${format(seatConflicts[0].data().startTime.toDate(), 'p')} to ${format(seatConflicts[0].data().endTime.toDate(), 'p')}.`);
        }

        // 2. Check for overlapping bookings for the same STUDENT
        const studentOverlapQuery = query(bookingsRef,
            where('studentId', '==', selectedStudentId),
            where('endTime', '>', Timestamp.fromDate(startDateTime))
        );
        const studentOverlapSnapshot = await getDocs(studentOverlapQuery);
        const studentConflicts = studentOverlapSnapshot.docs.filter(doc => doc.data().startTime.toDate() < endDateTime);
        if (studentConflicts.length > 0) {
            const conflict = studentConflicts[0].data();
            throw new Error(`${studentToAssign.name} already has a booking for seat ${conflict.seatId} from ${format(conflict.startTime.toDate(), 'p')} to ${format(conflict.endTime.toDate(), 'p')}.`);
        }

        // 3. If no conflicts, create the booking
        const newBookingRef = doc(bookingsRef);
        transaction.set(newBookingRef, {
          libraryId,
          roomId: seat.roomId,
          seatId: seat.id,
          studentId: selectedStudentId,
          studentName: studentToAssign.name,
          startTime: Timestamp.fromDate(startDateTime),
          endTime: Timestamp.fromDate(endDateTime),
          createdAt: serverTimestamp(),
        });
      });

      toast({ title: 'Seat Booked!', description: `Seat ${seat.id} booked for ${studentToAssign.name}.` });
      onSuccess();
    } catch (error) {
      console.error("CREATE BOOKING ERROR:", error);
      toast({
        variant: 'destructive',
        title: 'Booking Failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!firestore || !user) return;
    setIsCancelling(bookingId);
    try {
      const bookingRef = doc(firestore, `libraries/${libraryId}/seatBookings/${bookingId}`);
      await deleteDoc(bookingRef);
      toast({ title: 'Booking Cancelled', description: 'The seat is now available for this time slot.' });
      onSuccess();
    } catch (error) {
      console.error("CANCEL BOOKING ERROR:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not cancel the booking.' });
    } finally {
      setIsCancelling(null);
    }
  };
  
  React.useEffect(() => {
    if (!isOpen) {
        setSelectedStudentId(undefined);
        setStartTime('09:00');
        setDuration(4);
    }
  }, [isOpen]);

  const selectedStudentName = students.find(s => s.id === selectedStudentId)?.name;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage Bookings for Seat {seat.id}</DialogTitle>
          <DialogDescription>
            On {format(selectedDate, 'MMMM d, yyyy')}.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-6 py-4">
            {/* Existing Bookings */}
            <div>
                <h3 className="text-sm font-semibold mb-2">Existing Bookings</h3>
                {bookingsForSeat.length > 0 ? (
                    <ul className="space-y-2">
                        {bookingsForSeat.map(booking => (
                            <li key={booking.id} className="flex items-center justify-between text-sm p-2 rounded-md bg-muted">
                                <div>
                                    <span className="font-medium">{booking.studentName}</span>
                                    <span className="text-muted-foreground ml-2">
                                        {format(booking.startTime.toDate(), 'h:mm a')} - {format(booking.endTime.toDate(), 'h:mm a')}
                                    </span>
                                </div>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleCancelBooking(booking.id)} disabled={!!isCancelling}>
                                    {isCancelling === booking.id ? <Spinner className="h-4 w-4"/> : <Trash2 className="h-4 w-4"/>}
                                </Button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-muted-foreground">No bookings for this seat today.</p>
                )}
            </div>

            <Separator />
            
            {/* New Booking Form */}
            <div>
                 <h3 className="text-sm font-semibold mb-3">Create New Booking</h3>
                 <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>Student</Label>
                        <Popover open={isComboboxOpen} onOpenChange={setIsComboboxOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" role="combobox" className="w-full justify-between" disabled={isSubmitting}>
                                    {selectedStudentId ? selectedStudentName : "Select a student..."}
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
                                        <CommandItem key={student.id} value={student.name} onSelect={() => { setSelectedStudentId(student.id); setIsComboboxOpen(false); }}>
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
                            <Input id="startTime" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} disabled={isSubmitting || duration === 24}/>
                         </div>
                         <div className="space-y-2">
                            <Label htmlFor="duration">Duration</Label>
                            <Select value={String(duration)} onValueChange={(val) => setDuration(Number(val))} disabled={isSubmitting}>
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
            <Button type="button" variant="outline">Close</Button>
          </DialogClose>
          <Button type="button" onClick={handleBooking} disabled={isSubmitting || !selectedStudentId}>
            {isSubmitting && <Spinner className="mr-2" />}
            {isSubmitting ? 'Booking...' : 'Create Booking'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
