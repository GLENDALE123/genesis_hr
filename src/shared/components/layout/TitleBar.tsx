'use client';

import React, { useEffect, useState } from 'react';
import { Minus, Square, Copy, X, Camera, Crop, MousePointer } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { toast } from 'sonner';
import { useElementCapture } from '@/shared/hooks/use-element-capture';

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
  const { isSelecting, startElementCapture, stopElementCapture } = useElementCapture();

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

  // 전체 윈도우 캡처
  const captureWindow = async () => {
    try {
      toast.loading('전체 윈도우 캡처 중...', { id: 'capture-toast' });
      const result = await (window as any).electron?.window.captureScreenshot('window');
      
      if (result?.success) {
        toast.dismiss('capture-toast');
      } else if (result?.canceled) {
        toast.dismiss('capture-toast');
      } else {
        toast.error('캡처에 실패했습니다.', { id: 'capture-toast', description: result?.error });
      }
    } catch (error: any) {
      toast.error('캡처 중 오류가 발생했습니다.', { id: 'capture-toast', description: error.message });
    }
  };

  // 영역 선택 캡처
  const captureArea = async () => {
    try {
      toast.loading('영역 선택 캡처 중...', { id: 'capture-toast' });
      const result = await (window as any).electron?.window.captureScreenshot('area');
      
      if (result?.success) {
        toast.dismiss('capture-toast');
      } else if (result?.canceled) {
        toast.dismiss('capture-toast');
      } else {
        toast.error('캡처에 실패했습니다.', { id: 'capture-toast', description: result?.error });
      }
    } catch (error: any) {
      toast.error('캡처 중 오류가 발생했습니다.', { id: 'capture-toast', description: error.message });
    }
  };

  // 요소 선택 캡처
  const captureElement = () => {
    if (isSelecting) {
      stopElementCapture();
      toast.dismiss('element-capture-mode');
    } else {
      startElementCapture();
      toast.info('요소 선택 모드: 마우스를 움직여 요소를 선택하세요', { 
        id: 'element-capture-mode',
        duration: 3000 
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
      {/* 왼쪽: 앱 아이콘 & 타이틀 + 캡처 도구 */}
      <div className="flex items-center gap-3 text-xs px-3">
        <div className="h-4 w-4 rounded-sm bg-primary flex items-center justify-center flex-shrink-0">
          <span className="text-primary-foreground font-bold text-[10px]">TMS</span>
        </div>
        <span className="font-medium text-foreground">TMS 통합관리시스템</span>

        {/* 캡처 도구 (왼쪽 정렬) */}
        <div
          className="flex items-center h-full pl-3 gap-1 border-l border-border"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <span className="text-muted-foreground mr-1">캡처도구</span>
          {/* 전체 윈도우 캡처 */}
          <button
            className="h-6 w-6 flex items-center justify-center hover:bg-accent transition-colors rounded"
            onClick={captureWindow}
            title="전체 윈도우 캡처"
          >
            <Camera className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
          {/* 영역 선택 캡처 */}
          <button
            className="h-6 w-6 flex items-center justify-center hover:bg-accent transition-colors rounded"
            onClick={captureArea}
            title="사각형 영역 캡처"
          >
            <Crop className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
          {/* 요소 선택 캡처 */}
          <button
            className={`h-6 w-6 flex items-center justify-center transition-colors rounded ${
              isSelecting ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
            }`}
            onClick={captureElement}
            title={isSelecting ? '요소 선택 모드 종료' : '요소 선택 캡처'}
          >
            <MousePointer className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        </div>
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

