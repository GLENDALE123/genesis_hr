
import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { Skeleton } from '@/shared/components/ui/skeleton';

export interface UploadingImageItem {
  file: File | null; // null이면 기존 이미지 URL
  preview: string | null; // null이면 로딩 중
}

interface UploadingImageGridProps {
  items: UploadingImageItem[];
  onRemove: (index: number) => void;
  gridClassName?: string;
  imageClassName?: string;
}

/**
 * 이미지 업로드 중 미리보기 그리드 컴포넌트
 * - 로딩 상태: 스켈레톤 표시
 * - 로딩 완료: 실제 이미지 표시
 * - 삭제 버튼: 각 이미지에 X 버튼
 * 
 * @example
 * ```tsx
 * const [items, setItems] = useState<UploadingImageItem[]>([]);
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
 * <UploadingImageGrid
 *   items={items}
 *   onRemove={(index) => setItems(prev => prev.filter((_, i) => i !== index))}
 * />
 * ```
 */
export const UploadingImageGrid: React.FC<UploadingImageGridProps> = ({
  items,
  onRemove,
  gridClassName = 'grid-cols-[repeat(auto-fill,minmax(100px,1fr))]',
  imageClassName = 'h-24',
}) => {
  // cleanup 함수 추가
  const handleRemove = (index: number) => {
    const item = items[index];
    // preview URL이 blob URL이라면 해제
    if (item.preview && item.preview.startsWith('blob:')) {
      URL.revokeObjectURL(item.preview);
    }
    onRemove(index);
  };

  // 컴포넌트 언마운트 시 모든 blob URL 정리
  useEffect(() => {
    return () => {
      items.forEach(item => {
        if (item.preview && item.preview.startsWith('blob:')) {
          URL.revokeObjectURL(item.preview);
        }
      });
    };
  }, [items]);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className={`mt-2 grid ${gridClassName} gap-2`}>
      {items.map((item, index) => (
        <div key={index} className="relative">
          {item.preview === null ? (
            // 로딩 중: 스켈레톤 표시
            <Skeleton className={`w-full ${imageClassName} border`} style={{ borderRadius: 'var(--radius)' }} />
          ) : (
            // 로딩 완료: 실제 이미지 표시
            <>
              <img
                src={item.preview}
                alt={`preview ${index}`}
                className={`w-full ${imageClassName} object-cover border select-none`}
                style={{ borderRadius: 'var(--radius)' }}
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
                onError={(e) => {
                  // 이미지 로드 실패 시 기본 이미지로 대체
                  const target = e.target as HTMLImageElement;
                  target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik04NSA3MEgxMTVWNzBIMTA1VjkwSDk1VjcwSDg1WiIgZmlsbD0iIzlDQTNBRiIvPgo8cGF0aCBkPSJNMTAwIDExMEw5MCA5MEw4MCAxMTBIMTIwTDEwMCAxMTBaIiBmaWxsPSIjOUNBM0FGIi8+Cjwvc3ZnPgo=';
                  target.alt = '이미지 로드 실패';
                }}
              />
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-destructive/90 transition-colors"
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



