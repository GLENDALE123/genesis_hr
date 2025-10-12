'use client';

import React, { useState } from 'react';
import { ImageLightbox } from './ImageLightbox';

interface ImageGalleryGridProps {
  images: string[];
  gridClassName?: string;
  imageClassName?: string;
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
}) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

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
        {images.map((url, index) => (
          <img
            key={index}
            src={url}
            alt={`이미지 ${index + 1}`}
            className={`w-full ${imageClassName} object-cover border cursor-pointer hover:opacity-80 transition-opacity select-none`}
            style={{ borderRadius: 'var(--radius)' }}
            onClick={() => handleImageClick(index)}
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
          />
        ))}
      </div>

      <ImageLightbox
        images={images}
        initialIndex={selectedImageIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
};

