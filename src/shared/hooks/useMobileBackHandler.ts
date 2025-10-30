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

    const handlePopState = (event: PopStateEvent) => {
      // 모달이 열려있고, 히스토리 상태가 이 컴포넌트와 관련된 경우에만 닫기
      if (isOpen && event.state?.componentId === componentId.current) {
        onClose();
      }
    };

    // 히스토리에 상태 추가 (모달이 열렸음을 표시) - 한 번만 실행
    if (!historyStateAdded) {
      window.history.pushState({ componentId: componentId.current }, '');
      setHistoryStateAdded(true);
    }
    
    // popstate 이벤트 리스너 추가
    window.addEventListener('popstate', handlePopState);

    return () => {
      // 정리 함수에서 이벤트 리스너 제거
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isOpen, onClose, historyStateAdded, isMobile, componentType]);

  // 사용자가 UI로 닫았을 때(열림->닫힘) 한 번만 우리가 추가한 히스토리 항목 제거
  useEffect(() => {
    if (!isOpen && historyStateAdded) {
      if (window.history.state?.componentId === componentId.current) {
        window.history.back(); // 우리 가짜 state만 한 번 제거 (URL 이동 없음)
      }
      setHistoryStateAdded(false);
    }
  }, [isOpen, historyStateAdded]);

  return {
    isMobile,
    componentId: componentId.current
  };
};
