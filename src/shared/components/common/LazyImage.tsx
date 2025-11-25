import React, { useEffect, useState } from 'react';
import { cn } from '@/shared/lib/utils';
import {
  convertStorageBucketURL,
  getThumbnailURL,
  waitForThumbnailAvailability
} from '@/shared/utils/imagePathMigration';

export type ThumbnailStatus = 'checking' | 'thumbnail' | 'original' | 'error';

interface LazyImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  originalSrc: string;
  placeholderSrc?: string;
  useThumbnail?: boolean;
  lazy?: boolean;
  thumbnailCheckOptions?: {
    attempts?: number;
    intervalMs?: number;
  };
  onStatusChange?: (status: ThumbnailStatus) => void;
}

/**
 * 썸네일 생성 상태를 추적하면서 이미지를 로드하는 컴포넌트
 */
export const LazyImage: React.FC<LazyImageProps> = ({
  originalSrc,
  placeholderSrc,
  useThumbnail = true,
  lazy = true,
  thumbnailCheckOptions,
  className,
  onLoad,
  onError,
  onStatusChange,
  ...imgProps
}) => {
  const normalizedSrc = convertStorageBucketURL(originalSrc);
  const [displaySrc, setDisplaySrc] = useState<string>(placeholderSrc || normalizedSrc);
  const [status, setStatus] = useState<ThumbnailStatus>('checking');

  useEffect(() => {
    setDisplaySrc(placeholderSrc || normalizedSrc);
  }, [placeholderSrc, normalizedSrc]);

  useEffect(() => {
    let mounted = true;

    const resolveThumbnail = async (): Promise<void> => {
      if (!useThumbnail) {
        if (!mounted) return;
        setStatus('original');
        onStatusChange?.('original');
        setDisplaySrc(normalizedSrc);
        return;
      }

      setStatus('checking');
      onStatusChange?.('checking');

      try {
        const available = await waitForThumbnailAvailability(normalizedSrc, {
          attempts: thumbnailCheckOptions?.attempts,
          intervalMs: thumbnailCheckOptions?.intervalMs
        });

        if (!mounted) return;

        if (available) {
          setStatus('thumbnail');
          onStatusChange?.('thumbnail');
          setDisplaySrc(getThumbnailURL(normalizedSrc));
        } else {
          setStatus('original');
          onStatusChange?.('original');
          setDisplaySrc(normalizedSrc);
        }
      } catch (error) {
        if (!mounted) return;
        setStatus('error');
        onStatusChange?.('error');
        setDisplaySrc(normalizedSrc);
      }
    };

    resolveThumbnail();

    return () => {
      mounted = false;
    };
  }, [normalizedSrc, useThumbnail, onStatusChange]);

  const handleLoad: React.ReactEventHandler<HTMLImageElement> = (event) => {
    onLoad?.(event);
  };

  const handleError: React.ReactEventHandler<HTMLImageElement> = (event) => {
    setStatus('error');
    onStatusChange?.('error');
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
      data-thumbnail-status={status}
    />
  );
};

