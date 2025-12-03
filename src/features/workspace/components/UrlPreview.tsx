/**
 * URL 미리보기 컴포넌트
 * 링크를 자동으로 감지하고 미리보기 카드 표시
 */

import React, { useState, useEffect } from 'react';
import { ExternalLink, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

export interface UrlPreviewData {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
}

export interface UrlPreviewProps {
  url: string;
  className?: string;
}

export const UrlPreview: React.FC<UrlPreviewProps> = ({ url, className }) => {
  const [previewData, setPreviewData] = useState<UrlPreviewData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const fetchPreview = async () => {
      setIsLoading(true);
      setHasError(false);
      
      try {
        // 간단한 URL 미리보기 (실제로는 Open Graph 메타데이터를 파싱해야 함)
        // 여기서는 기본 정보만 표시
        const urlObj = new URL(url);
        setPreviewData({
          url,
          title: urlObj.hostname,
          description: url,
          siteName: urlObj.hostname.replace('www.', ''),
        });
      } catch (error) {
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    };

    if (url) {
      fetchPreview();
    }
  }, [url]);

  if (isLoading) {
    return (
      <div className={cn('border rounded-lg p-3 bg-muted/50 animate-pulse', className)}>
        <div className="h-4 bg-muted-foreground/20 rounded w-3/4 mb-2" />
        <div className="h-3 bg-muted-foreground/20 rounded w-full" />
      </div>
    );
  }

  if (hasError || !previewData) {
    return null;
  }

  return (
    <a
      href={previewData.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'block border rounded-lg overflow-hidden hover:border-primary transition-colors',
        className
      )}
    >
      {previewData.image && (
        <div className="w-full h-48 bg-muted relative overflow-hidden">
          <img
            src={previewData.image}
            alt={previewData.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}
      <div className="p-3">
        {previewData.siteName && (
          <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
            <ExternalLink className="h-3 w-3" />
            {previewData.siteName}
          </div>
        )}
        {previewData.title && (
          <h4 className="text-sm font-semibold mb-1 line-clamp-1">
            {previewData.title}
          </h4>
        )}
        {previewData.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {previewData.description}
          </p>
        )}
      </div>
    </a>
  );
};

/**
 * 텍스트에서 URL 추출
 */
export function extractUrls(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const matches = text.match(urlRegex);
  return matches || [];
}

