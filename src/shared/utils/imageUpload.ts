// 이미지 업로드 유틸리티 (클라이언트-서버 하이브리드)
import { uploadFile } from '@/shared/services/firebase/storage';

/**
 * 클라이언트에서 즉시 표시할 작은 썸네일 생성
 * - 목적: 빠른 미리보기 (메모리 효율적)
 * - 크기: 200x200px, 품질: 60%
 * - 생성 시간: ~0.1초
 */
export const createQuickThumbnail = async (file: File): Promise<string> => {
  const THUMB_SIZE = 200;
  const THUMB_QUALITY = 0.6;

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target?.result as string;
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        // 정사각형 비율로 맞추기
        const size = Math.min(width, height);
        const scale = THUMB_SIZE / size;
        
        canvas.width = THUMB_SIZE;
        canvas.height = THUMB_SIZE;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          resolve(URL.createObjectURL(file)); // 실패 시 원본 Blob URL
          return;
        }

        // 중앙 크롭
        const sx = (width - size) / 2;
        const sy = (height - size) / 2;
        
        ctx.drawImage(img, sx, sy, size, size, 0, 0, THUMB_SIZE, THUMB_SIZE);

        // Data URL 반환 (매우 작아서 메모리 효율적)
        const dataUrl = canvas.toDataURL('image/jpeg', THUMB_QUALITY);
        resolve(dataUrl);
      };
      
      img.onerror = () => resolve(URL.createObjectURL(file));
    };
    
    reader.onerror = () => resolve(URL.createObjectURL(file));
  });
};

/**
 * 미리보기 URL 정리 (메모리 해제)
 */
export const revokePreviewUrl = (url: string): void => {
  if (url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
  // Data URL은 정리 불필요 (메모리에 문자열로 저장)
};

/**
 * 클라이언트에서 빠른 압축 (Canvas API)
 * - 목적: 빠른 업로드를 위한 경량 압축
 * - 서버에서 추가로 썸네일 생성
 */
const compressImageQuick = async (file: File): Promise<File> => {
  const MAX_WIDTH = 1920;
  const MAX_HEIGHT = 1920;
  const QUALITY = 0.85;

  // HEIF/HEIC 파일은 압축 건너뛰기 (Functions에서 변환 처리)
  if (file.type.includes('heic') || file.type.includes('heif')) {
    console.log('📱 HEIF/HEIC 파일 감지: 압축 건너뛰고 원본 업로드');
    return file;
  }

  // 일반 이미지 압축 (품질이슈 증거 이미지 최적화)

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target?.result as string;
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        // 비율 유지하면서 리사이징
        if (width > MAX_WIDTH || height > MAX_HEIGHT) {
          const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
          width = width * ratio;
          height = height * ratio;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            console.log(`클라이언트 압축: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);
            resolve(compressedFile);
          },
          'image/jpeg',
          QUALITY
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
};

/**
 * 이미지 파일을 업로드합니다.
 * 
 * 처리 흐름:
 * 1. 클라이언트: 모든 이미지 압축 (품질 최적화)
 * 2. 업로드: Firebase Storage에 저장 (재시도 로직 포함)
 * 3. 서버(Functions): 백그라운드에서 썸네일 생성 (300px WebP)
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
      // 1단계: 클라이언트 압축 (모든 이미지)
      const compressedFile = await compressImageQuick(file);

      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name}`;
      const path = `${folder}/${fileName}`;

      // 2단계: Storage 업로드 (Functions 트리거 자동 실행)
      const downloadURL = await uploadFile(compressedFile, path);
      
      console.log(`✅ 이미지 업로드 성공 (시도 ${attempt}/${maxRetries}):`, fileName);
      return downloadURL;
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('알 수 없는 오류');
      console.warn(`⚠️ 이미지 업로드 실패 (시도 ${attempt}/${maxRetries}):`, lastError.message);
      
      // 마지막 시도가 아니면 잠시 대기 후 재시도
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt - 1) * 1000; // 지수 백오프: 1초, 2초, 4초...
        console.log(`⏳ ${delay}ms 후 재시도...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // 모든 재시도 실패
  console.error(`❌ 이미지 업로드 최종 실패 (${maxRetries}회 시도):`, lastError?.message);
  throw new Error(`이미지 업로드 실패: ${lastError?.message || '알 수 없는 오류'}`);
};

/**
 * 여러 이미지 파일을 일괄 업로드
 * 
 * @param files - 업로드할 이미지 파일 배열
 * @param folder - 저장할 폴더 경로
 * @param onProgress - 진행률 콜백
 * @returns 업로드된 이미지 URL 배열
 */
export const uploadImages = async (
  files: File[],
  folder: string,
  onProgress?: (current: number, total: number) => void
): Promise<string[]> => {
  const urls: string[] = [];
  
  for (let i = 0; i < files.length; i++) {
    try {
      const url = await uploadImage(files[i], folder);
      urls.push(url);
      onProgress?.(i + 1, files.length);
    } catch (error) {
      console.error(`업로드 실패: ${files[i].name}`, error);
      onProgress?.(i + 1, files.length);
    }
  }

  return urls;
};

/**
 * 썸네일 URL 가져오기 (Functions에서 자동 생성)
 * Functions가 백그라운드에서 300px WebP 썸네일 생성
 */
export const getThumbnailUrl = (originalUrl: string): string => {
  const urlParts = originalUrl.split('/');
  const fileName = urlParts[urlParts.length - 1];
  const fileNameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
  const thumbnailFileName = `${fileNameWithoutExt}_thumb.webp`;
  urlParts[urlParts.length - 1] = thumbnailFileName;
  return urlParts.join('/');
};

/**
 * 이미지 캐싱 시스템
 * - 로컬 스토리지에 이미지 URL 저장
 * - 재방문 시 빠른 로딩
 */
export class ImageCache {
  private static readonly CACHE_KEY = 'hs_image_cache';
  private static readonly MAX_CACHE_SIZE = 100; // 최대 100개 이미지
  private static readonly CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7일

  /**
   * 이미지 URL을 캐시에 저장
   */
  static setImage(url: string, metadata?: { size?: number; type?: string }): void {
    try {
      const cache = this.getCache();
      const now = Date.now();
      
      // 캐시 크기 제한 (오래된 것부터 삭제)
      if (Object.keys(cache).length >= this.MAX_CACHE_SIZE) {
        const oldestKey = Object.keys(cache).reduce((oldest, key) => 
          cache[key].timestamp < cache[oldest].timestamp ? key : oldest
        );
        delete cache[oldestKey];
      }
      
      // URL 해시를 키로 사용 (보안상 URL 자체는 저장하지 않음)
      const urlHash = this.hashUrl(url);
      cache[urlHash] = {
        url,
        timestamp: now,
        metadata: metadata || {}
      };
      
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
      console.log(`📦 이미지 캐시 저장: ${urlHash}`);
    } catch (error) {
      console.warn('캐시 저장 실패:', error);
    }
  }

  /**
   * 캐시에서 이미지 URL 조회
   */
  static getImage(url: string): string | null {
    try {
      const cache = this.getCache();
      const urlHash = this.hashUrl(url);
      const cached = cache[urlHash];
      
      if (cached) {
        // 만료 확인
        const now = Date.now();
        if (now - cached.timestamp < this.CACHE_EXPIRY) {
          console.log(`⚡ 캐시 히트: ${urlHash}`);
          return cached.url;
        } else {
          // 만료된 캐시 삭제
          delete cache[urlHash];
          localStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
        }
      }
      
      return null;
    } catch (error) {
      console.warn('캐시 조회 실패:', error);
      return null;
    }
  }

  /**
   * 캐시 초기화
   */
  static clearCache(): void {
    try {
      localStorage.removeItem(this.CACHE_KEY);
      console.log('🗑️ 이미지 캐시 초기화');
    } catch (error) {
      console.warn('캐시 초기화 실패:', error);
    }
  }

  /**
   * 캐시 상태 조회
   */
  static getCacheInfo(): { size: number; keys: string[] } {
    try {
      const cache = this.getCache();
      return {
        size: Object.keys(cache).length,
        keys: Object.keys(cache)
      };
    } catch (error) {
      return { size: 0, keys: [] };
    }
  }

  private static getCache(): Record<string, any> {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      return cached ? JSON.parse(cached) : {};
    } catch (error) {
      return {};
    }
  }

  private static hashUrl(url: string): string {
    // 간단한 해시 함수 (실제로는 crypto.subtle.digest 사용 권장)
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32bit 정수로 변환
    }
    return Math.abs(hash).toString(36);
  }
}

/**
 * 이미지 업로드 상태
 */
export interface ImageUploadState {
  file: File;
  previewUrl: string;      // 즉시 표시 (Blob URL)
  uploadedUrl?: string;    // 업로드 완료 후
  thumbnailUrl?: string;   // Functions 생성 후 (선택사항)
  status: 'preview' | 'uploading' | 'uploaded' | 'error';
  progress?: number;
  error?: string;
}

/**
 * 이미지 미리보기 상태 생성
 * - 사용자가 파일 선택 시 즉시 호출
 * - 작은 썸네일 생성 (비동기)
 */
export const createImagePreview = async (file: File): Promise<ImageUploadState> => {
  const previewUrl = await createQuickThumbnail(file);
  return {
    file,
    previewUrl,
    status: 'preview',
  };
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
    // 상태: 업로드 중
    const uploadingState = { ...state, status: 'uploading' as const, progress: 0 };
    onStateChange?.(uploadingState);

    // 업로드
    const uploadedUrl = await uploadImage(state.file, folder);

    // 상태: 업로드 완료
    const uploadedState = {
      ...state,
      uploadedUrl,
      status: 'uploaded' as const,
      progress: 100,
    };
    onStateChange?.(uploadedState);

    return uploadedState;
  } catch (error) {
    // 상태: 에러
    const errorState = {
      ...state,
      status: 'error' as const,
      error: error instanceof Error ? error.message : '업로드 실패',
    };
    onStateChange?.(errorState);
    return errorState;
  }
};


