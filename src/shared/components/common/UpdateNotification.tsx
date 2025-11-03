'use client';

import React, { useState, useEffect } from 'react';
import { X, Download, Clock } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';
import { Progress } from '@/shared/components/ui/progress';

export interface UpdateNotificationData {
  id: string;
  version: string;
  releaseNotes?: string;
  releaseDate?: string;
}

interface UpdateNotificationProps {
  notification: UpdateNotificationData;
  onClose: () => void;
  onUpdateNow: () => void;
  onRemindLater: () => void;
  downloading?: boolean;
  downloadProgress?: number;
}

export const UpdateNotification: React.FC<UpdateNotificationProps> = ({
  notification,
  onClose,
  onUpdateNow,
  onRemindLater,
  downloading = false,
  downloadProgress = 0,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 애니메이션을 위한 지연
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={cn(
        'fixed bottom-4 left-4 z-50 w-80 max-w-sm transition-all duration-300 ease-in-out',
        isVisible ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'
      )}
    >
      <div className="relative overflow-hidden rounded-lg border border-border bg-background shadow-lg border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-950/20">
        {/* 닫기 버튼 */}
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 h-6 w-6 p-0 hover:bg-background/80"
          onClick={onClose}
        >
          <X className="h-3 w-3" />
        </Button>

        {/* 알림 내용 */}
        <div className="p-4 pr-8">
          <div className="space-y-3">
            {/* 제목 */}
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">
                🔄 새 버전 사용 가능
              </h3>
              <p className="text-xs text-muted-foreground">
                버전 {notification.version}이 출시되었습니다.
              </p>
            </div>

            {/* 다운로드 진행률 */}
            {downloading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>다운로드 중...</span>
                  <span>{Math.round(downloadProgress)}%</span>
                </div>
                <Progress value={downloadProgress} className="h-1.5" />
              </div>
            )}

            {/* 액션 버튼 */}
            <div className="flex flex-col gap-2">
              <Button
                onClick={onUpdateNow}
                disabled={downloading && downloadProgress < 100}
                className="w-full"
                size="sm"
              >
                <Download className="mr-2 h-4 w-4" />
                {downloading 
                  ? `다운로드 중... ${Math.round(downloadProgress)}%`
                  : downloadProgress === 100
                  ? '설치 및 재시작'
                  : '지금 업데이트'}
              </Button>

              {!downloading && downloadProgress === 0 && (
                <button
                  onClick={onRemindLater}
                  className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors text-center self-center"
                >
                  나중에 알림
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

