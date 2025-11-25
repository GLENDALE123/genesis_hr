/**
 * 전역 스크롤바 스타일링 유틸리티
 * ScrollArea 컴포넌트와 동일한 스타일을 모든 스크롤 영역에 적용
 * 호버 시 스크롤바 너비 확장 기능 포함
 */

let cleanupFunctions: (() => void)[] = [];

/**
 * 스크롤바 스타일을 동적으로 적용하는 함수
 * 호버 시 스크롤바 너비 확장 기능 포함
 */
export const applyGlobalScrollbarStyles = () => {
  // 이미 적용되었는지 확인
  if (document.getElementById('global-scrollbar-styles')) {
    return;
  }

  const style = document.createElement('style');
  style.id = 'global-scrollbar-styles';
  style.textContent = `
    /* Firefox - 얇은 스크롤바 */
    * {
      scrollbar-width: thin !important;
      scrollbar-color: hsl(var(--muted-foreground) / 0.2) transparent !important;
    }

    /* Chrome, Edge, Safari - 기본 스타일 */
    *::-webkit-scrollbar {
      width: var(--scrollbar-width, 0.375rem) !important; /* 6px - w-1.5 */
      height: var(--scrollbar-height, 0.375rem) !important;
      transition: width 200ms ease-in-out, height 200ms ease-in-out !important;
    }

    *::-webkit-scrollbar-track {
      background: transparent !important;
    }

    *::-webkit-scrollbar-thumb {
      background-color: hsl(var(--muted-foreground) / 0.2) !important;
      border-radius: 9999px !important;
      border: none !important;
      transition: background-color 200ms ease-in-out !important;
    }

    *::-webkit-scrollbar-thumb:hover {
      background-color: hsl(var(--muted-foreground) / 0.4) !important;
    }

    /* ScrollArea 컴포넌트는 전역 스타일보다 우선 적용 */
    [data-radix-scroll-area-viewport] {
      scrollbar-width: none !important;
      -ms-overflow-style: none !important;
    }

    [data-radix-scroll-area-viewport]::-webkit-scrollbar {
      display: none !important;
    }
  `;

  document.head.appendChild(style);

  // 모든 스크롤 가능한 요소에 호버 클래스 추가 및 이벤트 리스너
  const addHoverClass = () => {
    const scrollableElements = document.querySelectorAll(
      '[class*="overflow-y-auto"], [class*="overflow-x-auto"], [class*="overflow-auto"], [style*="overflow-y: auto"], [style*="overflow-x: auto"], [style*="overflow: auto"]'
    );
    
    scrollableElements.forEach((element) => {
      if (element instanceof HTMLElement) {
        // ScrollArea 컴포넌트는 제외
        if (element.closest('[data-radix-scroll-area-root]')) {
          return;
        }

        if (!element.classList.contains('scrollbar-hover-container')) {
          element.classList.add('scrollbar-hover-container');
        }

        // 호버 이벤트로 스크롤바 너비 확장 (CSS만으로는 불가능하므로 JavaScript 사용)
        const handleMouseEnter = () => {
          element.style.setProperty('--scrollbar-width', '0.5rem'); // 8px - w-2
          element.style.setProperty('--scrollbar-height', '0.5rem');
        };

        const handleMouseLeave = () => {
          element.style.setProperty('--scrollbar-width', '0.375rem'); // 6px - w-1.5
          element.style.setProperty('--scrollbar-height', '0.375rem');
        };

        element.addEventListener('mouseenter', handleMouseEnter);
        element.addEventListener('mouseleave', handleMouseLeave);

        cleanupFunctions.push(() => {
          element.removeEventListener('mouseenter', handleMouseEnter);
          element.removeEventListener('mouseleave', handleMouseLeave);
        });
      }
    });
  };

  // 초기 적용
  if (document.body) {
    addHoverClass();
  } else {
    // DOM이 준비되지 않았으면 대기
    const observer = new MutationObserver(() => {
      if (document.body) {
        addHoverClass();
        observer.disconnect();
      }
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  // MutationObserver로 동적으로 추가되는 요소에도 적용
  const observer = new MutationObserver(() => {
    addHoverClass();
  });
  
  if (document.body) {
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  cleanupFunctions.push(() => {
    observer.disconnect();
  });
};

/**
 * 스크롤바 스타일 제거 함수
 */
export const removeGlobalScrollbarStyles = () => {
  // 모든 cleanup 함수 실행
  cleanupFunctions.forEach((cleanup) => cleanup());
  cleanupFunctions = [];

  const styleElement = document.getElementById('global-scrollbar-styles');
  if (styleElement) {
    styleElement.remove();
  }
};

