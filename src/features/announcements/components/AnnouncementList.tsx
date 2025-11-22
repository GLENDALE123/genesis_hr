
import React from 'react';
import { Calendar, User, Image as ImageIcon, Edit, Trash2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Announcement } from '../types/announcement.types';
import type { UserRole } from '@/features/auth/types';

interface AnnouncementListProps {
  announcements: Announcement[];
  onRowClick: (announcement: Announcement) => void;
  onEdit?: (announcement: Announcement) => void;
  onDelete?: (announcement: Announcement) => void;
  canManage?: boolean;
  currentUserRole?: UserRole;
}

export const AnnouncementList: React.FC<AnnouncementListProps> = ({
  announcements,
  onRowClick,
  onEdit,
  onDelete,
  canManage = false,
  currentUserRole
}) => {
  const formatPlanDate = (startDate?: string, endDate?: string) => {
    if (!startDate) return '해당 없음';
    if (!endDate || startDate === endDate) return startDate;
    return `${startDate} ~ ${endDate}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  if (announcements.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>등록된 공지사항이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[120px]">공지 해당일자</TableHead>
            <TableHead>제목</TableHead>
            <TableHead className="w-[150px]">협조요청</TableHead>
            <TableHead className="w-[80px]">이미지</TableHead>
            <TableHead className="w-[100px]">작성자</TableHead>
            <TableHead className="w-[100px]">작성일</TableHead>
            {canManage && <TableHead className="w-[120px]">작업</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {announcements.map((announcement) => (
            <TableRow
              key={announcement.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onRowClick(announcement)}
            >
              <TableCell className="text-sm">
                {announcement.planStartDate ? (
                  <Badge variant="outline" className="text-blue-600 border-blue-600">
                    {formatPlanDate(announcement.planStartDate, announcement.planEndDate)}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">해당 없음</span>
                )}
              </TableCell>
              
              <TableCell>
                <div className="font-medium line-clamp-1">
                  {announcement.title}
                </div>
                <div className="text-sm text-muted-foreground line-clamp-1 mt-1">
                  {announcement.content}
                </div>
              </TableCell>
              
              <TableCell>
                {announcement.cooperationRequest ? (
                  <Badge variant="secondary" className="text-xs">
                    {announcement.cooperationRequest}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              
              <TableCell>
                {announcement.imageUrls && announcement.imageUrls.length > 0 ? (
                  <div className="flex items-center gap-1 text-blue-600">
                    <ImageIcon className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {announcement.imageUrls.length}
                    </span>
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">없음</span>
                )}
              </TableCell>
              
              <TableCell>
                <div className="flex items-center gap-1 text-sm">
                  <User className="h-3 w-3" />
                  {announcement.author}
                </div>
              </TableCell>
              
              <TableCell className="text-sm text-muted-foreground">
                {formatDate(announcement.createdAt)}
              </TableCell>
              
              {canManage && (
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <div className="flex gap-1">
                    {onEdit && (
                      <Button
                        size="sm"
                        onClick={() => onEdit(announcement)}
                        className="h-7 px-2 bg-secondary text-secondary-foreground hover:bg-secondary/80"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                    )}
                    {onDelete && currentUserRole !== 'Manager' && (
                      <Button
                        size="sm"
                        onClick={() => onDelete(announcement)}
                        className="h-7 px-2 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

