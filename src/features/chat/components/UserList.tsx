/**
 * 사용자 목록 컴포넌트
 * 우클릭 메뉴, 즐겨찾기 기능 포함
 */

'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/shared/services/firebase/config';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { Input } from '@/shared/components/ui/input';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/shared/components/ui/context-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { Badge } from '@/shared/components/ui/badge';
import { Spinner } from '@/shared/components/ui/spinner';
import { useAuthStore } from '@/features/auth/store/authStore';
import { getAllUsersWithAuthInfo } from '@/shared/services/firebase/userManagement';
import { getUserDisplayName, getUserInitial } from '@/shared/utils/userUtils';
import { UserStatusService } from '../services/userStatusService';
import { ChatService } from '../services/chatService';
import { useChatStore } from '../store/chatStore';
import { MessageSquare, Star, Search } from 'lucide-react';
import type { UserManagementInfo } from '@/shared/services/firebase/userManagement';

// 모듈 레벨 캐시 (탭 전환 시 재로딩 방지)
let cachedUsers: UserManagementInfo[] = [];
let hasCachedUsers = false;
let cachedUserStatuses: Record<string, boolean> = {};
let userStatusUnsubscribe: (() => void) | null = null;

// 캐시 접근을 위한 export (프리로드용)
export const getCachedUsers = () => ({ cachedUsers, hasCachedUsers, cachedUserStatuses });
export const setCachedUsers = (users: UserManagementInfo[]) => {
  cachedUsers = users;
  hasCachedUsers = true;
};
export const setCachedUserStatuses = (statuses: Record<string, boolean>) => {
  cachedUserStatuses = statuses;
};
export const getUserStatusUnsubscribe = () => userStatusUnsubscribe;
export const setUserStatusUnsubscribe = (unsubscribe: (() => void) | null) => {
  userStatusUnsubscribe = unsubscribe;
};

// 전역 사용자 정보 참조 (다른 컴포넌트에서도 접근 가능)
export const globalUsersRef = React.createRef<{
  users: UserManagementInfo[];
  loaded: boolean;
}>();

export interface UserListProps {
  className?: string;
}

interface UserWithStatus extends UserManagementInfo {
  isOnline?: boolean;
}

export const UserList: React.FC<UserListProps> = ({ className }) => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const { addTemporaryRoom } = useChatStore();
  const [users, setUsers] = useState<UserWithStatus[]>([]);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [userStatuses, setUserStatuses] = useState<Record<string, boolean>>({});
  const [favorites, setFavorites] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // 전역 참조 업데이트
  const usersRef = useRef<{ users: UserManagementInfo[]; loaded: boolean }>({
    users: [],
    loaded: false,
  });

  // globalUsersRef 초기화
  useEffect(() => {
    if (!globalUsersRef.current) {
      (globalUsersRef as any).current = { users: [], loaded: false };
    }
  }, []);

  // 즐겨찾기 로드 및 구독 (Firestore)
  useEffect(() => {
    if (!currentUser?.uid || !db) return;

    const favoritesRef = doc(db, `users/${currentUser.uid}/chat/favorites`);

    // 초기 로드
    getDoc(favoritesRef).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setFavorites(data.favoriteUserIds || []);
      }
    });

    // 실시간 구독
    const unsubscribe = onSnapshot(
      favoritesRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setFavorites(data.favoriteUserIds || []);
        } else {
          setFavorites([]);
        }
      },
      (error) => {
        console.error('Failed to subscribe to favorites:', error);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [currentUser?.uid]);

  // 사용자 목록 로드 (캐시 활용)
  useEffect(() => {
    if (!currentUser?.uid) return;

    // 캐시가 있으면 즉시 표시
    if (hasCachedUsers && cachedUsers.length > 0) {
      setUsers(cachedUsers);
      setUserStatuses(cachedUserStatuses);
      usersRef.current = { users: cachedUsers, loaded: true };
      setUsersLoaded(true);

      // 전역 참조에 할당
      if (globalUsersRef.current) {
        globalUsersRef.current.users = cachedUsers;
        globalUsersRef.current.loaded = true;
      }
      return;
    }

    let retryCount = 0;
    const maxRetries = 3;

    const loadUsers = async () => {
      try {
        const userList = await getAllUsersWithAuthInfo();
        // 현재 사용자 제외
        const filteredUsers = userList.filter((u) => u.uid !== currentUser.uid);

        // 캐시에 저장
        cachedUsers = filteredUsers;
        hasCachedUsers = true;

        setUsers(filteredUsers);
        usersRef.current = { users: filteredUsers, loaded: true };
        setUsersLoaded(true);

        // 전역 참조에 할당
        if (globalUsersRef.current) {
          globalUsersRef.current.users = filteredUsers;
          globalUsersRef.current.loaded = true;
        }

        // 사용자 상태 구독 (한 번만)
        if (!userStatusUnsubscribe) {
          const userIds = filteredUsers.map((u) => u.uid);
          if (userIds.length > 0) {
            userStatusUnsubscribe = UserStatusService.subscribeToMultipleUserStatus(
              userIds,
              (statuses) => {
                const onlineMap: Record<string, boolean> = {};
                Object.entries(statuses).forEach(([uid, status]) => {
                  onlineMap[uid] = status.status === 'online';
                });
                cachedUserStatuses = onlineMap;
                setUserStatuses(onlineMap);
              }
            );
          }
        } else {
          // 이미 구독 중이면 캐시된 상태 사용
          setUserStatuses(cachedUserStatuses);
        }
      } catch (error) {
        console.error('Failed to load users:', error);
        retryCount++;
        if (retryCount < maxRetries) {
          setTimeout(loadUsers, 1000 * retryCount);
        } else {
          setUsersLoaded(true); // 에러가 나도 로딩 상태는 해제
        }
      }
    };

    loadUsers();
  }, [currentUser?.uid]);

  // 즐겨찾기 토글 (Firestore에 저장)
  const handleToggleFavorite = async (userId: string) => {
    if (!currentUser?.uid || !db) return;

    try {
      const favoritesRef = doc(db, `users/${currentUser.uid}/chat/favorites`);
      const newFavorites = favorites.includes(userId)
        ? favorites.filter((id) => id !== userId)
        : [...favorites, userId];

      await setDoc(
        favoritesRef,
        {
          favoriteUserIds: newFavorites,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      // 상태는 실시간 구독으로 자동 업데이트됨
    } catch (error) {
      console.error('Failed to update favorites:', error);
    }
  };

  // 채팅 시작
  const handleStartChat = async (userId: string) => {
    if (!currentUser?.uid) return;

    const targetUser = users.find((u) => u.uid === userId);
    if (!targetUser) return;

    try {
      // 기존 1:1 채팅방 확인
      const existingRoom = await ChatService.findDirectChatRoom(
        currentUser.uid,
        targetUser.uid
      );

      if (existingRoom) {
        // 기존 채팅방이 있으면 그 채팅방으로 이동
        // 채팅방 탭으로 전환
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('chat-sidebar-tab', 'rooms');
          window.dispatchEvent(new Event('chat-sidebar-tab-change'));
        }
        navigate(`/chat?room=${existingRoom.id}`);
        return;
      }

      // 기존 채팅방이 없으면 임시 채팅방 생성
      const tempRoomId = `temp_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      addTemporaryRoom({
        id: tempRoomId,
        type: 'direct',
        participants: [
          {
            uid: currentUser.uid,
            displayName: getUserDisplayName(currentUser, null, '사용자'),
            photoURL: currentUser.photoURL || undefined,
            joinedAt: new Date().toISOString(),
          },
          {
            uid: targetUser.uid,
            displayName: getUserDisplayName(
              { displayName: targetUser.displayName, email: targetUser.email },
              { position: targetUser.position },
              '사용자'
            ),
            photoURL: (targetUser as any).photoURL || undefined,
            joinedAt: new Date().toISOString(),
          },
        ],
        createdAt: new Date().toISOString(),
      });

      // 채팅방 탭으로 전환
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('chat-sidebar-tab', 'rooms');
        window.dispatchEvent(new Event('chat-sidebar-tab-change'));
      }

      // 임시 채팅방으로 이동
      navigate(`/chat?room=${tempRoomId}`);
    } catch (error) {
      console.error('Failed to start chat:', error);
      // 에러가 발생해도 임시 채팅방으로 이동
      const tempRoomId = `temp_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      addTemporaryRoom({
        id: tempRoomId,
        type: 'direct',
        participants: [
          {
            uid: currentUser.uid,
            displayName: getUserDisplayName(currentUser, null, '사용자'),
            photoURL: currentUser.photoURL || undefined,
            joinedAt: new Date().toISOString(),
          },
          {
            uid: targetUser.uid,
            displayName: getUserDisplayName(
              { displayName: targetUser.displayName, email: targetUser.email },
              { position: targetUser.position },
              '사용자'
            ),
            photoURL: (targetUser as any).photoURL || undefined,
            joinedAt: new Date().toISOString(),
          },
        ],
        createdAt: new Date().toISOString(),
      });
      navigate(`/chat?room=${tempRoomId}`);
    }
  };

  // 필터링 및 정렬된 사용자 목록
  const filteredUsers = useMemo(() => {
    let filtered = [...users];

    // 검색어로 필터링
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((user) => {
        const displayName = getUserDisplayName(
          { displayName: user.displayName, email: user.email },
          { position: user.position },
          ''
        ).toLowerCase();
        const email = (user.email || '').toLowerCase();
        const position = (user.position || '').toLowerCase();
        const department = (user.department || '').toLowerCase();

        return (
          displayName.includes(query) ||
          email.includes(query) ||
          position.includes(query) ||
          department.includes(query)
        );
      });
    }

    // 정렬
    const sorted = filtered.sort((a, b) => {
      const aIsFavorite = favorites.includes(a.uid || '');
      const bIsFavorite = favorites.includes(b.uid || '');

      // 즐겨찾기 우선
      if (aIsFavorite && !bIsFavorite) return -1;
      if (!aIsFavorite && bIsFavorite) return 1;

      // 이름순 정렬
      const aName = getUserDisplayName(
        { displayName: a.displayName, email: a.email },
        { position: a.position },
        ''
      );
      const bName = getUserDisplayName(
        { displayName: b.displayName, email: b.email },
        { position: b.position },
        ''
      );
      return aName.localeCompare(bName, 'ko');
    });

    return sorted;
  }, [users, favorites, searchQuery]);

  // 사용자 정보 가져오기 헬퍼
  const getUserInfo = (userId: string) => {
    const user = users.find((u) => u.uid === userId);
    if (!user) return null;

    const baseDisplayName = user.displayName || user.email?.split('@')[0] || '사용자';
    const displayNameWithPosition = user.position
      ? `${baseDisplayName} ${user.position}`
      : baseDisplayName;

    return {
      displayName: displayNameWithPosition,
      photoURL: (user as any).photoURL || undefined,
      position: user.position,
    };
  };

  // 전역 참조에 getUserInfo 함수 추가
  useEffect(() => {
    if (globalUsersRef.current) {
      (globalUsersRef.current as any).getUserInfo = getUserInfo;
    }
  }, [users]);

  if (!usersLoaded) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (filteredUsers.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        사용자가 없습니다
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* 검색바 */}
      <div className="flex-shrink-0 p-2 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="사용자 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>
      {/* 사용자 목록 */}
      <ScrollArea className="flex-1">
        <div className="p-2">
        {filteredUsers.map((user, index) => {
          if (!user.uid) return null;

          const isFavorite = favorites.includes(user.uid);
          const isOnline = userStatuses[user.uid] || false;
          const displayName = getUserDisplayName(
            { displayName: user.displayName, email: user.email },
            { position: user.position },
            '사용자'
          );
          const photoURL = (user as any).photoURL || undefined;

          return (
            <React.Fragment key={user.uid}>
              {index > 0 && (
                <div className="border-t border-border my-1" />
              )}
              <ContextMenu>
                <ContextMenuTrigger>
                  <div
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer ${
                      isFavorite
                        ? 'bg-muted/80 dark:bg-muted/60'
                        : 'hover:bg-muted'
                    }`}
                  >
                  <div className="relative">
                    <Avatar className="size-10">
                      <AvatarImage src={photoURL} alt={displayName} />
                      <AvatarFallback>{getUserInitial(user, 'U')}</AvatarFallback>
                    </Avatar>
                    {isOnline && (
                      <div className="absolute bottom-0 right-0 size-3 bg-green-500 border-2 border-background rounded-full" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{displayName}</span>
                      {isFavorite && <Star className="size-4 text-yellow-500 fill-yellow-500" />}
                    </div>
                    {user.department && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {user.department}
                      </p>
                    )}
                  </div>
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem onClick={() => handleStartChat(user.uid!)}>
                  <MessageSquare className="mr-2 size-4" />
                  채팅하기
                </ContextMenuItem>
                <ContextMenuItem onClick={() => handleToggleFavorite(user.uid!)}>
                  <Star
                    className={`mr-2 size-4 ${isFavorite ? 'text-yellow-500 fill-yellow-500' : ''}`}
                  />
                  {isFavorite ? '즐겨찾기 제거' : '즐겨찾기 추가'}
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
            </React.Fragment>
          );
        })}
        </div>
      </ScrollArea>
    </div>
  );
};

// getUserInfo 함수 export (다른 컴포넌트에서 사용)
export const getUserInfo = (userId: string) => {
  // globalUsersRef에서 먼저 시도
  if (globalUsersRef.current?.loaded && globalUsersRef.current.users) {
    const user = globalUsersRef.current.users.find((u) => u.uid === userId);
    if (user) {
      const baseDisplayName = user.displayName || user.email?.split('@')[0] || '사용자';
      // position이 이미 displayName에 포함되어 있는지 확인
      if (user.position && !baseDisplayName.includes(user.position)) {
        return {
          displayName: `${baseDisplayName} ${user.position}`,
          photoURL: user.photoURL || undefined,
          position: user.position,
        };
      }
      return {
        displayName: baseDisplayName,
        photoURL: (user as any).photoURL || undefined,
        position: user.position,
      };
    }
  }
  
  // globalUsersRef가 없거나 로드되지 않았으면 캐시된 사용자 정보 사용
  if (hasCachedUsers && cachedUsers.length > 0) {
    const user = cachedUsers.find((u) => u.uid === userId);
    if (user) {
      const baseDisplayName = user.displayName || user.email?.split('@')[0] || '사용자';
      // position이 이미 displayName에 포함되어 있는지 확인
      if (user.position && !baseDisplayName.includes(user.position)) {
        return {
          displayName: `${baseDisplayName} ${user.position}`,
          photoURL: user.photoURL || undefined,
          position: user.position,
        };
      }
      return {
        displayName: baseDisplayName,
        photoURL: (user as any).photoURL || undefined,
        position: user.position,
      };
    }
  }
  
  return null;
};

