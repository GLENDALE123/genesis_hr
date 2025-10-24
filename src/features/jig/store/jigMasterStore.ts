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
  subscribeToJigMasters,
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
  subscribeToMasters: () => () => void;
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

      subscribeToMasters: () => {
        set({ isLoading: true, error: null });
        
        const unsubscribe = subscribeToJigMasters(
          (masters) => {
            // 데이터가 실제로 변경되었을 때만 업데이트
            const currentItems = get().masterItems;
            const hasChanged = JSON.stringify(currentItems) !== JSON.stringify(masters);
            
            if (hasChanged) {
              set({ 
                masterItems: masters,
                lastFetchTimestamp: Date.now(),
                isLoading: false 
              });
            }
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

      createMasterItem: async (data, imageFiles, currentUserUid) => {
        set({ isLoading: true, error: null });
        try {
          await createJigMasterItem(data, imageFiles, { uid: currentUserUid, displayName: 'Unknown User' });
          // 실시간 구독으로 자동 업데이트되므로 수동 새로고침 불필요
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
          // 실시간 구독으로 자동 업데이트되므로 수동 새로고침 불필요
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
          // 실시간 구독으로 자동 업데이트되므로 수동 새로고침 불필요
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