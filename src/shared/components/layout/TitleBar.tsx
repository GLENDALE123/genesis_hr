'use client';

import React, { useEffect, useState } from 'react';
import { Minus, Square, Copy, X, Camera } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { toast } from 'sonner';

interface TitleBarProps {
  className?: string;
}

/**
 * Electron 커스텀 타이틀바
 * frame: false 설정 시 사용
 */
export const TitleBar: React.FC<TitleBarProps> = ({ className }) => {
  const [isElectron, setIsElectron] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    // Electron 환경 체크: contextBridge로 노출된 window.electron 존재 여부만 확인
    if (typeof window !== 'undefined' && (window as any).electron) {
      setIsElectron(true);
      (window as any).electron.window.isMaximized().then(setIsMaximized);
      const handleResize = () => {
        (window as any).electron?.window.isMaximized().then(setIsMaximized);
      };
      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }
  }, []);

  // Electron 환경이 아니면 렌더링하지 않음
  if (!isElectron) {
    return null;
  }

  // 윈도우 컨트롤 함수
  const minimizeWindow = () => {
    window.electron?.window.minimize();
  };

  const maximizeWindow = () => {
    window.electron?.window.maximize();
  };

  const closeWindow = () => {
    window.electron?.window.close();
  };

  // 스크린샷 캡처 함수 (클립보드 복사)
  const captureScreenshot = async () => {
    try {
      toast.loading('스크린샷 캡처 중...', { id: 'capture-toast' });
      const result = await (window as any).electron?.window.captureScreenshot();
      
      if (result?.success) {
        toast.success('스크린샷이 클립보드에 복사되었습니다.', { 
          id: 'capture-toast',
          duration: 2000
        });
      } else if (result?.canceled) {
        toast.dismiss('capture-toast');
      } else {
        toast.error('스크린샷 캡처에 실패했습니다.', { 
          id: 'capture-toast',
          description: result?.error || '알 수 없는 오류'
        });
      }
    } catch (error: any) {
      console.error('스크린샷 캡처 오류:', error);
      toast.error('스크린샷 캡처 중 오류가 발생했습니다.', { 
        id: 'capture-toast',
        description: error.message 
      });
    }
  };

  return (
    <div
      className={cn(
        "h-8 w-full flex items-center justify-between bg-background border-b select-none",
        "drag-region", // 드래그 가능 영역
        className
      )}
      style={{
        WebkitAppRegion: 'drag',
      } as React.CSSProperties}
    >
      {/* 왼쪽: 앱 아이콘 & 타이틀 */}
      <div className="flex items-center gap-2 text-xs px-3">
        <div className="h-4 w-4 rounded-sm bg-primary flex items-center justify-center flex-shrink-0">
          <span className="text-primary-foreground font-bold text-[10px]">TMS</span>
        </div>
        <span className="font-medium text-foreground">TMS 통합관리시스템</span>
      </div>

      {/* 중앙: 드래그 영역 */}
      <div className="flex-1" />

      {/* 오른쪽: 윈도우 컨트롤 버튼 (Windows 스타일) */}
      <div 
        className="flex items-center h-full"
        style={{
          WebkitAppRegion: 'no-drag',
        } as React.CSSProperties}
      >
        {/* 스크린샷 캡처 버튼 */}
        <button
          className="h-full w-10 flex items-center justify-center hover:bg-accent transition-colors border-r border-border"
          onClick={captureScreenshot}
          title="스크린샷 캡처"
        >
          <Camera className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
        
        {/* 최소화 버튼 */}
        <button
          className="h-full w-12 flex items-center justify-center hover:bg-accent transition-colors"
          onClick={minimizeWindow}
          title="최소화"
        >
          <Minus className="h-3 w-3" strokeWidth={1.5} />
        </button>
        
        {/* 최대화/복원 버튼 */}
        <button
          className="h-full w-12 flex items-center justify-center hover:bg-accent transition-colors"
          onClick={maximizeWindow}
          title={isMaximized ? "복원" : "최대화"}
        >
          {isMaximized ? (
            <Copy className="h-3 w-3" strokeWidth={1.5} />
          ) : (
            <Square className="h-3 w-3" strokeWidth={1.5} />
          )}
        </button>
        
        {/* 닫기 버튼 */}
        <button
          className="h-full w-12 flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors"
          onClick={closeWindow}
          title="닫기"
        >
          <X className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
};

