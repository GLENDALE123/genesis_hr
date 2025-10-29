import { useEffect, useCallback, useState } from 'react';

/**
 * 요소 선택 모드 (마우스 오버 시 하이라이트)
 */
export const useElementCapture = () => {
  const [isSelecting, setIsSelecting] = useState(false);

  // 요소 선택 모드 활성화
  const startElementCapture = useCallback(() => {
    setIsSelecting(true);
  }, []);

  // 요소 선택 모드 비활성화
  const stopElementCapture = useCallback(() => {
    setIsSelecting(false);
  }, []);

  // 특정 요소 캡처
  const captureElement = useCallback(async (element: HTMLElement) => {
    if (!(window as any).electron?.window.captureElement) {
      console.error('captureElement API not available');
      return { success: false, error: 'API not available' };
    }

    // 요소에 ID가 없으면 임시로 추가
    let selector = element.id;
    if (!selector) {
      // 요소의 경로를 따라 고유한 선택자 생성
      const path = [];
      let current: HTMLElement | null = element;
      
      while (current && current !== document.body) {
        let selector = current.tagName.toLowerCase();
        if (current.id) {
          selector += `#${current.id}`;
          path.unshift(selector);
          break;
        } else if (current.className) {
          const classes = current.className.split(' ').filter(c => c).slice(0, 2);
          if (classes.length > 0) {
            selector += `.${classes.join('.')}`;
          }
        }
        
        const index = Array.from(current.parentElement?.children || []).indexOf(current);
        path.unshift(`${selector}:nth-child(${index + 1})`);
        current = current.parentElement;
      }
      
      selector = path.join(' > ');
    }

    return await (window as any).electron.window.captureElement(selector);
  }, []);

  useEffect(() => {
    if (!isSelecting) {
      // 모든 하이라이트 제거
      document.querySelectorAll('[data-capture-highlight]').forEach(el => {
        el.removeAttribute('data-capture-highlight');
        (el as HTMLElement).style.outline = '';
      });
      return;
    }

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      // 이미 하이라이트된 요소는 제외
      if (target.hasAttribute('data-capture-highlight')) return;

      // 모든 하이라이트 제거
      document.querySelectorAll('[data-capture-highlight]').forEach(el => {
        el.removeAttribute('data-capture-highlight');
        (el as HTMLElement).style.outline = '';
      });

      // 현재 요소 하이라이트
      target.setAttribute('data-capture-highlight', 'true');
      target.style.outline = '3px solid #007acc';
      target.style.outlineOffset = '2px';
      target.style.cursor = 'crosshair';
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      // 하이라이트된 요소일 때만
      if (target.hasAttribute('data-capture-highlight')) {
        target.style.outline = '';
        target.style.cursor = '';
      }
    };

    const handleClick = async (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const target = e.target as HTMLElement;
      if (!target) return;

      // 자신 제외
      if (target.closest('[role="button"]') || target.closest('button')) {
        return;
      }

      setIsSelecting(false);

      // 캡처 실행
      await captureElement(target);
    };

    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);
    document.addEventListener('click', handleClick, true);

    return () => {
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
      document.removeEventListener('click', handleClick, true);
      
      // 모든 하이라이트 제거
      document.querySelectorAll('[data-capture-highlight]').forEach(el => {
        el.removeAttribute('data-capture-highlight');
        (el as HTMLElement).style.outline = '';
      });
    };
  }, [isSelecting, captureElement]);

  return {
    isSelecting,
    startElementCapture,
    stopElementCapture,
    captureElement,
  };
};

