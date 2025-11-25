import React, { useEffect, useState } from 'react';
import { cn } from '@/shared/lib/utils';
import { convertStorageBucketURL, getThumbnailURL } from '@/shared/utils/imagePathMigration';

interface LazyImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  originalSrc: string;
  placeholderSrc?: string;
  useThumbnail?: boolean;
  lazy?: boolean;
}

/**
 * 썸네일 생성 상태를 추적하면서 이미지를 로드하는 컴포넌트
 */
export const LazyImage: React.FC<LazyImageProps> = ({
  originalSrc,
  placeholderSrc,
  useThumbnail = true,
  lazy = true,
  className,
  onLoad,
  onError,
  ...imgProps
}) => {
  const normalizedSrc = convertStorageBucketURL(originalSrc);
  const [displaySrc, setDisplaySrc] = useState<string>(
    placeholderSrc || (useThumbnail ? getThumbnailURL(normalizedSrc) : normalizedSrc)
  );

  useEffect(() => {
    if (placeholderSrc) {
      setDisplaySrc(placeholderSrc);
      return;
    }
    setDisplaySrc(useThumbnail ? getThumbnailURL(normalizedSrc) : normalizedSrc);
  }, [placeholderSrc, normalizedSrc, useThumbnail]);

  const handleLoad: React.ReactEventHandler<HTMLImageElement> = (event) => {
    onLoad?.(event);
  };

  const handleError: React.ReactEventHandler<HTMLImageElement> = (event) => {
    if (displaySrc !== normalizedSrc) {
      setDisplaySrc(normalizedSrc);
    }
    onError?.(event);
  };

  return (
    <img
      src={displaySrc}
      alt={imgProps.alt}
      className={cn('select-none', className)}
      loading={lazy ? 'lazy' : undefined}
      decoding="async"
      draggable={false}
      onLoad={handleLoad}
      onError={handleError}
      {...imgProps}
    />
  );
};

