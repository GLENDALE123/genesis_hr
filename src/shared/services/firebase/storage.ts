/**
 * Firebase Storage 서비스
 */

import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
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
    console.log('🔄 프로필 사진 업로드 중...', fileName);
    await uploadBytes(storageRef, file, {
      contentType: file.type,
    });

    // 다운로드 URL 가져오기
    const downloadURL = await getDownloadURL(storageRef);
    console.log('✅ 프로필 사진 업로드 완료:', downloadURL);

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
    console.log('✅ 프로필 사진 삭제 완료');
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
            
            console.log('✅ 이미지 압축 완료:', {
              original: `${(file.size / 1024).toFixed(2)}KB`,
              compressed: `${(compressedFile.size / 1024).toFixed(2)}KB`,
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
 * 일반 파일 업로드 (기존 API 호환)
 * @param file - 업로드할 파일
 * @param path - Storage 경로
 * @returns 업로드된 파일의 다운로드 URL
 */
export const uploadFile = async (file: File, path: string): Promise<string> => {
  if (!storage) {
    throw new Error('Firebase Storage가 초기화되지 않았습니다.');
  }

  try {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file, {
      contentType: file.type,
    });
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error) {
    console.error('❌ 파일 업로드 실패:', error);
    throw error;
  }
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
    console.log('✅ 파일 삭제 완료:', path);
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
 * 여러 이미지 파일 업로드
 * @param files - 업로드할 파일 배열
 * @param folderPath - 업로드할 폴더 경로
 * @returns 업로드된 이미지들의 다운로드 URL 배열
 */
export const uploadImageFiles = async (
  files: File[],
  folderPath: string
): Promise<string[]> => {
  if (!storage) {
    throw new Error('Firebase Storage가 초기화되지 않았습니다.');
  }

  try {
    const uploadPromises = files.map(async (file, index) => {
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

      // 파일명 생성 (타임스탬프 + 인덱스)
      const timestamp = Date.now();
      const fileExtension = file.name.split('.').pop() || 'jpg';
      const fileName = `image_${timestamp}_${index}.${fileExtension}`;
      
      if (!storage) {
        throw new Error('Firebase Storage가 초기화되지 않았습니다.');
      }

      // Storage 경로
      const storageRef = ref(storage, `${folderPath}/${fileName}`);

      // 파일 업로드
      console.log(`🔄 이미지 업로드 중... (${index + 1}/${files.length})`, fileName);
      await uploadBytes(storageRef, file, {
        contentType: file.type,
      });

      // 다운로드 URL 가져오기
      const downloadURL = await getDownloadURL(storageRef);
      console.log(`✅ 이미지 업로드 완료 (${index + 1}/${files.length}):`, downloadURL);

      return downloadURL;
    });

    const downloadURLs = await Promise.all(uploadPromises);
    console.log(`✅ 모든 이미지 업로드 완료 (${files.length}개)`);

    return downloadURLs;
  } catch (error) {
    console.error('❌ 이미지 업로드 실패:', error);
    throw error;
  }
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
  uploadImageFiles,
};

export default storageService;
