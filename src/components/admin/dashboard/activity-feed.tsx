import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ActivityLog } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Skeleton } from '@/components/ui/skeleton';

interface ActivityFeedProps {
  logs: ActivityLog[];
  isLoading?: boolean;
}

function formatActivity(log: ActivityLog): string {
    const userName = `<span class="font-semibold">${log.user.name}</span>`;
    const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);

    switch (log.activityType) {
        case 'student_created':
            return `${userName} created student ${log.details.studentName}.`;
        case 'student_updated':
            return `${userName} updated student ${log.details.studentName}.`;
        case 'student_deleted':
            return `${userName} archived student ${log.details.studentName}.`;
        case 'payment_processed':
            return `${userName} processed a payment of ${formatCurrency(log.details.amount)} for ${log.details.studentName}.`;
        case 'monthly_payments_created':
            return `${userName} created ${log.details.count} monthly invoices.`;
        case 'expense_created':
            return `${userName} recorded an expense of ${formatCurrency(log.details.amount)} for ${log.details.category}.`;
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
        case 'announcement_created':
            return `${userName} created an announcement: "${log.details.title}".`;
        case 'announcement_deleted':
            return `${userName} deleted an announcement (ID: ${log.details.announcementId}).`;
        case 'suggestion_status_updated':
            return `${userName} updated a suggestion's status to ${log.details.newStatus}.`;
        case 'suggestion_deleted':
            return `${userName} deleted a suggestion (ID: ${log.details.suggestionId}).`;
        case 'print_request_submitted':
            return `${userName} submitted a print request for ${log.details.fileName}.`;
        case 'print_request_approved':
            return `${userName} approved print request ${log.details.requestId}.`;
        case 'print_request_rejected':
             return `${userName} rejected print request ${log.details.requestId}.`;
        default:
            return `${userName} performed an action: ${log.activityType}.`;
    }
}

export function ActivityFeed({ logs, isLoading }: ActivityFeedProps) {
  const userAvatar = PlaceHolderImages.find((p) => p.id === 'user-avatar');

  return (
    <div className="space-y-6">
      {isLoading ? (
        Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start gap-4">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="grid gap-1.5 flex-1">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-24" />
                </div>
            </div>
        ))
      ) : (
        logs.map((log) => (
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
        ))
      )}
    </div>
  );
}
