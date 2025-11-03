/**
 * 이미지 경로 마이그레이션 유틸리티
 * HS-Jig와 hs-next 프로젝트 간 이미지 경로 호환성 처리
 */

/**
 * 이미지 URL에서 Firebase Storage 경로를 추출합니다
 * @param url Firebase Storage URL
 * @returns Storage 경로
 */
export const extractStoragePathFromURL = (url: string): string => {
  try {
    // Firebase Storage URL에서 경로 부분을 추출
    // 예: https://firebasestorage.googleapis.com/v0/b/bucket/o/path%2Fto%2Ffile.jpg?alt=media&token=xxx
    const urlObj = new URL(url);
    const pathMatch = urlObj.pathname.match(/\/o\/(.+)/);
    if (pathMatch) {
      // URL 인코딩된 경로를 디코딩
      return decodeURIComponent(pathMatch[1]);
    }
    return '';
  } catch (error) {
    console.error('URL 파싱 실패:', error);
    return '';
  }
};

/**
 * 이미지가 구 경로에 있는지 확인합니다
 * @param url 이미지 URL
 * @returns 구 경로 여부
 */
export const isLegacyImagePath = (url: string): boolean => {
  const path = extractStoragePathFromURL(url);
  return path.startsWith('quality-inspection-images/');
};

/**
 * 구 경로를 신 경로로 변환합니다
 * @param url 구 경로 이미지 URL
 * @returns 신 경로 이미지 URL (실제 변환은 하지 않음, 경로만 반환)
 */
export const convertLegacyPathToNewPath = (url: string): string => {
  const path = extractStoragePathFromURL(url);
  if (path.startsWith('quality-inspection-images/')) {
    // quality-inspection-images/docId/filename -> quality-inspections/docId/filename
    return path.replace('quality-inspection-images/', 'quality-inspections/');
  }
  return path;
};

/**
 * 이미지 삭제 시 경로 호환성을 처리합니다
 * @param url 삭제할 이미지 URL
 * @returns 삭제 성공 여부
 */
export const deleteImageWithCompatibility = async (url: string): Promise<boolean> => {
  try {
    const { deleteFile } = await import('@/shared/services/firebase/storage');
    const path = extractStoragePathFromURL(url);
    
    if (path) {
      await deleteFile(path);
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ 이미지 삭제 실패:', error);
    return false;
  }
};

/**
 * 여러 이미지 삭제 시 경로 호환성을 처리합니다
 * @param urls 삭제할 이미지 URL 배열
 * @returns 삭제 결과
 */
export const deleteImagesWithCompatibility = async (urls: string[]): Promise<{
  success: string[];
  failed: string[];
}> => {
  const results = await Promise.allSettled(
    urls.map(url => deleteImageWithCompatibility(url))
  );
  
  const success: string[] = [];
  const failed: string[] = [];
  
  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value) {
      success.push(urls[index]);
    } else {
      failed.push(urls[index]);
    }
  });
  
  return { success, failed };
};

/**
 * 이미지 경로 마이그레이션 로그
 * @param fromPath 원본 경로
 * @param toPath 대상 경로
 */
export const logImagePathMigration = (fromPath: string, toPath: string): void => {
};

/**
 * 통합 이미지 경로 생성
 * HS-Jig와 hs-next 모두 호환되는 경로 생성
 * @param docId 문서 ID
 * @param fileName 파일명 (선택사항)
 * @returns 통합 경로
 */
export const createUnifiedImagePath = (docId: string, fileName?: string): string => {
  if (fileName) {
    return `quality-inspections/${docId}/${fileName}`;
  }
  return `quality-inspections/${docId}`;
};

/**
 * 이미지와 관련된 썸네일 파일 경로 생성
 * @param imagePath 원본 이미지 경로
 * @returns 썸네일 파일 경로
 */
export const getThumbnailPath = (imagePath: string): string => {
  const pathParts = imagePath.split('/');
  const fileName = pathParts[pathParts.length - 1];
  const fileNameWithoutExt = fileName.split('.')[0];
  const thumbnailFileName = `${fileNameWithoutExt}_thumb.webp`;
  
  pathParts[pathParts.length - 1] = thumbnailFileName;
  return pathParts.join('/');
};

/**
 * 이미지 URL에서 썸네일 URL 생성
 * @param imageUrl 원본 이미지 URL
 * @returns 썸네일 이미지 URL
 */
export const getThumbnailURL = (imageUrl: string): string => {
  const path = extractStoragePathFromURL(imageUrl);
  const thumbnailPath = getThumbnailPath(path);
  
  // Firebase Storage URL 재구성
  const url = new URL(imageUrl);
  const encodedPath = encodeURIComponent(thumbnailPath);
  url.pathname = `/v0/b/${url.pathname.split('/')[3]}/o/${encodedPath}`;
  
  return url.toString();
};

/**
 * 기존 Storage 버킷 URL을 새 버킷 URL로 변환
 * hs-jig-b2093 -> hs-jig-b2093.firebasestorage.app
 * @param imageUrl 원본 이미지 URL (이전 버킷)
 * @returns 새 버킷을 가리키는 URL
 */
export const convertStorageBucketURL = (imageUrl: string): string => {
  try {
    const url = new URL(imageUrl);
    // 기존 버킷 이름 확인
    if (url.hostname === 'firebasestorage.googleapis.com') {
      const pathMatch = url.pathname.match(/\/v0\/b\/([^\/]+)\/o\/(.+)/);
      if (pathMatch) {
        const oldBucket = pathMatch[1];
        const filePath = pathMatch[2];
        
        // 이전 버킷을 새 버킷으로 변환
        if (oldBucket === 'hs-jig-b2093') {
          const newBucket = 'hs-jig-b2093.firebasestorage.app';
          // 새 URL 생성
          const newUrl = new URL(`https://firebasestorage.googleapis.com/v0/b/${newBucket}/o/${filePath}`);
          // 기존 쿼리 파라미터 유지 (token, alt 등)
          url.searchParams.forEach((value, key) => {
            newUrl.searchParams.set(key, value);
          });
          return newUrl.toString();
        }
      }
    }
    return imageUrl;
  } catch {
    return imageUrl;
  }
};

/**
 * Firebase Storage 이미지 URL에 크기 제한 쿼리 추가
 * Firebase Storage URL에 w (width) 파라미터 추가하여 이미지 크기 제한
 * @param imageUrl 원본 이미지 URL
 * @param maxWidth 최대 너비 (픽셀)
 * @returns 크기 제한된 이미지 URL
 */
export const getResizedImageURL = (imageUrl: string, maxWidth: number = 300): string => {
  try {
    // 먼저 버킷 URL 변환
    const convertedUrl = convertStorageBucketURL(imageUrl);
    const url = new URL(convertedUrl);
    // 기존 파라미터 유지하면서 w 파라미터 추가
    url.searchParams.set('w', maxWidth.toString());
    return url.toString();
  } catch {
    return imageUrl;
  }
};

/**
 * 이미지와 썸네일을 함께 삭제
 * @param imageUrl 삭제할 이미지 URL
 * @returns 삭제 결과
 */
export const deleteImageWithThumbnail = async (imageUrl: string): Promise<{
  imageDeleted: boolean;
  thumbnailDeleted: boolean;
  errors: string[];
}> => {
  const errors: string[] = [];
  let imageDeleted = false;
  let thumbnailDeleted = false;
  
  try {
    const { deleteFileIfExists } = await import('@/shared/services/firebase/storage');
    const imagePath = extractStoragePathFromURL(imageUrl);
    
    if (imagePath) {
      // 원본 이미지 삭제
      try {
        imageDeleted = await deleteFileIfExists(imagePath);
        if (imageDeleted) {
        } else {
        }
      } catch (error) {
        errors.push(`원본 이미지 삭제 실패: ${error}`);
        console.error('❌ 원본 이미지 삭제 실패:', error);
      }
      
      // 썸네일 삭제
      try {
        const thumbnailPath = getThumbnailPath(imagePath);
        thumbnailDeleted = await deleteFileIfExists(thumbnailPath);
        if (thumbnailDeleted) {
        } else {
        }
      } catch (error) {
        errors.push(`썸네일 삭제 실패: ${error}`);
        console.error('❌ 썸네일 삭제 실패:', error);
      }
    } else {
    }
  } catch (error) {
    errors.push(`이미지 삭제 처리 실패: ${error}`);
    console.error('❌ 이미지 삭제 처리 실패:', error);
  }
  
  return { imageDeleted, thumbnailDeleted, errors };
};

/**
 * 여러 이미지와 썸네일을 함께 삭제
 * @param urls 삭제할 이미지 URL 배열
 * @returns 삭제 결과
 */
export const deleteImagesWithThumbnails = async (urls: string[]): Promise<{
  success: string[];
  failed: string[];
  thumbnailResults: { imageUrl: string; thumbnailDeleted: boolean }[];
}> => {
  const results = await Promise.allSettled(
    urls.map(url => deleteImageWithThumbnail(url))
  );
  
  const success: string[] = [];
  const failed: string[] = [];
  const thumbnailResults: { imageUrl: string; thumbnailDeleted: boolean }[] = [];
  
  results.forEach((result, index) => {
    const imageUrl = urls[index];
    
    if (result.status === 'fulfilled') {
      const { imageDeleted, thumbnailDeleted, errors } = result.value;
      
      // 파일이 존재하지 않아서 삭제할 필요가 없는 경우도 성공으로 처리
      // (이미 삭제되었거나 존재하지 않는 파일)
      success.push(imageUrl);
      
      thumbnailResults.push({ imageUrl, thumbnailDeleted });
      
      if (errors.length > 0) {
        console.warn(`이미지 삭제 경고 (${imageUrl}):`, errors);
      }
    } else {
      failed.push(imageUrl);
      thumbnailResults.push({ imageUrl, thumbnailDeleted: false });
      console.error(`이미지 삭제 실패 (${imageUrl}):`, result.reason);
    }
  });
  
  return { success, failed, thumbnailResults };
};

/**
 * 이미지 URL이 유효한지 확인
 * @param url 이미지 URL
 * @returns 유효성 여부
 */
export const isValidImageURL = (url: string): boolean => {
  if (!url || typeof url !== 'string') return false;
  
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.includes('firebasestorage.googleapis.com');
  } catch {
    return false;
  }
};

/**
 * 이미지 URL 배열에서 유효한 URL만 필터링 (URL 형식만 확인)
 * @param urls 이미지 URL 배열
 * @returns 유효한 URL 배열
 */
export const filterValidImageURLs = (urls: string[]): string[] => {
  return urls.filter(isValidImageURL);
};

/**
 * 이미지 URL 배열에서 실제로 존재하는 파일만 필터링 (비동기)
 * @param urls 이미지 URL 배열
 * @returns 존재하는 이미지 URL 배열
 */
/**
 * Storage 경로에서 파일 목록 조회 (디버깅용)
 * @param folderPath 폴더 경로
 * @returns 파일 목록
 */
export const listStorageFiles = async (folderPath: string): Promise<string[]> => {
  try {
    const { storage } = await import('@/shared/services/firebase/config');
    const { listAll, ref } = await import('firebase/storage');
    
    if (!storage) {
      throw new Error('Firebase Storage가 초기화되지 않았습니다.');
    }
    
    const folderRef = ref(storage, folderPath);
    const result = await listAll(folderRef);
    
    const files = result.items.map(item => item.fullPath);
    return files;
  } catch (error) {
    console.error(`❌ Storage 폴더 조회 실패 (${folderPath}):`, error);
    return [];
  }
};

/**
 * 이미지 URL 배열에서 실제로 존재하는 파일만 필터링 (비동기)
 * @param urls 이미지 URL 배열
 * @returns 존재하는 이미지 URL 배열
 */
export const filterExistingImageURLs = async (urls: string[]): Promise<string[]> => {
  if (urls.length === 0) return [];
  
  try {
    const { fileExists } = await import('@/shared/services/firebase/storage');
    
    const existenceChecks = await Promise.allSettled(
      urls.map(async (url) => {
        const imagePath = extractStoragePathFromURL(url);
        if (!imagePath) return { url, exists: false };
        
        try {
          const exists = await fileExists(imagePath);
          return { url, exists };
        } catch (error) {
          console.warn(`파일 존재 확인 실패 (${url}):`, error);
          return { url, exists: false };
        }
      })
    );
    
    const existingUrls: string[] = [];
    
    existenceChecks.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.exists) {
        existingUrls.push(result.value.url);
      } else if (result.status === 'rejected') {
        console.warn(`URL 존재 확인 실패 (${urls[index]}):`, result.reason);
      }
    });
    
    return existingUrls;
  } catch (error) {
    console.error('이미지 URL 필터링 실패:', error);
    // 오류 발생 시 원본 배열 반환 (안전한 fallback)
    return urls.filter(isValidImageURL);
  }
};
