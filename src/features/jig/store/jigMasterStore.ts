/**
 * 지그 마스터 스토어
 */

import { create } from 'zustand';
import { JigMasterItem, CreateJigMasterItemData } from '../types';
import {
  getJigMasterItems,
  createJigMasterItem,
  updateJigMasterItem,
  deleteJigMasterItem,
  getAutocompleteData,
  subscribeToJigMasters,
} from '../services';
import { persist } from 'zustand/middleware';

/**
 * 캐시 인터페이스
 */
interface JigMasterCache {
  masterItems: JigMasterItem[];
  timestamp: number;
}

interface JigMasterState {
  masterItems: JigMasterItem[];
  cache: JigMasterCache | null;
  isLoading: boolean;
  isFetching: boolean; // 백그라운드 fetching
  error: string | null;
  selectedItem: JigMasterItem | null;
  autocompleteData: {
    itemNames: string[];
    partNames: string[];
    itemNumbers: string[];
  };
  lastFetchTimestamp: number;
  lastUpdated: number | null;
}

interface JigMasterActions {
  getCachedMasters: () => JigMasterItem[] | null;
  setMasters: (items: JigMasterItem[]) => void;
  fetchMasterItems: () => Promise<void>;
  subscribeToMasters: () => () => void;
  createMasterItem: (data: CreateJigMasterItemData, imageFiles: File[], currentUser: { uid: string; displayName: string }) => Promise<void>;
  updateMasterItem: (id: string, updates: Partial<JigMasterItem>) => Promise<void>;
  deleteMasterItem: (id: string) => Promise<void>;
  setSelectedItem: (item: JigMasterItem | null) => void;
  fetchAutocompleteData: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  setFetching: (fetching: boolean) => void;
  setError: (error: string | null) => void;
  clearCache: () => void;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5분 캐시 유효 시간

export const useJigMasterStore = create<JigMasterState & JigMasterActions>()(
  persist(
    (set, get) => ({
      // State
      masterItems: [],
      cache: null,
      isLoading: false,
      isFetching: false,
      error: null,
      selectedItem: null,
      autocompleteData: {
        itemNames: [],
        partNames: [],
        itemNumbers: [],
      },
      lastFetchTimestamp: 0,
      lastUpdated: null,

      // Actions
      getCachedMasters: () => {
        const { cache } = get();
        
        if (!cache) return null;
        
        // 캐시 유효 시간 확인
        const now = Date.now();
        const cacheAge = now - cache.timestamp;
        
        if (cacheAge < CACHE_DURATION) {
          console.log('📦 캐시된 지그 마스터 데이터 사용');
          return cache.masterItems;
        } else {
          console.log('⏰ 캐시 만료 - 새로운 데이터 필요');
        }
        
        return null;
      },

      setMasters: (items) => {
        set({
          masterItems: items,
          cache: {
            masterItems: items,
            timestamp: Date.now()
          },
          lastUpdated: Date.now(),
          lastFetchTimestamp: Date.now(),
          error: null
        });
        console.log(`✅ 지그 마스터 ${items.length}건 캐싱 완료`);
      },

      fetchMasterItems: async () => {
        set({ isLoading: true, error: null });
        try {
          const items = await getJigMasterItems();
          set({ 
            masterItems: items,
            cache: {
              masterItems: items,
              timestamp: Date.now()
            },
            lastFetchTimestamp: Date.now(),
            lastUpdated: Date.now(),
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
        const cachedMasters = get().getCachedMasters();
        
        if (cachedMasters) {
          console.log('📦 캐시된 데이터 먼저 표시');
          set({ masterItems: cachedMasters, isLoading: false, isFetching: true });
        } else {
          set({ isLoading: true, isFetching: false });
        }
        
        set({ error: null });
        
        const unsubscribe = subscribeToJigMasters(
          (masters) => {
            const currentItems = get().masterItems;
            
            // 참조가 같으면 업데이트하지 않음
            if (currentItems === masters) {
              set({ isLoading: false, isFetching: false });
              return;
            }
            
            // 길이가 다르면 확실히 변경된 것
            if (currentItems.length !== masters.length) {
              get().setMasters(masters);
              return;
            }
            
            // 길이가 같으면 내용 비교
            const hasChanges = masters.some((newItem, index) => {
              const currentItem = currentItems[index];
              return !currentItem || currentItem.id !== newItem.id;
            });
            
            if (hasChanges) {
              get().setMasters(masters);
            } else {
              // 변경사항이 없으면 로딩만 해제
              set({ isLoading: false, isFetching: false });
            }
          },
          (error) => {
            set({ 
              error: error.message,
              isLoading: false,
              isFetching: false
            });
          }
        );

        return unsubscribe;
      },

      createMasterItem: async (data, imageFiles, currentUser) => {
        set({ isLoading: true, error: null });
        try {
          await createJigMasterItem(data, imageFiles, currentUser);
          // 실시간 구독으로 자동 업데이트됨
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
          
          // 로컬 상태 즉시 업데이트 (UI 반응성 향상)
          const currentItems = get().masterItems;
          const updatedItems = currentItems.map(item => 
            item.id === id ? { ...item, ...updates } : item
          );
          
          // 캐시도 함께 업데이트
          get().setMasters(updatedItems);
          
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
          set({ isLoading: false });
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
          // 백그라운드에서 자동완성 데이터 로드 (로딩 상태 변경하지 않음)
          const data = await getAutocompleteData();
          set({ autocompleteData: data });
        } catch (error) {
          console.error('자동완성 데이터 로드 실패:', error);
          // 자동완성 실패는 전체 로딩에 영향을 주지 않음
        }
      },

      setLoading: (loading) => set({ isLoading: loading }),
      setFetching: (fetching) => set({ isFetching: fetching }),
      setError: (error) => set({ error }),
      clearCache: () => set({ cache: null }),
    }),
    {
      name: 'jig-master-storage',
      partialize: (state) => ({
        cache: state.cache,
        autocompleteData: state.autocompleteData,
        lastFetchTimestamp: state.lastFetchTimestamp,
        lastUpdated: state.lastUpdated,
      }),
    }
  )
);