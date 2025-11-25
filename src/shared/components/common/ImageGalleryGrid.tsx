'use client';

import React, { useState, useEffect } from 'react';
import { ImageLightbox } from './ImageLightbox';
import { LazyImage } from './LazyImage';
import { getResizedImageURL, convertStorageBucketURL } from '@/shared/utils/imagePathMigration';

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
  const [cachedImages, setCachedImages] = useState<string[]>([]);

  // 이미지 초기화 - Firebase Storage 크기 조정 쿼리 사용
  useEffect(() => {
    if (images.length === 0) {
      setCachedImages([]);
      return;
    }
    
    const convertedUrls = images.map(url => convertStorageBucketURL(url));
    const resizedUrls = convertedUrls.map(url => getResizedImageURL(url, 300));
    setCachedImages(resizedUrls);
  }, [images]);

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
          const placeholder = cachedImages[index] || convertStorageBucketURL(url);
          
          return (
            <div key={index} className="relative">
              <LazyImage
                originalSrc={url}
                placeholderSrc={placeholder}
                useThumbnail={useThumbnails}
                lazy={enableLazyLoading}
                className={`w-full ${imageClassName} object-cover border cursor-pointer hover:opacity-80 transition-opacity`}
                style={{ borderRadius: 'var(--radius)' }}
                alt={`이미지 ${index + 1}`}
                onClick={(e) => handleImageClick(e, index)}
              />
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

