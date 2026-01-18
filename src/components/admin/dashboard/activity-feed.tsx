import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ActivityLog } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { PlaceHolderImages } from '@/lib/placeholder-images';

interface ActivityFeedProps {
  logs: ActivityLog[];
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
            <p className="text-sm font-medium leading-none">
              <span className="font-semibold">{log.user.name}</span> {log.action.toLowerCase()}
              {log.details.studentName && <span className="font-semibold"> {log.details.studentName}</span>}
              {log.details.amount && <span className="text-muted-foreground"> for {log.details.amount}</span>}
              .
            </p>
            <p className="text-sm text-muted-foreground">
              {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
