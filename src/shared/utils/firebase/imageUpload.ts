// 이미지 업로드 유틸리티 (클라이언트-서버 하이브리드)
import imageCompression from 'browser-image-compression';
import {
  UploadError,
  CompressionError,
  UploadErrorCode,
  RetryableStatus,
  normalizeError,
  UploadResult,
  PartialUploadResult,
  validateFile,
  validateUploadConfig,
  mergeImageUploadOptions,
  ImageUploadOptions
} from '@/shared/types/upload';

type UploadFileFn = (file: File, path: string, maxRetries?: number) => Promise<string>;

interface StorageDependencies {
  uploadFile: UploadFileFn;
}

let storageDependencies: StorageDependencies | null = null;

/**
 * 이미지 업로드 모듈에 사용할 Storage 의존성을 주입합니다.
 */
export const setImageUploadStorageDeps = (deps: StorageDependencies): void => {
  storageDependencies = deps;
};

/**
 * Storage 의존성을 보장합니다 (필요 시 지연 로딩).
 */
const ensureStorageDependencies = async (): Promise<StorageDependencies> => {
  if (storageDependencies) {
    return storageDependencies;
  }

  const module = await import('@/shared/services/firebase/storage');
  storageDependencies = {
    uploadFile: module.uploadFile
  };
  return storageDependencies;
};

/**
 * 클라이언트에서 즉시 표시할 작은 썸네일 생성
 * - 목적: 빠른 미리보기 (메모리 효율적)
 * - 크기: 300x300px (미리보기 품질 개선)
 * - 생성 시간: ~0.1초
 */
export const createQuickThumbnail = async (file: File): Promise<string> => {
  try {
    const options = {
      maxSizeMB: 0.1, // 100KB 이하
      maxWidthOrHeight: 300,
      useWebWorker: true,
      fileType: 'image/jpeg'
    };
    
    // browser-image-compression을 사용하여 썸네일 생성
    const compressedFile = await imageCompression(file, options);
    return URL.createObjectURL(compressedFile);
  } catch (error) {
    console.warn('썸네일 생성 실패, 원본 사용:', error);
    return URL.createObjectURL(file);
  }
};

/**
 * 미리보기 URL 정리 (메모리 해제)
 */
export const revokePreviewUrl = (url: string): void => {
  if (url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
};

/**
 * 스마트 이미지 압축 (browser-image-compression 사용)
 * - Web Worker를 사용하여 메인 스레드 차단 방지
 * - 자동으로 최적의 압축 알고리즘 적용
 */
const compressImageSmart = async (file: File): Promise<File> => {
  // 이미 작은 파일은 압축 건너뛰기 (GIF 제외 - GIF는 압축 시 애니메이션 깨질 수 있음)
  if (file.size <= 1024 * 1024 && file.type !== 'image/gif') { // 1MB 이하
    return file;
  }
  
  // GIF는 압축하지 않음
  if (file.type === 'image/gif') {
    return file;
  }

  const options = {
    maxSizeMB: 1,          // 최대 1MB
    maxWidthOrHeight: 1280, // FHD보다 약간 작게 (채팅용으로 적절)
    useWebWorker: true,     // Web Worker 사용으로 성능 최적화
    initialQuality: 0.8,    // 초기 품질
    alwaysKeepResolution: true // 해상도 유지 (너무 작아지는 것 방지)
  };

  try {
    const compressedFile = await imageCompression(file, options);
    
    // 만약 압축된 파일이 원본보다 크다면 원본 사용 (드물지만 발생 가능)
    if (compressedFile.size > file.size) {
      return file;
    }
    
    return compressedFile;
  } catch (error) {
    // 압축 실패 시 에러 로깅
    const compressionError = new CompressionError(
      `이미지 압축 실패: ${file.name}`,
      error instanceof Error ? error : undefined,
      { fileName: file.name, fileSize: file.size, fileType: file.type }
    );
    
    logError(compressionError);
    
    // 실패 시 원본 반환 (사용자 경험을 위해)
    return file;
  }
};

/**
 * 여러 이미지를 병렬로 압축
 */
const getCompressionPoolSize = (fileCount: number): number => {
  if (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) {
    return Math.max(2, Math.min(4, Math.floor(navigator.hardwareConcurrency / 2)));
  }
  return Math.max(1, Math.min(4, Math.ceil(fileCount / 2)));
};

const compressImagesParallel = async (files: File[]): Promise<File[]> => {
  if (files.length === 0) {
    return [];
  }

  const prioritizedQueue = files
    .map((file, index) => ({ file, index }))
    .sort((a, b) => b.file.size - a.file.size); // 큰 파일 우선 처리

  const poolSize = Math.min(getCompressionPoolSize(files.length), prioritizedQueue.length);
  const results: File[] = new Array(files.length);
  let pointer = 0;

  const worker = async (): Promise<void> => {
    while (pointer < prioritizedQueue.length) {
      const currentTask = prioritizedQueue[pointer++];
      try {
        const compressed = await compressImageSmart(currentTask.file);
        results[currentTask.index] = compressed;
      } catch (error) {
        console.warn(`파일 ${currentTask.file.name} 압축 실패, 원본 사용`, error);
        results[currentTask.index] = currentTask.file;
      }
    }
  };

  const workers = Array.from({ length: poolSize }, () => worker());
  await Promise.all(workers);

  return results;
};

const createThumbnailFile = async (file: File): Promise<File> => {
  const options = {
    maxSizeMB: 0.2,
    maxWidthOrHeight: 300,
    useWebWorker: true,
    fileType: 'image/webp',
    initialQuality: 0.8
  };

  const compressed = await imageCompression(file, options);
  const baseName = file.name.includes('.') ? file.name.substring(0, file.name.lastIndexOf('.')) : file.name;
  return new File([compressed], `${baseName}_thumb.webp`, { type: 'image/webp' });
};

const getThumbnailStoragePath = (originalPath: string): string => {
  const lastSlash = originalPath.lastIndexOf('/');
  const folder = lastSlash !== -1 ? originalPath.slice(0, lastSlash + 1) : '';
  const fileName = lastSlash !== -1 ? originalPath.slice(lastSlash + 1) : originalPath;
  const baseName = fileName.includes('.') ? fileName.substring(0, fileName.lastIndexOf('.')) : fileName;
  return `${folder}${baseName}_thumb.webp`;
};

const uploadClientThumbnail = async (
  originalFile: File,
  originalPath: string,
  uploadFn: UploadFileFn
): Promise<void> => {
  try {
    const thumbnailFile = await createThumbnailFile(originalFile);
    const thumbnailPath = getThumbnailStoragePath(originalPath);
    await uploadFn(thumbnailFile, thumbnailPath, 1);
  } catch (error) {
    console.warn('클라이언트 썸네일 업로드 실패:', error);
  }
};

/**
 * 이미지 파일을 업로드합니다.
 * 
 * 처리 흐름:
 * 1. 파일/옵션 검증 (Zod)
 * 2. 클라이언트: browser-image-compression으로 압축
 * 3. 업로드: Firebase Storage에 저장
 * 
 * @param file - 업로드할 이미지 파일
 * @param folder - 저장할 폴더 경로
 * @param options - 업로드 옵션 (재시도 횟수 등)
 * @returns 업로드된 이미지의 다운로드 URL
 * @throws UploadError - 업로드 실패 시
 */
export const uploadImage = async (
  file: File, 
  folder: string, 
  options?: Partial<ImageUploadOptions>
): Promise<string> => {
  // 파일 타입 검증
  const validation = validateFile(file);
  if (!validation.valid && validation.error) {
    throw validation.error;
  }
  
  const mergedOptions = mergeImageUploadOptions(options);
  
  // 업로드 설정 검증
  const configValidation = validateUploadConfig({ folder, maxRetries: mergedOptions.maxRetries });
  if (!configValidation.valid && configValidation.error) {
    throw configValidation.error;
  }
  
  const startTime = Date.now();
  let lastError: UploadError | null = null;
  
  const { uploadFile } = await ensureStorageDependencies();

  for (let attempt = 1; attempt <= mergedOptions.maxRetries; attempt++) {
    try {
      // 1단계: 압축
      const compressedFile = await compressImageSmart(file);

      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const path = `${folder}/${fileName}`;

      // 2단계: 업로드
      const downloadURL = await uploadFile(compressedFile, path);
      
      if (mergedOptions.generateThumbnails) {
        await uploadClientThumbnail(file, path, uploadFile);
      }
      
      const duration = Date.now() - startTime;
      logUploadSuccess(file.name, file.size, duration);
      
      return downloadURL;
      
    } catch (error) {
      const normalizedError = normalizeError(error, UploadErrorCode.UPLOAD_FAILED);
      lastError = normalizedError;
      
      // 재시도 가능한 에러인지 확인
      if (normalizedError.isRetryable() && attempt < mergedOptions.maxRetries) {
        // 지능적 백오프: 지수 백오프 + jitter
        const baseDelay = Math.pow(2, attempt - 1) * 1000;
        const jitter = Math.random() * 1000; // 0-1초 랜덤 지터 추가
        const delay = Math.min(baseDelay + jitter, 30000); // 최대 30초
        logRetryAttempt(file.name, attempt, mergedOptions.maxRetries, delay, normalizedError);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else if (!normalizedError.isRetryable()) {
        // 재시도 불가능한 에러는 즉시 중단
        logError(normalizedError, { fileName: file.name, fileSize: file.size, attempt });
        throw normalizedError;
      }
    }
  }
  
  // 모든 재시도 실패
  const finalError = lastError || new UploadError(
    UploadErrorCode.UPLOAD_FAILED,
    `이미지 업로드 실패 (${mergedOptions.maxRetries}회 시도)`,
    RetryableStatus.NON_RETRYABLE,
    undefined,
    { fileName: file.name, fileSize: file.size, maxRetries: mergedOptions.maxRetries }
  );
  
  logError(finalError, { fileName: file.name, fileSize: file.size, maxRetries: mergedOptions.maxRetries });
  throw finalError;
};

/**
 * 동적 배치 크기 계산
 * 네트워크 상태, 파일 크기, 브라우저 성능을 고려
 */
function calculateDynamicBatchSize(
  fileCount: number,
  totalSizeMB: number,
  averageFileSizeMB: number
): number {
  // 기본 배치 크기
  let batchSize = 6;
  
  // 파일 개수에 따른 조정
  if (fileCount <= 2) {
    batchSize = fileCount; // 적은 파일은 모두 동시 처리
  } else if (fileCount <= 8) {
    batchSize = Math.min(4, fileCount);
  } else if (fileCount <= 20) {
    batchSize = 6;
  } else {
    batchSize = 8; // 많은 파일은 더 큰 배치
  }
  
  // 파일 크기에 따른 조정
  if (totalSizeMB > 50) {
    batchSize = Math.max(2, batchSize - 2); // 큰 파일은 배치 크기 감소
  } else if (totalSizeMB < 5) {
    batchSize = Math.min(10, batchSize + 2); // 작은 파일은 배치 크기 증가
  }
  
  // 평균 파일 크기에 따른 조정
  if (averageFileSizeMB > 5) {
    batchSize = Math.max(2, batchSize - 1);
  } else if (averageFileSizeMB < 0.5) {
    batchSize = Math.min(12, batchSize + 2);
  }
  
  return Math.max(1, Math.min(batchSize, fileCount));
}

/**
 * 우선순위 기반 파일 정렬
 * 작은 파일 우선, 큰 파일은 나중에 처리
 */
function prioritizeFiles(files: File[]): File[] {
  return [...files].sort((a, b) => a.size - b.size);
}

/**
 * 여러 이미지 파일을 병렬로 일괄 업로드 (고성능)
 * 동적 배치 크기 조정 및 지능적 큐 관리
 * 부분 실패 시 상세한 에러 정보 제공
 * 
 * @param files - 업로드할 파일 배열
 * @param folder - 저장 폴더
 * @param onProgress - 진행률 콜백
 * @param options - 업로드 옵션 (병렬 압축 사용 여부 등)
 */
export const uploadImagesParallel = async (
  files: File[],
  folder: string,
  onProgress?: (current: number, total: number) => void,
  options?: Partial<ImageUploadOptions>
): Promise<string[]> => {
  const startTime = Date.now();
  
  try {
    const { uploadFile } = await ensureStorageDependencies();
    const mergedOptions = mergeImageUploadOptions(options);

    // 1단계: 병렬 압축
    let processedFiles = files;
    if (mergedOptions.useParallelCompression) {
      processedFiles = await compressImagesParallel(files);
    }
    
    // 2단계: 동적 배치 크기 계산
    const totalSizeMB = processedFiles.reduce((sum, file) => sum + file.size, 0) / (1024 * 1024);
    const averageFileSizeMB = totalSizeMB / processedFiles.length;
    const batchSize = calculateDynamicBatchSize(processedFiles.length, totalSizeMB, averageFileSizeMB);
    
    // 3단계: 우선순위 기반 정렬 (작은 파일 우선)
    const prioritizedFiles = prioritizeFiles(processedFiles);
    
    // 4단계: 배치 단위로 업로드 (지능적 큐 관리)
    let completedCount = 0;
    const results: UploadResult[] = [];
    
    for (let i = 0; i < prioritizedFiles.length; i += batchSize) {
      const batch = prioritizedFiles.slice(i, i + batchSize);
      
      // 배치 내에서 병렬 처리
      const batchPromises = batch.map(async (file, batchIndex): Promise<UploadResult> => {
        const fileStartTime = Date.now();
        
        try {
          // uploadImage 내부에서 재압축을 피하기 위해 직접 uploadFile 사용
          // (이미 processedFiles는 압축된 상태임)
          const timestamp = Date.now();
          const fileName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
          const path = `${folder}/${fileName}`;
          const downloadURL = await uploadFile(file, path);
          
          completedCount++;
          onProgress?.(completedCount, files.length);
          
          const duration = Date.now() - fileStartTime;

        if (mergedOptions.generateThumbnails) {
          await uploadClientThumbnail(file, path, uploadFile);
        }

          return {
            success: true,
            url: downloadURL,
            fileName: file.name,
            fileSize: file.size,
            duration
          };
        } catch (error) {
          const normalizedError = normalizeError(error, UploadErrorCode.UPLOAD_FAILED);
          const duration = Date.now() - fileStartTime;
          
          logError(normalizedError, {
            fileName: file.name,
            fileSize: file.size,
            index: i + batchIndex,
            duration
          });
          
          completedCount++;
          onProgress?.(completedCount, files.length);
          
          return {
            success: false,
            fileName: file.name,
            fileSize: file.size,
            error: normalizedError,
            duration
          };
        }
      });
      
      // 배치 완료 대기
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // 네트워크 상태에 따른 자동 조정 (다음 배치 전 짧은 대기)
      if (i + batchSize < prioritizedFiles.length) {
        // 네트워크 부하를 줄이기 위한 짧은 대기 (선택적)
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    
    const duration = Date.now() - startTime;
    
    // 성공/실패 분리
    const successful: UploadResult[] = [];
    const failed: UploadResult[] = [];
    
    results.forEach(result => {
      if (result.success && result.url) {
        successful.push(result);
      } else {
        failed.push(result);
      }
    });
    
    // 부분 실패 시 상세한 에러 정보 제공
    if (failed.length > 0) {
      const partialResult: PartialUploadResult = {
        successful,
        failed,
        totalCount: files.length,
        successCount: successful.length,
        failureCount: failed.length
      };
      
      logPartialUploadFailure(partialResult, duration);
      
      // 일부 성공한 경우에도 URL 반환 (부분 성공 허용)
      if (successful.length > 0) {
        console.warn(`⚠️ 일부 파일 업로드 실패: ${failed.length}개 실패, ${successful.length}개 성공`);
        return successful.map(r => r.url!);
      } else {
        // 모두 실패한 경우 에러 throw
        const firstError = failed[0]?.error;
        throw firstError || new UploadError(
          UploadErrorCode.UPLOAD_FAILED,
          '모든 파일 업로드에 실패했습니다.',
          RetryableStatus.UNKNOWN
        );
      }
    }
    
    // 모두 성공
    logUploadBatchSuccess(files.length, duration);
    return successful.map(r => r.url!);
    
  } catch (error) {
    const normalizedError = normalizeError(error, UploadErrorCode.UPLOAD_FAILED);
    logError(normalizedError, {
      totalFiles: files.length,
      duration: Date.now() - startTime
    });
    throw normalizedError;
  }
};

/**
 * 썸네일 URL 가져오기 (Functions에서 자동 생성)
 */
export const getThumbnailUrl = (originalUrl: string): string => {
  try {
    const urlObj = new URL(originalUrl);
    const path = decodeURIComponent(urlObj.pathname);
    const fileName = path.split('/').pop();
    
    if (!fileName) return originalUrl;
    
    const fileNameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
    const thumbnailFileName = `${fileNameWithoutExt}_thumb.webp`;
    
    // Firebase Storage URL 패턴에 맞게 변경 필요
    // 하지만 현재 구조에서는 원본 URL을 반환하는 것이 안전할 수 있음
    return originalUrl; 
  } catch (e) {
    return originalUrl;
  }
};

/**
 * 이미지 캐싱 시스템
 */
export class ImageCache {
  private static readonly CACHE_KEY = 'hs_image_cache';
  private static readonly MAX_CACHE_SIZE = 100;
  private static readonly CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7일

  static setImage(url: string, metadata?: { size?: number; type?: string }): void {
    try {
      const cache = this.getCache();
      const now = Date.now();
      
      if (Object.keys(cache).length >= this.MAX_CACHE_SIZE) {
        const oldestKey = Object.keys(cache).reduce((oldest, key) => 
          (cache[key] as { timestamp: number }).timestamp < (cache[oldest] as { timestamp: number }).timestamp ? key : oldest
        );
        delete cache[oldestKey];
      }
      
      const urlHash = this.hashUrl(url);
      cache[urlHash] = {
        url,
        timestamp: now,
        metadata: metadata || {}
      };
      
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.warn('캐시 저장 실패:', error);
    }
  }

  static getImage(url: string): string | null {
    try {
      const cache = this.getCache();
      const urlHash = this.hashUrl(url);
      const cached = cache[urlHash];
      
      if (cached) {
        const now = Date.now();
        if (now - (cached as { timestamp: number }).timestamp < this.CACHE_EXPIRY) {
          return (cached as { url: string }).url;
        } else {
          delete cache[urlHash];
          localStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  static clearCache(): void {
    try {
      localStorage.removeItem(this.CACHE_KEY);
    } catch (error) { /* ignore */ }
  }

  private static getCache(): Record<string, unknown> {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      return cached ? JSON.parse(cached) : {};
    } catch (error) {
      return {};
    }
  }

  private static hashUrl(url: string): string {
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
}

/**
 * 여러 이미지 파일을 일괄 업로드 (기존 API 호환)
 */
export const uploadImages = async (
  files: File[],
  folder: string,
  onProgress?: (current: number, total: number) => void
): Promise<string[]> => {
  return uploadImagesParallel(files, folder, onProgress);
};

/**
 * 에러 로깅 함수
 */
function logError(error: UploadError, metadata?: Record<string, unknown>): void {
  const errorLog = {
    timestamp: new Date().toISOString(),
    errorCode: error.code,
    message: error.message,
    retryable: error.retryable,
    fileName: metadata?.fileName,
    fileSize: metadata?.fileSize,
    metadata: { ...metadata, ...error.metadata }
  };
  
  console.error('[UPLOAD_ERROR]', JSON.stringify(errorLog));
  
  // 사용자 친화적인 메시지도 로깅
  console.error(`❌ ${error.getUserFriendlyMessage()}`);
}

/**
 * 업로드 성공 로깅
 */
function logUploadSuccess(fileName: string, fileSize: number, duration: number): void {
  console.log(`✅ 업로드 성공: ${fileName} (${(fileSize / 1024).toFixed(2)}KB, ${duration}ms)`);
}

/**
 * 재시도 시도 로깅
 */
function logRetryAttempt(fileName: string, attempt: number, maxRetries: number, delay: number, error: UploadError): void {
  console.warn(`⚠️ 재시도 ${attempt}/${maxRetries}: ${fileName} (${delay}ms 후 재시도)`, error.getUserFriendlyMessage());
}

/**
 * 부분 업로드 실패 로깅
 */
function logPartialUploadFailure(result: PartialUploadResult, duration: number): void {
  const errorLog = {
    timestamp: new Date().toISOString(),
    type: 'partial_upload_failure',
    totalCount: result.totalCount,
    successCount: result.successCount,
    failureCount: result.failureCount,
    duration,
    failedFiles: result.failed.map(f => ({
      fileName: f.fileName,
      fileSize: f.fileSize,
      errorCode: f.error?.code,
      errorMessage: f.error?.getUserFriendlyMessage()
    }))
  };
  
  console.error('[PARTIAL_UPLOAD_FAILURE]', JSON.stringify(errorLog));
}

/**
 * 배치 업로드 성공 로깅
 */
function logUploadBatchSuccess(fileCount: number, duration: number): void {
  console.log(`✅ 배치 업로드 완료: ${fileCount}개 파일 (${duration}ms)`);
}

/**
 * 이미지 업로드 상태
 */
export interface ImageUploadState {
  file: File;
  previewUrl: string;
  uploadedUrl?: string;
  thumbnailUrl?: string;
  status: 'preview' | 'uploading' | 'uploaded' | 'error';
  progress?: number;
  error?: string;
}

/**
 * 이미지 미리보기 상태 생성
 */
export const createImagePreview = async (file: File): Promise<ImageUploadState> => {
  try {
    const previewUrl = await createQuickThumbnail(file);
    return {
      file,
      previewUrl,
      status: 'preview',
    };
  } catch (error) {
    return {
      file,
      previewUrl: URL.createObjectURL(file),
      status: 'preview',
    };
  }
};

/**
 * 이미지 업로드 및 상태 업데이트
 * 업로드 완료 후 Blob URL 자동 정리
 */
export const uploadImageWithState = async (
  state: ImageUploadState,
  folder: string,
  onStateChange?: (state: ImageUploadState) => void
): Promise<ImageUploadState> => {
  try {
    const uploadingState = { ...state, status: 'uploading' as const, progress: 0 };
    onStateChange?.(uploadingState);

    const uploadedUrl = await uploadImage(state.file, folder);

    const uploadedState = {
      ...state,
      uploadedUrl,
      status: 'uploaded' as const,
      progress: 100,
    };
    onStateChange?.(uploadedState);

    // 업로드 완료 후 Blob URL 정리 (메모리 해제)
    if (state.previewUrl && state.previewUrl.startsWith('blob:')) {
      revokePreviewUrl(state.previewUrl);
    }

    return uploadedState;
  } catch (error) {
    const errorState = {
      ...state,
      status: 'error' as const,
      error: error instanceof Error ? error.message : '업로드 실패',
    };
    onStateChange?.(errorState);
    return errorState;
  }
};
