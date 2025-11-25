import type { UploadingImageItem } from '@/shared/components/common/UploadingImageGrid';

export type PendingUploadStatus = 'uploading' | 'failed' | 'cancelled' | 'timedOut';

export type PendingUploadErrorCode = 'cancelled' | 'timeout' | 'network' | 'unknown' | null;

export interface PendingUploadBase {
  id: string;
  attachments: UploadingImageItem[];
  text: string;
  mentionedUserIds: string[];
}

export interface PendingUpload extends PendingUploadBase {
  completed: number;
  total: number;
  createdAt: number;
  status: PendingUploadStatus;
  error: string | null;
  errorCode: PendingUploadErrorCode;
  timeoutAt: number | null;
  retryCount: number;
  totalBytes: number | null;
  lastUpdatedAt: number;
}

export interface PendingUploadPayload extends PendingUploadBase {
  timeoutAt?: number | null;
  controller?: AbortController | null;
  totalBytes?: number | null;
  isRetry?: boolean;
}

export interface PendingUploadProgressPayload {
  id: string;
  completed: number;
  total: number;
  timestamp?: number;
}
