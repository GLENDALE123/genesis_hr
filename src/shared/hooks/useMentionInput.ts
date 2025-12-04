/**
 * 멘션 입력 처리 훅
 */

import { useState, useRef, useEffect, KeyboardEvent, useCallback } from 'react';
import { getUserDisplayName } from '@/shared/utils/userUtils';
import { filterUsersForMention } from '@/shared/utils/mentionUtils';
import type { UserProfile } from '@/features/auth/types';

interface UserWithUid extends UserProfile {
  uid: string;
  displayName?: string;
  name?: string;
}

interface MentionUser {
  id: string;
  displayName: string;
  uid: string;
}

interface UseMentionInputOptions {
  users: UserWithUid[];
  currentUserUid?: string;
  editorRef: React.RefObject<HTMLDivElement | null>;
  onMentionInserted?: (user: MentionUser) => void;
}

export const useMentionInput = ({
  users,
  currentUserUid,
  editorRef,
  onMentionInserted,
}: UseMentionInputOptions) => {
  const [showMentionList, setShowMentionList] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [mentionedUsers, setMentionedUsers] = useState<MentionUser[]>([]);
  const mentionListRef = useRef<HTMLDivElement | null>(null);

  // 필터링된 사용자 목록
  const filteredUsers = filterUsersForMention(
    users,
    mentionSearch,
    currentUserUid,
    (user) => getUserDisplayName(user, null)
  );

  // 멘션 삽입
  const insertMention = useCallback((user: UserWithUid) => {
    if (!editorRef.current) return;

    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) {
      // 포커스를 복원하고 다시 시도
      editorRef.current.focus();
      setTimeout(() => {
        const newSelection = window.getSelection();
        if (newSelection && newSelection.rangeCount > 0) {
          insertMentionWithSelection(user, newSelection);
        }
      }, 0);
      return;
    }
    
    insertMentionWithSelection(user, selection);
  }, [editorRef]);

  // Selection을 이용한 멘션 삽입
  const insertMentionWithSelection = (user: UserWithUid, selection: Selection) => {
    if (!editorRef.current) return;

    const range = selection.getRangeAt(0);
    const currentNode = range.startContainer;
    
    // @ 검색어를 찾아서 삭제
    if (currentNode.nodeType === Node.TEXT_NODE) {
      const textContent = currentNode.textContent || '';
      const cursorPosition = range.startOffset;
      const textBeforeCursor = textContent.substring(0, cursorPosition);
      const textAfterCursor = textContent.substring(cursorPosition);
      
      // @ 패턴 찾기
      const mentionMatch = textBeforeCursor.match(/@([^\s]*)$/);
      
      if (mentionMatch) {
        const mentionStartPos = cursorPosition - mentionMatch[0].length;
        
        // @ 검색어 제거
        const newTextBefore = textContent.substring(0, mentionStartPos);
        const newTextAfter = textAfterCursor;
        
        // 텍스트 노드 업데이트
        currentNode.textContent = newTextBefore;
        
        // 멘션 span 생성
        const mentionSpan = document.createElement('span');
        mentionSpan.className = 'mention';
        mentionSpan.setAttribute('contenteditable', 'false');
        mentionSpan.setAttribute('data-user-id', user.uid || '');
        mentionSpan.setAttribute('data-display-name', getUserDisplayName(user, null) || '');
        mentionSpan.textContent = `@${getUserDisplayName(user, null)}`;
        
        // 스타일 적용 - 파란색 굵은 텍스트
        mentionSpan.style.cssText = `
          color: hsl(var(--primary));
          font-weight: 500;
        `;
        
        // 멘션 삽입
        if (currentNode.parentNode) {
          currentNode.parentNode.insertBefore(mentionSpan, currentNode.nextSibling);
          
          // 공백과 나머지 텍스트 추가
          const spaceNode = document.createTextNode(' ' + newTextAfter);
          currentNode.parentNode.insertBefore(spaceNode, mentionSpan.nextSibling);
          
          // 커서를 멘션 뒤로 이동
          const newRange = document.createRange();
          newRange.setStart(spaceNode, 1); // 공백 다음
          newRange.collapse(true);
          
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
      }
    }

    // 멘션된 사용자 추가
    const newMentionUser: MentionUser = {
      id: user.uid || '',
      displayName: getUserDisplayName(user, null) || '',
      uid: user.uid || '',
    };
    
    if (!mentionedUsers.find(u => u.id === newMentionUser.id)) {
      setMentionedUsers(prev => [...prev, newMentionUser]);
      onMentionInserted?.(newMentionUser);
    }

    // 멘션 리스트 닫기
    setShowMentionList(false);
    setMentionSearch('');
    
    // 포커스 유지
    editorRef.current?.focus();
  };

  // 입력 처리
  const handleInput = useCallback(() => {
    if (!editorRef.current) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const textBeforeCursor = range.startContainer.textContent?.slice(0, range.startOffset) || '';
    
    // @ 입력 감지
    const mentionMatch = textBeforeCursor.match(/@([^\s]*)$/);
    
    if (mentionMatch) {
      setMentionSearch(mentionMatch[1]);
      setShowMentionList(true);
      setSelectedMentionIndex(0);
    } else {
      setShowMentionList(false);
      setMentionSearch('');
    }
  }, [editorRef]);

  // 키 입력 처리
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>, onSubmit?: () => void) => {
    // 멘션 리스트가 열려있을 때
    if (showMentionList) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMentionIndex(prev => 
          prev < filteredUsers.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMentionIndex(prev => 
          prev > 0 ? prev - 1 : filteredUsers.length - 1
        );
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (filteredUsers[selectedMentionIndex]) {
          insertMention(filteredUsers[selectedMentionIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowMentionList(false);
        setMentionSearch('');
      }
      return;
    }

    // 일반 입력 처리
    if (e.key === 'Enter' && !e.shiftKey && onSubmit) {
      e.preventDefault();
      onSubmit();
    }
  }, [showMentionList, filteredUsers, selectedMentionIndex, insertMention]);

  // 멘션 리스트 스크롤
  useEffect(() => {
    if (mentionListRef.current) {
      const selectedElement = mentionListRef.current.children[selectedMentionIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedMentionIndex]);

  return {
    showMentionList,
    mentionSearch,
    selectedMentionIndex,
    mentionedUsers,
    filteredUsers,
    mentionListRef,
    insertMention,
    handleInput,
    handleKeyDown,
    setMentionedUsers,
    setShowMentionList,
  };
};

