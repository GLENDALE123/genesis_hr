/**
 * 지그 마스터 스토어
 */

import { create } from 'zustand';
import { JigMasterItem } from '../types';
import {
  getJigMasterItems,
  createJigMasterItem,
  updateJigMasterItem,
  deleteJigMasterItem,
  getAutocompleteData,
} from '../services';
import { persist } from 'zustand/middleware';

interface JigMasterState {
  masterItems: JigMasterItem[];
  isLoading: boolean;
  error: string | null;
  selectedItem: JigMasterItem | null;
  autocompleteData: {
    itemNames: string[];
    partNames: string[];
    itemNumbers: string[];
  };
  lastFetchTimestamp: number;
}

interface JigMasterActions {
  fetchMasterItems: () => Promise<void>;
  createMasterItem: (data: Omit<JigMasterItem, 'id' | 'createdAt'>, imageFiles: File[], currentUserUid: string) => Promise<void>;
  updateMasterItem: (id: string, updates: Partial<JigMasterItem>) => Promise<void>;
  deleteMasterItem: (id: string) => Promise<void>;
  setSelectedItem: (item: JigMasterItem | null) => void;
  fetchAutocompleteData: () => Promise<void>;
}

export const useJigMasterStore = create<JigMasterState & JigMasterActions>()(
  persist(
    (set, get) => ({
      // State
      masterItems: [],
      isLoading: false,
      error: null,
      selectedItem: null,
      autocompleteData: {
        itemNames: [],
        partNames: [],
        itemNumbers: [],
      },
      lastFetchTimestamp: 0,

      // Actions
      fetchMasterItems: async () => {
        set({ isLoading: true, error: null });
        try {
          const items = await getJigMasterItems();
          set({ 
            masterItems: items,
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

      createMasterItem: async (data, imageFiles, currentUserUid) => {
        set({ isLoading: true, error: null });
        try {
          await createJigMasterItem(data, imageFiles, { uid: currentUserUid, displayName: 'Unknown User' });
          // 생성 후 목록 새로고침
          await get().fetchMasterItems();
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
            isLoading: false 
          });
        }
      },

      updateMasterItem: async (id, updates) => {
        set({ isLoading: true, error: null });
        try {
          await updateJigMasterItem(id, updates);
          // 업데이트 후 목록 새로고침
          await get().fetchMasterItems();
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
            isLoading: false 
          });
        }
      },

      deleteMasterItem: async (id) => {
        set({ isLoading: true, error: null });
        try {
          await deleteJigMasterItem(id);
          // 삭제 후 목록 새로고침
          await get().fetchMasterItems();
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
            isLoading: false 
          });
        }
      },

      setSelectedItem: (item) => set({ selectedItem: item }),

      fetchAutocompleteData: async () => {
        try {
          const data = await getAutocompleteData();
          set({ autocompleteData: data });
        } catch (error) {
          console.error('자동완성 데이터 로드 실패:', error);
        }
      },
    }),
    {
      name: 'jig-master-storage',
      partialize: (state) => ({
        masterItems: state.masterItems,
        autocompleteData: state.autocompleteData,
        lastFetchTimestamp: state.lastFetchTimestamp,
      }),
    }
  )
);