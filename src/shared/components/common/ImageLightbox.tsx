'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface ImageLightboxProps {
  images: string[];
  initialIndex: number;
  open: boolean;
  onClose: () => void;
}

/**
 * 이미지 라이트박스 컴포넌트
 * - Dialog 기반 전체 화면 오버레이
 * - 좌우 화살표로 이미지 이동
 * - ESC 키 및 배경 클릭으로 닫기
 * - 이미지 카운터 표시
 * 
 * @example
 * ```tsx
 * const [lightboxOpen, setLightboxOpen] = useState(false);
 * const [selectedIndex, setSelectedIndex] = useState(0);
 * 
 * <ImageLightbox
 *   images={imageUrls}
 *   initialIndex={selectedIndex}
 *   open={lightboxOpen}
 *   onClose={() => setLightboxOpen(false)}
 * />
 * ```
 */
export const ImageLightbox: React.FC<ImageLightboxProps> = ({
  images,
  initialIndex,
  open,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  // initialIndex가 변경되면 currentIndex 업데이트
  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  const handlePrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  }, [images.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  }, [images.length]);

  // 키보드 이벤트 핸들러
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        handlePrevious();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, handlePrevious, handleNext, onClose]);

  // 터치 스와이프 핸들러
  useEffect(() => {
    if (!open) return;

    let touchStartX = 0;
    let touchEndX = 0;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      touchEndX = e.changedTouches[0].clientX;
      handleSwipe();
    };

    const handleSwipe = () => {
      const swipeThreshold = 50; // 최소 스와이프 거리
      const diff = touchStartX - touchEndX;

      if (Math.abs(diff) > swipeThreshold) {
        if (diff > 0) {
          // 왼쪽으로 스와이프 -> 다음 이미지
          handleNext();
        } else {
          // 오른쪽으로 스와이프 -> 이전 이미지
          handlePrevious();
        }
      }
    };

    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [open, handlePrevious, handleNext]);

  if (images.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] p-0 bg-black/95 border-none">
        {/* 닫기 버튼 */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute top-2 right-2 z-50 text-white hover:bg-white/20"
        >
          <X className="h-5 w-5" />
        </Button>

        {/* 이미지 카운터 */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
          {currentIndex + 1} / {images.length}
        </div>

        {/* 이전 버튼 */}
        {images.length > 1 && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrevious}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20 h-10 w-10"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
        )}

        {/* 다음 버튼 */}
        {images.length > 1 && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20 h-10 w-10"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        )}

        {/* 이미지 표시 */}
        <div className="w-full h-full flex items-center justify-center p-4">
          <img
            src={images[currentIndex]}
            alt={`이미지 ${currentIndex + 1}`}
            className="max-w-full max-h-[80vh] object-contain select-none"
            style={{ borderRadius: 'var(--radius)' }}
            onClick={(e) => e.stopPropagation()}
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

