/**
 * 개별 채팅방 페이지 클라이언트 컴포넌트
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChatView } from '@/features/chat/components/ChatView';
import { ChatComposer } from '@/features/chat/components/ChatComposer';
import { ChatAttachmentPreviewBar } from '@/shared/components/common/ChatAttachmentPreviewBar';
import type { UploadingImageItem } from '@/shared/components/common/UploadingImageGrid';
import { useChatStore } from '@/features/chat/store/chatStore';
import { useAuthStore } from '@/features/auth/store/authStore';
import { ChatService } from '@/features/chat/services/chatService';
import { getUserInfo } from '@/features/chat/components/UserList';
import { getUserDisplayName } from '@/shared/utils/userUtils';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { Search, ChevronUp, ChevronDown, ArrowLeft, X } from 'lucide-react';
import { SheetHeader, SheetFooter } from '@/shared/components/ui/sheet';
import type { MessageAttachment } from '@/features/chat/types/chat.types';
import type {
  PendingUpload,
  PendingUploadPayload,
  PendingUploadProgressPayload,
} from '@/features/chat/types/pendingUpload.types';

export interface ChatRoomPageClientProps {
  chatRoomId: string;
  isMobile?: boolean;
}

export const ChatRoomPageClient: React.FC<ChatRoomPageClientProps> = ({
  chatRoomId,
  isMobile = false,
}) => {
  const navigate = useNavigate();
  const { user, userProfile } = useAuthStore();
  const { currentChatRoom, setCurrentChatRoom, temporaryRooms, setMessages } = useChatStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<{ id: string; index: number }>>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [composerAttachments, setComposerAttachments] = useState<UploadingImageItem[]>([]);
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);
  const attachmentsRef = useRef<UploadingImageItem[]>([]);
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const pendingUploadsRef = useRef<PendingUpload[]>([]);
  const pendingPreviewSetRef = useRef<Set<string>>(new Set());

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
    pendingUploadsRef.current = pendingUploads;
  }, [pendingUploads]);

  useEffect(() => {
    return () => {
      releasePreviews(attachmentsRef.current);
      pendingUploadsRef.current.forEach((pending) => releasePreviews(pending.attachments));
      pendingUploadsRef.current = [];
      pendingPreviewSetRef.current.clear();
    };
  }, [releasePreviews]);

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

  const handleAttachmentsChange = useCallback((next: UploadingImageItem[]) => {
    const activePendingPreviews = new Set<string>();
    pendingUploadsRef.current.forEach((pending) => {
      pending.attachments.forEach((attachment) => {
        if (attachment.preview) {
          activePendingPreviews.add(attachment.preview);
        }
      });
    });
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
  }, []);

  useEffect(() => {
    releasePreviews(attachmentsRef.current);
    setComposerAttachments([]);
    setIsUploadingAttachments(false);
    setPendingUploads((prev) => {
      if (prev.length > 0) {
        prev.forEach((pending) => releasePreviews(pending.attachments));
      }
      return [];
    });
    pendingPreviewSetRef.current.clear();
  }, [chatRoomId, releasePreviews]);

  const handlePendingUploadStart = useCallback((payload: PendingUploadPayload) => {
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
    setPendingUploads((prev) => [
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
  }, []);

  const handlePendingUploadProgress = useCallback((payload: PendingUploadProgressPayload) => {
    setPendingUploads((prev) =>
      prev.map((item) =>
        item.id === payload.id
          ? {
              ...item,
              completed: Math.max(
                item.completed,
                Math.min(payload.total || item.total, payload.completed)
              ),
              total: payload.total || item.total,
              lastUpdatedAt: payload.timestamp ?? Date.now(),
            }
          : item
      )
    );
  }, []);

  const removePendingUpload = useCallback(
    (id: string) => {
      setPendingUploads((prev) => {
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

  const handlePendingUploadComplete = useCallback(({ id }: { id: string }) => {
    removePendingUpload(id);
  }, [removePendingUpload]);

  const handlePendingUploadError = useCallback(({ id }: { id: string }) => {
    removePendingUpload(id);
  }, [removePendingUpload]);
  
  // 검색 결과가 변경되면 첫 번째 결과로 이동
  useEffect(() => {
    if (searchResults.length > 0) {
      setCurrentSearchIndex(0);
      const messageId = searchResults[0].id;
      // 약간의 지연을 두어 ChatView가 메시지를 렌더링한 후 스크롤
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('scroll-to-message', { detail: { messageId } }));
      }, 100);
    } else {
      setCurrentSearchIndex(0);
    }
  }, [searchResults.length > 0 ? searchResults.map(r => r.id).join(',') : '']);
  
  // 검색 아이콘 클릭 핸들러
  const handleSearchIconClick = () => {
    setIsSearchOpen(true);
    // 애니메이션 후 포커스
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  };
  
  // 검색바 닫기 (검색어가 비어있을 때만)
  const handleSearchBlur = () => {
    if (!searchQuery.trim()) {
      setIsSearchOpen(false);
    }
  };
  
  // ESC 키로 검색바 닫기
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      if (!searchQuery.trim()) {
        setIsSearchOpen(false);
      } else {
        setSearchQuery('');
      }
    }
  };

  // 검색어 초기화 핸들러
  const handleClearSearch = () => {
    setSearchQuery('');
    setIsSearchOpen(false);
  };

  // 사용자 정보 로드 확인
  useEffect(() => {
    const checkUsersLoaded = () => {
      const checkInterval = setInterval(() => {
        // UserList의 globalUsersRef를 확인
        setUsersLoaded(true); // 일단 true로 설정
      }, 100);

      setTimeout(() => {
        clearInterval(checkInterval);
        setUsersLoaded(true);
      }, 2000);
    };

    checkUsersLoaded();
  }, []);

  // 채팅방 로드
  useEffect(() => {
    if (!chatRoomId || !user?.uid) return;

    // 임시 채팅방인 경우
    if (chatRoomId.startsWith('temp_')) {
      const tempRoom = temporaryRooms.find((r) => r.id === chatRoomId);
      if (tempRoom) {
        setCurrentChatRoom({
          id: tempRoom.id,
          type: tempRoom.type,
          participants: tempRoom.participants,
          createdBy: user.uid,
          createdAt: tempRoom.createdAt,
          updatedAt: tempRoom.createdAt,
        });
      }
      return;
    }

    // Firestore에서 채팅방 로드
    const loadChatRoom = async () => {
      try {
        const room = await ChatService.getChatRoom(chatRoomId);
        if (room) {
          setCurrentChatRoom(room);
        } else {
          // 채팅방이 없으면 메인 페이지로 리다이렉트
          navigate('/messages');
        }
      } catch (error) {
        console.error('Failed to load chat room:', error);
        navigate('/messages');
      }
    };

    loadChatRoom();
  }, [chatRoomId, user?.uid, navigate, setCurrentChatRoom, temporaryRooms]);

  useEffect(() => {
    if (!chatRoomId || chatRoomId.startsWith('temp_')) return;

    let cancelled = false;

    const preloadMessages = async () => {
      try {
        const initialMessages = await ChatService.fetchInitialMessages(chatRoomId, 50);
        if (!cancelled) {
          setMessages(chatRoomId, initialMessages);
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Failed to preload messages:', error);
        }
      }
    };

    preloadMessages();

    return () => {
      cancelled = true;
    };
  }, [chatRoomId, setMessages]);

  // 채팅방 이름 가져오기
  const getRoomName = () => {
    if (!currentChatRoom || !user?.uid) return '채팅방';

    if (currentChatRoom.type === 'direct') {
      const otherParticipant = currentChatRoom.participants.find(
        (p) => p.uid !== user.uid
      );
      if (!otherParticipant) return '채팅방';

      if (usersLoaded) {
        const userInfo = getUserInfo(otherParticipant.uid);
        if (userInfo?.displayName) {
          return userInfo.displayName;
        }
      }

      return otherParticipant.displayName || '사용자';
    }

    return currentChatRoom.name || '그룹 채팅';
  };

  if (!currentChatRoom) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted/20">
        <div className="text-sm text-muted-foreground">로딩 중...</div>
      </div>
    );
  }

  // 채팅 메시지 전송 핸들러
  const handleSendMessage = async (
    text: string,
    mentionedUserIds?: string[],
    attachments?: MessageAttachment[]
  ) => {
    if (!user || !currentChatRoom) return;

    // 이름+직급 가져오기 (UserList에서 사용하는 방식과 동일)
    const senderDisplayName = getUserDisplayName(
      { displayName: user.displayName, email: user.email },
      { position: userProfile?.position },
      '사용자'
    );

    const tempRoom = temporaryRooms.find((r) => r.id === chatRoomId);

    try {
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

      // 임시 채팅방이었다면 실제 채팅방 ID로 URL 업데이트
      if (tempRoom && result.roomId !== chatRoomId) {
        navigate(`/messages?room=${result.roomId}`);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  // Sheet 닫기 핸들러 (모바일)
  const handleSheetClose = () => {
    if (isMobile) {
      navigate('/messages');
    }
  };

  // 검색어가 있으면 검색바가 확장되어 채팅방 이름 영역까지 차지 (모바일만)
  const hasSearchQuery = searchQuery.trim().length > 0;
  const shouldShowRoomName = isMobile ? (!hasSearchQuery && !isSearchOpen) : true;

  // 헤더 컨텐츠
  const headerContent = (
    <div className="flex items-center gap-4 min-w-0">
      {isMobile && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSheetClose}
          className="flex-shrink-0 -ml-2"
          aria-label="뒤로가기"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      )}
      {/* 채팅방 이름 */}
      {shouldShowRoomName && (
        isMobile ? (
          // 모바일: 뒤로가기 옆에 채팅방 이름 좌측 정렬
          <h1 className="text-lg font-semibold truncate min-w-0">
            {getRoomName()}
          </h1>
        ) : (
          // 데스크탑: 기존 레이아웃 유지
          <h1 className="text-lg font-semibold truncate flex-1 min-w-0">
            {getRoomName()}
          </h1>
        )
      )}
      {/* 검색 결과 네비게이션 (데스크탑: 검색바 좌측) */}
      {!isMobile && searchResults.length > 0 && (
        <div className="flex-shrink-0 flex items-center justify-between gap-2 min-w-[120px]">
          {/* 검색 결과 숫자 좌측 정렬 */}
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {currentSearchIndex + 1} / {searchResults.length}
          </span>
          {/* 화살표 우측 정렬 (검색 결과가 최신부터 오래된 순서이므로 반대로 동작) */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                // 위쪽 화살표: 더 오래된 메시지로 (인덱스 증가)
                if (currentSearchIndex < searchResults.length - 1) {
                  const newIndex = currentSearchIndex + 1;
                  setCurrentSearchIndex(newIndex);
                  const messageId = searchResults[newIndex].id;
                  window.dispatchEvent(new CustomEvent('scroll-to-message', { detail: { messageId } }));
                }
              }}
              disabled={currentSearchIndex === searchResults.length - 1}
              className="h-8 w-8"
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                // 아래쪽 화살표: 더 최신 메시지로 (인덱스 감소)
                if (currentSearchIndex > 0) {
                  const newIndex = currentSearchIndex - 1;
                  setCurrentSearchIndex(newIndex);
                  const messageId = searchResults[newIndex].id;
                  window.dispatchEvent(new CustomEvent('scroll-to-message', { detail: { messageId } }));
                }
              }}
              disabled={currentSearchIndex === 0}
              className="h-8 w-8"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      {/* 검색바 (모바일: 검색어가 있으면 확장, 데스크탑: 기존 크기 유지) */}
      <div 
        className={`relative flex items-center gap-2 transition-all duration-300 ease-in-out ${
          isMobile && (hasSearchQuery || isSearchOpen)
            ? 'flex-1 min-w-0' 
            : 'flex-shrink-0 ml-auto'
        }`}
        style={{ 
          width: isMobile && (isSearchOpen || hasSearchQuery) ? '100%' : (isSearchOpen ? '200px' : 'auto'),
          minWidth: isMobile && (isSearchOpen || hasSearchQuery) ? '0' : (isSearchOpen ? '200px' : 'auto'),
        }}
      >
        {!isSearchOpen && !hasSearchQuery && (
          <button
            onClick={handleSearchIconClick}
            className="p-2 hover:bg-muted rounded-md transition-colors flex-shrink-0"
            aria-label="검색"
          >
            <Search className="h-5 w-5 text-muted-foreground" />
          </button>
        )}
        {(isSearchOpen || hasSearchQuery) && (
          <div className={`relative overflow-visible ${isMobile ? 'w-full' : 'w-[200px]'}`}>
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
            <Input
              ref={searchInputRef}
              placeholder="메시지 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onBlur={handleSearchBlur}
              onKeyDown={handleSearchKeyDown}
              className="pl-9 pr-9 relative z-20 w-full"
            />
            {searchQuery.trim() && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground z-30 flex items-center justify-center"
                aria-label="검색 초기화"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // 모바일일 때 Sheet 구조 사용
  if (isMobile) {
    return (
      <>
        <SheetHeader className="flex-shrink-0 border-b bg-background px-4 py-3 min-w-0 overflow-x-hidden">
          {headerContent}
        </SheetHeader>
        {/* 모바일: 검색 결과 네비게이션 (헤더 아래) */}
        {searchResults.length > 0 && (
          <div className="flex-shrink-0 border-b bg-background px-4 py-2 flex items-center justify-between gap-2">
            {/* 검색 결과 숫자 좌측 정렬 */}
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {currentSearchIndex + 1} / {searchResults.length}
            </span>
            {/* 화살표 우측 정렬 (검색 결과가 최신부터 오래된 순서이므로 반대로 동작) */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  // 위쪽 화살표: 더 오래된 메시지로 (인덱스 증가)
                  if (currentSearchIndex < searchResults.length - 1) {
                    const newIndex = currentSearchIndex + 1;
                    setCurrentSearchIndex(newIndex);
                    const messageId = searchResults[newIndex].id;
                    window.dispatchEvent(new CustomEvent('scroll-to-message', { detail: { messageId } }));
                  }
                }}
                disabled={currentSearchIndex === searchResults.length - 1}
                className="h-8 w-8"
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  // 아래쪽 화살표: 더 최신 메시지로 (인덱스 감소)
                  if (currentSearchIndex > 0) {
                    const newIndex = currentSearchIndex - 1;
                    setCurrentSearchIndex(newIndex);
                    const messageId = searchResults[newIndex].id;
                    window.dispatchEvent(new CustomEvent('scroll-to-message', { detail: { messageId } }));
                  }
                }}
                disabled={currentSearchIndex === 0}
                className="h-8 w-8"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
        <div className="flex-1 min-w-0 overflow-hidden">
          <ChatView
            chatRoomId={chatRoomId}
            searchQuery={searchQuery}
            currentUserId={user?.uid || ''}
            onSearchResultsChange={setSearchResults}
            hideInput={true}
            pendingUploadsOverride={pendingUploads}
          />
        </div>
        {composerAttachments.length > 0 && (
          <div className="flex-shrink-0 border-t border-b bg-background px-4 py-2 min-w-0">
            <ChatAttachmentPreviewBar
              items={composerAttachments}
              onRemove={handleRemoveAttachment}
              disableRemove={isUploadingAttachments}
            />
          </div>
        )}
        <SheetFooter className="flex-shrink-0 border-t bg-background p-4 min-w-0">
          <ChatComposer
            onSubmit={handleSendMessage}
            placeholder="메시지를 입력하세요..."
            disabled={!user}
            users={[]} // TODO: 채팅방 참여자 목록 전달
            currentUserUid={user?.uid}
            uploadFolder={`chat/messages/${chatRoomId}`}
            attachments={composerAttachments}
            onAttachmentsChange={handleAttachmentsChange}
            onUploadingStateChange={setIsUploadingAttachments}
            onPendingUploadStart={handlePendingUploadStart}
            onUploadProgress={handlePendingUploadProgress}
            onUploadComplete={handlePendingUploadComplete}
            onUploadError={handlePendingUploadError}
          />
        </SheetFooter>
      </>
    );
  }

  // 데스크톱 레이아웃
  return (
    <div className="flex h-full min-w-0 w-full max-w-full">
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* 헤더 */}
        <div className="flex-shrink-0 border-b bg-background px-4 py-3 min-w-0 overflow-x-hidden">
          {headerContent}
        </div>
        {/* 채팅 영역 (스크롤 가능) */}
        <div className="flex-1 min-h-0 min-w-0 overflow-hidden">
          <ChatView
            chatRoomId={chatRoomId}
            searchQuery={searchQuery}
            currentUserId={user?.uid || ''}
            onSearchResultsChange={setSearchResults}
            hideInput={true}
            pendingUploadsOverride={pendingUploads}
          />
        </div>
        {/* 입력 영역 (고정) */}
        <div className="flex-shrink-0 border-t bg-background p-4 min-w-0">
          <ChatAttachmentPreviewBar
            items={composerAttachments}
            onRemove={handleRemoveAttachment}
            className="px-1"
            disableRemove={isUploadingAttachments}
          />
          <ChatComposer
            onSubmit={handleSendMessage}
            placeholder="메시지를 입력하세요..."
            disabled={!user}
            users={[]} // TODO: 채팅방 참여자 목록 전달
            currentUserUid={user?.uid}
            uploadFolder={`chat/messages/${chatRoomId}`}
            attachments={composerAttachments}
            onAttachmentsChange={handleAttachmentsChange}
            onUploadingStateChange={setIsUploadingAttachments}
            onPendingUploadStart={handlePendingUploadStart}
            onUploadProgress={handlePendingUploadProgress}
            onUploadComplete={handlePendingUploadComplete}
            onUploadError={handlePendingUploadError}
          />
        </div>
      </div>
    </div>
  );
};


