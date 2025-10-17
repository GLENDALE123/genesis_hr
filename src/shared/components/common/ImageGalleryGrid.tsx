'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ImageLightbox } from './ImageLightbox';
import { LazyImage } from './LazyImage';
import { ImageCache, getThumbnailUrl } from '@/shared/utils/imageUpload';
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
  const [errorImages, setErrorImages] = useState<boolean[]>([]);
  const imageRefs = useRef<(HTMLImageElement | HTMLDivElement | null)[]>([]);

  // 지연 로딩을 위한 Intersection Observer
  useEffect(() => {
    if (!enableLazyLoading) {
      // 지연 로딩 비활성화시 모든 이미지 즉시 로드
      loadAllImages();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.getAttribute('data-index') || '0');
            loadImage(index);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.1, // 10% 보이면 로드 시작
        rootMargin: '50px' // 50px 전에 미리 로드
      }
    );

    // 각 이미지 요소 관찰 시작
    imageRefs.current.forEach((img, index) => {
      if (img) {
        img.setAttribute('data-index', index.toString());
        observer.observe(img);
      }
    });

    // 첫 화면에 보이는 이미지들 즉시 로드 (3개씩)
    const loadVisibleImages = async () => {
      const visibleIndices: number[] = [];
      imageRefs.current.forEach((img, index) => {
        if (img && img.getBoundingClientRect().top < window.innerHeight + 200) {
          visibleIndices.push(index);
        }
      });
      
      // 처음 3개 이미지 즉시 로드
      const firstThree = visibleIndices.slice(0, 3);
      await Promise.allSettled(firstThree.map(index => loadImage(index)));
    };
    
    loadVisibleImages();

    return () => observer.disconnect();
  }, [images, enableLazyLoading]);

  // 모든 이미지 로드 (지연 로딩 비활성화시)
  const loadAllImages = useCallback(async () => {
    const processedImages = await Promise.all(
      images.map(async (originalUrl) => {
        // 썸네일 우선 로드 (useThumbnails가 true일 때)
        let targetUrl = originalUrl;
        if (useThumbnails) {
          const thumbnailUrl = getThumbnailUrl(originalUrl);
          try {
            const thumbnailResponse = await fetch(thumbnailUrl, { method: 'HEAD' });
            if (thumbnailResponse.ok) {
              targetUrl = thumbnailUrl;
            }
          } catch (error) {
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
        console.log('캐시된 이미지 사용:', cachedUrl, isCompressed ? '(압축됨)' : '(원본)');
        
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
      const thumbnailUrl = useThumbnails ? getThumbnailUrl(originalUrl) : null;
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
      console.warn('이미지 로드 실패:', originalUrl, error);
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
        }
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(blob);
    });
  }, []);

  const handleImageClick = (index: number) => {
    setSelectedImageIndex(index);
    setLightboxOpen(true);
  };

  if (images.length === 0) {
    return null;
  }

  return (
    <>
      <div className={`grid ${gridClassName} gap-2`}>
        {images.map((url, index) => {
          const isLoaded = loadedImages[index];
          
          return (
            <div key={index} className="relative">
              {enableLazyLoading ? (
                <LazyImage
                  src={cachedImages[index] || url}
                  alt={`이미지 ${index + 1}`}
                  className={`w-full ${imageClassName} object-cover border cursor-pointer hover:opacity-80 transition-opacity select-none`}
                  style={{ borderRadius: 'var(--radius)' }}
                  onClick={() => handleImageClick(index)}
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
                  onClick={() => handleImageClick(index)}
                  draggable={false}
                  onDragStart={(e) => e.preventDefault()}
                  onError={async () => {
                    // 이미지 로드 실패시 원본 URL 사용 (썸네일 → 원본 폴백)
                    const currentSrc = cachedImages[index] || url;
                    const thumbnailUrl = useThumbnails ? getThumbnailUrl(url) : null;
                    
                    if (currentSrc === thumbnailUrl) {
                      // 썸네일 로드 실패 - 원본을 직접 사용하거나 CORS 우회 시도
                      console.log('썸네일 로드 실패, 원본으로 폴백:', currentSrc, '→', url);
                      
                      // 원본 URL을 직접 사용 (CORS 문제 우회)
                      setCachedImages(prev => {
                        const newImages = [...prev];
                        newImages[index] = url;
                        return newImages;
                      });
                      
                      // 원본도 실패할 경우를 대비해 에러 상태 설정
                      setTimeout(() => {
                        const img = new Image();
                        img.onerror = () => {
                          console.log('원본 이미지도 로드 실패:', url);
                          setErrorImages(prev => {
                            const newErrors = [...prev];
                            newErrors[index] = true;
                            return newErrors;
                          });
                        };
                        img.src = url;
                      }, 1000);
                      
                    } else {
                      // 원본도 실패한 경우 - 에러 상태로 표시
                      console.log('원본 이미지도 로드 실패:', url);
                      setLoadedImages(prev => {
                        const newLoaded = [...prev];
                        newLoaded[index] = false;
                        return newLoaded;
                      });
                      setErrorImages(prev => {
                        const newErrors = [...prev];
                        newErrors[index] = true;
                        return newErrors;
                      });
                    }
                  }}
                />
              ) : (
                <div 
                  ref={(el) => {
                    imageRefs.current[index] = el;
                  }}
                  className={`w-full ${imageClassName} ${
                    errorImages[index] 
                      ? 'bg-red-100 dark:bg-red-900/20 border-red-300 dark:border-red-700' 
                      : 'bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600'
                  } rounded-md border cursor-pointer flex items-center justify-center relative`}
                  style={{ borderRadius: 'var(--radius)' }}
                  onClick={() => handleImageClick(index)}
                >
                  {errorImages[index] ? (
                    // 에러 상태 UI
                    <>
                      <div className="w-8 h-8 text-red-500 dark:text-red-400">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"/>
                          <line x1="15" y1="9" x2="9" y2="15"/>
                          <line x1="9" y1="9" x2="15" y2="15"/>
                        </svg>
                      </div>
                      <div className="absolute bottom-2 left-2 right-2 text-center">
                        <span className="text-xs text-red-600 dark:text-red-400 bg-white/90 dark:bg-black/90 px-2 py-1 rounded">
                          이미지 로드 실패
                        </span>
                      </div>
                    </>
                  ) : (
                    // 로딩 상태 UI
                    <>
                      <Spinner className="size-8 text-blue-500" />
                      <div className="absolute bottom-2 left-2 right-2 text-center">
                        <span className="text-xs text-gray-500 dark:text-gray-400 bg-white/80 dark:bg-black/80 px-2 py-1 rounded">
                          로딩 중...
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <ImageLightbox
        images={images} // 원본 URL 사용 (모든 이미지 접근 가능)
        initialIndex={selectedImageIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
};

