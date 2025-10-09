'use client';

import React from 'react';
import { X } from 'lucide-react';
import { Skeleton } from '@/shared/components/ui/skeleton';

export interface ImagePreviewItem {
  file: File;
  preview: string | null; // null이면 로딩 중
}

interface ImagePreviewGridProps {
  items: ImagePreviewItem[];
  onRemove: (index: number) => void;
  gridClassName?: string;
  imageClassName?: string;
}

/**
 * 이미지 미리보기 그리드 공통 컴포넌트
 * - 로딩 상태: 스켈레톤 표시
 * - 로딩 완료: 실제 이미지 표시
 * - 삭제 버튼: 각 이미지에 X 버튼
 * 
 * @example
 * ```tsx
 * const [items, setItems] = useState<ImagePreviewItem[]>([]);
 * 
 * const handleFileSelect = async (files: File[]) => {
 *   // 1단계: 즉시 로딩 상태로 추가
 *   const newItems = files.map(file => ({ file, preview: null }));
 *   setItems(prev => [...prev, ...newItems]);
 *   
 *   // 2단계: 썸네일 생성
 *   const startIndex = items.length;
 *   for (let i = 0; i < files.length; i++) {
 *     const thumbnail = await createQuickThumbnail(files[i]);
 *     setItems(prev => {
 *       const updated = [...prev];
 *       updated[startIndex + i] = { file: files[i], preview: thumbnail };
 *       return updated;
 *     });
 *   }
 * };
 * 
 * <ImagePreviewGrid
 *   items={items}
 *   onRemove={(index) => setItems(prev => prev.filter((_, i) => i !== index))}
 * />
 * ```
 */
export const ImagePreviewGrid: React.FC<ImagePreviewGridProps> = ({
  items,
  onRemove,
  gridClassName = 'grid-cols-[repeat(auto-fill,minmax(100px,1fr))]',
  imageClassName = 'h-24',
}) => {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className={`mt-2 grid ${gridClassName} gap-2`}>
      {items.map((item, index) => (
        <div key={index} className="relative">
          {item.preview === null ? (
            // 로딩 중: 스켈레톤 표시
            <Skeleton className={`w-full ${imageClassName} rounded border`} />
          ) : (
            // 로딩 완료: 실제 이미지 표시
            <>
              <img
                src={item.preview}
                alt={`preview ${index}`}
                className={`w-full ${imageClassName} object-cover rounded border`}
              />
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-destructive/90"
                aria-label="이미지 삭제"
              >
                <X className="h-3 w-3" />
              </button>
            </>
          )}
        </div>
      ))}
    </div>
  );
};



