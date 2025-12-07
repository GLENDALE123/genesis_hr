/**
 * 모바일 뒤로가기 처리를 위한 커스텀 훅
 * Dialog, AlertDialog, Sheet 등에서 사용
 */

import { useEffect, useRef } from 'react';

interface UseMobileBackHandlerOptions {
  /** 모달/다이얼로그가 열려있는지 여부 */
  isOpen: boolean;
  /** 모달/다이얼로그를 닫는 함수 */
  onClose: () => void;
  /** 컴포넌트 타입 (디버깅용) */
  componentType?: string;
}

// 전역 히스토리 스택 관리 (중첩된 모달/시트 처리용)
const historyStack: Array<{ componentId: string; onClose: () => void }> = [];

// 전역 단일 popstate 핸들러
let globalPopStateHandler: ((event: PopStateEvent) => void) | null = null;

const setupGlobalPopStateHandler = () => {
  if (globalPopStateHandler) return; // 이미 설정됨

  globalPopStateHandler = (_event: PopStateEvent) => {
    // 히스토리 스택에서 가장 최근 항목(가장 위에 있는 것)만 처리
    if (historyStack.length > 0) {
      const topItem = historyStack[historyStack.length - 1];
      topItem.onClose();
      historyStack.pop();
    }
  };

  window.addEventListener('popstate', globalPopStateHandler, true);
};

// 모바일 앱에서 뒤로가기 버튼 처리용 전역 함수
// 모달/시트가 열려있으면 닫고 true 반환, 없으면 false 반환
if (typeof window !== 'undefined') {
  (window as any).closeModalIfOpen = (): boolean => {
    if (historyStack.length > 0) {
      const topItem = historyStack[historyStack.length - 1];
      topItem.onClose();
      historyStack.pop();
      // 히스토리도 정리
      if (window.history.length > 1) {
        window.history.back();
      }
      return true; // 모달이 닫혔음
    }
    return false; // 모달이 없음
  };
}

export const useMobileBackHandler = ({
  isOpen,
  onClose,
  componentType = 'Modal'
}: UseMobileBackHandlerOptions) => {
  const historyStateAddedRef = useRef(false);
  const componentIdRef = useRef(`${componentType.toLowerCase()}-${Math.random().toString(36).substr(2, 9)}`);
  const onCloseRef = useRef(onClose);
  const isMobileRef = useRef(window.innerWidth < 1440);
  
  // 컴포넌트 언마운트 시 정리 함수
  const cleanupFromStack = () => {
    if (historyStateAddedRef.current) {
      historyStateAddedRef.current = false;
      // 스택에서 제거
      const index = historyStack.findIndex(item => item.componentId === componentIdRef.current);
      if (index !== -1) {
        historyStack.splice(index, 1);
      }
      // 히스토리 제거
      if (window.history.state?.componentId === componentIdRef.current) {
        window.history.back();
      }
    }
  };
  
  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      cleanupFromStack();
    };
  }, []);
  
  // onClose를 항상 최신 값으로 유지
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  
  // 모바일 여부 업데이트
  useEffect(() => {
    const checkIsMobile = () => {
      isMobileRef.current = window.innerWidth < 1440;
    };
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);
  
  // 모바일 뒤로가기 처리
  useEffect(() => {
    if (!isOpen || !isMobileRef.current) {
      // 닫혔을 때 정리
      cleanupFromStack();
      return;
    }

    // 열렸을 때 히스토리 추가
    if (!historyStateAddedRef.current) {
      window.history.pushState({ componentId: componentIdRef.current }, '');
      historyStateAddedRef.current = true;
      // 스택에 추가 (가장 최근 것)
      historyStack.push({ 
        componentId: componentIdRef.current, 
        onClose: () => onCloseRef.current() 
      });
      // 전역 핸들러 설정 (한 번만)
      setupGlobalPopStateHandler();
    } else {
      // 이미 스택에 있는 경우 onClose 함수만 업데이트
      const index = historyStack.findIndex(item => item.componentId === componentIdRef.current);
      if (index !== -1) {
        historyStack[index].onClose = () => onCloseRef.current();
      }
    }
  }, [isOpen]);

  return {
    isMobile: isMobileRef.current,
    componentId: componentIdRef.current
  };
};
