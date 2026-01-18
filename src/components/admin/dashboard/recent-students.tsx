import Image from 'next/image';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Student } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

interface RecentStudentsProps {
  students: Student[];
  isLoading?: boolean;
}

export function RecentStudents({ students, isLoading }: RecentStudentsProps) {
  const studentAvatars = PlaceHolderImages.filter((p) =>
    p.id.startsWith('student-avatar')
  );

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Student</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Joined</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[100px]" />
                    <Skeleton className="h-4 w-[150px]" />
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Skeleton className="h-6 w-[70px]" />
              </TableCell>
              <TableCell className="text-right">
                <Skeleton className="h-4 w-[100px] ml-auto" />
              </TableCell>
            </TableRow>
          ))
        ) : (
          students.map((student, index) => {
            const avatar = studentAvatars[index % studentAvatars.length];
            const status = student.status;
            const variant =
              status === 'active'
                ? 'success'
                : status === 'at-risk'
                ? 'destructive'
                : 'secondary';
            return (
              <TableRow key={student.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Image
                      src={avatar.imageUrl}
                      alt={student.name}
                      width={40}
                      height={40}
                      className="rounded-full"
                      data-ai-hint={avatar.imageHint}
                    />
                    <div>
                      <div className="font-medium">{student.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {student.email}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={variant} className="capitalize">
                    {student.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {formatDistanceToNow(student.createdAt.toDate(), {
                    addSuffix: true,
                  })}
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}
