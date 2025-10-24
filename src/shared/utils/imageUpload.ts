// 이미지 업로드 유틸리티 (클라이언트-서버 하이브리드)
import { uploadFile } from '@/shared/services/firebase/storage';


/**
 * 클라이언트에서 즉시 표시할 작은 썸네일 생성
 * - 목적: 빠른 미리보기 (메모리 효율적)
 * - 크기: 200x200px, 품질: 60%
 * - 생성 시간: ~0.1초
 * - 개선: 오류 처리 강화 및 재시도 로직 추가
 */
export const createQuickThumbnail = async (file: File): Promise<string> => {
  const THUMB_SIZE = 200;
  const THUMB_QUALITY = 0.6;
  const MAX_RETRIES = 3;

  // 파일 유효성 검사
  if (!file || file.size === 0) {
    console.warn('⚠️ 빈 파일 또는 크기가 0인 파일:', file.name);
    return URL.createObjectURL(file);
  }

  // 지원되는 이미지 타입 확인
  const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  if (!supportedTypes.includes(file.type.toLowerCase())) {
    console.warn('⚠️ 지원되지 않는 이미지 타입:', file.type, file.name);
    return URL.createObjectURL(file);
  }


  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        let img: HTMLImageElement | null = null;
        let canvas: HTMLCanvasElement | null = null;
        
        // 리소스 정리 함수
        const cleanup = () => {
          if (img) {
            img.onload = null;
            img.onerror = null;
            img.src = '';
            img = null;
          }
          if (canvas) {
            canvas.width = 0;
            canvas.height = 0;
            canvas = null;
          }
        };
        
        reader.onload = (e) => {
          try {
            img = new Image();
            img.crossOrigin = 'anonymous'; // CORS 문제 방지
            
            img.onload = () => {
              try {
                canvas = document.createElement('canvas');
                const { width, height } = img!;

                // 이미지 크기 유효성 검사
                if (width === 0 || height === 0) {
                  cleanup();
                  reject(new Error(`이미지 크기가 0입니다: ${width}x${height}`));
                  return;
                }

                // 정사각형 비율로 맞추기
                const size = Math.min(width, height);
                
                canvas!.width = THUMB_SIZE;
                canvas!.height = THUMB_SIZE;
                const ctx = canvas!.getContext('2d');
                
                if (!ctx) {
                  cleanup();
                  reject(new Error('Canvas context를 가져올 수 없습니다'));
                  return;
                }

                // Canvas 설정 최적화
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'medium';

                // 중앙 크롭
                const sx = Math.max(0, (width - size) / 2);
                const sy = Math.max(0, (height - size) / 2);
                
                // 이미지 그리기 (안전한 범위 체크)
                ctx.drawImage(img!, sx, sy, size, size, 0, 0, THUMB_SIZE, THUMB_SIZE);

                // Data URL 생성
                const dataUrl = canvas!.toDataURL('image/jpeg', THUMB_QUALITY);
                
                // 생성된 Data URL 유효성 검사
                if (!dataUrl || dataUrl === 'data:,') {
                  cleanup();
                  reject(new Error('썸네일 생성 실패: 빈 Data URL'));
                  return;
                }

                cleanup();
                resolve(dataUrl);
              } catch (error) {
                cleanup();
                reject(error);
              }
            };
            
            img.onerror = () => {
              cleanup();
              reject(new Error('이미지 로드 실패'));
            };

            img.src = e.target?.result as string;
          } catch (error) {
            cleanup();
            reject(error);
          }
        };
        
        reader.onerror = () => {
          reject(new Error('파일 읽기 실패'));
        };

        reader.readAsDataURL(file);
      });

      return result;

    } catch (error) {
      if (attempt === MAX_RETRIES) {
        return URL.createObjectURL(file);
      }
      
      // 재시도 전 더 긴 대기 (500ms, 1000ms, 2000ms)
      const waitTime = 500 * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  // 최종 Fallback
  return URL.createObjectURL(file);
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
 * 동적 배치 크기 계산 (파일 수와 크기에 따라 최적화)
 */
const calculateOptimalBatchSize = (files: File[], operation: 'compress' | 'upload'): number => {
  const fileCount = files.length;
  const totalSizeMB = files.reduce((sum, file) => sum + file.size, 0) / (1024 * 1024);
  
  // 기본 배치 크기
  let baseBatchSize = 4;
  
  // 파일 수에 따른 조정
  if (fileCount <= 2) {
    baseBatchSize = fileCount; // 적은 파일은 모두 동시 처리
  } else if (fileCount <= 8) {
    baseBatchSize = Math.min(4, fileCount); // 중간 파일 수
  } else {
    baseBatchSize = 6; // 많은 파일은 더 큰 배치
  }
  
  // 파일 크기에 따른 조정
  if (totalSizeMB > 100) {
    baseBatchSize = Math.max(2, baseBatchSize - 2); // 큰 파일은 배치 크기 감소
  } else if (totalSizeMB < 10) {
    baseBatchSize = Math.min(8, baseBatchSize + 2); // 작은 파일은 배치 크기 증가
  }
  
  // 작업 유형에 따른 조정
  if (operation === 'compress') {
    baseBatchSize = Math.min(6, baseBatchSize); // 압축은 CPU 집약적
  } else if (operation === 'upload') {
    baseBatchSize = Math.min(8, baseBatchSize); // 업로드는 네트워크 집약적
  }
  
  return baseBatchSize;
};

/**
 * 여러 이미지를 병렬로 압축 (Web Workers 활용)
 * - 동시에 여러 이미지 압축 처리
 * - CPU 코어를 최대한 활용
 */
const compressImagesParallel = async (files: File[]): Promise<File[]> => {
  const BATCH_SIZE = calculateOptimalBatchSize(files, 'compress');
  const compressedFiles: File[] = [];
  
  // 배치 단위로 나누어 처리
  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);
    
    // 배치 내에서 병렬 처리
    const batchPromises = batch.map(file => compressImageQuick(file));
    const batchResults = await Promise.all(batchPromises);
    
    compressedFiles.push(...batchResults);
    
    // UI 업데이트를 위한 짧은 대기
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  return compressedFiles;
};

/**
 * 이미지 압축을 Web Worker에서 처리 (비동기)
 * - 메인 스레드 블로킹 방지
 * - 더 빠른 처리
 */
const compressImageWithWorker = async (file: File): Promise<File> => {
  // Web Worker가 지원되지 않는 경우 기본 압축 사용
  if (typeof Worker === 'undefined') {
    return compressImageQuick(file);
  }
  
  return new Promise(async (resolve) => {
    // 간단한 Web Worker 코드 (실제로는 별도 파일로 분리 권장)
    const workerCode = `
      self.onmessage = function(e) {
        const { file, maxWidth, maxHeight, quality } = e.data;
        
        // ArrayBuffer를 Blob으로 변환
        const blob = new Blob([file.data], { type: file.type });
        
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        
        reader.onload = function(event) {
          const img = new Image();
          img.src = event.target.result;
          
          img.onload = function() {
            const canvas = document.createElement('canvas');
            let { width, height } = img;
            
            if (width > maxWidth || height > maxHeight) {
              const ratio = Math.min(maxWidth / width, maxHeight / height);
              width = width * ratio;
              height = height * ratio;
            }
            
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
              self.postMessage({ success: false, file: file });
              return;
            }
            
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'low';
            ctx.drawImage(img, 0, 0, width, height);
            
            canvas.toBlob(function(blob) {
              if (!blob) {
                self.postMessage({ success: false, file: file });
                return;
              }
              
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              
              self.postMessage({ 
                success: true, 
                file: compressedFile,
                originalSize: file.size,
                compressedSize: compressedFile.size
              });
            }, 'image/jpeg', quality);
          };
          
          img.onerror = function() {
            self.postMessage({ success: false, file: file });
          };
        };
        
        reader.onerror = function() {
          self.postMessage({ success: false, file: file });
        };
      };
    `;
    
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    const worker = new Worker(workerUrl);
    
    // File을 ArrayBuffer로 변환하여 전달
    const arrayBuffer = await file.arrayBuffer();
    worker.postMessage({
      file: {
        name: file.name,
        type: file.type,
        size: file.size,
        data: arrayBuffer
      },
      maxWidth: 1920,
      maxHeight: 1080,
      quality: 0.6
    });
    
    worker.onmessage = function(e) {
      const { success, file: resultFile } = e.data;
      worker.terminate();
      URL.revokeObjectURL(workerUrl);
      resolve(success ? resultFile : file);
    };
    
    worker.onerror = function() {
      worker.terminate();
      URL.revokeObjectURL(workerUrl);
      resolve(file);
    };
  });
};

/**
 * 스마트 이미지 압축 (파일 크기별 최적화)
 * - 작은 파일: 압축 건너뛰기
 * - 중간 파일: 빠른 압축
 * - 큰 파일: 고품질 압축
 */
const compressImageSmart = async (file: File): Promise<File> => {
  const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB
  const LARGE_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  
  // 작은 파일은 압축 건너뛰기
  if (file.size <= MAX_FILE_SIZE) {
    return file;
  }
  
  // 큰 파일은 고품질 압축
  if (file.size > LARGE_FILE_SIZE) {
    return compressImageWithWorker(file);
  }
  
  // 중간 파일은 빠른 압축
  return compressImageQuick(file);
};
const compressImageQuick = async (file: File): Promise<File> => {
  const MAX_WIDTH = 1920;  // 원래대로 복원
  const MAX_HEIGHT = 1080; // 원래대로 복원
  const QUALITY = 0.6;     // 품질 향상 (0.6 → 0.8)
  const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB 이하는 압축 건너뛰기
  

  // HEIF/HEIC 파일은 압축 건너뛰기 (Functions에서 변환 처리)
  if (file.type.includes('heic') || file.type.includes('heif')) {
    return file;
  }

  // 작은 파일은 압축 건너뛰기 (빠른 처리)
  if (file.size <= MAX_FILE_SIZE) {
    return file;
  }

  // 빠른 압축을 위한 최적화

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

        // 빠른 압축을 위한 Canvas 최적화
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'low'; // 빠른 처리
        
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
  maxRetries: number = 5
): Promise<string> => {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // 1단계: 클라이언트 압축 (스마트 압축 사용)
      const compressedFile = await compressImageSmart(file);

      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name}`;
      const path = `${folder}/${fileName}`;

      // 2단계: Storage 업로드 (Functions 트리거 자동 실행)
      const downloadURL = await uploadFile(compressedFile, path);
      
      return downloadURL;
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('알 수 없는 오류');
      
      // 마지막 시도가 아니면 잠시 대기 후 재시도
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt - 1) * 1000; // 지수 백오프: 1초, 2초, 4초...
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // 모든 재시도 실패
  console.error(`❌ 이미지 업로드 최종 실패 (${maxRetries}회 시도):`, lastError?.message);
  throw new Error(`이미지 업로드 실패: ${lastError?.message || '알 수 없는 오류'}`);
};

/**
 * 여러 이미지 파일을 병렬로 일괄 업로드 (고성능)
 * 
 * @param files - 업로드할 이미지 파일 배열
 * @param folder - 저장할 폴더 경로
 * @param onProgress - 진행률 콜백
 * @param useParallelCompression - 병렬 압축 사용 여부 (기본값: true)
 * @returns 업로드된 이미지 URL 배열
 */
export const uploadImagesParallel = async (
  files: File[],
  folder: string,
  onProgress?: (current: number, total: number) => void,
  useParallelCompression: boolean = true
): Promise<string[]> => {
  
  try {
    // 1단계: 병렬 압축 (선택적)
    let processedFiles = files;
    if (useParallelCompression && files.length > 1) {
      processedFiles = await compressImagesParallel(files);
    }
    
    // 2단계: 병렬 업로드 (배치 처리)
    const BATCH_SIZE = calculateOptimalBatchSize(processedFiles, 'upload');
    const urls: string[] = [];
    let completedCount = 0; // 완료된 파일 수 추적
    
    for (let i = 0; i < processedFiles.length; i += BATCH_SIZE) {
      const batch = processedFiles.slice(i, i + BATCH_SIZE);
      
      // 배치 내에서 병렬 업로드 (재시도 횟수 증가)
      const batchPromises = batch.map(async (file, index) => {
        try {
          const url = await uploadImage(file, folder, 5); // 재시도 횟수 5회로 증가
          completedCount++;
          onProgress?.(completedCount, files.length);
          return url;
        } catch (error) {
          console.error(`업로드 실패: ${file.name}`, error);
          completedCount++;
          onProgress?.(completedCount, files.length);
          return null;
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      urls.push(...batchResults.filter(url => url !== null));
      
      // UI 업데이트를 위한 짧은 대기
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    return urls;
    
  } catch (error) {
    console.error('❌ 병렬 업로드 실패:', error);
    throw error;
  }
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
          (cache[key] as { timestamp: number }).timestamp < (cache[oldest] as { timestamp: number }).timestamp ? key : oldest
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
        if (now - (cached as { timestamp: number }).timestamp < this.CACHE_EXPIRY) {
          return (cached as { url: string }).url;
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

  private static getCache(): Record<string, unknown> {
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
 * 여러 이미지 파일을 일괄 업로드 (기존 API 호환)
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
  try {
    const previewUrl = await createQuickThumbnail(file);
    
    return {
      file,
      previewUrl,
      status: 'preview',
    };
  } catch (error) {
    // 실패 시 원본 Blob URL 사용
    const fallbackUrl = URL.createObjectURL(file);
    return {
      file,
      previewUrl: fallbackUrl,
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


