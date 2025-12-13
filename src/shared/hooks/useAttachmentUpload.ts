/**
 * 첨부파일 업로드 처리 훅
 */

import { useState, useRef, useCallback } from 'react';
import { uploadImageFilesParallel } from '@/shared/services/firebase/storage';
import type { UploadingImageItem } from '@/shared/components/common/UploadingImageGrid';

// 첨부파일 타입 정의
interface MessageAttachment {
  id: string;
  type: 'image' | 'file';
  url: string;
  name: string;
  size: number;
  mimeType: string;
}

// PendingUpload 관련 타입 정의
interface PendingUploadPayload {
  id: string;
  attachments: Array<{
    id: string;
    file: File;
    preview: string;
  }>;
  text: string;
  mentionedUserIds: string[];
  timeoutAt: number;
  isRetry: boolean;
  totalBytes: number;
}

interface PendingUploadProgressPayload {
  id: string;
  completed: number;
  total: number;
  timestamp: number;
}

interface UseAttachmentUploadOptions {
  uploadFolder: string;
  onUploadingStateChange?: (uploading: boolean) => void;
  onPendingUploadStart?: (payload: PendingUploadPayload) => void;
  onUploadProgress?: (payload: PendingUploadProgressPayload) => void;
  onUploadComplete?: (payload: { id: string }) => void;
  onUploadError?: (payload: { id: string; error: Error }) => void;
}

const computeDynamicTimeout = (files: File[]): number => {
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  const totalMegabytes = totalBytes / (1024 * 1024);
  const baseTimeout = 60_000; // 60초
  const sizeTimeout = Math.max(totalMegabytes * 10_000, 30_000); // 용량당 10초, 최소 30초
  const maxTimeout = 300_000; // 최대 5분
  return Math.min(baseTimeout + sizeTimeout, maxTimeout);
};

export const useAttachmentUpload = ({
  uploadFolder,
  onUploadingStateChange,
  onPendingUploadStart,
  onUploadProgress,
  onUploadComplete,
  onUploadError,
}: UseAttachmentUploadOptions) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const uploadAbortControllerRef = useRef<AbortController | null>(null);

  const handleFileSelect = useCallback(
    async (files: FileList | null): Promise<MessageAttachment[]> => {
      if (!files || files.length === 0) return [];

      const fileArray = Array.from(files);
      const imageFiles = fileArray.filter((file) => file.type.startsWith('image/'));

      if (imageFiles.length === 0) return [];

      try {
        setIsUploading(true);
        setUploadError(null);
        onUploadingStateChange?.(true);

        const uploadId = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const timeoutAt = Date.now() + computeDynamicTimeout(imageFiles);

        // Pending upload 시작
        const pendingPayload: PendingUploadPayload = {
          id: uploadId,
          attachments: imageFiles.map((file) => ({
            id: `attachment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            file,
            preview: URL.createObjectURL(file),
          })),
          text: '',
          mentionedUserIds: [],
          timeoutAt,
          isRetry: false,
          totalBytes: imageFiles.reduce((sum, file) => sum + file.size, 0),
        };

        onPendingUploadStart?.(pendingPayload);

        // AbortController 생성
        const abortController = new AbortController();
        uploadAbortControllerRef.current = abortController;

        // 업로드 진행
        const uploadPromises = imageFiles.map(async (file, index) => {
          const progressCallback = (progress: number) => {
            onUploadProgress?.({
              id: uploadId,
              completed: index + 1,
              total: imageFiles.length,
              timestamp: Date.now(),
            });
          };

          return uploadImageFilesParallel([file], uploadFolder, progressCallback, abortController.signal);
        });

        const uploadResults = await Promise.all(uploadPromises);
        const attachments: MessageAttachment[] = uploadResults.flat().map((url: string, index: number) => {
          const file = imageFiles[index];
          return {
            id: `attachment-${Date.now()}-${index}`,
            type: 'image' as const,
            url,
            name: file.name,
            size: file.size,
            mimeType: file.type,
          };
        });

        // 업로드 완료
        onUploadComplete?.({ id: uploadId });
        setIsUploading(false);
        onUploadingStateChange?.(false);

        return attachments;
      } catch (error) {
        const uploadId = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const errorObj = error instanceof Error ? error : new Error('업로드 실패');
        onUploadError?.({ id: uploadId, error: errorObj });
        setIsUploading(false);
        setUploadError(errorObj.message);
        onUploadingStateChange?.(false);
        return [];
      }
    },
    [uploadFolder, onUploadingStateChange, onPendingUploadStart, onUploadProgress, onUploadComplete, onUploadError]
  );

  const cancelUpload = useCallback(() => {
    if (uploadAbortControllerRef.current) {
      uploadAbortControllerRef.current.abort();
      uploadAbortControllerRef.current = null;
    }
    setIsUploading(false);
    onUploadingStateChange?.(false);
  }, [onUploadingStateChange]);

  return {
    isUploading,
    uploadError,
    handleFileSelect,
    cancelUpload,
    setUploadError,
  };
};


