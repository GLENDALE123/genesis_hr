'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ImageLightbox } from './ImageLightbox';
import { LazyImage } from './LazyImage';
import { ImageCache } from '@/shared/utils/imageUpload';
import { getThumbnailURL, getResizedImageURL, convertStorageBucketURL } from '@/shared/utils/imagePathMigration';
import { Spinner } from '../ui/spinner';

interface ImageGalleryGridProps {
  images: string[];
  gridClassName?: string;
  imageClassName?: string;
  enableLazyLoading?: boolean; // 지연 로딩 활성화 옵션
  useThumbnails?: boolean; // 썸네일 사용 여부 (기본값: true)
}

/**
 * 이미지 갤러리 그리드 컴포넌트
 * - 이미 업로드된 이미지 URL 배열을 그리드로 표시
 * - 각 이미지 클릭 시 ImageLightbox 오픈
 * 
 * @example
 * ```tsx
 * <ImageGalleryGrid images={request.imageUrls} />
 * ```
 */
export const ImageGalleryGrid: React.FC<ImageGalleryGridProps> = ({
  images,
  gridClassName = 'grid-cols-[repeat(auto-fill,minmax(150px,1fr))]',
  imageClassName = 'h-32',
  enableLazyLoading = true,
  useThumbnails = true
}) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [cachedImages, setCachedImages] = useState<string[]>([]);
  const [loadedImages, setLoadedImages] = useState<boolean[]>([]);
  const imageRefs = useRef<(HTMLImageElement | HTMLDivElement | null)[]>([]);
  const blobUrlsRef = useRef<Set<string>>(new Set());

  // 이미지 초기화 - Firebase Storage 크기 조정 쿼리 사용
  useEffect(() => {
    if (images.length === 0) return;
    
    // 기존 버킷 URL을 새 버킷으로 변환 후 크기 조정
    // Firebase Storage w 파라미터로 이미지 크기 제한 (300px)
    const convertedUrls = images.map(url => convertStorageBucketURL(url));
    const resizedUrls = convertedUrls.map(url => getResizedImageURL(url, 300));
    setCachedImages(resizedUrls);
  }, [images.length]);

  // 모든 이미지 로드 (지연 로딩 비활성화시)
  const loadAllImages = useCallback(async () => {
    const processedImages = await Promise.all(
      images.map(async (originalUrl) => {
        // 썸네일 우선 로드 (useThumbnails가 true일 때)
        let targetUrl = originalUrl;
        if (useThumbnails) {
          const thumbnailUrl = getThumbnailURL(originalUrl);
          try {
            const thumbnailResponse = await fetch(thumbnailUrl, { method: 'HEAD' });
            if (thumbnailResponse.ok) {
              targetUrl = thumbnailUrl;
            }
          } catch {
            // 썸네일 로드 실패시 원본 사용
          }
        }
        
        const cachedUrl = ImageCache.getImage(targetUrl);
        if (cachedUrl) return cachedUrl;
        
        try {
          const response = await fetch(targetUrl);
          if (response.ok) {
            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);
            ImageCache.setImage(targetUrl, { size: blob.size, type: blob.type });
            return objectUrl;
          }
        } catch (error) {
          console.warn('이미지 로드 실패:', targetUrl, error);
        }
        
        return originalUrl;
      })
    );
    
    setCachedImages(processedImages);
    setLoadedImages(new Array(images.length).fill(true));
  }, [images, useThumbnails]);

  // 생성된 blob URL 추적 (언마운트 시 정리)
  useEffect(() => {
    cachedImages.forEach((url) => {
      if (url && typeof url === 'string' && url.indexOf('blob:') === 0) {
        blobUrlsRef.current.add(url);
      }
    });
  }, [cachedImages]);

  useEffect(() => {
    return () => {
      blobUrlsRef.current.forEach((url) => {
        try { URL.revokeObjectURL(url); } catch {}
      });
      blobUrlsRef.current.clear();
    };
  }, []);

  // 개별 이미지 로드 (지연 로딩시) - 간단한 버전
  const loadImage = useCallback(async (index: number) => {
    if (loadedImages[index]) return; // 이미 로드됨
    
    const originalUrl = images[index];
    
    try {
      // 캐시에서 먼저 확인 (가장 빠름)
      const cachedUrl = ImageCache.getImage(originalUrl);
      if (cachedUrl) {
        // 캐시된 이미지가 압축된 이미지인지 확인 (WebP 확장자 또는 blob URL)
        const isCompressed = cachedUrl.includes('.webp') || cachedUrl.startsWith('blob:');
        
        setCachedImages(prev => {
          const newImages = [...prev];
          newImages[index] = cachedUrl;
          return newImages;
        });
        setLoadedImages(prev => {
          const newLoaded = [...prev];
          newLoaded[index] = true;
          return newLoaded;
        });
        return;
      }
      
      // 간단한 접근: 썸네일 우선 시도, 실패시 onError에서 폴백
      const thumbnailUrl = useThumbnails ? getThumbnailURL(originalUrl) : null;
      const finalUrl = thumbnailUrl || originalUrl;
      
      
      // 캐시에 저장
      ImageCache.setImage(originalUrl, { 
        size: 0, 
        type: thumbnailUrl ? 'image/webp' : 'image/jpeg' 
      });
      
      setCachedImages(prev => {
        const newImages = [...prev];
        newImages[index] = finalUrl;
        return newImages;
      });
      setLoadedImages(prev => {
        const newLoaded = [...prev];
        newLoaded[index] = true;
        return newLoaded;
      });
      
    } catch (error) {
      console.warn(`❌ [ImageGallery] 이미지 로드 실패 (${index + 1}):`, originalUrl, error);
      // 최종 실패시 원본 URL 사용
      setCachedImages(prev => {
        const newImages = [...prev];
        newImages[index] = originalUrl;
        return newImages;
      });
      setLoadedImages(prev => {
        const newLoaded = [...prev];
        newLoaded[index] = true;
        return newLoaded;
      });
    }
  }, [images, loadedImages, useThumbnails]);

  // 원본 이미지를 썸네일 크기로 압축하는 함수
  const compressImageToThumbnailSize = useCallback(async (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }
      
      img.onload = () => {
        try {
          // 썸네일 크기로 리사이즈 (300x300)
          const maxSize = 300;
          let { width, height } = img;
          
          if (width > height) {
            if (width > maxSize) {
              height = (height * maxSize) / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = (width * maxSize) / height;
              height = maxSize;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          // 고품질 리샘플링
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          
          // 이미지 그리기
          ctx.drawImage(img, 0, 0, width, height);
          
          // WebP 또는 JPEG로 압축 (85% 품질)
          canvas.toBlob(
            (compressedBlob) => {
              if (compressedBlob) {
                const compressedUrl = URL.createObjectURL(compressedBlob);
                resolve(compressedUrl);
              } else {
                reject(new Error('Failed to compress image'));
              }
            },
            'image/webp', // WebP 우선 시도
            0.85 // 85% 품질
          );
        } catch (error) {
          reject(error);
        } finally {
          try { URL.revokeObjectURL(tempUrl); } catch {}
        }
      };
      
      img.onerror = () => {
        try { URL.revokeObjectURL(tempUrl); } catch {}
        reject(new Error('Failed to load image'));
      };
      const tempUrl = URL.createObjectURL(blob);
      img.src = tempUrl;
    });
  }, []);

  const handleImageClick = (e: React.MouseEvent, index: number) => {
    e.stopPropagation(); // 부모 이벤트 전파 방지 (Dialog 닫힘 방지)
    setSelectedImageIndex(index);
    setLightboxOpen(true);
  };

  if (images.length === 0) {
    return null;
  }

  return (
    <>
      <div 
        className={`grid ${gridClassName} gap-2`}
        onClick={(e) => e.stopPropagation()} // 부모 이벤트 전파 방지
      >
        {images.map((url, index) => {
          const isLoaded = loadedImages[index];
          
          return (
            <div key={index} className="relative">
              {enableLazyLoading ? (
                <img
                  src={cachedImages[index] || url}
                  alt={`이미지 ${index + 1}`}
                  className={`w-full ${imageClassName} object-cover border cursor-pointer hover:opacity-80 transition-opacity select-none`}
                  style={{ borderRadius: 'var(--radius)' }}
                  onClick={(e) => handleImageClick(e, index)}
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  onDragStart={(e) => e.preventDefault()}
                  onError={() => {
                    // 이미지 로드 실패시 처리
                  }}
                />
              ) : isLoaded ? (
                <img
                  ref={(el) => {
                    imageRefs.current[index] = el;
                  }}
                  src={cachedImages[index] || url}
                  alt={`이미지 ${index + 1}`}
                  className={`w-full ${imageClassName} object-cover border cursor-pointer hover:opacity-80 transition-opacity select-none`}
                  style={{ borderRadius: 'var(--radius)' }}
                  onClick={(e) => handleImageClick(e, index)}
                  draggable={false}
                  onDragStart={(e) => e.preventDefault()}
                  onError={() => {
                    // 이미지 로드 실패시 처리
                  }}
                />
              ) : (
                <div 
                  ref={(el) => {
                    imageRefs.current[index] = el;
                  }}
                  className={`w-full ${imageClassName} bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md border cursor-pointer flex items-center justify-center relative`}
                  style={{ borderRadius: 'var(--radius)' }}
                  onClick={(e) => handleImageClick(e, index)}
                >
                  {/* 로딩 상태 UI */}
                  <Spinner className="size-8 text-primary" />
                  <div className="absolute bottom-2 left-2 right-2 text-center">
                    <span className="text-xs text-gray-500 dark:text-gray-400 bg-white/80 dark:bg-black/80 px-2 py-1 rounded">
                      로딩 중...
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <ImageLightbox
        images={images.map(url => convertStorageBucketURL(url))} // 버킷 URL 변환 후 전달
        initialIndex={selectedImageIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
};

