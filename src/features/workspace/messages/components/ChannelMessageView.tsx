/**
 * 워크스페이스 채널 메시지 뷰 컴포넌트
 * 1:1 채팅과 완전히 독립적인 워크스페이스 전용 메시지 뷰
 */

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { ChannelMessageService } from '../services/channelMessageService';
import { ChannelMessageComponent } from './ChannelMessage';
import { ChatAttachmentPreviewBar } from '@/shared/components/common/ChatAttachmentPreviewBar';
import { ChannelMessageComposer } from './ChannelMessageComposer';
import { useAuthStore } from '@/features/auth/store/authStore';
import { getUserDisplayName } from '@/shared/utils/user/userUtils';
import { MESSAGE_PAGINATION } from '@/features/workspace/constants';
import type { ChannelMessage, ChannelMessageAttachment } from '../types/channelMessage.types';
import type { UploadingImageItem } from '@/shared/components/common/UploadingImageGrid';
import { cn } from '@/shared/lib/utils';
import type {
  PendingUpload,
  PendingUploadPayload,
  PendingUploadProgressPayload,
} from '@/features/chat/types/pendingUpload.types';
import { Loader2 } from 'lucide-react';
import { createVirtuosoComponents } from '@/shared/components/common/VirtuosoComponents';
import { getUserProfile } from '@/shared/services/firebase/userProfile';
import type { UserProfile } from '@/features/auth/types';
import {
  buildCombinedChannelMessages,
  CombinedChannelMessageItem,
  createChannelMessageGroupingMap,
  mergeHistoricalChannelMessages,
} from '@/features/workspace/utils/channelMessageUtils';
import type { Channel } from '@/features/workspace/channels';

export interface ChannelMessageViewProps {
  channelId: string;
  workspaceId: string;
  searchQuery?: string;
  currentUserId: string;
  onSearchResultsChange?: (results: Array<{ id: string; index: number }>) => void;
  hideInput?: boolean;
  pendingUploadsOverride?: PendingUpload[];
  onThreadClick?: (messageId: string) => void; // 스레드 클릭 핸들러
  channel?: Channel; // 채널 정보 (멤버 목록 등)
}

const START_INDEX = 1_000_000;

export const ChannelMessageView: React.FC<ChannelMessageViewProps> = ({
  channelId,
  workspaceId,
  searchQuery = '',
  currentUserId,
  onSearchResultsChange,
  hideInput = false,
  pendingUploadsOverride,
  onThreadClick,
  channel,
}) => {
  const { user, userProfile } = useAuthStore();
  const [composerAttachments, setComposerAttachments] = useState<UploadingImageItem[]>([]);
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);
  const attachmentsRef = useRef<UploadingImageItem[]>([]);
  const [internalPendingUploads, setInternalPendingUploads] = useState<PendingUpload[]>([]);
  const internalPendingRef = useRef<PendingUpload[]>([]);
  const pendingPreviewSetRef = useRef<Set<string>>(new Set());
  const virtuosoRef = useRef<VirtuosoHandle | null>(null);
  const isUsingExternalPending = typeof pendingUploadsOverride !== 'undefined';
  const pendingUploads = isUsingExternalPending ? (pendingUploadsOverride ?? []) : internalPendingUploads;
  const [channelMessages, setChannelMessages] = useState<ChannelMessage[]>([]);
  const [historicalMessages, setHistoricalMessages] = useState<ChannelMessage[]>([]);
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false);
  const [hasMoreOlderMessages, setHasMoreOlderMessages] = useState(true);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const combinedMessagesRef = useRef<CombinedChannelMessageItem[]>([]);
  const isMountedRef = useRef(true);
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile | null>>({}); // 사용자 프로필 캐시

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const currentUserDisplayName = useMemo(() => {
    if (!user) return '사용자';
    return getUserDisplayName(
      { displayName: user.displayName, email: user.email },
      { position: userProfile?.position },
      '사용자'
    );
  }, [user, userProfile?.position]);
  const currentUserPhotoURL = user?.photoURL || undefined;

  const releasePreviews = useCallback((items: UploadingImageItem[]) => {
    items.forEach((item) => {
      if (item.preview && item.preview.startsWith('blob:')) {
        URL.revokeObjectURL(item.preview);
      }
    });
  }, []);

  useEffect(() => {
    attachmentsRef.current = composerAttachments;
  }, [composerAttachments]);

  useEffect(() => {
    return () => {
      releasePreviews(attachmentsRef.current);
    };
  }, [releasePreviews]);

  useEffect(() => {
    internalPendingRef.current = internalPendingUploads;
  }, [internalPendingUploads]);

  useEffect(() => {
    return () => {
      if (!isUsingExternalPending) {
        internalPendingRef.current.forEach((pending) => {
          releasePreviews(pending.attachments);
          pending.attachments.forEach((attachment) => {
            if (attachment.preview) {
              pendingPreviewSetRef.current.delete(attachment.preview);
            }
          });
        });
        internalPendingRef.current = [];
        pendingPreviewSetRef.current.clear();
      }
    };
  }, [isUsingExternalPending, releasePreviews]);

  useEffect(() => {
    if (isUsingExternalPending) return;
    setInternalPendingUploads((prev) => {
      if (prev.length > 0) {
        prev.forEach((pending) => releasePreviews(pending.attachments));
      }
      return [];
    });
    setIsUploadingAttachments(false);
    pendingPreviewSetRef.current.clear();
  }, [channelId, workspaceId, isUsingExternalPending, releasePreviews]);

  const getActivePendingPreviews = useCallback((): Set<string> => {
    const source = pendingUploads;
    const previews = new Set<string>();
    source.forEach((pending) => {
      pending.attachments.forEach((attachment) => {
        if (attachment.preview) {
          previews.add(attachment.preview);
        }
      });
    });
    return previews;
  }, [pendingUploads]);

  const handleAttachmentsChange = useCallback(
    (next: UploadingImageItem[]) => {
      const activePendingPreviews = getActivePendingPreviews();
      setComposerAttachments((prev) => {
        prev.forEach((item) => {
          const preview = item.preview;
          if (
            preview &&
            preview.startsWith('blob:') &&
            !next.some((n) => n.preview === preview) &&
            !activePendingPreviews.has(preview) &&
            !pendingPreviewSetRef.current.has(preview)
          ) {
            URL.revokeObjectURL(preview);
          }
        });
        return next;
      });
    },
    [getActivePendingPreviews]
  );

  const handleRemoveAttachment = useCallback(
    (index: number) => {
      if (isUploadingAttachments) return;
      setComposerAttachments((prev) => {
        const target = prev[index];
        if (target?.preview && target.preview.startsWith('blob:')) {
          URL.revokeObjectURL(target.preview);
        }
        return prev.filter((_, i) => i !== index);
      });
    },
    [isUploadingAttachments]
  );

  useEffect(() => {
    releasePreviews(attachmentsRef.current);
    setComposerAttachments([]);
    setIsUploadingAttachments(false);
    setInternalPendingUploads((prev) => {
      if (prev.length > 0) {
        prev.forEach((pending) => releasePreviews(pending.attachments));
      }
      return [];
    });
    pendingPreviewSetRef.current.clear();
    setChannelMessages([]);
    setHistoricalMessages([]);
    setHasMoreOlderMessages(true);
    setIsLoadingOlderMessages(false);
    setIsInitialLoading(true);
    setIsAtBottom(true);
  }, [channelId, workspaceId, isUsingExternalPending, releasePreviews]);

  const nonPendingMessages = useMemo(
    () => mergeHistoricalChannelMessages(historicalMessages, channelMessages),
    [historicalMessages, channelMessages]
  );

  const { combinedMessages } = useMemo(
    () =>
      buildCombinedChannelMessages({
        nonPendingMessages,
        pendingUploads,
        channelId,
        workspaceId,
        currentUserId,
        currentUserDisplayName,
        currentUserPhotoURL,
      }),
    [
      nonPendingMessages,
      pendingUploads,
      channelId,
      workspaceId,
      currentUserId,
      currentUserDisplayName,
      currentUserPhotoURL,
    ]
  );

  useEffect(() => {
    combinedMessagesRef.current = combinedMessages;
  }, [combinedMessages]);

  // Virtuoso firstItemIndex 계산 (역방향 스크롤 시 위치 유지를 위함)
  const firstItemIndex = START_INDEX - combinedMessages.length;

  const groupingMap = useMemo(
    () => createChannelMessageGroupingMap(nonPendingMessages),
    [nonPendingMessages]
  );

  const handleAtBottomStateChange = useCallback((bottom: boolean) => {
    setIsAtBottom(bottom);
  }, []);

  const scrollToIndex = useCallback(
    (index: number, options?: { align?: 'start' | 'center' | 'end'; behavior?: 'auto' | 'smooth' }) => {
      const targetIndex = index;
      virtuosoRef.current?.scrollToIndex({
        index: targetIndex,
        align: options?.align ?? 'end',
        behavior: options?.behavior ?? 'smooth',
      });
    },
    []
  );

  const virtuosoComponents = useMemo(
    () =>
      createVirtuosoComponents({
        isInitialLoading,
        isLoadingOlderMessages,
        hasMoreOlderMessages,
        scrollerDataAttribute: 'channel-message-virtuoso-scroller',
        scrollerDisplayName: 'ChannelMessageVirtuosoScroller',
        listDisplayName: 'ChannelMessageVirtuosoList',
      }),
    [hasMoreOlderMessages, isInitialLoading, isLoadingOlderMessages]
  );

  // 검색 결과 추적 (2글자 이상일 때만)
  useEffect(() => {
    if (!onSearchResultsChange) return;

    const trimmedQuery = searchQuery?.trim() || '';
    if (trimmedQuery.length >= 2) {
      const query = trimmedQuery.toLowerCase();
      const results = nonPendingMessages
        .slice()
        .reverse()
        .map((msg, originalIndex) => {
          const actualIndex = nonPendingMessages.length - 1 - originalIndex;
          return { msg, index: actualIndex };
        })
        .filter(({ msg }) => msg.text.toLowerCase().includes(query))
        .map(({ msg, index }) => ({ id: msg.id, index }));

      onSearchResultsChange(results);
    } else {
      onSearchResultsChange([]);
    }
  }, [searchQuery, nonPendingMessages, onSearchResultsChange]);

  // 메시지 초기 로드 및 구독
  useEffect(() => {
    if (!channelId || !workspaceId) {
      setChannelMessages([]);
      setIsInitialLoading(false);
      return;
    }

    // currentUserId가 없으면 구독하지 않음 (로그아웃 상태)
    if (!currentUserId) {
      setChannelMessages([]);
      setIsInitialLoading(false);
      return;
    }

    let unsubscribeFn: (() => void) | undefined;

    setIsInitialLoading(true);

    const fetchAndSubscribe = async () => {
      try {
        const initialMessages = await ChannelMessageService.fetchInitialMessages(
          channelId,
          workspaceId,
          MESSAGE_PAGINATION.INITIAL_BATCH
        );
        
        if (!isMountedRef.current) return;

        // currentUserId가 여전히 있는지 확인 (로그아웃 중일 수 있음)
        if (!currentUserId) {
          setChannelMessages([]);
          setIsInitialLoading(false);
          return;
        }

        setChannelMessages(initialMessages);
        setHasMoreOlderMessages(initialMessages.length === MESSAGE_PAGINATION.INITIAL_BATCH);
        
        // 초기 로드 후에도 컴포넌트가 여전히 마운트 상태인지 확인 후 구독 시작
        if (!isMountedRef.current) return;

        const unsub = ChannelMessageService.subscribeToChannelMessages(
          channelId,
          workspaceId,
          async (newMessages) => {
            if (!isMountedRef.current) return;

            // currentUserId가 여전히 있는지 확인 (로그아웃 중일 수 있음)
            if (!currentUserId) {
              if (unsubscribeFn) {
                unsubscribeFn();
                unsubscribeFn = undefined;
              }
              setChannelMessages([]);
              setIsInitialLoading(false);
              return;
            }

            setChannelMessages(newMessages);

            const unreadMessages = newMessages.filter(
              (msg) => msg.sender.uid !== currentUserId && !msg.readBy.includes(currentUserId)
            );
            
            if (unreadMessages.length > 0) {
              const markAsReadPromises = unreadMessages.map((msg) =>
                ChannelMessageService.markMessageAsRead(channelId, workspaceId, msg.id, currentUserId).catch((markError) => {
                  // 권한 오류는 조용히 처리 (로그아웃 중일 수 있음)
                  const errorMessage = markError instanceof Error ? markError.message : String(markError);
                  const isPermissionError = 
                    errorMessage.includes('permission') || 
                    errorMessage.includes('insufficient');
                  
                  if (!isPermissionError && process.env.NODE_ENV === 'development') {
                    console.warn(`Failed to mark message ${msg.id} as read:`, markError);
                  }
                })
              );
              
              await Promise.allSettled(markAsReadPromises);
            }
          },
          (error) => {
            // 권한 오류는 조용히 처리 (로그아웃 중일 수 있음)
            const errorMessage = error instanceof Error ? error.message : String(error);
            const isPermissionError = 
              errorMessage.includes('permission') || 
              errorMessage.includes('insufficient');
            
            if (!isPermissionError) {
              console.error('Failed to subscribe to channel messages:', error);
            }
          },
          MESSAGE_PAGINATION.INITIAL_BATCH
        );

        // 구독 함수 반환 직후 언마운트 체크
        if (!isMountedRef.current) {
          unsub();
          return;
        }

        unsubscribeFn = unsub;
        setIsInitialLoading(false);
      } catch (error) {
        // 권한 오류는 조용히 처리 (로그아웃 중일 수 있음)
        const errorMessage = error instanceof Error ? error.message : String(error);
        const isPermissionError = 
          errorMessage.includes('permission') || 
          errorMessage.includes('insufficient');
        
        if (!isPermissionError && isMountedRef.current && process.env.NODE_ENV === 'development') {
          console.error('Failed to fetch initial channel messages:', error);
        }
        setIsInitialLoading(false);
      }
    };

    fetchAndSubscribe();

    return () => {
      if (unsubscribeFn) {
        unsubscribeFn();
        unsubscribeFn = undefined;
      }
    };
  }, [channelId, workspaceId, currentUserId]);

  const handleLoadOlderMessages = useCallback(async () => {
    if (isLoadingOlderMessages || !hasMoreOlderMessages) return;
    if (!channelId || !workspaceId) return;

    const oldestMessage = nonPendingMessages[0];
    if (!oldestMessage?.timestamp) {
      setHasMoreOlderMessages(false);
      return;
    }

    setIsLoadingOlderMessages(true);
    try {
      const olderMessages = await ChannelMessageService.fetchOlderMessages(
        channelId,
        workspaceId,
        oldestMessage.timestamp,
        MESSAGE_PAGINATION.OLDER_PAGE_SIZE
      );

      if (!isMountedRef.current) return;

      if (olderMessages.length === 0) {
        setHasMoreOlderMessages(false);
        return;
      }

      setHistoricalMessages((prev) => [...olderMessages, ...prev]);

      if (olderMessages.length < MESSAGE_PAGINATION.OLDER_PAGE_SIZE) {
        setHasMoreOlderMessages(false);
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to load older channel messages:', error);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoadingOlderMessages(false);
      }
    }
  }, [
    channelId,
    workspaceId,
    hasMoreOlderMessages,
    isLoadingOlderMessages,
    nonPendingMessages,
  ]);

  const handleStartReached = useCallback(() => {
    if (isInitialLoading || isLoadingOlderMessages || !hasMoreOlderMessages) {
      return;
    }

    handleLoadOlderMessages();
  }, [
    handleLoadOlderMessages,
    hasMoreOlderMessages,
    isInitialLoading,
    isLoadingOlderMessages,
  ]);

  useEffect(() => {
    const handleScrollToMessage = (event: CustomEvent<{ messageId: string }>) => {
      const currentCombinedMessages = combinedMessagesRef.current;
      const targetIndex = currentCombinedMessages.findIndex(
        (item) => item.message.id === event.detail.messageId
      );
      if (targetIndex >= 0) {
        const currentFirstItemIndex = START_INDEX - currentCombinedMessages.length;
        scrollToIndex(targetIndex + currentFirstItemIndex, { align: 'center', behavior: 'smooth' });
      }
    };

    window.addEventListener('scroll-to-message', handleScrollToMessage as EventListener);

    return () => {
      window.removeEventListener('scroll-to-message', handleScrollToMessage as EventListener);
    };
  }, [scrollToIndex]);

  // 메시지 전송
  const handleSendMessage = async (
    text: string,
    mentionedUserIds?: string[],
    attachments?: ChannelMessageAttachment[]
  ) => {
    if (!user || (!text.trim() && (!attachments || attachments.length === 0))) return;
    
    // 이름+직급 가져오기
    const senderDisplayName = getUserDisplayName(
      { displayName: user.displayName, email: user.email },
      { position: userProfile?.position },
      '사용자'
    );

    try {
      await ChannelMessageService.sendMessage(
        channelId,
        workspaceId,
        text,
        {
          uid: user.uid,
          displayName: senderDisplayName,
          photoURL: user.photoURL || undefined,
        },
        attachments,
        mentionedUserIds,
        undefined
      );
    } catch (error) {
      console.error('Failed to send channel message:', error);
      throw error; // 에러를 다시 throw하여 ChannelMessageComposer에서 처리할 수 있도록
    }
  };

  const handlePendingUploadStart = useCallback(
    (payload: PendingUploadPayload) => {
      if (!isMountedRef.current || isUsingExternalPending) return;
      const normalizedAttachments = payload.attachments.map((attachment) => {
        if (attachment.preview) {
          return attachment;
        }
        if (attachment.file) {
          return {
            ...attachment,
            preview: URL.createObjectURL(attachment.file),
          };
        }
        return attachment;
      });
      normalizedAttachments.forEach((attachment) => {
        if (attachment.preview) {
          pendingPreviewSetRef.current.add(attachment.preview);
        }
      });
      setInternalPendingUploads((prev) => [
        ...prev,
        {
          id: payload.id,
          attachments: normalizedAttachments,
          text: payload.text,
          mentionedUserIds: payload.mentionedUserIds,
          completed: 0,
          total: Math.max(normalizedAttachments.length, 1),
          createdAt: Date.now(),
          status: 'uploading',
          error: null,
          errorCode: null,
          timeoutAt: payload.timeoutAt ?? null,
          retryCount: payload.isRetry ? 1 : 0,
          totalBytes: payload.totalBytes ?? null,
          lastUpdatedAt: Date.now(),
        },
      ]);
    },
    [isUsingExternalPending]
  );

  const handlePendingUploadProgress = useCallback(
    (payload: PendingUploadProgressPayload) => {
      if (!isMountedRef.current || isUsingExternalPending) return;
      setInternalPendingUploads((prev) =>
        prev.map((item) =>
          item.id === payload.id
            ? {
                ...item,
                completed: Math.max(
                  item.completed,
                  Math.min(payload.total || item.total, payload.completed)
                ),
                total: payload.total || item.total,
              }
            : item
        )
      );
    },
    [isUsingExternalPending]
  );

  const removePendingUpload = useCallback(
    (id: string) => {
      if (!isMountedRef.current) return;
      setInternalPendingUploads((prev) => {
        const target = prev.find((item) => item.id === id);
        if (target) {
          const attachmentsToRelease = target.attachments;
          requestAnimationFrame(() => {
            releasePreviews(attachmentsToRelease);
          });
          attachmentsToRelease.forEach((attachment) => {
            if (attachment.preview) {
              pendingPreviewSetRef.current.delete(attachment.preview);
            }
          });
        }
        return prev.filter((item) => item.id !== id);
      });
    },
    [releasePreviews]
  );

  const handlePendingUploadComplete = useCallback(
    ({ id }: { id: string }) => {
      if (isUsingExternalPending) return;
      removePendingUpload(id);
    },
    [isUsingExternalPending, removePendingUpload]
  );

  const handlePendingUploadError = useCallback(
    ({ id }: { id: string }) => {
      if (isUsingExternalPending) return;
      removePendingUpload(id);
    },
    [isUsingExternalPending, removePendingUpload]
  );

  const hasMessages = combinedMessages.length > 0;
  const virtuosoKey = `${channelId}-${workspaceId}-${hasMessages ? 'ready' : 'empty'}`;
  const followOutputMode = isAtBottom ? 'auto' : false;

  // 채널 멤버 목록
  const channelMembers = useMemo(() => {
    return channel?.members || [];
  }, [channel?.members]);

  return (
    <div className="flex flex-col h-full min-w-0 relative overflow-hidden">
      <div className="flex-1 min-h-0 min-w-0 relative">
        {isInitialLoading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center gap-2 bg-background">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">메시지를 불러오는 중...</span>
          </div>
        )}
        {!isInitialLoading ? (
          combinedMessages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <p>첫 메시지를 보내 채널을 시작하세요</p>
            </div>
          ) : (
            <div className="h-full">
              <Virtuoso<CombinedChannelMessageItem>
                key={virtuosoKey}
                ref={virtuosoRef}
                style={{ height: '100%' }}
                data={combinedMessages}
                components={virtuosoComponents}
                followOutput={followOutputMode}
                increaseViewportBy={{ top: 400, bottom: 400 }}
                startReached={handleStartReached}
                firstItemIndex={firstItemIndex}
                initialTopMostItemIndex={START_INDEX - 1}
                atBottomStateChange={handleAtBottomStateChange}
                itemContent={(index: number, item: CombinedChannelMessageItem) => {
                  const currentMessage = item.message;
                  const isPending = item.type === 'pending';
                  const pendingAttachments = isPending ? item.pending.attachments : undefined;
                  const grouping = groupingMap.get(currentMessage.id);

                  const showAvatar = isPending ? false : grouping?.showAvatar ?? true;
                  const isFirstInGroup = isPending ? true : grouping?.isFirstInGroup ?? true;
                  const isLastInGroup = isPending ? true : grouping?.isLastInGroup ?? true;

                  const pendingProgress = (() => {
                    if (!isPending || !item.pending) {
                      return { completed: 0, total: 0 };
                    }
                    const total =
                      item.pending.total || Math.max(item.pending.attachments.length, 1);
                    const completed = Math.min(item.pending.completed, total);
                    return { completed, total };
                  })();

                  return (
                    <div
                      key={currentMessage.id}
                      id={`message-${currentMessage.id}`}
                      className="min-w-0 py-0.5"
                    >
                      <ChannelMessageComponent
                        message={currentMessage}
                        currentUserId={currentUserId}
                        showAvatar={showAvatar}
                        searchQuery={searchQuery}
                        channelMembers={channelMembers}
                        isFirstInGroup={isFirstInGroup}
                        isLastInGroup={isLastInGroup}
                        pendingUpload={
                          isPending
                            ? {
                                completed: pendingProgress.completed,
                                total: pendingProgress.total,
                              }
                            : undefined
                        }
                        userProfile={currentMessage.sender.uid ? userProfiles[currentMessage.sender.uid] || null : null}
                        pendingAttachments={pendingAttachments}
                        onThreadClick={onThreadClick}
                      />
                    </div>
                  );
                }}
                computeItemKey={(index, item) => item.message.id}
              />
            </div>
          )
        ) : null}
      </div>

      {/* 입력 영역 */}
      {!hideInput && (
        <>
          {composerAttachments.length > 0 && (
            <div className="border-t border-b bg-background px-4 py-2 min-w-0">
              <ChatAttachmentPreviewBar
                items={composerAttachments}
                onRemove={handleRemoveAttachment}
                disableRemove={isUploadingAttachments}
              />
            </div>
          )}
          <div
            className="flex-shrink-0 border-t bg-background p-4 min-w-0 sticky bottom-0 z-10"
          >
            <ChannelMessageComposer
              onSubmit={handleSendMessage}
              placeholder="메시지를 입력하세요..."
              disabled={!user}
              users={[]} // TODO: 채널 멤버 목록 전달
              currentUserUid={user?.uid}
              attachments={composerAttachments}
              onAttachmentsChange={handleAttachmentsChange}
              uploadFolder={`workspace/messages/${workspaceId}/${channelId}`}
              onUploadingStateChange={setIsUploadingAttachments}
              onPendingUploadStart={isUsingExternalPending ? undefined : handlePendingUploadStart}
              onUploadProgress={isUsingExternalPending ? undefined : handlePendingUploadProgress}
              onUploadComplete={isUsingExternalPending ? undefined : handlePendingUploadComplete}
              onUploadError={isUsingExternalPending ? undefined : handlePendingUploadError}
            />
          </div>
        </>
      )}
    </div>
  );
};

