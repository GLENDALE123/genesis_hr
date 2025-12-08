/**
 * React Error Boundary 컴포넌트
 * 예상치 못한 에러를 잡아서 사용자에게 친화적인 에러 화면 표시
 */
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 에러 로깅
    console.error('❌ [ErrorBoundary] 에러 발생:', error);
    console.error('❌ [ErrorBoundary] 에러 정보:', errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // 전역 에러 핸들러에 전달
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Electron 환경에서 메인 프로세스에 에러 전달
    if (typeof window !== 'undefined' && (window as any).electron) {
      try {
        (window as any).electron.ipcRenderer.send('app-error', {
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString(),
        });
      } catch (e) {
        // IPC 전송 실패는 무시
      }
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
          <div className="max-w-md w-full bg-card border border-destructive/50 rounded-lg p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-destructive"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  예상치 못한 오류가 발생했습니다
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  문제가 계속되면 페이지를 새로고침하세요.
                </p>
              </div>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mt-4 p-3 bg-muted rounded-md">
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground mb-2">
                    에러 상세 정보 (개발 모드)
                  </summary>
                  <pre className="whitespace-pre-wrap break-words text-xs text-destructive">
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              </div>
            )}

            <div className="flex gap-2 mt-6">
              <button
                onClick={this.handleReset}
                className="flex-1 px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
              >
                다시 시도
              </button>
              <button
                onClick={this.handleReload}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                페이지 새로고침
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}




















