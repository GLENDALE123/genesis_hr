/**
 * 사용자 목록 컴포넌트
 * 우클릭 메뉴, 즐겨찾기 기능 포함
 */

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
import { UserStatusService, type UserStatusData } from '../services/userStatusService';
import { ChatService } from '../services/chatService';
import { useChatStore } from '../store/chatStore';
import { MessageSquare, Star, Search } from 'lucide-react';
import type { UserManagementInfo } from '@/shared/services/firebase/userManagement';

// 모듈 레벨 캐시 (탭 전환 시 재로딩 방지)
let cachedUsers: UserManagementInfo[] = [];
let hasCachedUsers = false;
let cachedUserStatuses: Record<string, boolean> = {};
let userStatusUnsubscribe: (() => void) | null = null;

// localStorage 캐시 키
const USERS_CACHE_KEY = 'chat-users-cache';
const USERS_CACHE_EXPIRY_KEY = 'chat-users-cache-expiry';
const CACHE_DURATION = 5 * 60 * 1000; // 5분

// localStorage에서 사용자 목록 캐시 로드
const loadUsersFromLocalStorage = (): UserManagementInfo[] | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    const expiry = localStorage.getItem(USERS_CACHE_EXPIRY_KEY);
    if (!expiry) return null;
    
    const expiryTime = parseInt(expiry, 10);
    if (Date.now() > expiryTime) {
      // 캐시 만료
      localStorage.removeItem(USERS_CACHE_KEY);
      localStorage.removeItem(USERS_CACHE_EXPIRY_KEY);
      return null;
    }
    
    const cached = localStorage.getItem(USERS_CACHE_KEY);
    if (!cached) return null;
    
    return JSON.parse(cached) as UserManagementInfo[];
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Failed to load users from localStorage:', error);
    }
    return null;
  }
};

// localStorage에 사용자 목록 캐시 저장
const saveUsersToLocalStorage = (users: UserManagementInfo[]) => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(USERS_CACHE_KEY, JSON.stringify(users));
    localStorage.setItem(USERS_CACHE_EXPIRY_KEY, String(Date.now() + CACHE_DURATION));
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Failed to save users to localStorage:', error);
    }
  }
};

// 캐시 접근을 위한 export (프리로드용)
export const getCachedUsers = () => {
  // 메모리 캐시가 있으면 사용
  if (hasCachedUsers && cachedUsers.length > 0) {
    return { cachedUsers, hasCachedUsers, cachedUserStatuses };
  }
  
  // localStorage 캐시 확인
  const localStorageUsers = loadUsersFromLocalStorage();
  if (localStorageUsers && localStorageUsers.length > 0) {
    cachedUsers = localStorageUsers;
    hasCachedUsers = true;
    return { cachedUsers, hasCachedUsers, cachedUserStatuses };
  }
  
  return { cachedUsers, hasCachedUsers, cachedUserStatuses };
};

export const setCachedUsers = (users: UserManagementInfo[]) => {
  cachedUsers = users;
  hasCachedUsers = true;
  saveUsersToLocalStorage(users);
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
  status?: UserStatusData;
}

// 개별 사용자 아이템 컴포넌트 (React.memo로 최적화)
interface UserItemProps {
  user: UserWithStatus;
  index: number;
  isFavorite: boolean;
  status: UserStatusData['status'];
  displayName: string;
  photoURL?: string;
  onUserClick: (user: UserWithStatus) => void;
  onToggleFavorite: (userId: string) => void;
}

const UserItem = React.memo<UserItemProps>(({
  user,
  index,
  isFavorite,
  status,
  displayName,
  photoURL,
  onUserClick,
  onToggleFavorite,
}) => {
  // 상태별 색상 설정
  const getStatusColor = () => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'away':
        return 'bg-yellow-500';
      case 'offline':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <React.Fragment>
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
            onClick={() => onUserClick(user)}
          >
            <div className="relative">
              <Avatar
                className="[width:var(--avatar-size,2.5rem)] [height:var(--avatar-size,2.5rem)]"
                style={{ '--avatar-size': '2.5rem' } as React.CSSProperties}
              >
                <AvatarImage src={photoURL} alt={displayName} />
                <AvatarFallback className="flex items-center justify-center font-medium text-muted-foreground [font-size:calc(var(--avatar-size,2.5rem)*0.4)]">
                  {getUserInitial(user, 'U')}
                </AvatarFallback>
              </Avatar>
              <div className={`absolute bottom-0 right-0 size-3 ${getStatusColor()} border-2 border-background rounded-full`} />
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
          <ContextMenuItem onClick={() => onUserClick(user)}>
            <MessageSquare className="mr-2 h-4 w-4" />
            메시지 보내기
          </ContextMenuItem>
          <ContextMenuItem onClick={() => onToggleFavorite(user.uid || '')}>
            <Star className={`mr-2 h-4 w-4 ${isFavorite ? 'fill-yellow-500 text-yellow-500' : ''}`} />
            {isFavorite ? '즐겨찾기 제거' : '즐겨찾기 추가'}
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </React.Fragment>
  );
}, (prevProps, nextProps) => {
  // 상태가 변경되지 않았으면 리렌더링 방지
  return (
    prevProps.user.uid === nextProps.user.uid &&
    prevProps.isFavorite === nextProps.isFavorite &&
    prevProps.status === nextProps.status &&
    prevProps.displayName === nextProps.displayName &&
    prevProps.photoURL === nextProps.photoURL
  );
});

UserItem.displayName = 'UserItem';

export const UserList: React.FC<UserListProps> = ({ className }) => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const { addTemporaryRoom } = useChatStore();
  const [users, setUsers] = useState<UserWithStatus[]>([]);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [userStatuses, setUserStatuses] = useState<Record<string, UserStatusData>>({});
  const [favorites, setFavorites] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const isMountedRef = useRef(true);
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);
  const previousStatusesRef = useRef<Record<string, UserStatusData>>({});
  const statusUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      if (statusUpdateTimeoutRef.current) {
        clearTimeout(statusUpdateTimeoutRef.current);
        statusUpdateTimeoutRef.current = null;
      }
    };
  }, []);

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
      if (!isMountedRef.current) return;
      if (snap.exists()) {
        const data = snap.data();
        setFavorites(data.favoriteUserIds || []);
      }
    });

    // 실시간 구독
    const unsubscribe = onSnapshot(
      favoritesRef,
      (snap) => {
        if (!isMountedRef.current) return;
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

  // 사용자 목록 로드 (캐시 활용 및 백그라운드 업데이트)
  useEffect(() => {
    if (!currentUser?.uid) return;

    // localStorage 캐시 확인 (메모리 캐시가 없을 때)
    if (!hasCachedUsers || cachedUsers.length === 0) {
      const localStorageUsers = loadUsersFromLocalStorage();
      if (localStorageUsers && localStorageUsers.length > 0) {
        cachedUsers = localStorageUsers;
        hasCachedUsers = true;
      }
    }

      // 캐시가 있으면 즉시 표시하고 백그라운드에서 업데이트
    if (hasCachedUsers && cachedUsers.length > 0) {
      setUsers(cachedUsers);
      // cachedUserStatuses를 UserStatusData 형식으로 변환
      const statuses: Record<string, UserStatusData> = {};
      Object.entries(cachedUserStatuses).forEach(([uid, isOnline]) => {
        statuses[uid] = {
          status: isOnline ? 'online' : 'offline',
          lastSeen: new Date().toISOString(),
        };
      });
      setUserStatuses(statuses);
      usersRef.current = { users: cachedUsers, loaded: true };
      setUsersLoaded(true);

      // 전역 참조에 할당
      if (globalUsersRef.current) {
        globalUsersRef.current.users = cachedUsers;
        globalUsersRef.current.loaded = true;
      }
      
      // 백그라운드에서 최신 정보 업데이트 (사용자 경험을 방해하지 않음)
      getAllUsersWithAuthInfo()
        .then((userList) => {
          if (!isMountedRef.current) return;
          const filteredUsers = userList.filter((u) => u.uid !== currentUser.uid);
          setCachedUsers(filteredUsers); // localStorage에도 저장
          setUsers(filteredUsers);
          usersRef.current = { users: filteredUsers, loaded: true };
          if (globalUsersRef.current) {
            globalUsersRef.current.users = filteredUsers;
            globalUsersRef.current.loaded = true;
          }
        })
        .catch((error) => {
          if (process.env.NODE_ENV === 'development') {
            console.error('Failed to update users in background:', error);
          }
        });
      
      // 사용자 상태 구독 (한 번만)
      if (!userStatusUnsubscribe) {
        const userIds = cachedUsers.map((u) => u.uid);
        if (userIds.length > 0) {
          userStatusUnsubscribe = UserStatusService.subscribeToMultipleUserStatus(
            userIds,
              (statuses) => {
                if (!isMountedRef.current) return;
                
                // 상태 변경이 실제로 있는지 확인 (깜빡임 방지)
                const hasChanged = Object.keys(statuses).some((uid) => {
                  const prevStatus = previousStatusesRef.current[uid];
                  const newStatus = statuses[uid];
                  return !prevStatus || prevStatus.status !== newStatus.status;
                });
                
                // 변경이 없으면 업데이트하지 않음
                if (!hasChanged && Object.keys(statuses).length === Object.keys(previousStatusesRef.current).length) {
                  return;
                }
                
                // UserStatusData 형식으로 변환
                const statusMap: Record<string, UserStatusData> = {};
                const onlineMap: Record<string, boolean> = {};
                Object.entries(statuses).forEach(([uid, status]) => {
                  statusMap[uid] = status;
                  onlineMap[uid] = status.status === 'online';
                });
                cachedUserStatuses = onlineMap;
                previousStatusesRef.current = statusMap;
                
                // 디바운스 처리 (100ms) - 빠른 연속 업데이트 방지
                if (statusUpdateTimeoutRef.current) {
                  clearTimeout(statusUpdateTimeoutRef.current);
                }
                statusUpdateTimeoutRef.current = setTimeout(() => {
                  if (isMountedRef.current) {
                    setUserStatuses({ ...statusMap });
                  }
                }, 100);
              }
          );
        }
      } else {
        // 이미 구독 중이면 캐시된 상태 사용
        if (isMountedRef.current) {
          const statuses: Record<string, UserStatusData> = {};
          Object.entries(cachedUserStatuses).forEach(([uid, isOnline]) => {
            statuses[uid] = {
              status: isOnline ? 'online' : 'offline',
              lastSeen: new Date().toISOString(),
            };
          });
          setUserStatuses(statuses);
        }
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

        // 캐시에 저장 (localStorage 포함)
        setCachedUsers(filteredUsers);

        if (!isMountedRef.current) return;

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
                if (!isMountedRef.current) return;
                
                // 상태 변경이 실제로 있는지 확인 (깜빡임 방지)
                const hasChanged = Object.keys(statuses).some((uid) => {
                  const prevStatus = previousStatusesRef.current[uid];
                  const newStatus = statuses[uid];
                  return !prevStatus || prevStatus.status !== newStatus.status;
                });
                
                // 변경이 없으면 업데이트하지 않음
                if (!hasChanged && Object.keys(statuses).length === Object.keys(previousStatusesRef.current).length) {
                  return;
                }
                
                // UserStatusData 형식으로 변환
                const statusMap: Record<string, UserStatusData> = {};
                const onlineMap: Record<string, boolean> = {};
                Object.entries(statuses).forEach(([uid, status]) => {
                  statusMap[uid] = status;
                  onlineMap[uid] = status.status === 'online';
                });
                cachedUserStatuses = onlineMap;
                previousStatusesRef.current = statusMap;
                
                // 디바운스 처리 (100ms) - 빠른 연속 업데이트 방지
                if (statusUpdateTimeoutRef.current) {
                  clearTimeout(statusUpdateTimeoutRef.current);
                }
                statusUpdateTimeoutRef.current = setTimeout(() => {
                  if (isMountedRef.current) {
                    setUserStatuses({ ...statusMap });
                  }
                }, 100);
              }
            );
          }
        } else {
          // 이미 구독 중이면 캐시된 상태 사용
          if (isMountedRef.current) {
            const statuses: Record<string, UserStatusData> = {};
            Object.entries(cachedUserStatuses).forEach(([uid, isOnline]) => {
              statuses[uid] = {
                status: isOnline ? 'online' : 'offline',
                lastSeen: new Date().toISOString(),
              };
            });
            previousStatusesRef.current = statuses;
            setUserStatuses(statuses);
          }
        }
      } catch (error) {
        console.error('Failed to load users:', error);
        if (!isMountedRef.current) return;
        retryCount++;
        if (retryCount < maxRetries) {
          retryTimerRef.current = setTimeout(() => {
            if (isMountedRef.current) {
              loadUsers();
            }
          }, 1000 * retryCount);
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

  // 필터링 및 정렬된 사용자 목록 (상태 변경 시에도 안정적으로 유지)
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
  }, [users, favorites, searchQuery]); // userStatuses는 의존성에서 제외 (깜빡임 방지)

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
      <ScrollArea
        type="auto"
        className="flex-1"
        hideHorizontalScrollbar
        overflowX="hidden"
      >
        <div className="p-2">
        {filteredUsers.map((user, index) => {
          if (!user.uid) return null;

          const isFavorite = favorites.includes(user.uid);
          const userStatus = userStatuses[user.uid];
          const status = userStatus?.status || 'offline';
          const displayName = getUserDisplayName(
            { displayName: user.displayName, email: user.email },
            { position: user.position },
            '사용자'
          );
          const photoURL = (user as any).photoURL || undefined;

          return (
            <UserItem
              key={user.uid}
              user={user}
              index={index}
              isFavorite={isFavorite}
              status={status}
              displayName={displayName}
              photoURL={photoURL}
              onUserClick={(user) => handleStartChat(user.uid!)}
              onToggleFavorite={handleToggleFavorite}
            />
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

