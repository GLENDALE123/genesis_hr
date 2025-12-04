/**
 * 키보드 단축키 훅
 * 슬랙/디스코드 스타일의 키보드 단축키 지원
 */

import { useEffect, useCallback } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  action: () => void;
  description?: string;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      shortcuts.forEach((shortcut) => {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = shortcut.ctrl ? event.ctrlKey : !event.ctrlKey;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatch = shortcut.alt ? event.altKey : !event.altKey;
        const metaMatch = shortcut.meta ? event.metaKey : !event.metaKey;

        if (keyMatch && ctrlMatch && shiftMatch && altMatch && metaMatch) {
          event.preventDefault();
          shortcut.action();
        }
      });
    },
    [shortcuts]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}

// 일반적인 단축키 정의
export const COMMON_SHORTCUTS = {
  // 메시지 전송
  SEND_MESSAGE: {
    key: 'Enter',
    description: '메시지 전송',
  },
  SEND_MESSAGE_NEW_LINE: {
    key: 'Enter',
    shift: true,
    description: '새 줄',
  },
  // 검색
  SEARCH: {
    key: 'k',
    ctrl: true,
    description: '검색',
  },
  // 채널 이동
  NEXT_CHANNEL: {
    key: 'ArrowDown',
    alt: true,
    description: '다음 채널',
  },
  PREV_CHANNEL: {
    key: 'ArrowUp',
    alt: true,
    description: '이전 채널',
  },
  // 스레드
  OPEN_THREAD: {
    key: 't',
    ctrl: true,
    description: '스레드 열기',
  },
  // 멘션
  MENTION: {
    key: '@',
    description: '멘션',
  },
  // 이모지
  EMOJI: {
    key: ':',
    description: '이모지 선택기',
  },
};


