/**
 * 첨부파일 처리 훅
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import type { UploadingImageItem } from '@/shared/components/common/UploadingImageGrid';

interface UseAttachmentHandlingOptions {
  isUsingExternalPending?: boolean;
  onAttachmentsChange?: (items: UploadingImageItem[]) => void;
}

export const useAttachmentHandling = ({
  isUsingExternalPending = false,
  onAttachmentsChange,
}: UseAttachmentHandlingOptions = {}) => {
  const [composerAttachments, setComposerAttachments] = useState<UploadingImageItem[]>([]);
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);
  const attachmentsRef = useRef<UploadingImageItem[]>([]);

  const releasePreviews = useCallback((items: UploadingImageItem[]) => {
    items.forEach((item) => {
      if (item.preview && item.preview.startsWith('blob:')) {
        URL.revokeObjectURL(item.preview);
      }
    });
  }, []);

  useEffect(() => {
    attachmentsRef.current = composerAttachments;
  }, [composerAttachments]);

  useEffect(() => {
    return () => {
      releasePreviews(attachmentsRef.current);
    };
  }, [releasePreviews]);

  const handleAttachmentsChange = useCallback(
    (next: UploadingImageItem[]) => {
      setComposerAttachments((prev) => {
        prev.forEach((item) => {
          const preview = item.preview;
          if (
            preview &&
            preview.startsWith('blob:') &&
            !next.some((n) => n.preview === preview)
          ) {
            URL.revokeObjectURL(preview);
          }
        });
        return next;
      });
      onAttachmentsChange?.(next);
    },
    [onAttachmentsChange]
  );

  const handleRemoveAttachment = useCallback(
    (index: number) => {
      if (isUploadingAttachments) return;
      setComposerAttachments((prev) => {
        const target = prev[index];
        if (target?.preview && target.preview.startsWith('blob:')) {
          URL.revokeObjectURL(target.preview);
        }
        return prev.filter((_, i) => i !== index);
      });
    },
    [isUploadingAttachments]
  );

  const clearAttachments = useCallback(() => {
    releasePreviews(attachmentsRef.current);
    setComposerAttachments([]);
    setIsUploadingAttachments(false);
  }, [releasePreviews]);

  return {
    composerAttachments,
    isUploadingAttachments,
    setComposerAttachments,
    setIsUploadingAttachments,
    handleAttachmentsChange,
    handleRemoveAttachment,
    clearAttachments,
  };
};


