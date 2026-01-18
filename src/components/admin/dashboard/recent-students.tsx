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

interface RecentStudentsProps {
  students: Student[];
}

export function RecentStudents({ students }: RecentStudentsProps) {
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
        {students.map((student, index) => {
          const avatar = studentAvatars[index % studentAvatars.length];
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
                <Badge variant={student.paymentStatus === 'paid' ? 'success' : student.paymentStatus === 'pending' ? 'secondary' : 'destructive'}>
                  {student.paymentStatus}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {formatDistanceToNow(student.createdAt.toDate(), {
                  addSuffix: true,
                })}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
