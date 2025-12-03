/**
 * Direct Message Zustand 스토어
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type {
  DirectMessageRoom,
  DirectMessage,
  TemporaryDirectMessageRoom,
  TypingStatus,
  // 하위 호환성
  ChatRoom,
  ChatMessage,
  TemporaryChatRoom,
} from '../types/chat.types';

interface DirectMessageState {
  // Direct Message 방 목록
  directMessageRooms: DirectMessageRoom[];
  // 현재 선택된 Direct Message 방
  currentDirectMessageRoom: DirectMessageRoom | null;
  // 현재 Direct Message 방의 메시지
  messages: Record<string, DirectMessage[]>; // directMessageRoomId -> messages[]
  // 임시 Direct Message 방 목록
  temporaryRooms: TemporaryDirectMessageRoom[];
  // 타이핑 상태
  typingStatus: Record<string, TypingStatus[]>; // directMessageRoomId -> typing users[]
  // 읽지 않은 메시지 수 (전체)
  unreadCounts: Record<string, number>; // directMessageRoomId -> count
  // 로딩 상태
  isLoadingRooms: boolean;
  isLoadingMessages: boolean;
  
  // 하위 호환성을 위한 별칭 속성
  chatRooms: DirectMessageRoom[];
  currentChatRoom: DirectMessageRoom | null;
}

interface DirectMessageActions {
  // Direct Message 방 관련
  setDirectMessageRooms: (rooms: DirectMessageRoom[]) => void;
  addDirectMessageRoom: (room: DirectMessageRoom) => void;
  updateDirectMessageRoom: (roomId: string, updates: Partial<DirectMessageRoom>) => void;
  removeDirectMessageRoom: (roomId: string) => void;
  setCurrentDirectMessageRoom: (room: DirectMessageRoom | null) => void;
  
  // 메시지 관련
  setMessages: (directMessageRoomId: string, messages: DirectMessage[]) => void;
  addMessage: (directMessageRoomId: string, message: DirectMessage) => void;
  updateMessage: (directMessageRoomId: string, messageId: string, updates: Partial<DirectMessage>) => void;
  removeMessage: (directMessageRoomId: string, messageId: string) => void;
  
  // 임시 Direct Message 방 관련
  addTemporaryRoom: (room: TemporaryDirectMessageRoom) => void;
  removeTemporaryRoom: (roomId: string) => void;
  clearTemporaryRooms: () => void;
  
  // 타이핑 상태 관련
  setTypingStatus: (directMessageRoomId: string, users: TypingStatus[]) => void;
  addTypingUser: (directMessageRoomId: string, user: TypingStatus) => void;
  removeTypingUser: (directMessageRoomId: string, userId: string) => void;
  
  // 읽지 않은 메시지 수 관련
  setUnreadCount: (directMessageRoomId: string, count: number) => void;
  incrementUnreadCount: (directMessageRoomId: string) => void;
  resetUnreadCount: (directMessageRoomId: string) => void;
  
  // 로딩 상태
  setIsLoadingRooms: (loading: boolean) => void;
  setIsLoadingMessages: (loading: boolean) => void;
  
  // 전체 초기화
  reset: () => void;
  
  // 하위 호환성을 위한 별칭
  setChatRooms: (rooms: ChatRoom[]) => void;
  addChatRoom: (room: ChatRoom) => void;
  updateChatRoom: (roomId: string, updates: Partial<ChatRoom>) => void;
  removeChatRoom: (roomId: string) => void;
  setCurrentChatRoom: (room: ChatRoom | null) => void;
}

const initialState: DirectMessageState = {
  directMessageRooms: [],
  currentDirectMessageRoom: null,
  messages: {},
  temporaryRooms: [],
  typingStatus: {},
  unreadCounts: {},
  isLoadingRooms: false,
  isLoadingMessages: false,
  // 하위 호환성
  chatRooms: [],
  currentChatRoom: null,
};

type DirectMessageStore = DirectMessageState & DirectMessageActions;

export const useDirectMessageStore = create<DirectMessageStore>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,

        // Direct Message 방 관련
        setDirectMessageRooms: (rooms) => set({ 
          directMessageRooms: rooms,
          chatRooms: rooms, // 하위 호환성
        }),
        addDirectMessageRoom: (room) =>
          set((state) => {
            const newRooms = [...state.directMessageRooms, room];
            return {
              directMessageRooms: newRooms,
              chatRooms: newRooms, // 하위 호환성
            };
          }),
        updateDirectMessageRoom: (roomId, updates) =>
          set((state) => {
            const updatedRooms = state.directMessageRooms.map((room) =>
              room.id === roomId ? { ...room, ...updates } : room
            );
            const updatedCurrent = state.currentDirectMessageRoom?.id === roomId
              ? { ...state.currentDirectMessageRoom, ...updates }
              : state.currentDirectMessageRoom;
            return {
              directMessageRooms: updatedRooms,
              chatRooms: updatedRooms, // 하위 호환성
              currentDirectMessageRoom: updatedCurrent,
              currentChatRoom: updatedCurrent, // 하위 호환성
            };
          }),
        removeDirectMessageRoom: (roomId) =>
          set((state) => {
            const filteredRooms = state.directMessageRooms.filter((room) => room.id !== roomId);
            const isCurrent = state.currentDirectMessageRoom?.id === roomId;
            return {
              directMessageRooms: filteredRooms,
              chatRooms: filteredRooms, // 하위 호환성
              currentDirectMessageRoom: isCurrent ? null : state.currentDirectMessageRoom,
              currentChatRoom: isCurrent ? null : state.currentChatRoom, // 하위 호환성
              messages: Object.fromEntries(
                Object.entries(state.messages).filter(([id]) => id !== roomId)
              ),
              typingStatus: Object.fromEntries(
                Object.entries(state.typingStatus).filter(([id]) => id !== roomId)
              ),
              unreadCounts: Object.fromEntries(
                Object.entries(state.unreadCounts).filter(([id]) => id !== roomId)
              ),
            };
          }),
        setCurrentDirectMessageRoom: (room) => set({ 
          currentDirectMessageRoom: room,
          currentChatRoom: room, // 하위 호환성
        }),

        // 메시지 관련
        setMessages: (directMessageRoomId, messages) =>
          set((state) => ({
            messages: {
              ...state.messages,
              [directMessageRoomId]: messages,
            },
          })),
        addMessage: (directMessageRoomId, message) =>
          set((state) => ({
            messages: {
              ...state.messages,
              [directMessageRoomId]: [...(state.messages[directMessageRoomId] || []), message],
            },
          })),
        updateMessage: (directMessageRoomId, messageId, updates) =>
          set((state) => ({
            messages: {
              ...state.messages,
              [directMessageRoomId]: (state.messages[directMessageRoomId] || []).map((msg) =>
                msg.id === messageId ? { ...msg, ...updates } : msg
              ),
            },
          })),
        removeMessage: (directMessageRoomId, messageId) =>
          set((state) => ({
            messages: {
              ...state.messages,
              [directMessageRoomId]: (state.messages[directMessageRoomId] || []).filter(
                (msg) => msg.id !== messageId
              ),
            },
          })),

        // 임시 Direct Message 방 관련
        addTemporaryRoom: (room) =>
          set((state) => ({
            temporaryRooms: [...state.temporaryRooms, room],
          })),
        removeTemporaryRoom: (roomId) =>
          set((state) => ({
            temporaryRooms: state.temporaryRooms.filter((room) => room.id !== roomId),
          })),
        clearTemporaryRooms: () => set({ temporaryRooms: [] }),

        // 타이핑 상태 관련
        setTypingStatus: (directMessageRoomId, users) =>
          set((state) => ({
            typingStatus: {
              ...state.typingStatus,
              [directMessageRoomId]: users,
            },
          })),
        addTypingUser: (directMessageRoomId, user) =>
          set((state) => {
            const existing = state.typingStatus[directMessageRoomId] || [];
            const filtered = existing.filter((u) => u.userId !== user.userId);
            return {
              typingStatus: {
                ...state.typingStatus,
                [directMessageRoomId]: [...filtered, user],
              },
            };
          }),
        removeTypingUser: (directMessageRoomId, userId) =>
          set((state) => ({
            typingStatus: {
              ...state.typingStatus,
              [directMessageRoomId]: (state.typingStatus[directMessageRoomId] || []).filter(
                (u) => u.userId !== userId
              ),
            },
          })),

        // 읽지 않은 메시지 수 관련
        setUnreadCount: (directMessageRoomId, count) =>
          set((state) => ({
            unreadCounts: {
              ...state.unreadCounts,
              [directMessageRoomId]: count,
            },
          })),
        incrementUnreadCount: (directMessageRoomId) =>
          set((state) => ({
            unreadCounts: {
              ...state.unreadCounts,
              [directMessageRoomId]: (state.unreadCounts[directMessageRoomId] || 0) + 1,
            },
          })),
        resetUnreadCount: (directMessageRoomId) =>
          set((state) => {
            const newCounts = { ...state.unreadCounts };
            delete newCounts[directMessageRoomId];
            return { unreadCounts: newCounts };
          }),

        // 로딩 상태
        setIsLoadingRooms: (loading) => set({ isLoadingRooms: loading }),
        setIsLoadingMessages: (loading) => set({ isLoadingMessages: loading }),

        // 전체 초기화
        reset: () => set(initialState),

        // 하위 호환성을 위한 별칭 (기존 ChatRoom/ChatMessage를 DirectMessageRoom/DirectMessage로 변환)
        setChatRooms: (rooms) => {
          const dmRooms = rooms as DirectMessageRoom[];
          set({ 
            directMessageRooms: dmRooms,
            chatRooms: dmRooms,
          });
        },
        addChatRoom: (room) =>
          set((state) => {
            const dmRoom = room as DirectMessageRoom;
            const newRooms = [...state.directMessageRooms, dmRoom];
            return {
              directMessageRooms: newRooms,
              chatRooms: newRooms,
            };
          }),
        updateChatRoom: (roomId, updates) =>
          set((state) => {
            const updatedRooms = state.directMessageRooms.map((room) =>
              room.id === roomId ? { ...room, ...updates } : room
            );
            const updatedCurrent = state.currentDirectMessageRoom?.id === roomId
              ? { ...state.currentDirectMessageRoom, ...updates } as DirectMessageRoom
              : state.currentDirectMessageRoom;
            return {
              directMessageRooms: updatedRooms,
              chatRooms: updatedRooms,
              currentDirectMessageRoom: updatedCurrent,
              currentChatRoom: updatedCurrent,
            };
          }),
        removeChatRoom: (roomId) =>
          set((state) => {
            const filteredRooms = state.directMessageRooms.filter((room) => room.id !== roomId);
            const isCurrent = state.currentDirectMessageRoom?.id === roomId;
            return {
              directMessageRooms: filteredRooms,
              chatRooms: filteredRooms,
              currentDirectMessageRoom: isCurrent ? null : state.currentDirectMessageRoom,
              currentChatRoom: isCurrent ? null : state.currentChatRoom,
              messages: Object.fromEntries(
                Object.entries(state.messages).filter(([id]) => id !== roomId)
              ),
              typingStatus: Object.fromEntries(
                Object.entries(state.typingStatus).filter(([id]) => id !== roomId)
              ),
              unreadCounts: Object.fromEntries(
                Object.entries(state.unreadCounts).filter(([id]) => id !== roomId)
              ),
            };
          }),
        setCurrentChatRoom: (room) => set({ 
          currentDirectMessageRoom: room as DirectMessageRoom | null,
          currentChatRoom: room as DirectMessageRoom | null,
        }),
      }),
      {
        name: 'direct-message-store',
        partialize: (state) => ({
          temporaryRooms: state.temporaryRooms,
        }),
      }
    ),
    { name: 'DirectMessageStore' }
  )
);

// 하위 호환성을 위한 별칭
export const useChatStore = useDirectMessageStore;
