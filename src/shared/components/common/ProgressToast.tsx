
import React from 'react';
import { Progress } from '@/shared/components/ui/progress';
import { Button } from '@/shared/components/ui/button';
import { Upload, CheckCircle, XCircle, X } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

interface ProgressToastProps {
  title: string;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  message?: string;
  className?: string;
  onCancel?: () => void;
  onRetry?: () => void;
  isCancellable?: boolean;
  error?: string;
  currentCount?: number; // 현재 완료된 파일 수
  totalCount?: number; // 전체 파일 수
}

export const ProgressToast: React.FC<ProgressToastProps> = ({
  title,
  progress,
  status,
  message,
  className,
  onCancel,
  onRetry,
  isCancellable = false,
  error,
  currentCount,
  totalCount
}) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'uploading':
        return <Upload className="h-4 w-4 animate-pulse" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Upload className="h-4 w-4" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'uploading':
        return 'text-blue-600';
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className={cn(
      "flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-lg border",
      className
    )}>
      <div className="flex-shrink-0">
        {getStatusIcon()}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h4 className={cn("text-sm font-medium", getStatusColor())}>
            {title}
          </h4>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">
              {currentCount && totalCount ? `${currentCount}/${totalCount}` : `${Math.round(progress)}%`}
            </span>
            {status === 'uploading' && isCancellable && onCancel && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onCancel}
                className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
        
        {status === 'uploading' && (
          <Progress 
            value={progress} 
            className="h-2 mb-1"
          />
        )}
        
        {message && (
          <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
            {message}
          </p>
        )}
        
        {status === 'error' && error && (
          <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-600 dark:text-red-400">
            {error}
          </div>
        )}
        
        {status === 'error' && onRetry && (
          <div className="mt-2 flex gap-2">
            <Button
              size="sm"
              onClick={onRetry}
              className="h-6 px-2 text-xs bg-blue-500 text-white hover:bg-blue-600"
            >
              다시 시도
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                // 토스트 닫기
                const toastElement = document.querySelector('[data-sonner-toast]');
                if (toastElement) {
                  toastElement.remove();
                }
              }}
              className="h-6 px-2 text-xs"
            >
              닫기
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

// Sonner Promise 확장을 위한 헬퍼 함수들
export const createImageUploadPromise = (
  uploadPromise: Promise<string[]>,
  fileCount: number,
  toast: any,
  onCancel?: () => void
) => {
  let progressToast: any = null;
  let isCancelled = false;
  
  // 취소 가능한 Promise로 래핑
  const cancellablePromise = new Promise<string[]>((resolve, reject) => {
    const cancelHandler = () => {
      isCancelled = true;
      reject(new Error('사용자에 의해 취소되었습니다.'));
    };
    
    uploadPromise
      .then((result) => {
        if (!isCancelled) {
          resolve(result);
        }
      })
      .catch((error) => {
        if (!isCancelled) {
          reject(error);
        }
      });
    
    // 취소 핸들러 등록
    if (onCancel) {
      const originalOnCancel = onCancel;
      onCancel = () => {
        cancelHandler();
        originalOnCancel();
      };
    }
  });
  
  return toast.promise(
    cancellablePromise,
    {
      loading: () => {
        progressToast = toast.custom((t: any) => (
          <ProgressToast
            title="이미지 업로드 중..."
            progress={0}
            status="uploading"
            message={`${fileCount}개 파일 업로드 중`}
            isCancellable={true}
            onCancel={() => {
              isCancelled = true;
              toast.dismiss('image-upload-progress');
              toast.error('업로드가 취소되었습니다.');
              if (onCancel) onCancel();
            }}
          />
        ), {
          duration: Infinity,
          id: 'image-upload-progress'
        });
        return progressToast;
      },
      success: (imageUrls: string[]) => {
        toast.dismiss('image-upload-progress');
        return toast.success(
          '이미지 업로드 완료',
          {
            description: `${imageUrls.length}개의 이미지가 업로드되었습니다.`,
            duration: 3000
          }
        );
      },
      error: (error: any) => {
        toast.dismiss('image-upload-progress');
        
        // 에러 타입에 따른 처리
        if (error.message === '사용자에 의해 취소되었습니다.') {
          return toast.error('업로드가 취소되었습니다.');
        }
        
        // 네트워크 에러나 기타 에러
        return toast.custom((t: any) => (
          <ProgressToast
            title="이미지 업로드 실패"
            progress={0}
            status="error"
            message="이미지 업로드에 실패했습니다."
            error={error.message || '알 수 없는 오류가 발생했습니다.'}
            onRetry={() => {
              toast.dismiss(t.id);
              // 재시도 로직은 호출하는 쪽에서 처리
            }}
          />
        ), {
          duration: Infinity,
          id: 'image-upload-error'
        });
      }
    }
  );
};

// 진행률 업데이트를 위한 토스트 업데이트 함수
export const updateProgressToast = (
  toast: any, 
  progress: number, 
  fileCount: number,
  onCancel?: () => void,
  currentCount?: number // 현재 완료된 파일 수
) => {
  // 진행률을 0-100 범위로 정규화
  const normalizedProgress = Math.max(0, Math.min(100, progress));
  
  // 현재 파일 수가 제공되지 않으면 진행률에서 계산
  const actualCurrentCount = currentCount || Math.round((normalizedProgress / 100) * fileCount);
  
  toast.custom((t: any) => (
    <ProgressToast
      title="이미지 업로드 중..."
      progress={normalizedProgress}
      status="uploading"
      message={`${fileCount}개 파일 업로드 중`}
      isCancellable={true}
      onCancel={onCancel}
      currentCount={actualCurrentCount}
      totalCount={fileCount}
    />
  ), {
    duration: Infinity,
    id: 'image-upload-progress'
  });
};

// 타임아웃 처리를 위한 헬퍼 함수
export const createTimeoutPromise = (timeoutMs: number = 30000) => {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error('업로드 시간이 초과되었습니다. 네트워크 연결을 확인해주세요.'));
    }, timeoutMs);
  });
};

// 재시도 로직을 포함한 업로드 함수
export const createRetryableUploadPromise = (
  uploadFunction: () => Promise<string[]>,
  maxRetries: number = 3,
  delayMs: number = 1000
) => {
  return new Promise<string[]>(async (resolve, reject) => {
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await uploadFunction();
        resolve(result);
        return;
      } catch (error) {
        lastError = error;
        
        if (attempt < maxRetries) {
          // 재시도 전 대기
          await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
        }
      }
    }
    
    reject(lastError);
  });
};


