/**
 * 지그 요청 스토어
 */

import { create } from 'zustand';
import { JigRequest, MasterData, JigStatus } from '../types';
import {
  getJigRequests,
  createJigRequest,
  updateJigRequest,
  deleteJigRequest,
  addJigRequestComment,
  updateJigRequestStatus,
  updateJigRequestQuantity,
  getMasterData,
  subscribeToJigRequests,
} from '../services';
import { persist } from 'zustand/middleware';

interface JigRequestState {
  requests: JigRequest[];
  masterData: MasterData | null;
  isLoading: boolean;
  error: string | null;
  selectedRequest: JigRequest | null;
  lastFetchTimestamp: number;
}

interface JigRequestActions {
  fetchRequests: () => Promise<void>;
  subscribeToRequests: () => () => void;
  createRequest: (data: Omit<JigRequest, 'id' | 'createdAt' | 'history' | 'comments' | 'status'>, imageFiles: File[], currentUserUid: string, currentUserName: string) => Promise<void>;
  updateRequest: (id: string, updates: Partial<JigRequest>, currentUserUid: string, currentUserName: string) => Promise<void>;
  deleteRequest: (id: string) => Promise<void>;
  setSelectedRequest: (request: JigRequest | null) => void;
  addCommentToRequest: (requestId: string, commentText: string, userUid: string, userName: string, mentionedUserIds?: string[]) => Promise<void>;
  updateRequestStatus: (requestId: string, newStatus: JigStatus, currentUserUid: string, currentUserName: string, reason?: string) => Promise<void>;
  updateRequestQuantity: (requestId: string, quantityChange: number, currentUserUid: string, currentUserName: string) => Promise<void>;
  fetchMasterData: () => Promise<void>;
}

export const useJigRequestStore = create<JigRequestState & JigRequestActions>()(
  persist(
    (set, get) => ({
      // State
      requests: [],
      masterData: null,
      isLoading: false,
      error: null,
      selectedRequest: null,
      lastFetchTimestamp: 0,

      // Actions
      fetchRequests: async () => {
        set({ isLoading: true, error: null });
        try {
          const requests = await getJigRequests();
          set({ 
            requests,
            lastFetchTimestamp: Date.now(),
            isLoading: false 
          });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
            isLoading: false 
          });
        }
      },

      subscribeToRequests: () => {
        set({ isLoading: true, error: null });
        
        const unsubscribe = subscribeToJigRequests(
          (newRequests) => {
            // Quality 테이블 방식: 단순하게 업데이트
            set({ 
              requests: newRequests,
              lastFetchTimestamp: Date.now(),
              isLoading: false 
            });
          },
          (error) => {
            set({ 
              error: error.message,
              isLoading: false 
            });
          }
        );

        return unsubscribe;
      },

      createRequest: async (data, imageFiles, currentUserUid, currentUserName) => {
        set({ isLoading: true, error: null });
        try {
          await createJigRequest({ ...data, status: 'pending' as JigStatus }, imageFiles, { uid: currentUserUid, displayName: currentUserName });
          // 생성 후 목록 새로고침
          await get().fetchRequests();
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
            isLoading: false 
          });
        }
      },

      updateRequest: async (id, updates, currentUserUid, currentUserName) => {
        set({ isLoading: true, error: null });
        try {
          await updateJigRequest(id, updates, { uid: currentUserUid, displayName: currentUserName });
          // 업데이트 후 목록 새로고침
          await get().fetchRequests();
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
            isLoading: false 
          });
        }
      },

      deleteRequest: async (id) => {
        set({ isLoading: true, error: null });
        try {
          await deleteJigRequest(id);
          // 삭제 후 목록 새로고침
          await get().fetchRequests();
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
            isLoading: false 
          });
        }
      },

      setSelectedRequest: (request) => set({ selectedRequest: request }),

      addCommentToRequest: async (requestId, commentText, userUid, userName, mentionedUserIds) => {
        try {
          await addJigRequestComment(requestId, commentText, { uid: userUid, displayName: userName });
          // 댓글 추가 후 목록 새로고침
          await get().fetchRequests();
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : '댓글 추가 중 오류가 발생했습니다.',
          });
        }
      },

      updateRequestStatus: async (requestId, newStatus, currentUserUid, currentUserName, reason) => {
        try {
          await updateJigRequestStatus(requestId, newStatus, { uid: currentUserUid, displayName: currentUserName }, reason);
          // 상태 업데이트 후 목록 새로고침
          await get().fetchRequests();
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : '상태 업데이트 중 오류가 발생했습니다.',
          });
        }
      },

      updateRequestQuantity: async (requestId, quantityChange, currentUserUid, currentUserName) => {
        try {
          await updateJigRequestQuantity(requestId, quantityChange, { uid: currentUserUid, displayName: currentUserName });
          // 입고 처리 후 목록 새로고침
          await get().fetchRequests();
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : '입고 처리 중 오류가 발생했습니다.',
          });
        }
      },

      fetchMasterData: async () => {
        try {
          const masterData = await getMasterData();
          set({ masterData });
        } catch (error) {
          console.error('마스터 데이터 로드 실패:', error);
        }
      },
    }),
    {
      name: 'jig-request-storage',
      partialize: (state) => ({
        requests: state.requests,
        masterData: state.masterData,
        lastFetchTimestamp: state.lastFetchTimestamp,
      }),
    }
  )
);