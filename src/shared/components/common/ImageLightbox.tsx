'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/shared/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/shared/components/ui/sheet';
import { Button } from '@/shared/components/ui/button';
import { ChevronLeft, ChevronRight, X, ArrowLeft } from 'lucide-react';
import { useDeviceType } from '@/shared/hooks/use-device';

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
  const { isSmartphone, isTablet } = useDeviceType();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // initialIndex가 변경되면 currentIndex 업데이트
  useEffect(() => {
    setCurrentIndex(initialIndex);
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [initialIndex]);

  // 이미지 변경 시 확대/위치 초기화
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [currentIndex]);

  const handleZoom = useCallback((delta: number) => {
    setScale(prev => {
      const newScale = prev + delta;
      // 1배 ~ 3배 사이로 제한
      const finalScale = Math.max(1, Math.min(3, newScale));
      
      // 1배로 줌아웃되면 위치 중앙으로 초기화
      if (finalScale === 1) {
        setPosition({ x: 0, y: 0 });
      }
      
      return finalScale;
    });
  }, []);

  const handleDoubleClick = useCallback(() => {
    if (scale === 1) {
      setScale(2);
    } else {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [scale]);

  const handlePrevious = useCallback(() => {
    setCurrentIndex(prevIndex => {
      return prevIndex > 0 ? prevIndex - 1 : images.length - 1;
    });
  }, [images.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex(prevIndex => {
      return prevIndex < images.length - 1 ? prevIndex + 1 : 0;
    });
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
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        handleZoom(0.2);
      } else if (e.key === '-') {
        e.preventDefault();
        handleZoom(-0.2);
      } else if (e.key === '0') {
        e.preventDefault();
        setScale(1);
        setPosition({ x: 0, y: 0 });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, handlePrevious, handleNext, onClose, handleZoom]);

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

  // 마우스 휠로 확대/축소
  useEffect(() => {
    if (!open) return;

    const handleWheel = (e: WheelEvent) => {
      // Ctrl 키 없이 마우스 스크롤로 확대/축소
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.2 : 0.2;
      handleZoom(delta);
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [open, handleZoom]);

  // 마우스 드래그 스와이프 핸들러
  useEffect(() => {
    if (!open) return;

    let mouseStartX = 0;
    let isDragging = false;

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // 버튼이나 클릭 가능한 요소에서는 드래그 비활성화
      if (
        target.tagName === 'BUTTON' ||
        target.closest('button') ||
        target.onclick !== null
      ) {
        return;
      }
      
      // 라이트박스 내부 영역에서만 드래그 활성화
      mouseStartX = e.clientX;
      isDragging = true;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      // 드래그 중 텍스트 선택 방지
      e.preventDefault();
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const mouseEndX = e.clientX;
      const swipeThreshold = 50; // 최소 스와이프 거리
      const diff = mouseStartX - mouseEndX;

      if (Math.abs(diff) > swipeThreshold) {
        if (diff > 0) {
          // 왼쪽으로 드래그 -> 다음 이미지
          handleNext();
        } else {
          // 오른쪽으로 드래그 -> 이전 이미지
          handlePrevious();
        }
      }

      isDragging = false;
    };

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [open, handlePrevious, handleNext]);

  // 모바일/태블릿에서 뒤로가기 버튼으로 인한 페이지 이동 방지
  useEffect(() => {
    if (!open || (!isSmartphone && !isTablet)) return;

    // 히스토리 엔트리 추가 (뒤로가기 감지용)
    const currentUrl = window.location.href;
    window.history.pushState({ sheetOpen: true }, '', currentUrl);
    
    const handlePopState = (e: PopStateEvent) => {
      // Sheet가 열려있는 동안 뒤로가기로 페이지 이동하는 것을 방지
      onClose();
    };
    
    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [open, isSmartphone, isTablet, onClose]);

  if (images.length === 0) return null;

  // Sheet 닫기 핸들러 (히스토리 정리 포함)
  const handleSheetClose = useCallback((open: boolean) => {
    if (!open && (isSmartphone || isTablet)) {
      // Sheet가 닫힐 때 추가한 히스토리 엔트리 제거
      window.history.back();
    }
    onClose();
  }, [onClose, isSmartphone, isTablet]);

  // 뒤로가기 핸들러 (시트만 닫기)
  const handleBack = useCallback(() => {
    onClose();
  }, [onClose]);

  // 공통 컨텐츠
  const lightboxContent = (
    <>
      {/* 모바일/태블릿: 뒤로가기 버튼 (좌측 상단) */}
      {(isSmartphone || isTablet) && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          className="absolute top-2 left-2 z-50 text-white hover:bg-white/20"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      )}

      {/* 닫기 버튼 (데스크톱) */}
      {!isSmartphone && !isTablet && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute top-2 right-2 z-50 text-white hover:bg-white/20"
        >
          <X className="h-5 w-5" />
        </Button>
      )}

      {/* 이미지 카운터 */}
      <div className={`absolute top-2 z-50 bg-black/50 text-white px-3 py-1 rounded-full text-sm ${
        isSmartphone || isTablet 
          ? 'right-2' 
          : 'left-1/2 -translate-x-1/2'
      }`}>
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
      <div 
        className="w-full h-full flex items-center justify-center p-4 overflow-hidden"
        onMouseMove={(e) => {
          if (isDragging && scale > 1) {
            setPosition({
              x: position.x + (e.clientX - dragStart.x),
              y: position.y + (e.clientY - dragStart.y),
            });
            setDragStart({ x: e.clientX, y: e.clientY });
          }
        }}
        onMouseDown={(e) => {
          if (scale > 1) {
            setIsDragging(true);
            setDragStart({ x: e.clientX, y: e.clientY });
          }
        }}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => setIsDragging(false)}
      >
        <img
          src={images[currentIndex]}
          alt={`이미지 ${currentIndex + 1}`}
          className="select-none cursor-move"
          style={{ 
            maxWidth: '100%',
            maxHeight: '80vh',
            objectFit: 'contain',
            borderRadius: 'var(--radius)',
            transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
            transition: isDragging ? 'none' : 'transform 0.2s',
          }}
          onDoubleClick={handleDoubleClick}
          onClick={(e) => {
            e.stopPropagation();
            if (scale === 1) {
              // 확대되어 있지 않으면 이미지 변경 방지
            }
          }}
          draggable={false}
          onDragStart={(e) => e.preventDefault()}
        />
      </div>
    </>
  );

  // 모바일/태블릿에서는 Sheet 사용 (전체화면)
  if (isSmartphone || isTablet) {
    return (
      <Sheet open={open} onOpenChange={handleSheetClose} modal={true}>
        <SheetContent 
          side="right" 
          className="h-screen w-screen max-h-screen p-0 bg-black/95 border-none overflow-hidden"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          {/* 접근성을 위한 숨겨진 제목과 설명 */}
          <SheetTitle className="sr-only">
            이미지 갤러리 - {currentIndex + 1}번째 이미지 ({images.length}개 중)
          </SheetTitle>
          <SheetDescription className="sr-only">
            이미지를 확대하여 볼 수 있습니다. 터치 제스처로 이전/다음 이미지로 이동할 수 있습니다.
          </SheetDescription>
          {lightboxContent}
        </SheetContent>
      </Sheet>
    );
  }

  // 데스크톱에서는 Dialog 사용
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] p-0 bg-black/95 border-none [&>button]:hidden">
        {/* 접근성을 위한 숨겨진 제목과 설명 */}
        <DialogTitle className="sr-only">
          이미지 갤러리 - {currentIndex + 1}번째 이미지 ({images.length}개 중)
        </DialogTitle>
        <DialogDescription className="sr-only">
          이미지를 확대하여 볼 수 있습니다. 키보드 화살표 키나 터치 제스처로 이전/다음 이미지로 이동할 수 있습니다.
        </DialogDescription>
        {lightboxContent}
      </DialogContent>
    </Dialog>
  );
};

