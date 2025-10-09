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
  const MAX_SIZE_MB = 2;  // 2MB 이하는 압축하지 않음
  const QUALITY = 0.85;

  // 작은 파일은 압축 건너뛰기
  if (file.size <= MAX_SIZE_MB * 1024 * 1024) {
    return file;
  }

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
 * 1. 클라이언트: 빠른 압축 (2MB 이상만)
 * 2. 업로드: Firebase Storage에 저장
 * 3. 서버(Functions): 백그라운드에서 썸네일 생성 (300px WebP)
 * 
 * @param file - 업로드할 이미지 파일
 * @param folder - 저장할 폴더 경로
 * @returns 업로드된 이미지의 다운로드 URL
 */
export const uploadImage = async (file: File, folder: string): Promise<string> => {
  // 1단계: 클라이언트 압축 (빠른 업로드)
  const compressedFile = await compressImageQuick(file);

  const timestamp = Date.now();
  const fileName = `${timestamp}_${file.name}`;
  const path = `${folder}/${fileName}`;

  // 2단계: Storage 업로드 (Functions 트리거 자동 실행)
  const downloadURL = await uploadFile(compressedFile, path);
  
  return downloadURL;
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


