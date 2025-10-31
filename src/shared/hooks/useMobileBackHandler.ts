/**
 * 모바일 뒤로가기 처리를 위한 커스텀 훅
 * Dialog, AlertDialog, Sheet 등에서 사용
 */

import { useState, useEffect, useRef } from 'react';

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

// 전역 popstate 핸들러 (단일 핸들러로 관리)
let globalPopStateHandler: ((event: PopStateEvent) => void) | null = null;

const setupGlobalPopStateHandler = () => {
  if (globalPopStateHandler) return; // 이미 설정됨

  globalPopStateHandler = (_event: PopStateEvent) => {
    // 히스토리 스택에서 가장 최근 항목(가장 위에 있는 것)을 처리
    if (historyStack.length > 0) {
      const topItem = historyStack[historyStack.length - 1];
      topItem.onClose();
      historyStack.pop(); // 스택에서 제거
    }
  };

  window.addEventListener('popstate', globalPopStateHandler);
};

export const useMobileBackHandler = ({
  isOpen,
  onClose,
  componentType = 'Modal'
}: UseMobileBackHandlerOptions) => {
  const [isMobile, setIsMobile] = useState(false);
  const [historyStateAdded, setHistoryStateAdded] = useState(false);
  const componentId = useRef(`${componentType.toLowerCase()}-${Math.random().toString(36).substr(2, 9)}`);
  
  // 모바일/태블릿 환경 감지 (리사이즈에 반응)
  useEffect(() => {
    const checkIsMobile = () => {
      // 스마트폰(<768) + 태블릿(768~1439) 모두 포함
      setIsMobile(window.innerWidth < 1440);
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);
  
  // 모바일 뒤로가기 처리 (모바일/태블릿 환경에서만)
  useEffect(() => {
    if (!isOpen || !isMobile) {
      setHistoryStateAdded(false);
      return;
    }

    // 히스토리에 상태 추가 (모달이 열렸음을 표시) - 한 번만 실행
    if (!historyStateAdded) {
      window.history.pushState({ componentId: componentId.current }, '');
      setHistoryStateAdded(true);
      // 스택에 추가 (가장 최근 것)
      historyStack.push({ componentId: componentId.current, onClose });
      // 전역 핸들러 설정 (한 번만)
      setupGlobalPopStateHandler();
    }

    return () => {
      // 스택에서 제거
      const index = historyStack.findIndex(item => item.componentId === componentId.current);
      if (index !== -1) {
        historyStack.splice(index, 1);
      }
    };
  }, [isOpen, onClose, historyStateAdded, isMobile, componentType]);

  // 사용자가 UI로 닫았을 때(열림->닫힘) 한 번만 우리가 추가한 히스토리 항목 제거
  useEffect(() => {
    if (!isOpen && historyStateAdded) {
      if (window.history.state?.componentId === componentId.current) {
        window.history.back(); // 우리 가짜 state만 한 번 제거 (URL 이동 없음)
      }
      setHistoryStateAdded(false);
      // 스택에서도 제거
      const index = historyStack.findIndex(item => item.componentId === componentId.current);
      if (index !== -1) {
        historyStack.splice(index, 1);
      }
    }
  }, [isOpen, historyStateAdded]);

  return {
    isMobile,
    componentId: componentId.current
  };
};
