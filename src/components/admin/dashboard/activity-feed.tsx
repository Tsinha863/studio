import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ActivityLog } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { PlaceHolderImages } from '@/lib/placeholder-images';

interface ActivityFeedProps {
  logs: ActivityLog[];
}

function formatActivity(log: ActivityLog): string {
    const userName = `<span class="font-semibold">${log.user.name}</span>`;
    switch (log.activityType) {
        case 'student_created':
            return `${userName} created student ${log.details.studentName}.`;
        case 'student_updated':
            return `${userName} updated student ${log.details.studentName}.`;
        case 'student_deleted':
            return `${userName} deleted student with ID ${log.details.studentId}.`;
        case 'payment_processed':
            return `${userName} processed a payment of ₹${log.details.amount} for ${log.details.studentName}.`;
        case 'monthly_payments_created':
            return `${userName} created ${log.details.count} monthly invoices.`;
        case 'expense_created':
            return `${userName} recorded an expense of ₹${log.details.amount} for ${log.details.category}.`;
        case 'expense_updated':
            return `${userName} updated an expense record (ID: ${log.details.expenseId}).`;
        case 'expense_deleted':
            return `${userName} deleted an expense record (ID: ${log.details.expenseId}).`;
        case 'room_created':
            return `${userName} created room ${log.details.name} with capacity ${log.details.capacity}.`;
        case 'seat_assigned':
            return `${userName} assigned seat ${log.details.seatNumber} to ${log.details.studentName}.`;
        case 'seat_unassigned':
            return `${userName} unassigned seat ${log.details.seatNumber}.`;
        default:
            return `${userName} performed an action: ${log.activityType}.`;
    }
}

export function ActivityFeed({ logs }: ActivityFeedProps) {
  const userAvatar = PlaceHolderImages.find((p) => p.id === 'user-avatar');

  return (
    <div className="space-y-6">
      {logs.map((log) => (
        <div key={log.id} className="flex items-start gap-4">
          <Avatar className="h-9 w-9">
            <AvatarImage src={userAvatar?.imageUrl} alt={log.user.name} data-ai-hint={userAvatar?.imageHint} />
            <AvatarFallback>{log.user.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="grid gap-1">
            <p className="text-sm font-medium leading-none" dangerouslySetInnerHTML={{ __html: formatActivity(log) }} />
            <p className="text-sm text-muted-foreground">
              {formatDistanceToNow(log.timestamp.toDate(), { addSuffix: true })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
