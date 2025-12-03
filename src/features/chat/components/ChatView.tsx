/**
 * 채팅 뷰 컴포넌트
 * 메시지 목록 표시 및 실시간 구독
 */

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { useChatStore } from '../store/chatStore';
import { ChatService } from '../services/chatService';
import { ChatMessageComponent } from './ChatMessage';
import { ChatAttachmentPreviewBar } from '@/shared/components/common/ChatAttachmentPreviewBar';
import { ChatComposer } from './ChatComposer';
import { useAuthStore } from '@/features/auth/store/authStore';
import { getUserDisplayName } from '@/shared/utils/userUtils';
import { MESSAGE_PAGINATION } from '../constants';
import { getCachedMessages, setCachedMessages } from '../utils/chatCache';
import type { ChatMessage, MessageAttachment } from '../types/chat.types';
import type { UploadingImageItem } from '@/shared/components/common/UploadingImageGrid';
import { cn } from '@/shared/lib/utils';
import type {
  PendingUpload,
  PendingUploadPayload,
  PendingUploadProgressPayload,
} from '../types/pendingUpload.types';
import { Loader2 } from 'lucide-react';
import {
  buildCombinedMessages,
  CombinedMessageItem,
  createMessageGroupingMap,
  mergeHistoricalMessages,
} from '../utils/chatMessageUtils';
import { ReactionService } from '@/features/workspace/services/reactionService';
import type { MessageReaction } from '@/features/workspace/types';

export interface ChatViewProps {
  chatRoomId: string;
  searchQuery?: string;
  currentUserId: string;
  onSearchResultsChange?: (results: Array<{ id: string; index: number }>) => void;
  hideInput?: boolean;
  pendingUploadsOverride?: PendingUpload[];
  channelId?: string; // 워크스페이스 채널 ID
  workspaceId?: string; // 워크스페이스 ID
  onThreadClick?: (messageId: string) => void; // 스레드 클릭 핸들러
}

const START_INDEX = 1_000_000;

export const ChatView: React.FC<ChatViewProps> = ({
  chatRoomId,
  searchQuery = '',
  currentUserId,
  onSearchResultsChange,
  hideInput = false,
  pendingUploadsOverride,
  channelId,
  workspaceId,
  onThreadClick,
}) => {
  const navigate = useNavigate();
// ... existing code ...
  const { user, userProfile } = useAuthStore();
  const {
    messages,
    setMessages,
    currentChatRoom,
    temporaryRooms,
  } = useChatStore();
  const [composerAttachments, setComposerAttachments] = useState<UploadingImageItem[]>([]);
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);
  const attachmentsRef = useRef<UploadingImageItem[]>([]);
  const [internalPendingUploads, setInternalPendingUploads] = useState<PendingUpload[]>([]);
  const internalPendingRef = useRef<PendingUpload[]>([]);
  const pendingPreviewSetRef = useRef<Set<string>>(new Set());
  const virtuosoRef = useRef<VirtuosoHandle | null>(null);
  const isUsingExternalPending = typeof pendingUploadsOverride !== 'undefined';
  const pendingUploads = isUsingExternalPending ? (pendingUploadsOverride ?? []) : internalPendingUploads;
  const [historicalMessages, setHistoricalMessages] = useState<ChatMessage[]>([]);
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false);
  const [hasMoreOlderMessages, setHasMoreOlderMessages] = useState(true);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isAtBottom, setIsAtBottom] = useState(true);
  // combinedMessages는 아래에서 정의되므로 초기값은 빈 배열로 설정하고 useEffect에서 동기화합니다.
  const combinedMessagesRef = useRef<CombinedMessageItem[]>([]);
  const isMountedRef = useRef(true);
  const [messageReactions, setMessageReactions] = useState<Map<string, MessageReaction[]>>(new Map());

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
  }, [chatRoomId, isUsingExternalPending, releasePreviews]);

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
    setHistoricalMessages([]);
    setHasMoreOlderMessages(true);
    setIsLoadingOlderMessages(false);
    setIsInitialLoading(true);
    setIsAtBottom(true);
  }, [chatRoomId, isUsingExternalPending, releasePreviews]);

  const roomMessages = useMemo(() => {
    if (!chatRoomId || chatRoomId === 'new') return [];
    return messages[chatRoomId] || [];
  }, [messages, chatRoomId]);

  const nonPendingMessages = useMemo(
    () => mergeHistoricalMessages(historicalMessages, roomMessages),
    [historicalMessages, roomMessages]
  );

  const { combinedMessages } = useMemo(
    () =>
      buildCombinedMessages({
        nonPendingMessages,
        pendingUploads,
        chatRoomId,
        currentUserId,
        currentUserDisplayName,
        currentUserPhotoURL,
      }),
    [
      nonPendingMessages,
      pendingUploads,
      chatRoomId,
      currentUserId,
      currentUserDisplayName,
      currentUserPhotoURL,
    ]
  );

  useEffect(() => {
    combinedMessagesRef.current = combinedMessages;
  }, [combinedMessages]);

  const START_INDEX = 1_000_000;

  // Virtuoso firstItemIndex 계산 (역방향 스크롤 시 위치 유지를 위함)
  const firstItemIndex = START_INDEX - combinedMessages.length;

  const groupingMap = useMemo(
    () => createMessageGroupingMap(nonPendingMessages),
    [nonPendingMessages]
  );

  // 채널 메시지인 경우 반응 구독
  useEffect(() => {
    if (!channelId || !workspaceId || nonPendingMessages.length === 0) return;

    const unsubscribes: (() => void)[] = [];

    nonPendingMessages.forEach((message) => {
      const unsubscribe = ReactionService.subscribeToMessageReactions(
        message.id,
        (reactions) => {
          setMessageReactions((prev) => {
            const newMap = new Map(prev);
            newMap.set(message.id, reactions);
            return newMap;
          });
        },
        (error) => {
          console.error(`Error subscribing to reactions for message ${message.id}:`, error);
        }
      );
      unsubscribes.push(unsubscribe);
    });

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [channelId, workspaceId, nonPendingMessages]);

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

  const virtuosoComponents = useMemo(() => {
    const Scroller = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
      ({ className, style, children, ...props }, ref) => (
        <div
          {...props}
          ref={ref}
          style={style}
          className={cn('h-full w-full overflow-y-auto', className)}
          data-chat-virtuoso-scroller
        >
          {children}
        </div>
      )
    );
    Scroller.displayName = 'ChatVirtuosoScroller';

    const List = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
      ({ className, style, children, ...props }, ref) => (
        <div
          {...props}
          ref={ref}
          style={style}
          className={cn('py-2 px-0 min-w-0', className)}
        >
          {children}
        </div>
      )
    );
    List.displayName = 'ChatVirtuosoList';

    const Header: React.FC = () => {
      if (isInitialLoading) {
        return null;
      }

      if (isLoadingOlderMessages) {
        return (
          <div className="flex justify-center py-2 text-xs text-muted-foreground">
            이전 메시지를 불러오는 중...
          </div>
        );
      }

      if (!hasMoreOlderMessages) {
        return (
          <div className="flex justify-center py-2 text-xs text-muted-foreground">
            더 이상 이전 메시지가 없습니다
          </div>
        );
      }

      return null;
    };

    return { Scroller, List, Header };
  }, [hasMoreOlderMessages, isInitialLoading, isLoadingOlderMessages]);

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
    if (!chatRoomId || chatRoomId === 'new') {
      setMessages(chatRoomId, []);
      setIsInitialLoading(false);
      return;
    }

    if (chatRoomId.startsWith('temp_')) {
      setMessages(chatRoomId, []);
      setIsInitialLoading(false);
      return;
    }

    let unsubscribeFn: (() => void) | undefined;

    setIsInitialLoading(true);

    // 채널 메시지인 경우 ChannelMessageService 사용
    if (channelId && workspaceId) {
      const fetchAndSubscribe = async () => {
        try {
          const { ChannelMessageService } = await import('@/features/workspace/services/channelMessageService');
          
          const initialMessages = await ChannelMessageService.fetchInitialMessages(
            chatRoomId,
            MESSAGE_PAGINATION.INITIAL_BATCH
          );
          
          if (!isMountedRef.current) return;

          setMessages(chatRoomId, initialMessages);
          setHasMoreOlderMessages(initialMessages.length === MESSAGE_PAGINATION.INITIAL_BATCH);
          
          if (!isMountedRef.current) return;

          const unsub = ChannelMessageService.subscribeToChannelMessages(
            chatRoomId,
            async (newMessages) => {
              if (!isMountedRef.current) return;

              setMessages(chatRoomId, newMessages);

              if (!currentUserId) return;
              
              const unreadMessages = newMessages.filter(
                (msg) => msg.sender.uid !== currentUserId && !msg.readBy.includes(currentUserId)
              );
              
              if (unreadMessages.length > 0) {
                const markAsReadPromises = unreadMessages.map((msg) =>
                  ChannelMessageService.markMessageAsRead(chatRoomId, msg.id, currentUserId).catch((markError) => {
                    if (process.env.NODE_ENV === 'development') {
                      console.warn(`Failed to mark message ${msg.id} as read:`, markError);
                    }
                  })
                );
                
                await Promise.allSettled(markAsReadPromises);
              }
            },
            (error) => {
              console.error('Failed to subscribe to channel messages:', error);
            },
            MESSAGE_PAGINATION.INITIAL_BATCH
          );

          if (!isMountedRef.current) {
            unsub();
            return;
          }

          unsubscribeFn = unsub;
          setIsInitialLoading(false);
        } catch (error) {
          console.error('Failed to fetch initial channel messages:', error);
          if (isMountedRef.current) {
            setIsInitialLoading(false);
            // 에러 발생 시 빈 메시지 배열 설정
            setMessages(chatRoomId, []);
            setHasMoreOlderMessages(false);
          }
        }
      };

      fetchAndSubscribe();

      return () => {
        if (unsubscribeFn) {
          unsubscribeFn();
        }
      };
    }

    // 기존 Chat 메시지 (하위 호환성)
    const cached = getCachedMessages(chatRoomId);
    if (cached && cached.length > 0) {
      setMessages(chatRoomId, cached);
    }

    const fetchAndSubscribe = async () => {
      try {
        const initialMessages = await ChatService.fetchInitialMessages(
          chatRoomId,
          MESSAGE_PAGINATION.INITIAL_BATCH
        );
        
        if (!isMountedRef.current) return;

        setMessages(chatRoomId, initialMessages);
        setCachedMessages(chatRoomId, initialMessages);
        setHasMoreOlderMessages(initialMessages.length === MESSAGE_PAGINATION.INITIAL_BATCH);
        
        if (!isMountedRef.current) return;

        const unsub = ChatService.subscribeToMessages(
          chatRoomId,
          async (newMessages) => {
            if (!isMountedRef.current) return;

            setMessages(chatRoomId, newMessages);
            setCachedMessages(chatRoomId, newMessages);

            if (!currentUserId) return;
            
            const unreadMessages = newMessages.filter(
              (msg) => msg.sender.uid !== currentUserId && !msg.readBy.includes(currentUserId)
            );
            
            if (unreadMessages.length > 0) {
              const markAsReadPromises = unreadMessages.map((msg) =>
                ChatService.markMessageAsRead(chatRoomId, msg.id, currentUserId).catch((markError) => {
                  if (process.env.NODE_ENV === 'development') {
                    console.warn(`Failed to mark message ${msg.id} as read:`, markError);
                  }
                })
              );
              
              await Promise.allSettled(markAsReadPromises);
            }
          },
          (error) => {
            console.error('Failed to subscribe to messages:', error);
          },
          MESSAGE_PAGINATION.INITIAL_BATCH
        );

        if (!isMountedRef.current) {
          unsub();
          return;
        }

        unsubscribeFn = unsub;
        setIsInitialLoading(false);
      } catch (error) {
        if (isMountedRef.current && process.env.NODE_ENV === 'development') {
          console.error('Failed to fetch initial messages:', error);
        }
      }
    };

    fetchAndSubscribe();

    return () => {
      if (unsubscribeFn) {
        unsubscribeFn();
      }
    };
  }, [chatRoomId, currentUserId, setMessages, channelId, workspaceId]);
  const handleLoadOlderMessages = useCallback(async () => {
    if (isLoadingOlderMessages || !hasMoreOlderMessages) return;
    if (!chatRoomId) return;

    const oldestMessage = nonPendingMessages[0];
    if (!oldestMessage?.timestamp) {
      setHasMoreOlderMessages(false);
      return;
    }

    setIsLoadingOlderMessages(true);
    try {
      const olderMessages = await ChatService.fetchOlderMessages(
        chatRoomId,
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
        console.error('Failed to load older messages:', error);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoadingOlderMessages(false);
      }
    }
  }, [
    chatRoomId,
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
        // 0-based index를 START_INDEX 기반 절대 인덱스로 변환
        // START_INDEX는 컴포넌트 외부에 정의되어 있거나 상단에 정의됨 (1_000_000)
        const currentFirstItemIndex = 1_000_000 - currentCombinedMessages.length;
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
    attachments?: MessageAttachment[]
  ) => {
    if (!user || (!text.trim() && (!attachments || attachments.length === 0))) return;

    // 이름+직급 가져오기 (UserList에서 사용하는 방식과 동일)
    const senderDisplayName = getUserDisplayName(
      { displayName: user.displayName, email: user.email },
      { position: userProfile?.position },
      '사용자'
    );

    try {
      // 채널 메시지인 경우 ChannelMessageService 사용
      if (channelId && workspaceId) {
        const { ChannelMessageService } = await import('@/features/workspace/services/channelMessageService');
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
          mentionedUserIds
        );
        return;
      }

      // 기존 Chat 메시지 (하위 호환성)
      const tempRoom = temporaryRooms.find((r) => r.id === chatRoomId);
      
      const result = await ChatService.sendMessage(
        chatRoomId,
        text,
        {
          uid: user.uid,
          displayName: senderDisplayName,
          photoURL: user.photoURL || undefined,
        },
        attachments,
        mentionedUserIds,
        undefined,
        tempRoom
      );

      // 임시 채팅방인 경우 저장된 채팅방 ID로 URL 업데이트
      if (tempRoom && result.roomId !== chatRoomId) {
        navigate(`/chat?room=${result.roomId}`);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
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
  const virtuosoKey = `${chatRoomId}-${hasMessages ? 'ready' : 'empty'}`;
  const followOutputMode = isAtBottom ? 'auto' : false;

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
              <p>첫 메시지를 보내 채팅을 시작하세요</p>
            </div>
          ) : (
            <div className="h-full">
              <Virtuoso<CombinedMessageItem>
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
                itemContent={(index: number, item: CombinedMessageItem) => {
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
                      <ChatMessageComponent
                        message={currentMessage}
                        currentUserId={currentUserId}
                        showAvatar={showAvatar}
                        searchQuery={searchQuery}
                        participants={currentChatRoom?.participants || []}
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
                        pendingAttachments={pendingAttachments}
                        channelId={channelId}
                        workspaceId={workspaceId}
                        onThreadClick={onThreadClick}
                        reactions={channelId && workspaceId ? (messageReactions.get(currentMessage.id) || []) : undefined}
                        onAddReaction={channelId && workspaceId ? async (messageId, emoji) => {
                          if (!user?.uid) return;
                          try {
                            await ReactionService.addReaction({
                              messageId,
                              channelId,
                              workspaceId,
                              emoji,
                              userId: user.uid,
                            });
                          } catch (error) {
                            console.error('Failed to add reaction:', error);
                          }
                        } : undefined}
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
            <ChatComposer
              onSubmit={handleSendMessage}
              placeholder="메시지를 입력하세요..."
              disabled={!user}
              users={[]} // TODO: 채팅방 참여자 목록 전달
              currentUserUid={user?.uid}
              attachments={composerAttachments}
              onAttachmentsChange={handleAttachmentsChange}
              uploadFolder={`chat/messages/${chatRoomId}`}
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

