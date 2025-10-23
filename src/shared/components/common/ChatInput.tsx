'use client';

import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Avatar, AvatarFallback } from '@/shared/components/ui/avatar';
import { getUserDisplayName, getUserInitial } from '@/shared/utils/userUtils';
import type { UserProfile } from '@/features/auth/types';

interface ChatInputProps {
  onSubmit: (text: string, mentionedUserIds?: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  users: UserProfile[];
  currentUserUid?: string;
  replyTo?: string | null;
  replyToUser?: UserProfile | null;
  onCancelReply?: () => void;
}

interface MentionUser {
  id: string;
  displayName: string;
  uid: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSubmit,
  placeholder = '메시지를 입력하세요...',
  disabled = false,
  users,
  currentUserUid,
  replyTo,
  replyToUser,
  onCancelReply,
}) => {
  const [showMentionList, setShowMentionList] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [mentionedUsers, setMentionedUsers] = useState<MentionUser[]>([]);
  
  const editorRef = useRef<HTMLDivElement>(null);
  const mentionListRef = useRef<HTMLDivElement>(null);

  // @ 뒤의 텍스트로 사용자 필터링 (자기 자신 제외)
  const filteredUsers = users.filter(user => 
    user.uid !== currentUserUid && // 자기 자신 제외
    getUserDisplayName(user, null)?.toLowerCase().includes(mentionSearch.toLowerCase())
  ).slice(0, 5); // 최대 5명만 표시

  // 텍스트 추출 (HTML -> @[DisplayName](UID) 형태)
  const extractText = (html: string): string => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // 멘션 태그를 @[DisplayName](UID) 형태로 변환
    const mentions = tempDiv.querySelectorAll('.mention');
    mentions.forEach(mention => {
      const displayName = mention.getAttribute('data-display-name');
      const userId = mention.getAttribute('data-user-id');
      if (displayName && userId) {
        mention.textContent = `@[${displayName}](${userId})`;
      } else if (displayName) {
        mention.textContent = `@${displayName}`;
      }
    });
    
    return tempDiv.textContent || '';
  };

  // 멘션된 사용자 ID 추출
  const extractMentionedUserIds = (html: string): string[] => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    const mentions = tempDiv.querySelectorAll('.mention');
    const userIds: string[] = [];
    
    mentions.forEach(mention => {
      const userId = mention.getAttribute('data-user-id');
      if (userId && !userIds.includes(userId)) {
        userIds.push(userId);
      }
    });
    
    return userIds;
  };

  // 제출 처리
  const handleSubmit = () => {
    if (!editorRef.current || disabled) return;
    
    const html = editorRef.current.innerHTML;
    const text = extractText(html);
    
    if (!text.trim()) return;
    
    const mentionedUserIds = extractMentionedUserIds(html);
    
    onSubmit(text.trim(), mentionedUserIds);
    
    // 입력창 초기화
    editorRef.current.innerHTML = '';
    setMentionedUsers([]);
    setShowMentionList(false);
    
    // 답글 취소 (replyToUser 초기화)
    if (onCancelReply) {
      onCancelReply();
    }
  };

  // 키 입력 처리
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // 입력 처리
  const handleInput = () => {
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
  };

  // 멘션 삽입
  const insertMention = (user: UserProfile) => {
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
  };

  // Selection을 이용한 멘션 삽입
  const insertMentionWithSelection = (user: UserProfile, selection: Selection) => {
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
    }

    // 멘션 리스트 닫기
    setShowMentionList(false);
    setMentionSearch('');
    
    // 포커스 유지
    editorRef.current?.focus();
  };

  // 답글 시 자동 멘션
  useEffect(() => {
    if (replyToUser && editorRef.current) {
      // 이미 멘션이 있는지 확인
      const existingMention = editorRef.current.querySelector('.mention');
      if (!existingMention || editorRef.current.textContent?.trim() === '') {
        // 자동으로 멘션 삽입
        const mentionSpan = document.createElement('span');
        mentionSpan.className = 'mention';
        mentionSpan.setAttribute('contenteditable', 'false');
        mentionSpan.setAttribute('data-user-id', replyToUser.uid || '');
        mentionSpan.setAttribute('data-display-name', replyToUser.displayName || '');
        mentionSpan.textContent = `@${replyToUser.displayName}`;
        
        // 스타일 적용
        mentionSpan.style.cssText = `
          color: hsl(var(--primary));
          font-weight: 500;
        `;
        
        // 멘션 삽입
        editorRef.current.innerHTML = '';
        editorRef.current.appendChild(mentionSpan);
        editorRef.current.appendChild(document.createTextNode(' '));
        
        // 커서를 멘션 뒤로 이동
        const range = document.createRange();
        const selection = window.getSelection();
        const spaceNode = mentionSpan.nextSibling;
        
        if (spaceNode) {
          range.setStart(spaceNode, 1);
          range.collapse(true);
          selection?.removeAllRanges();
          selection?.addRange(range);
        }
        
        // 멘션된 사용자 추가
        setMentionedUsers([{
          id: replyToUser.uid || '',
          displayName: replyToUser.displayName || '',
          uid: replyToUser.uid || '',
        }]);
        
        // 포커스
        editorRef.current.focus();
      }
    }
  }, [replyToUser]);

  // 멘션 리스트 스크롤
  useEffect(() => {
    if (mentionListRef.current) {
      const selectedElement = mentionListRef.current.children[selectedMentionIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedMentionIndex]);

  return (
    <div className="flex items-start gap-2.5">
      <Avatar className="w-8 h-8">
        <AvatarFallback className="bg-muted" />
      </Avatar>
      
      <div className="flex-1 relative">
        {/* 답글 표시 */}
        {replyTo && onCancelReply && (
          <div className="mb-2 p-2 bg-muted/50 rounded-md flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              @{replyTo}에게 답글
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCancelReply}
              className="h-6 w-6 p-0"
            >
              <span className="text-xs">✕</span>
            </Button>
          </div>
        )}

        {/* contentEditable 입력창 */}
        <div
          ref={editorRef}
          contentEditable={!disabled}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          className="w-full min-h-[72px] p-3 border border-border rounded-md bg-background text-foreground text-sm font-normal focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring overflow-y-auto"
          style={{
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
          }}
          data-placeholder={replyTo ? `@${replyTo}에게 답글...` : placeholder}
          suppressContentEditableWarning
        />

        {/* 멘션 드롭다운 */}
        {showMentionList && filteredUsers.length > 0 && (
          <div
            ref={mentionListRef}
            className="absolute z-50 bottom-full mb-1 w-64 bg-popover border border-border rounded-md shadow-lg overflow-hidden"
            onMouseDown={(e) => e.preventDefault()}
          >
            <div className="max-h-60 overflow-y-auto">
              {filteredUsers.map((user, index) => (
                <div
                  key={user.uid}
                  onClick={() => insertMention(user)}
                  className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${
                    index === selectedMentionIndex
                      ? 'bg-accent text-accent-foreground'
                      : 'hover:bg-accent/50'
                  }`}
                >
                  <Avatar className="w-6 h-6">
                    <AvatarFallback className="text-xs bg-muted">
                      {getUserInitial(user, '?')}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">
                    {getUserDisplayName(user, null) || '알 수 없음'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 제출 버튼 */}
        <div className="flex justify-end mt-2">
          <Button
            type="button"
            size="sm"
            onClick={handleSubmit}
            disabled={disabled}
          >
            전송
          </Button>
        </div>

        {/* placeholder 스타일 */}
        <style jsx>{`
          [contenteditable]:empty:before {
            content: attr(data-placeholder);
            color: hsl(var(--muted-foreground));
            pointer-events: none;
            position: absolute;
          }
        `}</style>
      </div>
    </div>
  );
};

export default ChatInput;

