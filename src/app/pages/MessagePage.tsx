/**
 * 메시지 페이지
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';
import { useChatStore } from '@/features/chat/store/chatStore';
import { useAuthStore } from '@/features/auth/store/authStore';
import { getAllUsersWithAuthInfo } from '@/shared/services/firebase/userManagement';
import { UserStatusService } from '@/features/chat/services/userStatusService';
import { 
  getCachedUsers, 
  setCachedUsers, 
  setCachedUserStatuses, 
  globalUsersRef, 
  getUserStatusUnsubscribe, 
  setUserStatusUnsubscribe,
  getUserInfo 
} from '@/features/chat/components/UserList';
import { useDeviceType } from '@/shared/hooks/use-device';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/shared/components/ui/sheet';
import { ChatSidebar } from '@/features/chat/components/ChatSidebar';
import { UserList } from '@/features/chat/components/UserList';
import { ChatRoomList } from '@/features/chat/components/ChatRoomList';
import { ChatRoomPageClient } from './ChatRoomPageClient';

export default function MessagePage() {
  return (
    <ProtectedRoute>
      <MessagePageClient />
    </ProtectedRoute>
  );
}

const MessagePageClient: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  const { temporaryRooms, removeChatRoom, removeTemporaryRoom, currentChatRoom } = useChatStore();
  const [isMounted, setIsMounted] = useState(false);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const { isSmartphone } = useDeviceType();
  const isMobile = isSmartphone;
  
  // URL 쿼리 파라미터에서 채팅방 ID 추출
  const chatRoomId = searchParams?.get('room') || null;
  const handleRoomSelect = (roomId: string) => {
    navigate(`/messages?room=${roomId}`);
  };
  
  // 사용자 정보 로드 확인
  useEffect(() => {
    const checkUsersLoaded = () => {
      const checkInterval = setInterval(() => {
        setUsersLoaded(true);
      }, 100);

      setTimeout(() => {
        clearInterval(checkInterval);
        setUsersLoaded(true);
      }, 2000);
    };

    checkUsersLoaded();
  }, []);
  
  // 다이렉트 메시지 방 이름 가져오기
  const getRoomName = () => {
    if (!currentChatRoom || !user?.uid) return '다이렉트 메시지';

    if (currentChatRoom.type === 'direct') {
      const otherParticipant = currentChatRoom.participants.find(
        (p) => p.uid !== user.uid
      );
      if (!otherParticipant) return '다이렉트 메시지';

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
  
  // 모바일에서 Sheet 열림 상태 관리 (chatRoomId 기반)
  const isSheetOpen = isMobile && !!chatRoomId;
  
  // Sheet 닫기 시 URL에서 room 파라미터 제거
  const handleSheetClose = (open: boolean) => {
    if (!open && isMobile && chatRoomId) {
      // URL에서 room 파라미터 제거
      navigate('/messages');
    }
  };

  // 사용자 목록 프리로드 (채팅 페이지 진입 시)
  useEffect(() => {
    if (!user?.uid || !isMounted) return;

    const { hasCachedUsers, cachedUsers: cachedUsersList } = getCachedUsers();
    
    // 캐시가 있으면 전역 참조에 즉시 할당하고 백그라운드에서 업데이트
    if (hasCachedUsers && cachedUsersList.length > 0) {
      // 전역 참조에 즉시 할당
      if (globalUsersRef.current) {
        globalUsersRef.current.users = cachedUsersList;
        globalUsersRef.current.loaded = true;
      }
      
      // 사용자 상태 구독도 미리 시작 (한 번만)
      if (!getUserStatusUnsubscribe()) {
        const userIds = cachedUsersList.map((u) => u.uid || '').filter(Boolean);
        if (userIds.length > 0) {
          const unsubscribe = UserStatusService.subscribeToMultipleUserStatus(
            userIds,
            (statuses) => {
              const onlineMap: Record<string, boolean> = {};
              Object.entries(statuses).forEach(([uid, status]) => {
                onlineMap[uid] = status.status === 'online';
              });
              // 캐시된 상태 업데이트
              setCachedUserStatuses(onlineMap);
            }
          );
          setUserStatusUnsubscribe(unsubscribe);
        }
      }
      
      // 백그라운드에서 최신 정보 업데이트 (사용자 경험을 방해하지 않음)
      getAllUsersWithAuthInfo()
        .then((userList) => {
          const filteredUsers = userList.filter((u) => u.uid !== user.uid);
          
          // 모듈 레벨 캐시에 저장 (UserList에서 사용)
          setCachedUsers(filteredUsers);
          
          // 전역 참조에도 할당
          if (globalUsersRef.current) {
            globalUsersRef.current.users = filteredUsers;
            globalUsersRef.current.loaded = true;
          }
        })
        .catch((error) => {
          // 에러가 발생해도 앱이 계속 작동하도록 조용히 처리
          if (process.env.NODE_ENV === 'development') {
            console.warn('Failed to update users in background:', error);
          }
        });
    } else {
      // 캐시가 없으면 미리 로드
      const loadUsers = async () => {
        try {
          const userList = await getAllUsersWithAuthInfo();
          const filteredUsers = userList.filter((u) => u.uid !== user.uid);
          
          // 모듈 레벨 캐시에 저장 (UserList에서 사용)
          setCachedUsers(filteredUsers);
          
          // 전역 참조에도 할당
          if (globalUsersRef.current) {
            globalUsersRef.current.users = filteredUsers;
            globalUsersRef.current.loaded = true;
          }
          
          // 사용자 상태 구독도 미리 시작 (한 번만)
          if (!getUserStatusUnsubscribe()) {
            const userIds = filteredUsers.map((u) => u.uid || '').filter(Boolean);
            if (userIds.length > 0) {
              const unsubscribe = UserStatusService.subscribeToMultipleUserStatus(
                userIds,
                (statuses) => {
                  const onlineMap: Record<string, boolean> = {};
                  Object.entries(statuses).forEach(([uid, status]) => {
                    onlineMap[uid] = status.status === 'online';
                  });
                  // 캐시된 상태 업데이트
                  setCachedUserStatuses(onlineMap);
                }
              );
              setUserStatusUnsubscribe(unsubscribe);
            }
          }
        } catch (error) {
          // 에러가 발생해도 앱이 계속 작동하도록 조용히 처리
          // 서버 측 500 에러는 Firebase Functions의 문제이므로, 
          // 사용자 목록은 UserList 컴포넌트에서 로드될 때 다시 시도됩니다.
          // 여기서는 조용히 실패하도록 처리합니다.
          if (process.env.NODE_ENV === 'development') {
            console.warn('Failed to preload users (will retry when UserList loads):', error);
          }
        }
      };
      
      loadUsers();
    }
  }, [user?.uid, isMounted]);

  // 임시 채팅방 정리 (메인 페이지로 돌아왔을 때)
  useEffect(() => {
    temporaryRooms.forEach((room) => {
      removeChatRoom(room.id);
      removeTemporaryRoom(room.id);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 클라이언트 마운트 확인 (hydration 오류 방지)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 사용자가 없으면 로그인 페이지로 리다이렉트 (클라이언트에서만)
  useEffect(() => {
    if (isMounted && !user) {
      navigate('/login');
    }
  }, [isMounted, user, navigate]);

  // 서버 사이드에서는 항상 동일한 구조 렌더링 (hydration 오류 방지)
  if (!isMounted) {
    return (
      <div className="flex h-full min-w-0 w-full max-w-full">
        <div className="flex-shrink-0" style={{ width: '300px' }} />
        <div className="flex-1 min-w-0 flex items-center justify-center bg-muted/30">
          <div className="text-center text-muted-foreground">
            <p className="text-lg">다이렉트 메시지 방을 선택하거나 새로 만들어주세요</p>
          </div>
        </div>
      </div>
    );
  }

  // 클라이언트에서 사용자가 없으면 null (리다이렉트 처리 중)
  if (!user) {
    return null;
  }

  // 모바일 레이아웃
  if (isMobile) {
    return (
      <>
        {/* 모바일: 사이드바만 전체 화면으로 표시 */}
        <div className="flex h-full min-w-0 w-full max-w-full">
          <ChatSidebar className="flex-shrink-0 w-full" />
        </div>
        
        {/* 모바일: 채팅방 Sheet */}
        {chatRoomId && (
          <Sheet open={isSheetOpen} onOpenChange={handleSheetClose}>
            <SheetContent 
              side="right" 
              className="w-full sm:w-full p-0 flex flex-col"
              fullscreen
              hideClose={true}
            >
              <SheetTitle className="sr-only">{getRoomName()}</SheetTitle>
              <SheetDescription className="sr-only">다이렉트 메시지</SheetDescription>
              <ChatRoomPageClient chatRoomId={chatRoomId} isMobile={true} />
            </SheetContent>
          </Sheet>
        )}
      </>
    );
  }

  const desktopChatArea = chatRoomId ? (
    <ChatRoomPageClient chatRoomId={chatRoomId} isMobile={false} />
  ) : (
    <div className="flex h-full w-full items-center justify-center bg-muted/30">
      <div className="text-center text-muted-foreground">
        <p className="text-lg">채팅방을 선택하거나 새로 만들어주세요</p>
      </div>
    </div>
  );

  return (
    <div className="flex h-full min-w-0 w-full max-w-full">
      <aside className="flex h-full w-[300px] flex-shrink-0 flex-col border-r bg-background">
        <div className="flex-shrink-0 border-b px-4 py-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          사용자 목록
        </div>
        <div className="flex-1 min-h-0">
          <UserList />
        </div>
      </aside>
      <aside className="flex h-full w-[300px] flex-shrink-0 flex-col border-r bg-background">
        <div className="flex-shrink-0 border-b px-4 py-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          다이렉트 메시지 목록
        </div>
        <div className="flex-1 min-h-0">
          <ChatRoomList onRoomClick={handleRoomSelect} />
        </div>
      </aside>
      <main className="flex-1 min-w-0 h-full flex">
        {desktopChatArea}
      </main>
    </div>
  );
};

