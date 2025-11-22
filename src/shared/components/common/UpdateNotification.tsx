
import React, { useState, useEffect } from 'react';
import { X, Download, Clock } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';
import { Progress } from '@/shared/components/ui/progress';
import { Spinner } from '@/shared/components/ui/spinner';

export interface UpdateNotificationData {
  id?: string;
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
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  useEffect(() => {
    // 애니메이션을 위한 지연
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // 다운로드가 시작되면 모달 표시
  useEffect(() => {
    if (downloading) {
      setShowUpdateModal(true);
    }
  }, [downloading]);

  // "지금 업데이트" 클릭 시 모달 표시 및 다운로드 시작
  const handleUpdateClick = () => {
    setShowUpdateModal(true);
    onUpdateNow();
  };

  return (
    <>
      {/* 초기 알림창 (좌측 하단) - 업데이트 시작 전에만 표시 */}
      {!showUpdateModal && (
        <div
          className={cn(
            'fixed bottom-4 left-4 right-4 sm:right-auto sm:w-80 md:w-96 z-[9999] transition-all duration-300 ease-in-out',
            isVisible ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'
          )}
          style={{ zIndex: 9999 }}
        >
          <div className="relative overflow-hidden rounded-lg border border-border bg-background shadow-lg bg-blue-50 dark:bg-blue-950/90 backdrop-blur-sm">
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
                  <div className="flex items-center gap-2">
                    <Image
                      src="/tms-logo.png"
                      alt="TMS 로고"
                      width={20}
                      height={20}
                      className="object-contain"
                    />
                    <h3 className="text-sm font-semibold text-foreground">
                      새 버전 사용 가능
                    </h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    버전 {notification.version}이 출시되었습니다.
                  </p>
                </div>

                {/* 액션 버튼 */}
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={handleUpdateClick}
                    className="w-full"
                    size="sm"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    지금 업데이트
                  </Button>

                  <button
                    onClick={onRemindLater}
                    className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors text-center self-center"
                  >
                    나중에 알림
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 업데이트 진행 모달 (전체 화면 오버레이) */}
      {showUpdateModal && (
        <div 
          className="fixed inset-0 z-[10000] bg-black/70 backdrop-blur-sm flex items-center justify-center"
          style={{ zIndex: 10000 }}
        >
          <div className="relative w-[400px] aspect-square bg-background rounded-lg border border-border shadow-2xl p-8 flex flex-col items-center justify-center gap-6">
            {/* 로고 */}
            <div className="flex items-center gap-3">
              <Image
                src="/tms-logo.png"
                alt="TMS 로고"
                width={32}
                height={32}
                className="object-contain"
              />
              <h2 className="text-lg font-semibold text-foreground">
                TMS 통합관리시스템
              </h2>
            </div>

            {/* 제목 */}
            <p className="text-base font-medium text-foreground">
              버전 업데이트 중
            </p>

            {/* 스피너 */}
            <Spinner className="size-10 text-primary" />

            {/* 진행률 */}
            <div className="w-full space-y-2">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  {downloadProgress === 100 ? '다운로드 완료' : '다운로드 중...'}
                </span>
                <span>{Math.round(downloadProgress)}%</span>
              </div>
              <Progress value={downloadProgress} className="h-2" />
              {downloadProgress === 100 && (
                <p className="text-xs text-center text-muted-foreground mt-2">
                  설치 후 자동으로 재시작됩니다...
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};




