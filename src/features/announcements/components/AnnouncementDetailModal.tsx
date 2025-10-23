'use client';

import React from 'react';
import { Calendar, User, Edit, Trash2, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { ImageGalleryGrid } from '@/shared/components/common/ImageGalleryGrid';
import { Announcement } from '../types/announcement.types';

interface AnnouncementDetailModalProps {
  announcement: Announcement | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  canManage?: boolean;
}

export const AnnouncementDetailModal: React.FC<AnnouncementDetailModalProps> = ({
  announcement,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  canManage = false
}) => {
  if (!announcement) return null;

  const formatPlanDate = (startDate?: string, endDate?: string) => {
    if (!startDate) return null;
    if (!endDate || startDate === endDate) return startDate;
    return `${startDate} ~ ${endDate}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const planDate = formatPlanDate(announcement.planStartDate, announcement.planEndDate);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <DialogTitle className="text-xl font-semibold">
            {announcement.title}
          </DialogTitle>
          <Button
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 bg-transparent hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="space-y-6">
          {/* 메타 정보 */}
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground border-b pb-4">
            <div className="flex items-center gap-1">
              <User className="h-4 w-4" />
              <span className="font-medium">작성자:</span>
              {announcement.author}
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span className="font-medium">작성일:</span>
              {formatDate(announcement.createdAt)}
            </div>
            {planDate && (
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span className="font-medium">공지 해당일자:</span>
                <Badge variant="outline" className="text-blue-600 border-blue-600">
                  {planDate}
                </Badge>
              </div>
            )}
          </div>

          {/* 협조요청 */}
          {announcement.cooperationRequest && (
            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-semibold text-sm mb-2">협조 요청</h4>
              <Badge variant="secondary" className="text-sm">
                {announcement.cooperationRequest}
              </Badge>
            </div>
          )}

          {/* 이미지 갤러리 */}
          {announcement.imageUrls && announcement.imageUrls.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm mb-3">첨부 이미지</h4>
              <ImageGalleryGrid
                images={announcement.imageUrls}
                gridClassName="grid-cols-[repeat(auto-fill,minmax(150px,1fr))]"
                imageClassName="h-32"
                enableLazyLoading={true}
                useThumbnails={true}
              />
            </div>
          )}

          {/* 내용 */}
          <div>
            <h4 className="font-semibold text-sm mb-3">내용</h4>
            <div className="prose prose-sm max-w-none">
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {announcement.content}
              </p>
            </div>
          </div>

          {/* 관리 버튼 */}
          {canManage && (
            <div className="flex justify-end gap-2 pt-4 border-t">
              {onEdit && (
                <Button
                  onClick={onEdit}
                  className="flex items-center gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/80"
                >
                  <Edit className="h-4 w-4" />
                  수정
                </Button>
              )}
              {onDelete && (
                <Button
                  onClick={onDelete}
                  className="flex items-center gap-2 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  <Trash2 className="h-4 w-4" />
                  삭제
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
