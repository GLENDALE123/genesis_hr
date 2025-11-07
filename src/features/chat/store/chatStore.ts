/**
 * 채팅 Zustand 스토어
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type {
  ChatRoom,
  ChatMessage,
  TemporaryChatRoom,
  TypingStatus,
} from '../types/chat.types';

interface ChatState {
  // 채팅방 목록
  chatRooms: ChatRoom[];
  // 현재 선택된 채팅방
  currentChatRoom: ChatRoom | null;
  // 현재 채팅방의 메시지
  messages: Record<string, ChatMessage[]>; // chatRoomId -> messages[]
  // 임시 채팅방 목록
  temporaryRooms: TemporaryChatRoom[];
  // 타이핑 상태
  typingStatus: Record<string, TypingStatus[]>; // chatRoomId -> typing users[]
  // 읽지 않은 메시지 수 (전체)
  unreadCounts: Record<string, number>; // chatRoomId -> count
  // 로딩 상태
  isLoadingRooms: boolean;
  isLoadingMessages: boolean;
}

interface ChatActions {
  // 채팅방 관련
  setChatRooms: (rooms: ChatRoom[]) => void;
  addChatRoom: (room: ChatRoom) => void;
  updateChatRoom: (roomId: string, updates: Partial<ChatRoom>) => void;
  removeChatRoom: (roomId: string) => void;
  setCurrentChatRoom: (room: ChatRoom | null) => void;
  
  // 메시지 관련
  setMessages: (chatRoomId: string, messages: ChatMessage[]) => void;
  addMessage: (chatRoomId: string, message: ChatMessage) => void;
  updateMessage: (chatRoomId: string, messageId: string, updates: Partial<ChatMessage>) => void;
  removeMessage: (chatRoomId: string, messageId: string) => void;
  
  // 임시 채팅방 관련
  addTemporaryRoom: (room: TemporaryChatRoom) => void;
  removeTemporaryRoom: (roomId: string) => void;
  clearTemporaryRooms: () => void;
  
  // 타이핑 상태 관련
  setTypingStatus: (chatRoomId: string, users: TypingStatus[]) => void;
  addTypingUser: (chatRoomId: string, user: TypingStatus) => void;
  removeTypingUser: (chatRoomId: string, userId: string) => void;
  
  // 읽지 않은 메시지 수 관련
  setUnreadCount: (chatRoomId: string, count: number) => void;
  incrementUnreadCount: (chatRoomId: string) => void;
  resetUnreadCount: (chatRoomId: string) => void;
  
  // 로딩 상태
  setIsLoadingRooms: (loading: boolean) => void;
  setIsLoadingMessages: (loading: boolean) => void;
  
  // 전체 초기화
  reset: () => void;
}

const initialState: ChatState = {
  chatRooms: [],
  currentChatRoom: null,
  messages: {},
  temporaryRooms: [],
  typingStatus: {},
  unreadCounts: {},
  isLoadingRooms: false,
  isLoadingMessages: false,
};

type ChatStore = ChatState & ChatActions;

export const useChatStore = create<ChatStore>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,

        // 채팅방 관련
        setChatRooms: (rooms) => set({ chatRooms: rooms }),
        addChatRoom: (room) =>
          set((state) => ({
            chatRooms: [...state.chatRooms, room],
          })),
        updateChatRoom: (roomId, updates) =>
          set((state) => ({
            chatRooms: state.chatRooms.map((room) =>
              room.id === roomId ? { ...room, ...updates } : room
            ),
            currentChatRoom:
              state.currentChatRoom?.id === roomId
                ? { ...state.currentChatRoom, ...updates }
                : state.currentChatRoom,
          })),
        removeChatRoom: (roomId) =>
          set((state) => ({
            chatRooms: state.chatRooms.filter((room) => room.id !== roomId),
            currentChatRoom:
              state.currentChatRoom?.id === roomId ? null : state.currentChatRoom,
            messages: Object.fromEntries(
              Object.entries(state.messages).filter(([id]) => id !== roomId)
            ),
            typingStatus: Object.fromEntries(
              Object.entries(state.typingStatus).filter(([id]) => id !== roomId)
            ),
            unreadCounts: Object.fromEntries(
              Object.entries(state.unreadCounts).filter(([id]) => id !== roomId)
            ),
          })),
        setCurrentChatRoom: (room) => set({ currentChatRoom: room }),

        // 메시지 관련
        setMessages: (chatRoomId, messages) =>
          set((state) => ({
            messages: {
              ...state.messages,
              [chatRoomId]: messages,
            },
          })),
        addMessage: (chatRoomId, message) =>
          set((state) => ({
            messages: {
              ...state.messages,
              [chatRoomId]: [...(state.messages[chatRoomId] || []), message],
            },
          })),
        updateMessage: (chatRoomId, messageId, updates) =>
          set((state) => ({
            messages: {
              ...state.messages,
              [chatRoomId]: (state.messages[chatRoomId] || []).map((msg) =>
                msg.id === messageId ? { ...msg, ...updates } : msg
              ),
            },
          })),
        removeMessage: (chatRoomId, messageId) =>
          set((state) => ({
            messages: {
              ...state.messages,
              [chatRoomId]: (state.messages[chatRoomId] || []).filter(
                (msg) => msg.id !== messageId
              ),
            },
          })),

        // 임시 채팅방 관련
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
        setTypingStatus: (chatRoomId, users) =>
          set((state) => ({
            typingStatus: {
              ...state.typingStatus,
              [chatRoomId]: users,
            },
          })),
        addTypingUser: (chatRoomId, user) =>
          set((state) => {
            const existing = state.typingStatus[chatRoomId] || [];
            const filtered = existing.filter((u) => u.userId !== user.userId);
            return {
              typingStatus: {
                ...state.typingStatus,
                [chatRoomId]: [...filtered, user],
              },
            };
          }),
        removeTypingUser: (chatRoomId, userId) =>
          set((state) => ({
            typingStatus: {
              ...state.typingStatus,
              [chatRoomId]: (state.typingStatus[chatRoomId] || []).filter(
                (u) => u.userId !== userId
              ),
            },
          })),

        // 읽지 않은 메시지 수 관련
        setUnreadCount: (chatRoomId, count) =>
          set((state) => ({
            unreadCounts: {
              ...state.unreadCounts,
              [chatRoomId]: count,
            },
          })),
        incrementUnreadCount: (chatRoomId) =>
          set((state) => ({
            unreadCounts: {
              ...state.unreadCounts,
              [chatRoomId]: (state.unreadCounts[chatRoomId] || 0) + 1,
            },
          })),
        resetUnreadCount: (chatRoomId) =>
          set((state) => {
            const newCounts = { ...state.unreadCounts };
            delete newCounts[chatRoomId];
            return { unreadCounts: newCounts };
          }),

        // 로딩 상태
        setIsLoadingRooms: (loading) => set({ isLoadingRooms: loading }),
        setIsLoadingMessages: (loading) => set({ isLoadingMessages: loading }),

        // 전체 초기화
        reset: () => set(initialState),
      }),
      {
        name: 'chat-store',
        partialize: (state) => ({
          temporaryRooms: state.temporaryRooms,
        }),
      }
    ),
    { name: 'ChatStore' }
  )
);

