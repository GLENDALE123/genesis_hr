/**
 * 워크스페이스 채널 전용 메시지 입력 컴포넌트
 * ChatComposer와 분리하여 워크스페이스 전용 기능 제공
 */

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useImperativeHandle,
  forwardRef,
  KeyboardEvent,
} from 'react';
import { Button } from '@/shared/components/ui/button';
import { getUserDisplayName } from '@/shared/utils/userUtils';
import { extractText, extractMentionedUserIds } from '@/shared/utils/mentionUtils';
import { useMentionInput } from '@/shared/hooks/useMentionInput';
import { MentionDropdown } from '@/shared/components/common/MentionDropdown';
import type { UserProfile } from '@/features/auth/types';
import type { MessageAttachment } from '@/features/chat/types/chat.types';
import type {
  PendingUpload,
  PendingUploadPayload,
  PendingUploadProgressPayload,
} from '@/features/chat/types/pendingUpload.types';
import { Image as ImageIcon, Paperclip, X } from 'lucide-react';
import { uploadImageFilesParallel } from '@/shared/services/firebase/storage';
import type { UploadingImageItem } from '@/shared/components/common/UploadingImageGrid';

interface UserWithUid extends UserProfile {
  uid: string;
  displayName?: string;
  name?: string;
}

interface ChannelMessageComposerProps {
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
  uploadFolder?: string;
  attachments: UploadingImageItem[];
  onAttachmentsChange: (items: UploadingImageItem[]) => void;
  onUploadingStateChange?: (uploading: boolean) => void;
  onPendingUploadStart?: (payload: PendingUploadPayload) => void;
  onUploadProgress?: (payload: PendingUploadProgressPayload) => void;
  onUploadComplete?: (payload: { id: string }) => void;
  onUploadError?: (payload: { id: string; error: Error }) => void;
}


export interface ChannelMessageComposerHandle {
  retryPendingUpload: (pending: PendingUpload) => Promise<void>;
}

const computeDynamicTimeout = (files: File[]): number => {
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  const totalMegabytes = totalBytes / (1024 * 1024);
  const baseTimeout = 60_000; // 60초
  const sizeTimeout = Math.max(totalMegabytes * 10_000, 30_000); // 용량당 10초, 최소 30초
  const maxTimeout = 300_000; // 최대 5분
  return Math.min(baseTimeout + sizeTimeout, maxTimeout);
};

export const ChannelMessageComposer = forwardRef<ChannelMessageComposerHandle, ChannelMessageComposerProps>(({ 
  onSubmit,
  placeholder = '메시지를 입력하세요...',
  disabled = false,
  users,
  currentUserUid,
  replyTo,
  replyToUser,
  onCancelReply,
  uploadFolder = 'workspace/messages',
  attachments,
  onAttachmentsChange,
  onUploadingStateChange,
  onPendingUploadStart,
  onUploadProgress,
  onUploadComplete,
  onUploadError,
}, ref) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [currentText, setCurrentText] = useState('');

  const editorRef = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // 멘션 입력 훅 사용
  const {
    showMentionList,
    mentionedUsers,
    filteredUsers,
    mentionListRef,
    selectedMentionIndex,
    insertMention,
    handleInput: handleMentionInput,
    handleKeyDown: handleMentionKeyDown,
    setMentionedUsers,
  } = useMentionInput({
    users,
    currentUserUid,
    editorRef,
  });

  useEffect(() => {
    onUploadingStateChange?.(isUploading);
  }, [isUploading, onUploadingStateChange]);

  const performAttachmentUpload = useCallback(
    async ({
      attachmentsSnapshot,
      pendingUploadId,
      text,
      mentionedUserIds,
      isRetry = false,
    }: {
      attachmentsSnapshot: UploadingImageItem[];
      pendingUploadId: string;
      text: string;
      mentionedUserIds: string[];
      isRetry?: boolean;
    }): Promise<MessageAttachment[]> => {
      const files: File[] = [];
      attachmentsSnapshot.forEach((item) => {
        if (!item.file) {
          throw new Error('이미지 파일을 불러오지 못했습니다. 다시 시도해 주세요.');
        }
        files.push(item.file);
      });

      if (files.length === 0) {
        return [];
      }

      const controller = new AbortController();
      const timeoutMs = computeDynamicTimeout(files);
      const timeoutAt = Date.now() + timeoutMs;
      const totalBytes = files.reduce((sum, file) => sum + file.size, 0);

      onPendingUploadStart?.({
        id: pendingUploadId,
        attachments: attachmentsSnapshot,
        text,
        mentionedUserIds,
        controller,
        timeoutAt,
        totalBytes,
        isRetry,
      });

      onUploadProgress?.({
        id: pendingUploadId,
        completed: 0,
        total: attachmentsSnapshot.length,
        timestamp: Date.now(),
      });

      try {
        const urls = await uploadImageFilesParallel(
          files,
          `${uploadFolder}/${Date.now()}`,
          (progress) => {
            const now = Date.now();
            const totalCount = attachmentsSnapshot.length;
            const estimatedCompleted = Math.round((progress / 100) * totalCount);
            onUploadProgress?.({
              id: pendingUploadId,
              completed: Math.min(totalCount, estimatedCompleted),
              total: totalCount,
              timestamp: now,
            });
          },
          controller.signal
        );

        return attachmentsSnapshot.map((item, index) => {
          const file = files[index];
          const url = urls[index];
          const id =
            typeof crypto !== 'undefined' && crypto.randomUUID
              ? crypto.randomUUID()
              : `${Date.now()}-${index}`;
          return {
            id,
            type: 'image' as const,
            url,
            name: file.name,
            size: file.size,
            mimeType: file.type,
            thumbnailUrl: url,
          };
        });
      } catch (error) {
        const err = error instanceof Error ? error : new Error('이미지 업로드에 실패했습니다.');
        onUploadError?.({ id: pendingUploadId, error: err });
        throw err;
      }
    },
    [uploadFolder, onPendingUploadStart, onUploadProgress, onUploadError]
  );

  const handleSubmit = async () => {
    if (!editorRef.current || disabled || isUploading) return;

    const html = editorRef.current.innerHTML;
    const text = extractText(html).trim();

    if (!text && attachments.length === 0) return;

    const mentionedUserIds = extractMentionedUserIds(html);
    const attachmentsSnapshot = attachments.slice();

    const clearComposer = () => {
      if (editorRef.current) {
        editorRef.current.innerHTML = '';
      }
      setCurrentText('');
      setMentionedUsers([]);
      setShowMentionList(false);
      if (onCancelReply) {
        onCancelReply();
      }
    };

    if (attachmentsSnapshot.length > 0) {
      const pendingUploadId =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `pending-${Date.now()}`;

      clearComposer();
      onAttachmentsChange([]);
      setIsUploading(true);
      setUploadError(null);

      let attachmentsPayload: MessageAttachment[] | null = null;

      try {
        attachmentsPayload = await performAttachmentUpload({
          attachmentsSnapshot,
          pendingUploadId,
          text,
          mentionedUserIds,
        });

        const textToSend =
          text || (attachmentsPayload.length > 0 ? '\u200B' : '');

        if (!textToSend && attachmentsPayload.length === 0) {
          throw new Error('메시지를 전송할 수 없습니다. 다시 시도해 주세요.');
        }

        await onSubmit(
          textToSend,
          mentionedUserIds,
          attachmentsPayload.length > 0 ? attachmentsPayload : undefined
        );

        onUploadComplete?.({ id: pendingUploadId });
      } catch (error) {
        const err = error instanceof Error ? error : new Error('이미지 업로드에 실패했습니다.');
        const message = err.message.toLowerCase();
        const isCancelled = message.includes('취소') || message.includes('cancel');

        if (!isCancelled) {
          setUploadError(err.message);
        }

        if (attachmentsPayload) {
          onUploadError?.({ id: pendingUploadId, error: err });
        }

        setIsUploading(false);
        return;
      }

      setIsUploading(false);
      return;
    }

    const prevMentionedUsers = [...mentionedUsers];
    const textOnlyToSend = text.trim();
    if (!textOnlyToSend) {
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      await onSubmit(textOnlyToSend, mentionedUserIds);
      clearComposer();
    } catch (error) {
      const err = error instanceof Error ? error : new Error('메시지 전송에 실패했습니다.');
      setUploadError(err.message);
      if (editorRef.current) {
        editorRef.current.innerHTML = html;
      }
      setMentionedUsers(prevMentionedUsers);
    } finally {
      setIsUploading(false);
    }
  };

  const retryPendingUpload = useCallback(
    async (pending: PendingUpload) => {
      if (disabled || isUploading) {
        throw new Error('다른 업로드가 진행 중입니다.');
      }

      setIsUploading(true);
      setUploadError(null);

      const attachmentsSnapshot = pending.attachments.slice();
      let attachmentsPayload: MessageAttachment[] | undefined;
      let uploadFinished = attachmentsSnapshot.length === 0;

      try {
        if (attachmentsSnapshot.length > 0) {
          attachmentsPayload = await performAttachmentUpload({
            attachmentsSnapshot,
            pendingUploadId: pending.id,
            text: pending.text,
            mentionedUserIds: pending.mentionedUserIds,
            isRetry: true,
          });
          uploadFinished = true;
        }

        const textToSend =
          pending.text ||
          (attachmentsPayload && attachmentsPayload.length > 0 ? '\u200B' : '');

        if (!textToSend && (!attachmentsPayload || attachmentsPayload.length === 0)) {
          throw new Error('메시지를 전송할 수 없습니다. 다시 시도해 주세요.');
        }

        await onSubmit(
          textToSend,
          pending.mentionedUserIds,
          attachmentsPayload && attachmentsPayload.length > 0 ? attachmentsPayload : undefined
        );

        onUploadComplete?.({ id: pending.id });
      } catch (error) {
        const err =
          error instanceof Error ? error : new Error('메시지 전송에 실패했습니다.');

        if (attachmentsSnapshot.length > 0 && uploadFinished) {
          onUploadError?.({ id: pending.id, error: err });
        } else if (attachmentsSnapshot.length === 0) {
          setUploadError(err.message);
        }

        throw err;
      } finally {
        setIsUploading(false);
      }
    },
    [
      disabled,
      isUploading,
      performAttachmentUpload,
      onSubmit,
      onUploadComplete,
      onUploadError,
    ]
  );

  useImperativeHandle(
    ref,
    () => ({
      retryPendingUpload,
    }),
    [retryPendingUpload]
  );

  const handleInput = () => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    const textContent = extractText(html);
    setCurrentText(textContent);
    handleMentionInput();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    handleMentionKeyDown(e, handleSubmit);
  };

  useEffect(() => {
    if (replyToUser && editorRef.current) {
      const existingMention = editorRef.current.querySelector('.mention');
      if (!existingMention || editorRef.current.textContent?.trim() === '') {
        const mentionSpan = document.createElement('span');
        mentionSpan.className = 'mention';
        mentionSpan.setAttribute('contenteditable', 'false');
        mentionSpan.setAttribute('data-user-id', replyToUser.uid || '');
        mentionSpan.setAttribute('data-display-name', replyToUser.displayName || '');
        mentionSpan.textContent = `@${replyToUser.displayName}`;

        mentionSpan.style.cssText = `
          color: hsl(var(--primary));
          font-weight: 500;
        `;

        editorRef.current.innerHTML = '';
        editorRef.current.appendChild(mentionSpan);
        editorRef.current.appendChild(document.createTextNode(' '));

        const range = document.createRange();
        const selection = window.getSelection();
        const spaceNode = mentionSpan.nextSibling;

        if (spaceNode) {
          range.setStart(spaceNode, 1);
          range.collapse(true);
          selection?.removeAllRanges();
          selection?.addRange(range);
        }

        setMentionedUsers([
          {
            id: replyToUser.uid || '',
            displayName: replyToUser.displayName || '',
            uid: replyToUser.uid || '',
          },
        ]);

        editorRef.current.focus();
      }
    }
  }, [replyToUser]);

  useEffect(() => {
    if (showMentionList && mentionListRef.current && selectedMentionIndex >= 0) {
      const activeItem = mentionListRef.current.children[selectedMentionIndex] as HTMLElement;
      activeItem?.scrollIntoView({ block: 'nearest' });
    }
  }, [showMentionList, selectedMentionIndex]);

  const handleImageSelect = (files: FileList | null) => {
    if (!files) return;
    const nextImages: UploadingImageItem[] = Array.from(files)
      .filter((file) => file.type.startsWith('image/'))
      .map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      }));

    if (nextImages.length > 0) {
      onAttachmentsChange([...attachments, ...nextImages]);
    }

    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const handleRemoveMention = (userId: string) => {
    setMentionedUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  return (
    <div className="flex items-end gap-2.5">
      <div className="flex-1 relative">
        {replyTo && onCancelReply && (
          <div className="mb-2 p-2 bg-muted/50 rounded-md flex items-center justify-between">
            <span className="text-xs text-muted-foreground">@{replyTo}에게 답글</span>
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

        <div
          ref={editorRef}
          contentEditable={!disabled && !isUploading}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          className="w-full min-h-[72px] max-h-[300px] p-3 border border-border rounded-md bg-background text-foreground text-lg font-medium focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring overflow-y-auto"
          style={{
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
          }}
          data-placeholder={replyTo ? `@${replyTo}에게 답글...` : placeholder}
          suppressContentEditableWarning
        />

        {showMentionList && filteredUsers.length > 0 && (
          <MentionDropdown
            users={filteredUsers}
            selectedIndex={selectedMentionIndex}
            onSelect={insertMention}
            mentionListRef={mentionListRef}
          />
        )}

        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => imageInputRef.current?.click()}
              disabled={disabled || isUploading}
              aria-label="이미지 첨부"
            >
              <ImageIcon className="h-5 w-5" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => {
                // 파일 첨부 로직 필요 시 확장
              }}
              disabled={disabled || isUploading}
              aria-label="파일 첨부"
            >
              <Paperclip className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex items-center gap-1">
            {!disabled &&
              mentionedUsers.map((user) => (
                <span
                  key={user.id}
                  className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs text-primary"
                >
                  @{user.displayName}
                  <button
                    type="button"
                    className="text-primary/70 hover:text-primary"
                    onClick={() => handleRemoveMention(user.id)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            <Button
              type="button"
              size="sm"
              onClick={handleSubmit}
              disabled={
                disabled ||
                isUploading ||
                (currentText.trim().length === 0 && attachments.length === 0)
              }
            >
              {isUploading ? '업로드 중...' : '전송'}
            </Button>
          </div>
        </div>
      </div>
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => handleImageSelect(event.target.files)}
      />
    </div>
  );
});

ChannelMessageComposer.displayName = 'ChannelMessageComposer';
