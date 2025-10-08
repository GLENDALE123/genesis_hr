'use client';

import React, { useEffect, useState } from 'react';
import { Minus, Square, Copy, X } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

interface TitleBarProps {
  className?: string;
}

export const TitleBar: React.FC<TitleBarProps> = ({ className }) => {
  const [isTauri, setIsTauri] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    // Tauri 환경인지 확인
    if (typeof window !== 'undefined' && (window as any).__TAURI__) {
      setIsTauri(true);
      
      // 최대화 상태 감지
      const setupMaximizeListener = async () => {
        const { appWindow } = await import('@tauri-apps/api/window');
        const maximized = await appWindow.isMaximized();
        setIsMaximized(maximized);
        
        // 최대화 상태 변경 감지
        const unlistenResize = await appWindow.onResized(async () => {
          const maximized = await appWindow.isMaximized();
          setIsMaximized(maximized);
        });
        
        return unlistenResize;
      };
      
      setupMaximizeListener();
    }
  }, []);

  // Tauri가 아니면 렌더링하지 않음
  if (!isTauri) {
    return null;
  }

  // Tauri 윈도우 컨트롤 함수
  const minimizeWindow = async () => {
    const { appWindow } = await import('@tauri-apps/api/window');
    await appWindow.minimize();
  };

  const maximizeWindow = async () => {
    const { appWindow } = await import('@tauri-apps/api/window');
    await appWindow.toggleMaximize();
  };

  const closeWindow = async () => {
    const { appWindow } = await import('@tauri-apps/api/window');
    await appWindow.close();
  };

  return (
    <div
      className={cn(
        "h-8 w-full flex items-center justify-between select-none",
        className
      )}
      style={{
        backgroundColor: 'hsl(var(--header-background))',
        color: 'hsl(var(--header-foreground))',
      }}
      data-tauri-drag-region
    >
      {/* 왼쪽: 앱 아이콘 & 타이틀 */}
      <div className="flex items-center gap-2 text-xs px-3" data-tauri-drag-region>
        <div className="h-4 w-4 rounded-sm bg-primary flex items-center justify-center flex-shrink-0">
          <span className="text-primary-foreground font-bold text-[10px]">HS</span>
        </div>
        <span className="font-normal">HS 인사관리 시스템</span>
      </div>

      {/* 중앙: 드래그 영역 */}
      <div className="flex-1" data-tauri-drag-region />

      {/* 오른쪽: 윈도우 컨트롤 버튼 (Windows 시스템 스타일) */}
      <div className="flex items-center h-full">
        {/* 최소화 버튼 */}
        <button
          className="h-full w-12 flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          onClick={minimizeWindow}
          title="최소화"
        >
          <Minus className="h-3 w-3" strokeWidth={1} />
        </button>
        
        {/* 최대화/복원 버튼 */}
        <button
          className="h-full w-12 flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          onClick={maximizeWindow}
          title={isMaximized ? "복원" : "최대화"}
        >
          {isMaximized ? (
            <Copy className="h-3 w-3" strokeWidth={1} />
          ) : (
            <Square className="h-3 w-3" strokeWidth={1} />
          )}
        </button>
        
        {/* 닫기 버튼 */}
        <button
          className="h-full w-12 flex items-center justify-center hover:bg-red-600 hover:text-white transition-colors"
          onClick={closeWindow}
          title="닫기"
        >
          <X className="h-3.5 w-3.5" strokeWidth={1} />
        </button>
      </div>
    </div>
  );
};

