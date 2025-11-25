import React from 'react';
import { X } from 'lucide-react';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Button } from '@/shared/components/ui/button';
import type { UploadingImageItem } from './UploadingImageGrid';

interface ChatAttachmentPreviewBarProps {
  items: UploadingImageItem[];
  onRemove: (index: number) => void;
  disableRemove?: boolean;
}

/**
 * 채팅 첨부파일 미리보기 바 컴포넌트
 * UploadingImageGrid와 유사하지만 채팅용으로 최적화
 */
export const ChatAttachmentPreviewBar: React.FC<ChatAttachmentPreviewBarProps> = ({
  items,
  onRemove,
  disableRemove = false,
}) => {
  if (items.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {items.map((item, index) => (
        <div
          key={index}
          className="relative flex-shrink-0 w-20 h-20 rounded-md overflow-hidden border border-border bg-muted"
        >
          {item.preview ? (
            <img
              src={item.preview}
              alt={`Preview ${index + 1}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <Skeleton className="w-full h-full" />
          )}
          {!disableRemove && (
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-1 right-1 h-6 w-6 rounded-full"
              onClick={() => onRemove(index)}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
};


