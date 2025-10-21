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
  
  // 모바일 환경 감지 (리사이즈에 반응)
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);
  
  // 모바일 뒤로가기 처리 (모바일 환경에서만)
  useEffect(() => {
    if (!isOpen || !isMobile) {
      setHistoryStateAdded(false);
      return;
    }

    const handlePopState = (event: PopStateEvent) => {
      // 모달이 열려있고, 히스토리 상태가 이 컴포넌트와 관련된 경우에만 닫기
      if (isOpen && event.state?.componentId === componentId.current) {
        console.log(`🔍 [${componentType}] 모바일 뒤로가기로 인한 모달 닫기:`, componentId.current);
        onClose();
      }
    };

    // 히스토리에 상태 추가 (모달이 열렸음을 표시) - 한 번만 실행
    if (!historyStateAdded) {
      window.history.pushState({ componentId: componentId.current }, '');
      setHistoryStateAdded(true);
      console.log(`📱 [${componentType}] 히스토리 상태 추가:`, componentId.current);
    }
    
    // popstate 이벤트 리스너 추가
    window.addEventListener('popstate', handlePopState);

    return () => {
      // 정리 함수에서 이벤트 리스너 제거
      window.removeEventListener('popstate', handlePopState);
      
      // 모달이 닫힐 때 히스토리 상태 정리
      if (window.history.state?.componentId === componentId.current && historyStateAdded) {
        window.history.back();
        console.log(`🧹 [${componentType}] 히스토리 상태 정리:`, componentId.current);
      }
    };
  }, [isOpen, onClose, historyStateAdded, isMobile, componentType]);

  return {
    isMobile,
    componentId: componentId.current
  };
};
