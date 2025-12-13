/**
 * Virtuoso 컴포넌트 설정
 */

import React from 'react';
import { cn } from '@/shared/lib/utils';
import { Loader2 } from 'lucide-react';

interface VirtuosoComponentsProps {
  isInitialLoading: boolean;
  isLoadingOlderMessages: boolean;
  hasMoreOlderMessages: boolean;
  scrollerDataAttribute?: string;
  scrollerDisplayName?: string;
  listDisplayName?: string;
}

export const createVirtuosoComponents = ({
  isInitialLoading,
  isLoadingOlderMessages,
  hasMoreOlderMessages,
  scrollerDataAttribute = 'virtuoso-scroller',
  scrollerDisplayName = 'VirtuosoScroller',
  listDisplayName = 'VirtuosoList',
}: VirtuosoComponentsProps) => {
  const Scroller = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, style, children, ...props }, ref) => (
      <div
        {...props}
        ref={ref}
        style={style}
        className={cn('h-full w-full overflow-y-auto', className)}
        data-attribute={scrollerDataAttribute}
      >
        {children}
      </div>
    )
  );
  Scroller.displayName = scrollerDisplayName;

  const List = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, style, children, ...props }, ref) => (
      <div
        {...props}
        ref={ref}
        style={style}
        className={cn('py-4 px-2 min-w-0', className)}
      >
        {children}
      </div>
    )
  );
  List.displayName = listDisplayName;

  const Header: React.FC = () => {
    if (isInitialLoading) {
      return null;
    }

    if (isLoadingOlderMessages) {
      return (
        <div className="flex justify-center py-2 text-xs text-muted-foreground">
          이전 메시지를 불러오는 중...
        </div>
      );
    }

    if (!hasMoreOlderMessages) {
      return (
        <div className="flex justify-center py-2 text-xs text-muted-foreground">
          더 이상 이전 메시지가 없습니다
        </div>
      );
    }

    return null;
  };

  return { Scroller, List, Header };
};



























