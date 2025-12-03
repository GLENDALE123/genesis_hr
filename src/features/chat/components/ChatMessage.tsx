/**
 * 채팅 메시지 컴포넌트
 */

import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { formatChatDateTime } from '../utils/dateFormat';
import { getUserInitial } from '@/shared/utils/userUtils';
import { getUserInfo, globalUsersRef } from './UserList';
import { File, MessageSquare, MoreVertical } from 'lucide-react';
import { ImageLightbox } from '@/shared/components/common/ImageLightbox';
import { cn } from '@/shared/lib/utils';
import type { UploadingImageItem } from '@/shared/components/common/UploadingImageGrid';
import { Progress } from '@/shared/components/ui/progress';
import type { ChatMessage } from '../types/chat.types';
import type { User } from 'firebase/auth';
import { ReactionPicker } from '@/features/workspace/components/ReactionPicker';
import { ThreadService } from '@/features/workspace/services/threadService';
import { PinnedMessageService } from '@/features/workspace/services/pinnedMessageService';
import { Button } from '@/shared/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { MarkdownRenderer } from '@/shared/components/common/MarkdownRenderer';
import { MessageSquareReply, Pin, PinOff, History, Edit, Copy, Link2, Share2 } from 'lucide-react';
import type { MessageReaction } from '@/features/workspace/types';
import { useAuthStore } from '@/features/auth/store/authStore';
import { MessageEditHistoryDialog } from '@/features/workspace/components/MessageEditHistoryDialog';
import { MessageEditDialog } from '@/features/workspace/components/MessageEditDialog';
import { copyMessageText, copyMessageLink, createMessageLink } from '@/features/workspace/utils/messageUtils';
import { MessageDeleteService } from '@/features/workspace/services/messageDeleteService';
import { useWorkspaceStore } from '@/features/workspace/store/workspaceStore';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';

export interface ChatMessageProps {
  message: ChatMessage;
  currentUserId: string;
  showAvatar?: boolean;
  searchQuery?: string; // 검색어
  participants?: Array<{ uid: string }>; // 채팅방 참여자 목록
  isFirstInGroup?: boolean; // 연속 메시지 그룹의 첫 번째 메시지인지
  isLastInGroup?: boolean; // 연속 메시지 그룹의 마지막 메시지인지
  pendingUpload?: {
    completed: number;
    total: number;
  };
  pendingAttachments?: UploadingImageItem[];
  channelId?: string; // 워크스페이스 채널 ID (스레드 기능용)
  workspaceId?: string; // 워크스페이스 ID (스레드 기능용)
  onThreadClick?: (messageId: string) => void; // 스레드 클릭 핸들러
  reactions?: MessageReaction[]; // 메시지 반응 목록
  onAddReaction?: (messageId: string, emoji: string) => void; // 반응 추가 핸들러
}

export const ChatMessageComponent = React.memo<ChatMessageProps>(({
  message,
  currentUserId,
  showAvatar = true,
  searchQuery = '',
  participants = [],
  isFirstInGroup = true,
  isLastInGroup = true,
  pendingUpload,
  pendingAttachments,
  channelId,
  workspaceId,
  onThreadClick,
  reactions = [],
  onAddReaction,
}) => {
  const isOwnMessage = message.sender.uid === currentUserId;
  const isPendingUpload = Boolean(pendingUpload);
  
  // 보낸 사람 이름 (이미 이름+직급이 포함되어 있음)
  const senderDisplayName = isOwnMessage ? '' : (message.sender.displayName || '사용자');
  
  // 읽지 않은 사람 수 계산 (자신 제외)
  const unreadCount = React.useMemo(() => {
    if (!isOwnMessage || !participants.length) return 0;
    
    // 자신을 제외한 참여자 수
    const otherParticipants = participants.filter(p => p.uid !== currentUserId);
    const totalOthers = otherParticipants.length;
    
    // 읽은 사람 수 (자신 제외)
    const readByOthers = message.readBy.filter(uid => uid !== currentUserId).length;
    
    // 읽지 않은 사람 수
    return Math.max(0, totalOthers - readByOthers);
  }, [message.readBy, participants, currentUserId, isOwnMessage]);

  // 마크다운 지원 여부 확인 (코드 블록, 링크 등이 있는지)
  const hasMarkdown = (text: string): boolean => {
    const markdownPatterns = [
      /```[\s\S]*?```/g, // 코드 블록
      /`[^`]+`/g, // 인라인 코드
      /\[([^\]]+)\]\(([^)]+)\)/g, // 링크
      /^#{1,6}\s/m, // 제목
      /^\*\s/m, // 리스트
      /^\d+\.\s/m, // 번호 리스트
      /^>\s/m, // 인용
      /\*\*[^*]+\*\*/g, // 볼드
      /_[^_]+_/g, // 이탤릭
    ];
    return markdownPatterns.some(pattern => pattern.test(text));
  };

  // 멘션과 검색어 하이라이트 처리 (마크다운이 아닌 경우)
  const renderPlainText = (text: string, mentionedUserIds?: string[], searchQuery?: string) => {
    // 검색어가 2글자 미만이면 하이라이트하지 않음
    const trimmedQuery = searchQuery?.trim() || '';
    const validSearchQuery = trimmedQuery.length >= 2 ? trimmedQuery : '';
    
    if (!validSearchQuery && (!mentionedUserIds || mentionedUserIds.length === 0)) {
      return <span>{text}</span>;
    }

    // 멘션과 검색어를 함께 처리
    const parts: Array<{ text: string; isMention: boolean; isSearch: boolean }> = [];
    const mentionRegex = /@(\S+)/g;
    const searchRegex = validSearchQuery
      ? new RegExp(`(${validSearchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
      : null;
    
    // 모든 매치 위치 수집
    const matches: Array<{ index: number; length: number; type: 'mention' | 'search' }> = [];
    
    // 멘션 매치
    let mentionMatch: RegExpExecArray | null;
    while ((mentionMatch = mentionRegex.exec(text)) !== null) {
      matches.push({
        index: mentionMatch.index,
        length: mentionMatch[0].length,
        type: 'mention' as const,
      });
    }
    
    // 검색어 매치
    if (searchRegex) {
      searchRegex.lastIndex = 0; // 리셋
      let searchMatch: RegExpExecArray | null;
      while ((searchMatch = searchRegex.exec(text)) !== null) {
        // 멘션과 겹치지 않는 경우만 추가
        const isOverlapping = matches.some(m => 
          searchMatch!.index < m.index + m.length && searchMatch!.index + searchMatch![0].length > m.index
        );
        if (!isOverlapping) {
          matches.push({
            index: searchMatch.index,
            length: searchMatch[0].length,
            type: 'search' as const,
          });
        }
      }
    }
    
    // 인덱스 순으로 정렬
    matches.sort((a, b) => a.index - b.index);
    
    // 텍스트 분할
    let lastIndex = 0;
    matches.forEach((match) => {
      // 매치 이전 텍스트
      if (match.index > lastIndex) {
        parts.push({
          text: text.substring(lastIndex, match.index),
          isMention: false,
          isSearch: false,
        });
      }
      
      // 매치된 텍스트
      parts.push({
        text: text.substring(match.index, match.index + match.length),
        isMention: match.type === 'mention',
        isSearch: match.type === 'search',
      });
      
      lastIndex = match.index + match.length;
    });
    
    // 나머지 텍스트
    if (lastIndex < text.length) {
      parts.push({
        text: text.substring(lastIndex),
        isMention: false,
        isSearch: false,
      });
    }
    
    return (
      <span>
        {parts.map((part, index) => {
          if (part.isMention) {
            // @here, @channel, @everyone 특별 처리
            const mentionText = part.text.toLowerCase();
            let mentionClass = 'text-blue-600 dark:text-blue-400 font-medium';
            if (mentionText.includes('@here')) {
              mentionClass = 'text-orange-600 dark:text-orange-400 font-semibold';
            } else if (mentionText.includes('@channel') || mentionText.includes('@everyone')) {
              mentionClass = 'text-red-600 dark:text-red-400 font-semibold';
            }
            return (
              <span key={index} className={mentionClass}>
                {part.text}
              </span>
            );
          } else if (part.isSearch) {
            return (
              <mark key={index} className={`px-1 py-0.5 rounded ${
                isOwnMessage 
                  ? 'bg-yellow-600/90 dark:bg-yellow-700/90 text-white' 
                  : 'bg-yellow-300/90 dark:bg-yellow-600/90'
              }`}>
                {part.text}
              </mark>
            );
          } else {
            return <span key={index}>{part.text}</span>;
          }
        })}
      </span>
    );
  };

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [showActions, setShowActions] = useState(false);
  const [hasThread, setHasThread] = useState(false);
  const [threadCount, setThreadCount] = useState(0);
  const [isPinned, setIsPinned] = useState(false);
  const [isEditHistoryOpen, setIsEditHistoryOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const { user } = useAuthStore();
  const { currentWorkspace } = useWorkspaceStore();

  // 스레드 존재 여부 확인
  useEffect(() => {
    if (!channelId || !workspaceId) return;

    const checkThread = async () => {
      try {
        const thread = await ThreadService.getMessageThread(message.id);
        if (thread) {
          setHasThread(true);
          setThreadCount(thread.messages.length);
        }
      } catch (error) {
        // 스레드가 없으면 무시
      }
    };

    checkThread();
  }, [message.id, channelId, workspaceId]);

  // 메시지 고정 여부 확인
  useEffect(() => {
    if (!channelId || !workspaceId) return;

    const checkPinned = async () => {
      try {
        const pinned = await PinnedMessageService.getPinnedMessage(message.id, channelId);
        setIsPinned(!!pinned);
      } catch (error) {
        // 고정되지 않았으면 무시
      }
    };

    checkPinned();
  }, [message.id, channelId, workspaceId]);

  // 메시지 삭제 여부 확인
  useEffect(() => {
    setIsDeleted(MessageDeleteService.isMessageDeleted(message));
  }, [message]);

  const handlePinMessage = async () => {
    if (!channelId || !workspaceId || !user?.uid) return;

    try {
      if (isPinned) {
        await PinnedMessageService.unpinMessage(message.id, channelId);
        setIsPinned(false);
      } else {
        await PinnedMessageService.pinMessage(
          message.id,
          channelId,
          workspaceId,
          user.uid,
          message
        );
        setIsPinned(true);
      }
    } catch (error) {
      console.error('Failed to pin/unpin message:', error);
    }
  };

  const handleCopyMessage = async () => {
    const success = await copyMessageText(message.text);
    if (success) {
      toast.success('메시지가 복사되었습니다');
    } else {
      toast.error('메시지 복사에 실패했습니다');
    }
  };

  const handleCopyLink = async () => {
    if (!channelId || !workspaceId) return;
    const success = await copyMessageLink(workspaceId, channelId, message.id);
    if (success) {
      toast.success('메시지 링크가 복사되었습니다');
    } else {
      toast.error('링크 복사에 실패했습니다');
    }
  };

  const handleShareMessage = async () => {
    if (!channelId || !workspaceId) return;
    const link = createMessageLink(workspaceId, channelId, message.id);
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${message.sender.displayName}의 메시지`,
          text: message.text,
          url: link,
        });
      } catch (error) {
        // 사용자가 공유를 취소한 경우
        if ((error as Error).name !== 'AbortError') {
          console.error('Failed to share:', error);
        }
      }
    } else {
      // 폴백: 링크 복사
      handleCopyLink();
    }
  };

  const imageAttachments = message.attachments?.filter((attachment) => attachment.type === 'image') ?? [];
  const fileAttachments = message.attachments?.filter((attachment) => attachment.type === 'file') ?? [];
  const pendingImageAttachments = pendingAttachments ?? [];
  const sanitizedText = (message.text || '').replace(/\u200B/g, '');
  const hasText = sanitizedText.trim().length > 0;
  const displayImageCount = isPendingUpload ? pendingImageAttachments.length : imageAttachments.length;
  const hasImages = displayImageCount > 0;
  const imageColumns = displayImageCount <= 1 ? 1 : displayImageCount === 2 ? 2 : 3;
  const imageRemainder = displayImageCount > 0 ? displayImageCount % imageColumns : 0;
  const pendingPercent = pendingUpload && pendingUpload.total > 0
    ? (pendingUpload.completed / pendingUpload.total) * 100
    : 0;

  const getImageFlexBasis = (index: number) => {
    if (imageColumns <= 1) {
      return 'flex-[1_0_100%]';
    }

    if (imageColumns === 2) {
      return 'flex-[1_0_50%]';
    }

    // imageColumns === 3
    if (imageRemainder !== 0 && index >= displayImageCount - imageRemainder) {
      if (imageRemainder === 1) {
        return 'flex-[1_0_100%]';
      }
      if (imageRemainder === 2) {
        return 'flex-[1_0_50%]';
      }
    }

    return 'flex-[1_0_33.3333%]';
  };

  const getImageAspectClass = (index: number) => {
    if (imageColumns <= 1) {
      return 'aspect-square';
    }

    if (imageColumns === 2) {
      return 'aspect-square';
    }

    // imageColumns === 3
    if (imageRemainder !== 0 && index >= displayImageCount - imageRemainder) {
      if (imageRemainder === 1) {
        return 'aspect-[3/1]';
      }
      if (imageRemainder === 2) {
        return 'aspect-[3/2]';
      }
    }

    return 'aspect-square';
  };

  const renderFileAttachments = () => {
    if (fileAttachments.length === 0) {
      return null;
    }

    return (
      <div className="mt-2 space-y-1 w-full">
        {fileAttachments.map((file) => (
          <a
            key={file.id}
            href={file.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
          >
            <File className="size-4" />
            <span className="flex-1 truncate text-sm">{file.name}</span>
            <span className="text-xs text-muted-foreground">
              {(file.size / 1024).toFixed(1)}KB
            </span>
          </a>
        ))}
      </div>
    );
  };

  const handleThreadClick = () => {
    if (onThreadClick) {
      onThreadClick(message.id);
    } else if (channelId && workspaceId) {
      // 스레드가 없으면 생성, 있으면 열기
      ThreadService.getMessageThread(message.id).then((thread) => {
        if (thread) {
          // 스레드가 있으면 열기 (부모 컴포넌트에서 처리)
          if (onThreadClick) {
            (onThreadClick as (messageId: string) => void)(message.id);
          }
        } else {
          // 스레드 생성 (나중에 구현)
        }
      });
    }
  };

  // 디스코드 스타일: 모든 메시지를 왼쪽 정렬
  return (
    <div
      className={cn(
        'flex gap-3 px-4 py-1 group hover:bg-muted/30 transition-colors',
        'flex-row' // 항상 왼쪽 정렬
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* 아바타 (항상 왼쪽에 표시, showAvatar가 true일 때만) */}
      {showAvatar && (
        <div className="flex-shrink-0">
          <Avatar
            className="[width:var(--avatar-size,2.5rem)] [height:var(--avatar-size,2.5rem)] rounded-full"
            style={{ '--avatar-size': '2.5rem' } as React.CSSProperties}
          >
            <AvatarImage src={message.sender.photoURL} alt={message.sender.displayName} />
            <AvatarFallback className="flex items-center justify-center font-medium text-muted-foreground [font-size:calc(var(--avatar-size,2.5rem)*0.4)]">
              {getUserInitial(message.sender, message.sender.displayName.charAt(0))}
            </AvatarFallback>
          </Avatar>
        </div>
      )}
      {!showAvatar && <div className="w-10" />}

      {/* 메시지 내용 - 디스코드 스타일: 항상 왼쪽 정렬 */}
      <div className="flex items-start gap-2 flex-1 min-w-0">
        <div className="flex flex-col gap-0.5 flex-1 min-w-0 items-start">
          {isFirstInGroup && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">
                {senderDisplayName || '사용자'}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatChatDateTime(message.timestamp)}
              </span>
            </div>
          )}
          {hasImages && (
            <div className={cn('relative flex flex-wrap overflow-hidden rounded-lg w-60 sm:w-72 md:w-80', isPendingUpload ? 'border border-border/40' : undefined)}>
              {isPendingUpload
                ? pendingImageAttachments.map((item, index) => (
                    <div
                      key={`pending-${index}`}
                      className={cn(
                        'relative w-full block overflow-hidden bg-muted border border-border/40',
                        getImageFlexBasis(index),
                        index % imageColumns === 0 ? 'ml-0' : '-ml-px',
                        index < imageColumns ? 'mt-0' : '-mt-px',
                        getImageAspectClass(index)
                      )}
                    >
                      {item.preview ? (
                        <img
                          src={item.preview}
                          alt={item.file?.name || '이미지 업로드 중'}
                          className="h-full w-full object-cover"
                          draggable={false}
                        />
                      ) : (
                        <div className="h-full w-full animate-pulse bg-muted-foreground/20" />
                      )}
                    </div>
                  ))
                : imageAttachments.map((image, index) => (
                    <button
                      type="button"
                      key={image.id}
                      onClick={() => {
                        setLightboxIndex(index);
                        setLightboxOpen(true);
                      }}
                      className={cn(
                        'relative w-full block overflow-hidden bg-muted focus:outline-none border border-border/40',
                        getImageFlexBasis(index),
                        index % imageColumns === 0 ? 'ml-0' : '-ml-px',
                        index < imageColumns ? 'mt-0' : '-mt-px',
                        getImageAspectClass(index)
                      )}
                    >
                      <img
                        src={image.thumbnailUrl || image.url}
                        alt={image.name || '이미지 첨부'}
                        className="absolute inset-0 w-full h-full object-cover"
                        loading="eager"
                        decoding="async"
                      />
                    </button>
                  ))}

              {isPendingUpload && pendingUpload && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/60 text-white p-4">
                  <Progress value={pendingPercent} className="w-24 h-2" />
                  <span className="text-sm font-medium">{Math.round(pendingPercent)}%</span>
                  <span className="text-xs font-medium">
                    {pendingUpload.completed} / {pendingUpload.total}
                  </span>
                </div>
              )}
            </div>
          )}
          {(hasText || fileAttachments.length > 0) && (
            <div
              className={cn(
                'px-2 py-1 break-words overflow-wrap-anywhere rounded',
                hasImages && 'mt-2',
                'text-sm',
                isDeleted && 'opacity-50 italic'
              )}
            >
              {hasText && (
                <div className={cn('text-foreground', isDeleted && 'text-muted-foreground')}>
                  {hasMarkdown(sanitizedText) ? (
                    <MarkdownRenderer
                      content={sanitizedText}
                      searchQuery={searchQuery}
                      className="prose prose-sm dark:prose-invert max-w-none"
                    />
                  ) : (
                    renderPlainText(sanitizedText, message.mentionedUserIds, searchQuery)
                  )}
                </div>
              )}
              {renderFileAttachments()}
            </div>
          )}

          {/* 반응 표시 */}
          {reactions.length > 0 && (
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              {reactions.map((reaction) => (
                <button
                  key={reaction.id}
                  onClick={() => onAddReaction?.(message.id, reaction.emoji)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-muted hover:bg-accent transition-colors"
                >
                  <span>{reaction.emoji}</span>
                  <span>{reaction.count}</span>
                </button>
              ))}
            </div>
          )}

          {/* 반응 및 액션 버튼 - 디스코드 스타일 */}
          <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {channelId && workspaceId && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleThreadClick}
                  className="h-7 w-7 p-0 hover:bg-muted"
                  title="답글 달기"
                >
                  <MessageSquareReply className="h-4 w-4" />
                </Button>
                <ReactionPicker
                  messageId={message.id}
                  channelId={channelId}
                  workspaceId={workspaceId}
                  reactions={reactions}
                />
              </>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 hover:bg-muted"
                  title="더보기"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {channelId && workspaceId && (
                  <>
                    <DropdownMenuItem onClick={handlePinMessage}>
                      {isPinned ? (
                        <>
                          <PinOff className="h-4 w-4 mr-2" />
                          고정 해제
                        </>
                      ) : (
                        <>
                          <Pin className="h-4 w-4 mr-2" />
                          메시지 고정
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {message.editedAt && (
                  <>
                    <DropdownMenuItem onClick={() => setIsEditHistoryOpen(true)}>
                      <History className="h-4 w-4 mr-2" />
                      편집 히스토리
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {isOwnMessage && channelId && workspaceId && (
                  <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    수정
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleCopyMessage}>
                  <Copy className="h-4 w-4 mr-2" />
                  복사
                </DropdownMenuItem>
                {channelId && workspaceId && (
                  <>
                    <DropdownMenuItem onClick={handleCopyLink}>
                      <Link2 className="h-4 w-4 mr-2" />
                      링크 복사
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleShareMessage}>
                      <Share2 className="h-4 w-4 mr-2" />
                      공유
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                {isOwnMessage && channelId && workspaceId && (
                  <DropdownMenuItem
                    onClick={async () => {
                      if (!user?.uid || !channelId || !workspaceId) return;
                      if (!confirm('이 메시지를 삭제하시겠습니까?')) return;

                      try {
                        await MessageDeleteService.deleteMessage(
                          message.id,
                          channelId,
                          workspaceId,
                          user.uid
                        );
                        setIsDeleted(true);
                        toast.success('메시지가 삭제되었습니다.');
                      } catch (error: any) {
                        console.error('Failed to delete message:', error);
                        toast.error(error.message || '메시지 삭제에 실패했습니다.');
                      }
                    }}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    삭제
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* 읽지 않은 사람 수 (내 메시지만) */}
          {isOwnMessage && unreadCount > 0 && isLastInGroup && (
            <div className="mt-0.5">
              <span className="text-xs font-semibold text-primary whitespace-nowrap">
                읽음 {unreadCount}
              </span>
            </div>
          )}
          
          {/* 수정 표시 */}
          {message.editedAt && isLastInGroup && (
            <div className="mt-0.5">
              <span className="text-xs text-muted-foreground whitespace-nowrap">(수정됨)</span>
            </div>
          )}
        </div>
      </div>
      {!isPendingUpload && imageAttachments.length > 0 && (
        <ImageLightbox
          images={imageAttachments.map((image) => image.url)}
          initialIndex={lightboxIndex}
          open={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
        />
      )}

      {/* 편집 히스토리 다이얼로그 */}
      {message.editedAt && (
        <MessageEditHistoryDialog
          open={isEditHistoryOpen}
          onOpenChange={setIsEditHistoryOpen}
          messageId={message.id}
        />
      )}

      {/* 메시지 편집 다이얼로그 */}
      {channelId && workspaceId && (
        <MessageEditDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          messageId={message.id}
          currentText={message.text}
        />
      )}
    </div>
  );
});

ChatMessageComponent.displayName = 'ChatMessageComponent';

