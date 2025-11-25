// 이미지 업로드 유틸리티 (클라이언트-서버 하이브리드)
import { uploadFile } from '@/shared/services/firebase/storage';
import imageCompression from 'browser-image-compression';

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
    console.error('이미지 압축 실패:', error);
    return file; // 실패 시 원본 반환
  }
};

/**
 * 여러 이미지를 병렬로 압축
 */
const compressImagesParallel = async (files: File[]): Promise<File[]> => {
  const compressPromises = files.map(file => compressImageSmart(file));
  const results = await Promise.allSettled(compressPromises);
  
  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      console.warn(`파일 ${files[index].name} 압축 실패, 원본 사용`);
      return files[index];
    }
  });
};

/**
 * 이미지 파일을 업로드합니다.
 * 
 * 처리 흐름:
 * 1. 클라이언트: browser-image-compression으로 압축
 * 2. 업로드: Firebase Storage에 저장
 * 
 * @param file - 업로드할 이미지 파일
 * @param folder - 저장할 폴더 경로
 * @param maxRetries - 최대 재시도 횟수 (기본값: 3)
 * @returns 업로드된 이미지의 다운로드 URL
 */
export const uploadImage = async (
  file: File, 
  folder: string, 
  maxRetries: number = 3
): Promise<string> => {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // 1단계: 압축
      const compressedFile = await compressImageSmart(file);

      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const path = `${folder}/${fileName}`;

      // 2단계: 업로드
      const downloadURL = await uploadFile(compressedFile, path);
      
      return downloadURL;
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('알 수 없는 오류');
      
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt - 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw new Error(`이미지 업로드 실패 (${maxRetries}회 시도): ${lastError?.message}`);
};

/**
 * 여러 이미지 파일을 병렬로 일괄 업로드 (고성능)
 */
export const uploadImagesParallel = async (
  files: File[],
  folder: string,
  onProgress?: (current: number, total: number) => void,
  useParallelCompression: boolean = true
): Promise<string[]> => {
  try {
    // 1단계: 병렬 압축
    let processedFiles = files;
    if (useParallelCompression) {
      processedFiles = await compressImagesParallel(files);
    }
    
    // 2단계: 병렬 업로드 (배치 처리 없이 Promise.all로 최대 성능)
    // 파일 개수가 아주 많지 않다면(예: 20개 이하) 한꺼번에 요청하는 것이 가장 빠름
    // 브라우저가 알아서 연결 제한을 관리함
    
    let completedCount = 0;
    
    const uploadPromises = processedFiles.map(async (file) => {
      try {
        const url = await uploadImage(file, folder, 3); // 재시도 로직이 uploadImage에 포함됨 (이미 압축된 파일이지만 uploadImage 내부에서 크기 체크 후 건너뜀)
        // 주의: uploadImage를 다시 호출하면 중복 압축 시도할 수 있음.
        // 하지만 compressImageSmart는 크기 체크를 하므로 1MB 이하면 바로 리턴됨.
        // 더 효율적으로 하려면 uploadFile을 직접 호출해야 함.
        
        // uploadImage 내부에서 재압축을 피하기 위해 직접 uploadFile 사용
        // (이미 processedFiles는 압축된 상태임)
        const timestamp = Date.now();
        const fileName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        const path = `${folder}/${fileName}`;
        const downloadURL = await uploadFile(file, path);
        
        completedCount++;
        onProgress?.(completedCount, files.length);
        return { success: true, url: downloadURL };
      } catch (error) {
        console.error(`❌ 업로드 실패: ${file.name}`, error);
        completedCount++;
        onProgress?.(completedCount, files.length);
        return { success: false, url: null };
      }
    });
    
    const results = await Promise.all(uploadPromises);
    
    const urls: string[] = [];
    results.forEach(result => {
      if (result.success && result.url) {
        urls.push(result.url);
      }
    });
    
    return urls;
    
  } catch (error) {
    console.error(`❌ 병렬 업로드 실패:`, error);
    throw error;
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
