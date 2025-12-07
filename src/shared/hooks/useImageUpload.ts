
import { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import { 
  createImagePreview, 
  uploadImageWithState, 
  ImageUploadState, 
  revokePreviewUrl
} from '@/shared/utils/firebase/imageUpload';
import { uploadImageFilesParallel } from '@/shared/services/firebase/storage';
import { UploadingImageItem } from '@/shared/components/common/UploadingImageGrid';

// 이미지 업로드 훅 인터페이스
export interface UseImageUploadReturn {
  uploadingImages: UploadingImageItem[];
  isUploading: boolean;
  uploadProgress: number;
  handleFileSelect: (files: File[]) => Promise<void>;
  removeImage: (index: number) => void;
  uploadImages: (folder: string, onProgress?: (progress: number) => void) => Promise<string[]>;
  clearImages: () => void;
  setExistingImages: (urls: string[]) => void;
  deletedImageUrls: string[]; // 삭제된 이미지 URL 추적
  setDeletedImageUrls: (urls: string[] | ((prev: string[]) => string[])) => void; // 삭제된 URL 설정
  clearDeletedUrls: () => void; // 삭제된 URL 목록 초기화
  cancelUpload: () => void; // 업로드 중단
  clearUploadingImages: () => void; // 업로드 중인 이미지들 완전 초기화
  abortController: AbortController | null; // 업로드 취소를 위한 AbortController
}

// 이미지 업로드 훅
export const useImageUpload = (): UseImageUploadReturn => {
  const [uploadingImages, setUploadingImages] = useState<UploadingImageItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deletedImageUrls, setDeletedImageUrls] = useState<string[]>([]); // 삭제된 이미지 URL 추적
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  // 최신 상태를 참조하기 위한 ref
  const uploadingImagesRef = useRef<UploadingImageItem[]>([]);
  
  // uploadingImages가 변경될 때마다 ref 업데이트
  useEffect(() => {
    uploadingImagesRef.current = uploadingImages;
  }, [uploadingImages]);

  const handleFileSelect = useCallback(async (files: File[]) => {
    if (files.length === 0) return;

    // 1단계: 즉시 로딩 상태로 추가
    const newItems: UploadingImageItem[] = files.map(file => ({ file, preview: null }));
    
    // 현재 상태를 참조하여 startIndex 계산
    let startIndex = 0;
    setUploadingImages(prev => {
      startIndex = prev.length;
      const updated = [...prev, ...newItems];
      uploadingImagesRef.current = updated; // ref도 업데이트
      return updated;
    });
    
    // 동적 배치 크기 계산
    const calculateThumbnailBatchSize = (fileCount: number, totalSizeMB: number): number => {
      let batchSize = 4; // 기본값
      
      if (fileCount <= 2) {
        batchSize = fileCount; // 적은 파일은 모두 동시 처리
      } else if (fileCount <= 8) {
        batchSize = Math.min(4, fileCount);
      } else {
        batchSize = 6; // 많은 파일은 더 큰 배치
      }
      
      // 파일 크기에 따른 조정
      if (totalSizeMB > 50) {
        batchSize = Math.max(2, batchSize - 1); // 큰 파일은 배치 크기 감소
      } else if (totalSizeMB < 5) {
        batchSize = Math.min(8, batchSize + 2); // 작은 파일은 배치 크기 증가
      }
      
      return batchSize;
    };
    
    const totalSizeMB = files.reduce((sum, file) => sum + file.size, 0) / (1024 * 1024);
    const THUMBNAIL_BATCH_SIZE = calculateThumbnailBatchSize(files.length, totalSizeMB);
    
    // 배치 단위로 썸네일 생성
    for (let i = 0; i < files.length; i += THUMBNAIL_BATCH_SIZE) {
      const batch = files.slice(i, i + THUMBNAIL_BATCH_SIZE);
      const batchStartIndex = startIndex + i;
      
      // 배치 내에서 병렬 처리
      const batchPromises = batch.map(async (file, batchIndex) => {
        const globalIndex = batchStartIndex + batchIndex;
        try {
          const thumbnail = await createImagePreview(file);
          
          setUploadingImages(prev => {
            const updated = [...prev];
            updated[globalIndex] = { file, preview: thumbnail.previewUrl };
            uploadingImagesRef.current = updated; // ref도 업데이트
            return updated;
          });
          
          return { success: true, index: globalIndex, file };
        } catch (error) {
          // 실패한 경우 원본 파일로 대체
          setUploadingImages(prev => {
            const updated = [...prev];
            updated[globalIndex] = { file, preview: URL.createObjectURL(file) };
            uploadingImagesRef.current = updated; // ref도 업데이트
            return updated;
          });
          
          return { success: false, index: globalIndex, file, error };
        }
      });

      // 배치 완료 대기
      const batchResults = await Promise.allSettled(batchPromises);
      
      // UI 업데이트를 위한 짧은 대기
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }, []); // 의존성 배열에서 uploadingImages.length 제거

  const removeImage = useCallback((index: number) => {
    setUploadingImages(prev => {
      const item = prev[index];
      
      // 기존 이미지 URL인 경우 삭제 목록에 추가
      if (item.file === null && item.preview && !item.preview.startsWith('blob:')) {
        setDeletedImageUrls(prevDeleted => [...prevDeleted, item.preview!]);
      }
      
      // blob URL인 경우에만 해제 (기존 이미지 URL은 해제하지 않음)
      if (item.preview && item.preview.startsWith('blob:')) {
        URL.revokeObjectURL(item.preview);
      }
      
      const updated = prev.filter((_, i) => i !== index);
      uploadingImagesRef.current = updated; // ref도 업데이트
      return updated;
    });
  }, []);

  const uploadImages = useCallback(async (folder: string, onProgress?: (progress: number) => void): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      // 비동기 작업을 즉시 시작
      (async () => {
        try {
          // 썸네일 생성이 완료될 때까지 대기 (최대 10초)
          let retryCount = 0;
          const maxRetries = 100; // 10초 (100 * 100ms)
          
          while (retryCount < maxRetries) {
            // ref를 통해 최신 상태 가져오기
            const currentImages = uploadingImagesRef.current;
            
            // 새로 업로드할 파일들만 필터링 (기존 이미지는 제외)
            const newFiles = currentImages
              .filter(item => item.file !== null)
              .map(item => item.file!);
            
            if (newFiles.length === 0) {
              // 파일이 없으면 즉시 종료
              resolve([]);
              return;
            }
            
            // 모든 썸네일이 준비되었는지 확인
            const allReady = currentImages
              .filter(item => item.file !== null)
              .every(item => item.preview !== null);
            
            if (allReady) {
              // 모든 썸네일이 준비되었으면 업로드 시작
              break;
            }
            
            // 최대 재시도 횟수에 도달했으면 강제로 시작
            if (retryCount >= maxRetries - 1) {
              console.warn('⚠️ 썸네일 생성이 완료되지 않았지만 업로드를 시작합니다.');
              break;
            }
            
            // 100ms 대기 후 재시도
            await new Promise(resolve => setTimeout(resolve, 100));
            retryCount++;
          }
          
          // 최종 파일 목록 가져오기
          const finalImages = uploadingImagesRef.current;
          const finalFiles = finalImages
            .filter(item => item.file !== null)
            .map(item => item.file!);
          
          if (finalFiles.length === 0) {
            resolve([]);
            return;
          }
          
          console.log(`🚀 업로드 시작: ${finalFiles.length}개 파일`);
          
          // 새로운 AbortController 생성
          const controller = new AbortController();
          setAbortController(controller);
          setIsUploading(true);
          setUploadProgress(0);

          const uploadedUrls: string[] = [];
          
          // 진행률 토스트 자동 표시 (챗 제외)
          const showToast = !folder.startsWith('chat/');
          
          const cancelHandler = () => {
            controller.abort();
          };
          
          const newUrls = await uploadImageFilesParallel(
            finalFiles,
            folder,
            onProgress,
            controller.signal,
            showToast,
            cancelHandler
          );
          uploadedUrls.push(...newUrls);

          console.log(`✅ 업로드 완료: ${uploadedUrls.length}개 파일`);
          resolve(uploadedUrls);
        } catch (error) {
          // AbortError인 경우 취소된 것으로 처리
          if (error instanceof Error && error.name === 'AbortError') {
            reject(new Error('사용자에 의해 취소되었습니다.'));
          } else {
            console.error('❌ 이미지 업로드 실패:', error);
            reject(error);
          }
        } finally {
          setIsUploading(false);
          setUploadProgress(0);
          setAbortController(null);
        }
      })();
    });
  }, []); // 의존성 배열에서 uploadingImages 제거

  const clearImages = useCallback(() => {
    // blob URL만 정리 (기존 이미지 URL은 정리하지 않음)
    // 현재 uploadingImages 상태를 직접 참조하여 무한 루프 방지
    setUploadingImages(currentImages => {
      // Blob URL 정리 자동화
      currentImages.forEach(item => {
        if (item.preview && item.preview.startsWith('blob:')) {
          URL.revokeObjectURL(item.preview);
        }
      });
      uploadingImagesRef.current = []; // ref도 초기화
      return [];
    });
    setIsUploading(false);
    setUploadProgress(0);
  }, []); // 의존성 배열에서 uploadingImages 제거
  
  // 컴포넌트 언마운트 시 메모리 정리
  useEffect(() => {
    return () => {
      // 언마운트 시 모든 Blob URL 정리
      const currentImages = uploadingImagesRef.current;
      currentImages.forEach(item => {
        if (item.preview && item.preview.startsWith('blob:')) {
          URL.revokeObjectURL(item.preview);
        }
      });
    };
  }, []);

  const cancelUpload = useCallback(() => {
    // AbortController가 있으면 실제 업로드 중단
    if (abortController) {
      abortController.abort();
    }
    
    // 상태 초기화
    setIsUploading(false);
    setUploadProgress(0);
    setAbortController(null);
  }, [abortController]);

  const clearUploadingImages = useCallback(() => {
    // 현재 uploadingImages 상태를 직접 참조하여 무한 루프 방지
    setUploadingImages(currentImages => {
      // blob URL 정리
      currentImages.forEach(item => {
        if (item.preview && item.preview.startsWith('blob:')) {
          URL.revokeObjectURL(item.preview);
        }
      });
      
      uploadingImagesRef.current = []; // ref도 초기화
      return [];
    });
    
    // 상태 완전 초기화
    setIsUploading(false);
    setUploadProgress(0);
    setDeletedImageUrls([]);
    
    // 진행 중인 업로드가 있으면 중단
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
    
  }, [abortController]); // uploadingImages 제거

  const setExistingImages = useCallback((urls: string[]) => {
    // 기존 이미지 URL들을 uploadingImages 형태로 변환
    const existingItems: UploadingImageItem[] = urls.map(url => ({
      file: null, // 기존 이미지는 파일이 없음
      preview: url
    }));
    
    // 기존 이미지만 추가하고, 새로 추가된 이미지들은 유지
    setUploadingImages(prev => {
      // 기존 이미지들 중에서 새로 추가된 이미지가 아닌 것들만 필터링
      const newImages = prev.filter(item => item.file !== null);
      const result = [...existingItems, ...newImages];
      uploadingImagesRef.current = result; // ref도 업데이트
      return result;
    });
    
    setDeletedImageUrls([]); // 기존 이미지 설정 시 삭제 목록 초기화
  }, []);

  const clearDeletedUrls = useCallback(() => {
    setDeletedImageUrls([]);
  }, []);

  return useMemo(() => ({
    uploadingImages,
    isUploading,
    uploadProgress,
    handleFileSelect,
    removeImage,
    uploadImages,
    clearImages,
    setExistingImages,
    deletedImageUrls,
    setDeletedImageUrls,
    clearDeletedUrls,
    cancelUpload,
    clearUploadingImages,
    abortController
  }), [
    uploadingImages,
    isUploading,
    uploadProgress,
    handleFileSelect,
    removeImage,
    uploadImages,
    clearImages,
    setExistingImages,
    deletedImageUrls,
    setDeletedImageUrls,
    clearDeletedUrls,
    cancelUpload,
    clearUploadingImages,
    abortController
  ]);
};

