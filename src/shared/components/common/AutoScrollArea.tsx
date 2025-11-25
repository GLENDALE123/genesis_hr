/**
 * 자동 스크롤 영역 컴포넌트
 * overflow-y-auto 또는 overflow-x-auto 클래스를 가진 div를 ScrollArea로 자동 변환
 */

import React from 'react';
import { ScrollArea, ScrollAreaProps } from '@/shared/components/ui/scroll-area';
import { cn } from '@/shared/lib/utils';

interface AutoScrollAreaProps extends Omit<ScrollAreaProps, 'children'> {
  children: React.ReactNode;
  className?: string;
  /**
   * overflow-y-auto 클래스를 가진 자식 요소를 자동으로 감지하여 ScrollArea로 감싸기
   * @default true
   */
  autoDetect?: boolean;
}

/**
 * AutoScrollArea 컴포넌트
 * 
 * 사용 예시:
 * ```tsx
 * // 기존 방식
 * <div className="overflow-y-auto h-full">
 *   {content}
 * </div>
 * 
 * // AutoScrollArea 사용
 * <AutoScrollArea className="h-full">
 *   {content}
 * </AutoScrollArea>
 * ```
 */
export const AutoScrollArea: React.FC<AutoScrollAreaProps> = ({
  children,
  className,
  autoDetect = true,
  hideVerticalScrollbar = false,
  hideHorizontalScrollbar = false,
  overflowY = 'auto',
  overflowX = 'auto',
  ...props
}) => {
  return (
    <ScrollArea
      className={cn(className)}
      hideVerticalScrollbar={hideVerticalScrollbar}
      hideHorizontalScrollbar={hideHorizontalScrollbar}
      overflowY={overflowY}
      overflowX={overflowX}
      {...props}
    >
      {children}
    </ScrollArea>
  );
};


