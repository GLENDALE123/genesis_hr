/**
 * 채팅 입력 컴포넌트
 * 멘션 기능이 포함된 contentEditable 기반 입력 필드
 */

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/shared/components/ui/button';
import type { UserProfile } from '@/features/auth/types';
import { extractText, extractMentionedUserIds } from '@/shared/utils/mentionUtils';

// 첨부파일 타입 정의
interface MessageAttachment {
  id: string;
  type: 'image' | 'file';
  url: string;
  name: string;
  size: number;
  mimeType: string;
}
import { useMentionInput } from '@/shared/hooks/useMentionInput';
import { MentionDropdown } from './MentionDropdown';
import { getUserDisplayName } from '@/shared/utils/user/userUtils';

interface UserWithUid extends UserProfile {
  uid: string;
  displayName?: string;
  name?: string;
}

interface ChatInputProps {
  onSubmit: (
    text: string,
    mentionedUserIds?: string[],
    attachments?: MessageAttachment[]
  ) => Promise<void> | void;
  placeholder?: string;
  disabled?: boolean;
  users: UserWithUid[];
  currentUserUid?: string;
  replyTo?: string | null;
  replyToUser?: UserWithUid | null;
  onCancelReply?: () => void;
  onAttachImage?: () => void;
  onAttachFile?: () => void;
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
  onAttachImage,
  onAttachFile,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // 멘션 입력 훅 사용
  const {
    showMentionList,
    mentionedUsers,
    filteredUsers,
    mentionListRef,
    insertMention,
    handleInput,
    handleKeyDown,
    setMentionedUsers,
  } = useMentionInput({
    users,
    currentUserUid,
    editorRef,
  });

  // 제출 처리
  const handleSubmit = async () => {
    if (!editorRef.current || disabled) return;
    
    const html = editorRef.current.innerHTML;
    const text = extractText(html);
    
    if (!text.trim()) return;
    
    const mentionedUserIds = extractMentionedUserIds(html);
    
    try {
      setIsUploading(true);
      setUploadError(null);
      await onSubmit(text.trim(), mentionedUserIds);
    
      editorRef.current.innerHTML = '';
      setMentionedUsers([]);
    
      if (onCancelReply) {
        onCancelReply();
      }
    } catch (error) {
      console.error('Failed to submit chat message:', error);
      setUploadError(error instanceof Error ? error.message : '메시지 전송에 실패했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageSelect = (files: FileList | null) => {
    if (!files) return;
    onAttachImage?.();
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
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
  }, [replyToUser, setMentionedUsers]);

  useEffect(() => {
    editorRef.current?.focus();
  }, []);

  return (
    <div className="flex items-end gap-2.5">
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

        {uploadError && (
          <div className="mb-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {uploadError}
          </div>
        )}

        {/* contentEditable 입력창 */}
        <div
          ref={editorRef}
          contentEditable={!disabled}
          onInput={handleInput}
          onKeyDown={(e) => handleKeyDown(e, handleSubmit)}
          className="w-full min-h-[72px] max-h-[300px] p-3 border border-border rounded-md bg-background text-foreground text-lg font-medium focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring overflow-y-auto"
          style={{
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
          }}
          data-placeholder={replyTo ? `@${replyTo}에게 답글...` : placeholder}
          suppressContentEditableWarning
        />

        {/* 멘션 드롭다운 */}
        {showMentionList && filteredUsers.length > 0 && (
          <MentionDropdown
            users={filteredUsers}
            selectedIndex={0}
            onSelect={insertMention}
            mentionListRef={mentionListRef}
          />
        )}

        {/* 액션 버튼 */}
        <div className="mt-2 flex items-center justify-end gap-2">
          <Button
            type="button"
            size="sm"
            onClick={handleSubmit}
            disabled={disabled || isUploading}
          >
            {isUploading ? '업로드 중...' : '전송'}
          </Button>
        </div>

        {/* placeholder 스타일 */}
        <style>{`
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
