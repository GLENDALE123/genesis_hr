/**
 * 이미지 업로드 관련 타입 정의
 */

import { z } from 'zod';

/**
 * 에러 코드 타입
 */
export enum UploadErrorCode {
  // 업로드 에러
  UPLOAD_FAILED = 'UPLOAD_FAILED',
  UPLOAD_TIMEOUT = 'UPLOAD_TIMEOUT',
  UPLOAD_CANCELLED = 'UPLOAD_CANCELLED',
  UPLOAD_NETWORK_ERROR = 'UPLOAD_NETWORK_ERROR',
  UPLOAD_QUOTA_EXCEEDED = 'UPLOAD_QUOTA_EXCEEDED',
  
  // 압축 에러
  COMPRESSION_FAILED = 'COMPRESSION_FAILED',
  COMPRESSION_UNSUPPORTED_FORMAT = 'COMPRESSION_UNSUPPORTED_FORMAT',
  COMPRESSION_SIZE_EXCEEDED = 'COMPRESSION_SIZE_EXCEEDED',
  
  // 썸네일 에러
  THUMBNAIL_GENERATION_FAILED = 'THUMBNAIL_GENERATION_FAILED',
  THUMBNAIL_NOT_FOUND = 'THUMBNAIL_NOT_FOUND',
  
  // 파일 에러
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  FILE_INVALID_TYPE = 'FILE_INVALID_TYPE',
  FILE_READ_ERROR = 'FILE_READ_ERROR',
  
  // 기타 에러
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR'
}

/**
 * 재시도 가능 여부
 */
export enum RetryableStatus {
  RETRYABLE = 'RETRYABLE',
  NON_RETRYABLE = 'NON_RETRYABLE',
  UNKNOWN = 'UNKNOWN'
}

/**
 * 업로드 에러 클래스
 */
export class UploadError extends Error {
  constructor(
    public code: UploadErrorCode,
    message: string,
    public retryable: RetryableStatus = RetryableStatus.UNKNOWN,
    public originalError?: Error,
    public metadata?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'UploadError';
    
    // Error의 stack trace 유지
    if (originalError && originalError.stack) {
      this.stack = originalError.stack;
    }
  }
  
  /**
   * 재시도 가능한 에러인지 확인
   */
  isRetryable(): boolean {
    return this.retryable === RetryableStatus.RETRYABLE;
  }
  
  /**
   * 사용자 친화적인 에러 메시지 생성
   */
  getUserFriendlyMessage(): string {
    switch (this.code) {
      case UploadErrorCode.UPLOAD_NETWORK_ERROR:
        return '네트워크 연결을 확인해주세요.';
      case UploadErrorCode.UPLOAD_TIMEOUT:
        return '업로드 시간이 초과되었습니다. 다시 시도해주세요.';
      case UploadErrorCode.UPLOAD_QUOTA_EXCEEDED:
        return '저장 공간이 부족합니다.';
      case UploadErrorCode.FILE_TOO_LARGE:
        return '파일 크기가 너무 큽니다.';
      case UploadErrorCode.FILE_INVALID_TYPE:
        return '지원하지 않는 파일 형식입니다.';
      case UploadErrorCode.COMPRESSION_FAILED:
        return '이미지 압축에 실패했습니다.';
      default:
        return this.message || '이미지 업로드에 실패했습니다.';
    }
  }
}

/**
 * 압축 에러 클래스
 */
export class CompressionError extends UploadError {
  constructor(
    message: string,
    originalError?: Error,
    metadata?: Record<string, unknown>
  ) {
    super(
      UploadErrorCode.COMPRESSION_FAILED,
      message,
      RetryableStatus.NON_RETRYABLE,
      originalError,
      metadata
    );
    this.name = 'CompressionError';
  }
}

/**
 * 썸네일 에러 클래스
 */
export class ThumbnailError extends UploadError {
  constructor(
    message: string,
    originalError?: Error,
    metadata?: Record<string, unknown>
  ) {
    super(
      UploadErrorCode.THUMBNAIL_GENERATION_FAILED,
      message,
      RetryableStatus.NON_RETRYABLE,
      originalError,
      metadata
    );
    this.name = 'ThumbnailError';
  }
}

/**
 * 에러 통계 정보
 */
export interface ErrorStatistics {
  errorCode: UploadErrorCode;
  count: number;
  lastOccurred: Date;
  retryableCount: number;
  nonRetryableCount: number;
  metadata?: Record<string, unknown>;
}

/**
 * 업로드 결과 타입
 */
export interface UploadResult {
  success: boolean;
  url?: string;
  error?: UploadError;
  fileName: string;
  fileSize: number;
  duration?: number;
}

/**
 * 부분 실패 결과 타입
 */
export interface PartialUploadResult {
  successful: UploadResult[];
  failed: UploadResult[];
  totalCount: number;
  successCount: number;
  failureCount: number;
}

/**
 * 이미지 업로드 옵션 인터페이스
 */
export interface ImageUploadOptions {
  maxRetries: number;
  showProgressToast: boolean;
  useParallelCompression: boolean;
}

export const defaultImageUploadOptions: ImageUploadOptions = {
  maxRetries: 3,
  showProgressToast: true,
  useParallelCompression: true
};

export const mergeImageUploadOptions = (
  options?: Partial<ImageUploadOptions>
): ImageUploadOptions => ({
  ...defaultImageUploadOptions,
  ...(options || {})
});

/**
 * 에러 로그 타입
 */
export interface ErrorLog {
  timestamp: Date;
  errorCode: UploadErrorCode;
  message: string;
  retryable: RetryableStatus;
  fileName?: string;
  fileSize?: number;
  metadata?: Record<string, unknown>;
  stack?: string;
}

/**
 * 파일 타입 검증 스키마
 */
export const FileSchema = z.object({
  name: z.string().min(1),
  size: z.number().min(0).max(100 * 1024 * 1024), // 최대 100MB
  type: z.string().regex(/^image\/(jpeg|jpg|png|gif|webp|heic|heif)$/i)
});

/**
 * 업로드 설정 검증 스키마
 */
export const UploadConfigSchema = z.object({
  folder: z.string().min(1),
  maxRetries: z.number().int().min(1).max(10).optional().default(3),
  maxFileSize: z.number().int().min(0).optional(),
  allowedTypes: z.array(z.string()).optional()
});

export type UploadConfig = z.infer<typeof UploadConfigSchema>;

/**
 * 파일 타입 검증 함수
 */
export function validateFile(file: File): { valid: boolean; error?: UploadError } {
  try {
    FileSchema.parse({
      name: file.name,
      size: file.size,
      type: file.type
    });
    return { valid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const fileSizeError = error.errors.find(e => e.path.includes('size'));
      const fileTypeError = error.errors.find(e => e.path.includes('type'));
      
      if (fileSizeError) {
        return {
          valid: false,
          error: new UploadError(
            UploadErrorCode.FILE_TOO_LARGE,
            '파일 크기가 너무 큽니다. (최대 100MB)',
            RetryableStatus.NON_RETRYABLE,
            undefined,
            { fileSize: file.size, fileName: file.name }
          )
        };
      }
      
      if (fileTypeError) {
        return {
          valid: false,
          error: new UploadError(
            UploadErrorCode.FILE_INVALID_TYPE,
            '지원하지 않는 파일 형식입니다. (JPEG, PNG, GIF, WEBP, HEIC만 지원)',
            RetryableStatus.NON_RETRYABLE,
            undefined,
            { fileType: file.type, fileName: file.name }
          )
        };
      }
    }
    
    return {
      valid: false,
      error: new UploadError(
        UploadErrorCode.VALIDATION_ERROR,
        '파일 검증에 실패했습니다.',
        RetryableStatus.NON_RETRYABLE,
        error instanceof Error ? error : undefined
      )
    };
  }
}

/**
 * 업로드 설정 검증 함수
 */
export function validateUploadConfig(config: unknown): { valid: boolean; error?: UploadError; config?: z.infer<typeof UploadConfigSchema> } {
  try {
    const validatedConfig = UploadConfigSchema.parse(config);
    return { valid: true, config: validatedConfig };
  } catch (error) {
    return {
      valid: false,
      error: new UploadError(
        UploadErrorCode.VALIDATION_ERROR,
        '업로드 설정이 유효하지 않습니다.',
        RetryableStatus.NON_RETRYABLE,
        error instanceof Error ? error : undefined
      )
    };
  }
}

/**
 * 타입 가드 함수: UploadError인지 확인
 */
export function isUploadError(error: unknown): error is UploadError {
  return error instanceof UploadError;
}

/**
 * 타입 가드 함수: 재시도 가능한 에러인지 확인
 */
export function isRetryableError(error: unknown): boolean {
  return isUploadError(error) && error.isRetryable();
}

/**
 * 에러를 UploadError로 변환하는 헬퍼 함수
 */
export function normalizeError(error: unknown, defaultCode: UploadErrorCode = UploadErrorCode.UNKNOWN_ERROR): UploadError {
  if (error instanceof UploadError) {
    return error;
  }
  
  if (error instanceof Error) {
    // 에러 메시지에서 재시도 가능 여부 판단
    const errorMessage = error.message.toLowerCase();
    let retryable = RetryableStatus.UNKNOWN;
    let code = defaultCode;
    
    if (errorMessage.includes('network') || errorMessage.includes('timeout') || errorMessage.includes('connection')) {
      retryable = RetryableStatus.RETRYABLE;
      code = UploadErrorCode.UPLOAD_NETWORK_ERROR;
    } else if (errorMessage.includes('quota') || errorMessage.includes('storage')) {
      retryable = RetryableStatus.NON_RETRYABLE;
      code = UploadErrorCode.UPLOAD_QUOTA_EXCEEDED;
    } else if (errorMessage.includes('cancelled') || errorMessage.includes('abort')) {
      retryable = RetryableStatus.NON_RETRYABLE;
      code = UploadErrorCode.UPLOAD_CANCELLED;
    }
    
    return new UploadError(code, error.message, retryable, error);
  }
  
  return new UploadError(
    defaultCode,
    typeof error === 'string' ? error : '알 수 없는 오류가 발생했습니다.',
    RetryableStatus.UNKNOWN
  );
}

