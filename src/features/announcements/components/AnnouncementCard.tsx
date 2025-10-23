'use client';

import React from 'react';
import { Calendar, User, Image as ImageIcon, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Announcement } from '../types/announcement.types';

interface AnnouncementCardProps {
  announcement: Announcement;
  onClick: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  canManage?: boolean;
}

export const AnnouncementCard: React.FC<AnnouncementCardProps> = ({
  announcement,
  onClick,
  onEdit,
  onDelete,
  canManage = false
}) => {
  const formatPlanDate = (startDate?: string, endDate?: string) => {
    if (!startDate) return null;
    if (!endDate || startDate === endDate) return startDate;
    return `${startDate} ~ ${endDate}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const planDate = formatPlanDate(announcement.planStartDate, announcement.planEndDate);
  const hasImages = announcement.imageUrls && announcement.imageUrls.length > 0;
  const imageCount = announcement.imageUrls?.length || 0;

  return (
    <Card 
      className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] group"
      onClick={onClick}
    >
      {/* 이미지 섹션 */}
      {hasImages && (
        <div className="relative">
          <img
            src={announcement.imageUrls![0]}
            alt={announcement.title}
            className="w-full h-40 object-cover rounded-t-lg"
            loading="lazy"
          />
          {imageCount > 1 && (
            <Badge 
              variant="secondary" 
              className="absolute top-2 right-2 bg-black/70 text-white hover:bg-black/80"
            >
              <ImageIcon className="h-3 w-3 mr-1" />
              {imageCount}
            </Badge>
          )}
        </div>
      )}

      <CardHeader className="pb-3">
        {/* 공지기간 배지 */}
        {planDate && (
          <Badge variant="outline" className="w-fit mb-2 text-blue-600 border-blue-600">
            <Calendar className="h-3 w-3 mr-1" />
            {planDate}
          </Badge>
        )}

        {/* 제목 */}
        <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-primary transition-colors">
          {announcement.title}
        </h3>
      </CardHeader>

      <CardContent className="pt-0">
        {/* 메타 정보 */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {announcement.author}
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatDate(announcement.createdAt)}
          </div>
        </div>

        {/* 협조요청 */}
        {announcement.cooperationRequest && (
          <div className="mb-3">
            <Badge variant="secondary" className="text-xs">
              협조요청: {announcement.cooperationRequest}
            </Badge>
          </div>
        )}

        {/* 내용 미리보기 */}
        <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
          {announcement.content}
        </p>

        {/* 관리 버튼 */}
        {canManage && (
          <div 
            className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            {onEdit && (
              <Button
                size="sm"
                onClick={onEdit}
                className="h-8 px-2 bg-secondary text-secondary-foreground hover:bg-secondary/80"
              >
                <Edit className="h-3 w-3 mr-1" />
                수정
              </Button>
            )}
            {onDelete && (
              <Button
                size="sm"
                onClick={onDelete}
                className="h-8 px-2 bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                삭제
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
