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
  subscribeToJigMastersByDateRange,
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
    productNames: string[];
    jigNumbers: string[];
    suppliers: string[];
    orderNumbers: string[];
  };
  lastFetchTimestamp: number;
  lastUpdated: number | null;
}

interface JigMasterActions {
  getCachedMasters: () => JigMasterItem[] | null;
  setMasters: (items: JigMasterItem[]) => void;
  fetchMasterItems: () => Promise<void>;
  subscribeToMasters: () => () => void;
  subscribeToMastersByDateRange: (startDate: string, endDate: string) => () => void;
  getJigsByDateRange: (startDate: string, endDate: string) => void;
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
        productNames: [],
        jigNumbers: [],
        suppliers: [],
        orderNumbers: [],
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
          return cache.masterItems;
        } else {
        }
        
        return null;
      },

      setMasters: (items) => {
        // autocomplete 데이터 자동 생성 (불필요한 API 호출 제거)
        const productNames = [...new Set([
          ...items.map(item => item.productName).filter((v): v is string => Boolean(v)),
          ...items.map(item => item.itemName).filter((v): v is string => Boolean(v))
        ])].sort();
        
        const partNames = [...new Set(items.map(item => item.partName).filter((v): v is string => Boolean(v)))].sort();
        
        const jigNumbers = [...new Set([
          ...items.map(item => item.jigNumber).filter((v): v is string => Boolean(v)),
          ...items.map(item => item.itemNumber).filter((v): v is string => Boolean(v))
        ])].sort();
        
        const suppliers = [...new Set(items.map(item => item.supplier).filter((v): v is string => Boolean(v)))].sort();
        
        const orderNumbers = [...new Set(items.map(item => item.orderNumber).filter((v): v is string => Boolean(v)))].sort();
        
        set({
          masterItems: items,
          cache: {
            masterItems: items,
            timestamp: Date.now()
          },
          autocompleteData: {
            itemNames: productNames,
            partNames,
            itemNumbers: jigNumbers,
            productNames,
            jigNumbers,
            suppliers,
            orderNumbers,
          },
          lastUpdated: Date.now(),
          lastFetchTimestamp: Date.now(),
          error: null,
          isLoading: false,
          isFetching: false
        });
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
          set({ masterItems: cachedMasters, isLoading: false, isFetching: true });
        } else {
          set({ isLoading: true, isFetching: false });
        }
        
        set({ error: null });
        
        const unsubscribe = subscribeToJigMasters(
          (masters) => {
            // 간단한 길이 비교만 수행 (복잡한 내용 비교 제거)
            const currentItems = get().masterItems;
            
            // 길이가 다르면 확실히 변경된 것
            if (currentItems.length !== masters.length) {
              get().setMasters(masters);
              return;
            }
            
            // 길이가 같으면 단순히 ID 배열만 비교
            const currentIds = currentItems.map(item => item.id).join(',');
            const newIds = masters.map(item => item.id).join(',');
            
            if (currentIds !== newIds) {
              get().setMasters(masters);
            } else {
              // 변경사항이 없으면 로딩만 해제 (상태 업데이트 최소화)
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

      subscribeToMastersByDateRange: (startDate, endDate) => {
        const cachedMasters = get().getCachedMasters();
        
        if (cachedMasters) {
          set({ masterItems: cachedMasters, isLoading: false, isFetching: true });
        } else {
          set({ isLoading: true, isFetching: false });
        }
        
        set({ error: null });
        
        const unsubscribe = subscribeToJigMastersByDateRange(
          startDate,
          endDate,
          (masters) => {
            const currentItems = get().masterItems;
            
            if (currentItems.length !== masters.length) {
              get().setMasters(masters);
              return;
            }
            
            const currentIds = currentItems.map(item => item.id).join(',');
            const newIds = masters.map(item => item.id).join(',');
            
            if (currentIds !== newIds) {
              get().setMasters(masters);
            } else {
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

      getJigsByDateRange: (startDate, endDate) => {
        const cachedMasters = get().getCachedMasters();
        
        if (cachedMasters) {
          set({ masterItems: cachedMasters, isLoading: false, isFetching: true });
        } else {
          set({ isLoading: true, isFetching: false });
        }
        
        set({ error: null });
        
        subscribeToJigMastersByDateRange(
          startDate,
          endDate,
          (masters) => {
            get().setMasters(masters);
          },
          (error) => {
            set({ 
              error: error.message,
              isLoading: false,
              isFetching: false
            });
          }
        );
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