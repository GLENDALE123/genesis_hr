/**
 * 워크스페이스 채널 메시지 컴포넌트
 * 1:1 채팅과 완전히 독립적인 워크스페이스 전용 메시지 컴포넌트
 */

import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { formatChannelMessageDateTime } from '@/features/workspace/utils/dateFormat';
import { getUserInitial, getUserDisplayName } from '@/shared/utils/user/userUtils';
import { File } from 'lucide-react';
import { ImageLightbox } from '@/shared/components/common/ImageLightbox';
import { cn } from '@/shared/lib/utils';
import type { UploadingImageItem } from '@/shared/components/common/UploadingImageGrid';
import { Progress } from '@/shared/components/ui/progress';
import type { ChannelMessage, ChannelMessageAttachment } from '../types/channelMessage.types';
import type { UserProfile } from '@/features/auth/types';
import { useProjectModalStore } from '@/features/workspace/store/projectModalStore';
import { ProjectQualityIssueMessage } from './ProjectQualityIssueMessage';

export interface ChannelMessageProps {
  message: ChannelMessage;
  currentUserId: string;
  showAvatar?: boolean;
  searchQuery?: string; // 검색어
  channelMembers?: string[]; // 채널 멤버 UID 목록
  isFirstInGroup?: boolean; // 연속 메시지 그룹의 첫 번째 메시지인지
  isLastInGroup?: boolean; // 연속 메시지 그룹의 마지막 메시지인지
  pendingUpload?: {
    completed: number;
    total: number;
  };
  pendingAttachments?: UploadingImageItem[];
  onThreadClick?: (messageId: string) => void; // 스레드 클릭 핸들러
  userProfile?: UserProfile | null; // 사용자 프로필 (직급 정보 포함)
}

export const ChannelMessageComponent = React.memo<ChannelMessageProps>(({
  message,
  currentUserId,
  showAvatar = true,
  searchQuery = '',
  channelMembers = [],
  isFirstInGroup = true,
  isLastInGroup = true,
  pendingUpload,
  pendingAttachments,
  onThreadClick,
  userProfile,
}) => {
  const isOwnMessage = message.sender.uid === currentUserId;
  const isPendingUpload = Boolean(pendingUpload);

  // 보낸 사람 이름 (직급 포함)
  const senderDisplayName = isOwnMessage
    ? ''
    : getUserDisplayName(
      { displayName: message.sender.displayName },
      userProfile || null,
      '사용자'
    );

  // 읽지 않은 사람 수 계산 (자신 제외)
  const unreadCount = React.useMemo(() => {
    if (!isOwnMessage || !channelMembers.length) return 0;

    // 자신을 제외한 멤버 수
    const otherMembers = channelMembers.filter(uid => uid !== currentUserId);
    const totalOthers = otherMembers.length;

    // 읽은 사람 수 (자신 제외)
    const readByOthers = message.readBy.filter(uid => uid !== currentUserId).length;

    // 읽지 않은 사람 수
    return Math.max(0, totalOthers - readByOthers);
  }, [message.readBy, channelMembers, currentUserId, isOwnMessage]);

  // 멘션과 검색어 하이라이트 처리에 더해, Project/Issue 링크 처리 추가 필요
  // 하지만 현재 구조상 텍스트를 파싱하는 로직이 복잡해질 수 있음.
  // 따라서, 메시지가 "project://" 링크를 포함하는 경우를 감지하여 별도의 Card를 렌더링하도록 함.

  // 프로젝트 링크 감지
  const projectLinkMatch = message.text?.match(/\[프로젝트 보기\]\(project:\/\/([a-zA-Z0-9]+)\)/);
  const projectId = projectLinkMatch ? projectLinkMatch[1] : null;

  // 품질이슈 프로젝트 메시지인지 확인
  const isQualityIssueProjectMessage = message.metadata?.type === 'project-quality-issue';

  // 멘션과 검색어 하이라이트 처리
  const renderMessageText = (text: string, mentionedUserIds?: string[], searchQuery?: string) => {
    // 프로젝트 링크 제거 (카드로 보여줄 것이므로 텍스트에서는 숨김)
    let displayTx = text;
    if (projectId) {
      displayTx = text.replace(/\[프로젝트 보기\]\(project:\/\/[a-zA-Z0-9]+\)/, '');
    }

    // 검색어가 2글자 미만이면 하이라이트하지 않음
    const trimmedQuery = searchQuery?.trim() || '';
    const validSearchQuery = trimmedQuery.length >= 2 ? trimmedQuery : '';

    if (!validSearchQuery && (!mentionedUserIds || mentionedUserIds.length === 0)) {
      return <span className="whitespace-pre-wrap">{displayTx}</span>;
    }

    // ... (기존 하이라이트 로직 유지하되 displayTx 사용) ...
    const parts: Array<{ text: string; isMention: boolean; isSearch: boolean }> = [];
    const mentionRegex = /@(\S+)/g;
    const searchRegex = validSearchQuery
      ? new RegExp(`(${validSearchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
      : null;

    // ... (기존 로직: displayTx 대상으로 수행) ...
    // Note: To simplify, I will just re-implement the highlight logic on displayTx.
    const matches: Array<{ index: number; length: number; type: 'mention' | 'search' }> = [];

    let mentionMatch: RegExpExecArray | null;
    while ((mentionMatch = mentionRegex.exec(displayTx)) !== null) {
      matches.push({ index: mentionMatch.index, length: mentionMatch[0].length, type: 'mention' });
    }

    if (searchRegex) {
      searchRegex.lastIndex = 0;
      let searchMatch: RegExpExecArray | null;
      while ((searchMatch = searchRegex.exec(displayTx)) !== null) {
        const isOverlapping = matches.some(m =>
          searchMatch!.index < m.index + m.length && searchMatch!.index + searchMatch![0].length > m.index
        );
        if (!isOverlapping) {
          matches.push({ index: searchMatch.index, length: searchMatch[0].length, type: 'search' });
        }
      }
    }

    matches.sort((a, b) => a.index - b.index);

    let lastIndex = 0;
    matches.forEach((match) => {
      if (match.index > lastIndex) {
        parts.push({ text: displayTx.substring(lastIndex, match.index), isMention: false, isSearch: false });
      }
      parts.push({ text: displayTx.substring(match.index, match.index + match.length), isMention: match.type === 'mention', isSearch: match.type === 'search' });
      lastIndex = match.index + match.length;
    });

    if (lastIndex < displayTx.length) {
      parts.push({ text: displayTx.substring(lastIndex), isMention: false, isSearch: false });
    }

    return (
      <span className="whitespace-pre-wrap">
        {parts.map((part, index) => {
          if (part.isMention) {
            return <span key={index} className="text-blue-600 dark:text-blue-400 font-medium">{part.text}</span>;
          } else if (part.isSearch) {
            return (
              <mark key={index} className={`px-1 py-0.5 rounded ${isOwnMessage ? 'bg-yellow-600/90 dark:bg-yellow-700/90 text-white' : 'bg-yellow-300/90 dark:bg-yellow-600/90'}`}>
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

  // 품질이슈 프로젝트 메시지인 경우 특별한 UI 렌더링
  if (isQualityIssueProjectMessage) {
    return (
      <div className="px-4 py-2">
        <ProjectQualityIssueMessage message={message} />
      </div>
    );
  }

  return (
    <div
      className={`flex gap-3 px-4 py-1 group ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'
        }`}
    >
      {/* 아바타 (상대방 메시지만, showAvatar가 true일 때) */}
      {!isOwnMessage && showAvatar && (
        <div className="flex-shrink-0">
          <Avatar
            className="[width:var(--avatar-size,2rem)] [height:var(--avatar-size,2rem)]"
            style={{ '--avatar-size': '2rem' } as React.CSSProperties}
          >
            <AvatarImage src={message.sender.photoURL} alt={message.sender.displayName} />
            <AvatarFallback className="flex items-center justify-center font-medium text-muted-foreground [font-size:calc(var(--avatar-size,2rem)*0.4)]">
              {getUserInitial(message.sender, message.sender.displayName.charAt(0))}
            </AvatarFallback>
          </Avatar>
        </div>
      )}
      {!isOwnMessage && !showAvatar && <div className="w-8" />}

      {/* 메시지 내용 */}
      <div className={`flex items-end gap-2 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'} max-w-[70%] md:max-w-[60%]`}>
        <div className={`flex flex-col gap-0 ${isOwnMessage ? 'items-end' : 'items-start'}`}>
          {!isOwnMessage && isFirstInGroup && (
            <span className="text-base font-semibold text-muted-foreground">
              {senderDisplayName}
            </span>
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
                'px-3 py-2 border break-words overflow-wrap-anywhere',
                hasImages && 'mt-2',
                isOwnMessage
                  ? `bg-yellow-400 dark:bg-yellow-500 text-foreground dark:text-black border-yellow-400 dark:border-yellow-500 ${isFirstInGroup ? 'rounded-s-xl rounded-ee-xl' : 'rounded-xl'
                  }`
                  : `bg-card dark:bg-muted text-foreground border-border dark:border-muted ${isFirstInGroup ? 'rounded-e-xl rounded-es-xl' : 'rounded-xl'
                  }`
              )}
            >
              {hasText && (
                <div className="text-lg font-medium">
                  {renderMessageText(sanitizedText, message.mentionedUserIds, searchQuery)}

                  {/* 프로젝트 카드 렌더링 */}
                  {projectLinkMatch && (
                    <div className="mt-3 p-3 bg-white dark:bg-zinc-800 rounded-lg border border-border shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">🚀</span>
                        <span className="font-bold text-sm text-primary">프로젝트 시작됨</span>
                      </div>
                      <div className="text-xs text-muted-foreground mb-3">
                        새로운 프로젝트가 생성되었습니다. 상세 내용은 프로젝트 보기에서 확인하세요.
                      </div>
                      <button
                        className="w-full py-1.5 px-3 bg-primary text-primary-foreground text-sm font-medium rounded hover:bg-primary/90 transition-colors flex items-center justify-center gap-1"
                        onClick={async () => {
                          if (projectLinkMatch && projectLinkMatch[1]) {
                            const projectId = projectLinkMatch[1];
                            try {
                              // 프로젝트 정보를 가져와서 source 타입 확인
                              const { ProjectService } = await import('@/features/workspace/services/projectService');
                              const project = await ProjectService.getProject(projectId);
                              
                              // 품질이슈에서 생성된 프로젝트인 경우 품질이슈 탭을 기본으로 열기
                              const initialTab = project?.source?.type === 'quality-issue' ? 'issue' : 'info';
                              useProjectModalStore.getState().openProjectModal(projectId, initialTab);
                            } catch (error) {
                              console.error('Failed to load project:', error);
                              // 프로젝트 로드 실패 시 기본 탭으로 열기
                              useProjectModalStore.getState().openProjectModal(projectId);
                            }
                          }
                        }}
                      >
                        프로젝트 보기
                      </button>
                    </div>
                  )}
                </div>
              )}
              {renderFileAttachments()}
            </div>
          )}
        </div>
        {/* 시간 표시는 그룹의 마지막 메시지에만 표시 (1분 이내 연속 메시지) */}
        {isLastInGroup && (
          <div className={`flex flex-col items-end gap-0.5 flex-shrink-0 ${isOwnMessage ? '' : 'items-start'}`}>
            {/* 읽지 않은 사람 수 (내 메시지만) */}
            {isOwnMessage && unreadCount > 0 && (
              <span className="text-xs font-semibold text-primary whitespace-nowrap">
                {unreadCount}
              </span>
            )}
            <div className={`flex items-center gap-1 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {formatChannelMessageDateTime(message.timestamp)}
              </span>
              {message.editedAt && (
                <span className="text-xs text-muted-foreground whitespace-nowrap">(수정됨)</span>
              )}
            </div>
          </div>
        )}
      </div>
      {!isPendingUpload && imageAttachments.length > 0 && (
        <ImageLightbox
          images={imageAttachments.map((image) => image.url)}
          initialIndex={lightboxIndex}
          open={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  );
});

ChannelMessageComponent.displayName = 'ChannelMessageComponent';



