'use client';

import React, { useState, useRef, useEffect, memo } from 'react';
import { cn } from '@/shared/lib/utils';
import { getThumbnailURL, convertStorageBucketURL } from '@/shared/utils/imagePathMigration';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  placeholder?: string;
  onLoad?: () => void;
  onError?: () => void;
  onClick?: () => void;
  useThumbnail?: boolean; // 썸네일 우선 로드 여부 (기본값: true)
}

/**
 * 지연 로딩 이미지 컴포넌트
 * Intersection Observer를 사용하여 뷰포트에 들어올 때만 이미지 로드
 */
const LazyImageComponent: React.FC<LazyImageProps> = ({
  src,
  alt,
  className,
  style,
  placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5YTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkxvYWRpbmcuLi48L3RleHQ+PC9zdmc+',
  onLoad,
  onError,
  onClick,
  useThumbnail = true
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [imageSrc, setImageSrc] = useState<string>(src);
  const imgRef = useRef<HTMLImageElement>(null);

  // 썸네일 우선 로드 설정
  useEffect(() => {
    if (!isInView || !useThumbnail) {
      const convertedSrc = convertStorageBucketURL(src);
      setImageSrc(convertedSrc);
      return;
    }

    // 썸네일 URL 생성 및 존재 확인
    const convertedSrc = convertStorageBucketURL(src);
    const thumbnailUrl = getThumbnailURL(convertedSrc);
    
    // 썸네일 존재 여부 확인 (HEAD 요청)
    fetch(thumbnailUrl, { method: 'HEAD' })
      .then(response => {
        if (response.ok) {
          setImageSrc(thumbnailUrl); // 썸네일 사용
        } else {
          setImageSrc(convertedSrc); // 원본 사용
        }
      })
      .catch(() => {
        setImageSrc(convertedSrc); // 원본 사용
      });
  }, [src, isInView, useThumbnail]);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px', // 뷰포트 50px 전에 미리 로드
        threshold: 0.1
      }
    );

    observer.observe(img);

    return () => {
      observer.disconnect();
    };
  }, []);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  const handleImageError = () => {
    // 썸네일 로드 실패 시 원본으로 폴백
    if (useThumbnail && imageSrc !== convertStorageBucketURL(src)) {
      setImageSrc(convertStorageBucketURL(src));
      return; // 재시도하므로 여기서는 에러 처리하지 않음
    }
    handleError();
  };

  return (
    <div className={cn('relative overflow-hidden', className)}>
      <img
        ref={imgRef}
        src={isInView ? imageSrc : placeholder}
        alt={alt}
        className={cn(
          'w-full h-full object-cover transition-opacity duration-300',
          isLoaded ? 'opacity-100' : 'opacity-0'
        )}
        style={style}
        onLoad={handleLoad}
        onError={handleImageError}
        onClick={onClick}
        loading="lazy"
      />
      
      {/* 로딩 오버레이 */}
      {isInView && !isLoaded && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      )}
      
      {/* 에러 상태 */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground">
          <div className="text-center">
            <div className="text-2xl mb-2">📷</div>
            <div className="text-sm">이미지 로드 실패</div>
          </div>
        </div>
      )}
    </div>
  );
};

// 메모이제이션 적용
export const LazyImage = memo(LazyImageComponent);
