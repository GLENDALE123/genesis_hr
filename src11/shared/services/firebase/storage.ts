/**
 * Firebase Storage 서비스
 */

import { ref, uploadBytes, getDownloadURL, deleteObject, getMetadata } from 'firebase/storage';
import { storage } from './config';

/**
 * 프로필 사진 업로드
 * @param userId - 사용자 ID
 * @param file - 업로드할 파일
 * @returns 업로드된 이미지의 다운로드 URL
 */
export const uploadProfilePhoto = async (
  userId: string,
  file: File
): Promise<string> => {
  if (!storage) {
    throw new Error('Firebase Storage가 초기화되지 않았습니다.');
  }

  try {
    // 파일 크기 제한 (5MB)
    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('파일 크기는 5MB 이하여야 합니다.');
    }

    // 파일 타입 확인
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('JPG, PNG, WEBP 파일만 업로드 가능합니다.');
    }

    // 파일명 생성 (타임스탬프 포함)
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const fileName = `profile_${timestamp}.${fileExtension}`;
    
    // Storage 경로: users/{userId}/profile/{fileName}
    const storageRef = ref(storage, `users/${userId}/profile/${fileName}`);

    // 파일 업로드
    await uploadBytes(storageRef, file, {
      contentType: file.type,
    });

    // 다운로드 URL 가져오기
    const downloadURL = await getDownloadURL(storageRef);

    return downloadURL;
  } catch (error) {
    console.error('❌ 프로필 사진 업로드 실패:', error);
    throw error;
  }
};

/**
 * 프로필 사진 삭제
 * @param photoURL - 삭제할 사진의 URL
 */
export const deleteProfilePhoto = async (photoURL: string): Promise<void> => {
  if (!storage) {
    throw new Error('Firebase Storage가 초기화되지 않았습니다.');
  }

  try {
    // URL에서 Storage 경로 추출
    const url = new URL(photoURL);
    const pathname = url.pathname;
    
    // /v0/b/{bucket}/o/{path} 형식에서 {path} 추출
    const pathMatch = pathname.match(/\/o\/(.+)$/);
    if (!pathMatch) {
      throw new Error('잘못된 Storage URL입니다.');
    }
    
    const storagePath = decodeURIComponent(pathMatch[1]);
    const storageRef = ref(storage, storagePath);

    // 파일 삭제
    await deleteObject(storageRef);
  } catch (error) {
    console.error('❌ 프로필 사진 삭제 실패:', error);
    // 삭제 실패는 치명적이지 않으므로 에러를 throw하지 않음
  }
};

/**
 * 이미지 파일 압축 (클라이언트 사이드)
 * @param file - 원본 파일
 * @param maxWidth - 최대 너비 (기본값: 500px)
 * @param maxHeight - 최대 높이 (기본값: 500px)
 * @param quality - 품질 (0-1, 기본값: 0.8)
 * @returns 압축된 파일
 */
export const compressImage = async (
  file: File,
  maxWidth: number = 500,
  maxHeight: number = 500,
  quality: number = 0.8
): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        // Canvas 생성
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // 비율 유지하면서 리사이즈
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // 이미지 그리기
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context를 가져올 수 없습니다.'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // Blob으로 변환
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('이미지 압축에 실패했습니다.'));
              return;
            }
            
            // File 객체 생성
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });
            
            resolve(compressedFile);
          },
          file.type,
          quality
        );
      };
      
      img.onerror = () => {
        reject(new Error('이미지 로드에 실패했습니다.'));
      };
      
      img.src = e.target?.result as string;
    };
    
    reader.onerror = () => {
      reject(new Error('파일 읽기에 실패했습니다.'));
    };
    
    reader.readAsDataURL(file);
  });
};

/**
 * 일반 파일 업로드 (개선된 재시도 로직)
 * @param file - 업로드할 파일
 * @param path - Storage 경로
 * @param maxRetries - 최대 재시도 횟수 (기본값: 5)
 * @returns 업로드된 파일의 다운로드 URL
 */
export const uploadFile = async (
  file: File, 
  path: string, 
  maxRetries: number = 5
): Promise<string> => {
  if (!storage) {
    throw new Error('Firebase Storage가 초기화되지 않았습니다.');
  }

  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const storageRef = ref(storage, path);
      
      // 파일 크기에 따른 동적 타임아웃 설정
      const fileSizeMB = file.size / (1024 * 1024);
      const baseTimeout = 60000; // 기본 60초
      const sizeTimeout = Math.max(fileSizeMB * 10000, 30000); // 파일 크기당 10초, 최소 30초
      const dynamicTimeout = Math.min(baseTimeout + sizeTimeout, 300000); // 최대 5분
      
      // 업로드 실행
      const uploadPromise = uploadBytes(storageRef, file, {
        contentType: file.type,
      });
      
      // 타임아웃 Promise
      let timeoutId: NodeJS.Timeout | null = null;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`업로드 타임아웃 (${Math.round(dynamicTimeout / 1000)}초)`));
        }, dynamicTimeout);
      });
      
      // 업로드 실행 및 타임아웃 처리
      try {
        await Promise.race([uploadPromise, timeoutPromise]);
        // 타임아웃이 발생하지 않았으면 타임아웃 타이머 정리
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      } catch (raceError) {
        // 타임아웃 발생 시 타임아웃 타이머 정리
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        // 타임아웃 에러인 경우 재시도
        if (raceError instanceof Error && raceError.message.includes('업로드 타임아웃')) {
          throw raceError;
        }
        // 다른 에러도 다시 throw
        throw raceError;
      }
      
      // 다운로드 URL 가져오기 (별도 타임아웃)
      const downloadURLPromise = getDownloadURL(storageRef);
      let downloadTimeoutId: NodeJS.Timeout | null = null;
      const downloadTimeoutPromise = new Promise<never>((_, reject) => {
        downloadTimeoutId = setTimeout(() => {
          reject(new Error('다운로드 URL 가져오기 타임아웃'));
        }, 10000);
      });
      
      try {
        const downloadURL = await Promise.race([downloadURLPromise, downloadTimeoutPromise]);
        // 타임아웃이 발생하지 않았으면 타임아웃 타이머 정리
        if (downloadTimeoutId) {
          clearTimeout(downloadTimeoutId);
        }
        return downloadURL;
      } catch (raceError) {
        // 타임아웃 발생 시 타임아웃 타이머 정리
        if (downloadTimeoutId) {
          clearTimeout(downloadTimeoutId);
        }
        throw raceError;
      }
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('알 수 없는 오류');
      
      // 재시도 가능한 오류인지 확인 (타임아웃 오류 포함)
      const isRetryableError = (
        lastError.message.includes('retry-limit-exceeded') ||
        lastError.message.includes('network') ||
        lastError.message.includes('timeout') ||
        lastError.message.includes('업로드 타임아웃') ||
        lastError.message.includes('다운로드 URL 가져오기 타임아웃') ||
        lastError.message.includes('quota') ||
        lastError.message.includes('unavailable') ||
        lastError.message.includes('connection') ||
        lastError.message.includes('aborted') ||
        lastError.message.includes('cancelled') ||
        lastError.message.includes('ECONNRESET') ||
        lastError.message.includes('ETIMEDOUT') ||
        lastError.message.includes('ENOTFOUND')
      );
      
      if (!isRetryableError) {
        const errorMessage = `재시도 불가능한 오류: ${lastError.message}`;
        console.error(`❌ ${errorMessage}`);
        throw new Error(errorMessage);
      }
      
      const warningMessage = `파일 업로드 실패 (시도 ${attempt}/${maxRetries}): ${lastError.message}`;
      console.warn(`⚠️ ${warningMessage}`);
      
      // 마지막 시도가 아니면 지수 백오프로 대기
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 15000); // 최대 15초
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // 모든 재시도 실패
  const errorDetails = lastError?.message || '알 수 없는 오류';
  const finalErrorMessage = `파일 업로드 실패 (${maxRetries}회 시도): ${errorDetails}`;
  console.error(`❌ ${finalErrorMessage}`);
  throw new Error(finalErrorMessage);
};

/**
 * 파일 다운로드 URL 가져오기
 * @param path - Storage 경로
 * @returns 다운로드 URL
 */
export const getFileDownloadURL = async (path: string): Promise<string> => {
  if (!storage) {
    throw new Error('Firebase Storage가 초기화되지 않았습니다.');
  }

  try {
    const storageRef = ref(storage, path);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error) {
    console.error('❌ 다운로드 URL 가져오기 실패:', error);
    throw error;
  }
};

/**
 * 파일 존재 여부 확인
 * @param path - Storage 경로
 * @returns 파일 존재 여부
 */
export const fileExists = async (path: string): Promise<boolean> => {
  if (!storage) {
    throw new Error('Firebase Storage가 초기화되지 않았습니다.');
  }

  try {
    const storageRef = ref(storage, path);
    await getMetadata(storageRef);
    return true;
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'storage/object-not-found') {
      return false;
    }
    throw error;
  }
};

/**
 * 파일 삭제 (존재 여부 확인 후)
 * @param path - Storage 경로
 */
export const deleteFileIfExists = async (path: string): Promise<boolean> => {
  if (!storage) {
    throw new Error('Firebase Storage가 초기화되지 않았습니다.');
  }

  try {
    const exists = await fileExists(path);
    if (!exists) {
      return false;
    }

    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
    return true;
  } catch (error) {
    console.error('❌ 파일 삭제 실패:', error);
    throw error;
  }
};

/**
 * 파일 삭제
 * @param path - Storage 경로
 */
export const deleteFile = async (path: string): Promise<void> => {
  if (!storage) {
    throw new Error('Firebase Storage가 초기화되지 않았습니다.');
  }

  try {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
  } catch (error) {
    console.error('❌ 파일 삭제 실패:', error);
    throw error;
  }
};

/**
 * 폴더 내 파일 목록 가져오기
 * @param folderPath - 폴더 경로
 * @returns 파일 목록
 */
export const listFiles = async (folderPath: string): Promise<string[]> => {
  if (!storage) {
    throw new Error('Firebase Storage가 초기화되지 않았습니다.');
  }

  try {
    const { listAll } = await import('firebase/storage');
    const storageRef = ref(storage, folderPath);
    const result = await listAll(storageRef);
    const files = result.items.map((item) => item.fullPath);
    return files;
  } catch (error) {
    console.error('❌ 파일 목록 가져오기 실패:', error);
    throw error;
  }
};

/**
 * 파일 메타데이터 가져오기
 * @param path - Storage 경로
 * @returns 파일 메타데이터
 */
export const getFileMetadata = async (path: string): Promise<Record<string, unknown>> => {
  if (!storage) {
    throw new Error('Firebase Storage가 초기화되지 않았습니다.');
  }

  try {
    const { getMetadata } = await import('firebase/storage');
    const storageRef = ref(storage, path);
    const metadata = await getMetadata(storageRef);
    return metadata as unknown as Record<string, unknown>;
  } catch (error) {
    console.error('❌ 메타데이터 가져오기 실패:', error);
    throw error;
  }
};


/**
 * 여러 이미지 파일 업로드 (병렬 압축 + 업로드, 진행률 콜백 지원)
 * @param files - 업로드할 파일 배열
 * @param folderPath - 업로드할 폴더 경로
 * @param onProgress - 진행률 콜백 함수 (선택사항)
 * @param abortSignal - 업로드 취소를 위한 AbortSignal (선택사항)
 * @returns 업로드된 이미지들의 다운로드 URL 배열
 */
export const uploadImageFilesParallel = async (
  files: File[],
  folderPath: string,
  onProgress?: (progress: number) => void,
  abortSignal?: AbortSignal
): Promise<string[]> => {
  if (!storage) {
    throw new Error('Firebase Storage가 초기화되지 않았습니다.');
  }

  try {
    // AbortSignal이 중단되었는지 확인
    if (abortSignal?.aborted) {
      throw new Error('사용자에 의해 취소되었습니다.');
    }
    
    // imageUpload.ts의 병렬처리 함수 사용
    const { uploadImagesParallel } = await import('@/shared/utils/imageUpload');
    
    const downloadURLs = await uploadImagesParallel(
      files,
      folderPath,
      (current, total) => {
        // AbortSignal이 중단되었는지 확인
        if (abortSignal?.aborted) {
          throw new Error('사용자에 의해 취소되었습니다.');
        }
        
        // 진행률 콜백 호출
        const progress = Math.round((current / total) * 100);
        if (onProgress) {
          onProgress(progress);
        }
      },
      true // 병렬 압축 사용
    );
    
    return downloadURLs;
  } catch (error) {
    // AbortError인 경우 취소된 것으로 처리
    if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('취소'))) {
      throw new Error('사용자에 의해 취소되었습니다.');
    }
    
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
    console.error(`❌ 병렬 이미지 업로드 실패: ${errorMessage}`);
    throw new Error(`병렬 이미지 업로드 실패: ${errorMessage}`);
  }
};

/**
 * 재시도 로직이 포함된 이미지 파일 업로드
 * @param files - 업로드할 파일 배열
 * @param folderPath - 업로드할 폴더 경로
 * @param maxRetries - 최대 재시도 횟수 (기본값: 3)
 * @returns 업로드된 이미지들의 다운로드 URL 배열
 */
export const uploadImageFilesWithRetry = async (
  files: File[],
  folderPath: string,
  maxRetries: number = 3
): Promise<string[]> => {
  if (!storage) {
    throw new Error('Firebase Storage가 초기화되지 않았습니다.');
  }
  const results: string[] = [];
  const failedFiles: { file: File; error: Error; attempts: number }[] = [];
  
  for (const file of files) {
    let lastError: Error | null = null;
    let success = false;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // 파일 크기 제한 (10MB)
        const MAX_FILE_SIZE = 10 * 1024 * 1024;
        if (file.size > MAX_FILE_SIZE) {
          throw new Error(`파일 ${file.name}의 크기는 10MB 이하여야 합니다.`);
        }

        // 파일 확장자 확인
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'];
        if (!allowedTypes.includes(file.type)) {
          throw new Error(`지원되지 않는 파일 형식입니다: ${file.type}`);
        }

        // 파일명 생성 (타임스탬프 + 시도 횟수)
        const timestamp = Date.now();
        const fileExtension = file.name.split('.').pop() || 'jpg';
        const fileName = `image_${timestamp}_${attempt}.${fileExtension}`;
        
        // Storage 경로
        const storageRef = ref(storage, `${folderPath}/${fileName}`);

        // 파일 크기에 따른 동적 타임아웃 설정
        const fileSizeMB = file.size / (1024 * 1024);
        const baseTimeout = 60000; // 기본 60초
        const sizeTimeout = Math.max(fileSizeMB * 10000, 30000); // 파일 크기당 10초, 최소 30초
        const dynamicTimeout = Math.min(baseTimeout + sizeTimeout, 300000); // 최대 5분
        // 업로드 실행
        const uploadPromise = uploadBytes(storageRef, file, {
          contentType: file.type,
        });
        
        // 타임아웃 Promise
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`업로드 타임아웃 (${dynamicTimeout / 1000}초)`));
          }, dynamicTimeout);
        });
        
        // 업로드 실행 및 타임아웃 처리
        await Promise.race([uploadPromise, timeoutPromise]);
        // 다운로드 URL 가져오기 (별도 타임아웃)
        const downloadURLPromise = getDownloadURL(storageRef);
        const downloadTimeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('다운로드 URL 가져오기 타임아웃')), 10000);
        });
        
        const downloadURL = await Promise.race([downloadURLPromise, downloadTimeoutPromise]);
        results.push(downloadURL);
        success = true;
        break;
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('알 수 없는 오류');
        
        // 재시도 가능한 오류인지 확인
        const isRetryableError = (
          lastError.message.includes('retry-limit-exceeded') ||
          lastError.message.includes('network') ||
          lastError.message.includes('timeout') ||
          lastError.message.includes('업로드 타임아웃') ||
          lastError.message.includes('다운로드 URL 가져오기 타임아웃') ||
          lastError.message.includes('quota') ||
          lastError.message.includes('unavailable') ||
          lastError.message.includes('connection') ||
          lastError.message.includes('aborted') ||
          lastError.message.includes('cancelled')
        );
        
        if (!isRetryableError) {
          console.error(`❌ ${file.name} 재시도 불가능한 오류: ${lastError.message}`);
          break;
        }
        
        console.warn(`⚠️ ${file.name} 업로드 실패 (시도 ${attempt}/${maxRetries}): ${lastError.message}`);
        
        // 마지막 시도가 아니면 지수 백오프로 대기
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 15000); // 최대 15초
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    if (!success && lastError) {
      failedFiles.push({ file, error: lastError, attempts: maxRetries });
    }
  }
  
  // 결과 로깅
  if (failedFiles.length > 0) {
    console.error(`❌ 실패한 파일들:`, failedFiles.map(f => `${f.file.name}: ${f.error.message}`));
    throw new Error(`${failedFiles.length}개 파일 업로드 실패: ${failedFiles.map(f => f.file.name).join(', ')}`);
  }
  
  return results;
};

const storageService = {
  uploadProfilePhoto,
  deleteProfilePhoto,
  compressImage,
  uploadFile,
  getFileDownloadURL,
  deleteFile,
  listFiles,
  getFileMetadata,
  uploadImageFilesWithRetry,
  uploadImageFilesParallel,
};

export default storageService;
