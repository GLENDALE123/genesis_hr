/**
 * 지그 마스터 스토어
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { JigMasterItem } from '../types';

/**
 * 지그 마스터 데이터 캐시 인터페이스
 */
interface DateRangeCache {
  startDate: string;
  endDate: string;
  masterItems: JigMasterItem[];
  timestamp: number; // 캐시 시간
}

interface JigMasterState {
  // 캐시된 데이터 (날짜 범위별)
  cache: DateRangeCache | null;
  
  // 현재 표시 중인 데이터
  masterItems: JigMasterItem[];
  
  // 로딩 상태
  isLoading: boolean;
  isFetching: boolean; // 백그라운드 fetching
  
  // 에러
  error: Error | null;
  
  // 마지막 업데이트 시간
  lastUpdated: number | null;
  
  // 선택된 항목
  selectedItem: JigMasterItem | null;
  
  // 자동완성 데이터
  autocompleteData: {
    itemNames: string[];
    partNames: string[];
    itemNumbers: string[];
    productNames: string[];
    jigNumbers: string[];
    suppliers: string[];
    orderNumbers: string[];
  };
}

interface JigMasterActions {
  // 캐시 확인 및 반환
  getCachedMasters: (startDate: string, endDate: string) => JigMasterItem[] | null;
  
  // 데이터 설정 (캐싱)
  setMasters: (masterItems: JigMasterItem[], startDate: string, endDate: string) => void;
  
  // 로딩 상태 설정
  setLoading: (loading: boolean) => void;
  setFetching: (fetching: boolean) => void;
  
  // 에러 설정
  setError: (error: Error | null) => void;
  
  // 캐시 초기화
  clearCache: () => void;
  
  // 특정 지그 업데이트 (실시간 동기화)
  updateMaster: (masterId: string, updateData: Partial<JigMasterItem>) => void;
  
  // 특정 지그 삭제 (실시간 동기화)
  deleteMaster: (masterId: string) => void;
  
  // 새 지그 추가 (실시간 동기화)
  addMaster: (master: JigMasterItem) => void;
  
  // 선택된 항목 설정
  setSelectedItem: (item: JigMasterItem | null) => void;
  
  // 자동완성 데이터 설정
  setAutocompleteData: (data: JigMasterState['autocompleteData']) => void;
}

type JigMasterStore = JigMasterState & JigMasterActions;

// 캐시 유효 시간 (5분)
const CACHE_DURATION = 5 * 60 * 1000;

export const useJigMasterStore = create<JigMasterStore>()(
  devtools(
    persist(
      (set, get) => ({
        // State
        cache: null,
        masterItems: [],
        isLoading: false,
        isFetching: false,
        error: null,
        lastUpdated: null,
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
        
        // Actions
        getCachedMasters: (startDate: string, endDate: string) => {
          const { cache } = get();
          
          if (!cache) return null;
          
          // 날짜 범위가 일치하는지 확인
          if (cache.startDate !== startDate || cache.endDate !== endDate) {
            return null;
          }
          
          // 캐시 유효 시간 확인
          const now = Date.now();
          if (now - cache.timestamp > CACHE_DURATION) {
            return null;
          }
          
          return cache.masterItems;
        },
        
        setMasters: (masterItems: JigMasterItem[], startDate: string, endDate: string) => {
          // autocomplete 데이터 자동 생성
          const productNames = [...new Set([
            ...masterItems.map(item => item.productName).filter((v): v is string => Boolean(v)),
            ...masterItems.map(item => item.itemName).filter((v): v is string => Boolean(v))
          ])].sort();

          const partNames = [...new Set(masterItems.map(item => item.partName).filter((v): v is string => Boolean(v)))].sort();

          const jigNumbers = [...new Set([
            ...masterItems.map(item => item.jigNumber).filter((v): v is string => Boolean(v)),
            ...masterItems.map(item => item.itemNumber).filter((v): v is string => Boolean(v))
          ])].sort();

          const suppliers = [...new Set(masterItems.map(item => item.supplier).filter((v): v is string => Boolean(v)))].sort();

          const orderNumbers = [...new Set(masterItems.map(item => item.orderNumber).filter((v): v is string => Boolean(v)))].sort();

          const now = Date.now();
          
          set({
            masterItems,
            cache: {
              startDate,
              endDate,
              masterItems,
              timestamp: now
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
            lastUpdated: now,
            isLoading: false,
            isFetching: false,
            error: null
          });
        },
        
        setLoading: (isLoading: boolean) => {
          set({ isLoading });
        },
        
        setFetching: (isFetching: boolean) => {
          set({ isFetching });
        },
        
        setError: (error: Error | null) => {
          set({ error, isLoading: false, isFetching: false });
        },
        
        clearCache: () => {
          set({ cache: null });
        },
        
        updateMaster: (masterId: string, updateData: Partial<JigMasterItem>) => {
          const { masterItems, cache } = get();
          
          // 기존 지그 데이터 찾기
          const existingMaster = masterItems.find(item => item.id === masterId);
          if (!existingMaster) {
            console.warn(`📦 지그 업데이트 실패: ${masterId}를 찾을 수 없음`);
            return;
          }
          
          // 실제 변경사항이 있는지 확인
          const hasChanges = Object.keys(updateData).some(key => {
            const typedKey = key as keyof JigMasterItem;
            return existingMaster[typedKey] !== updateData[typedKey];
          });
          
          if (!hasChanges) {
            return;
          }
          
          // 업데이트된 지그 목록 생성
          const updatedItems = masterItems.map(item =>
            item.id === masterId ? { ...item, ...updateData } : item
          );
          
          // 캐시도 함께 업데이트
          if (cache) {
            const updatedCacheItems = cache.masterItems.map(item =>
              item.id === masterId ? { ...item, ...updateData } : item
            );
            
            set({
              masterItems: updatedItems,
              cache: {
                ...cache,
                masterItems: updatedCacheItems
              },
              lastUpdated: Date.now()
            });
          } else {
            set({
              masterItems: updatedItems,
              lastUpdated: Date.now()
            });
          }
        },
        
        deleteMaster: (masterId: string) => {
          const { masterItems, cache } = get();
          
          // 삭제된 지그 목록 생성
          const filteredItems = masterItems.filter(item => item.id !== masterId);
          
          // 캐시도 함께 업데이트
          if (cache) {
            const filteredCacheItems = cache.masterItems.filter(item => item.id !== masterId);
            
            set({
              masterItems: filteredItems,
              cache: {
                ...cache,
                masterItems: filteredCacheItems
              },
              lastUpdated: Date.now()
            });
          } else {
            set({
              masterItems: filteredItems,
              lastUpdated: Date.now()
            });
          }
        },
        
        addMaster: (master: JigMasterItem) => {
          const { masterItems, cache } = get();
          
          // 이미 존재하는지 확인
          if (masterItems.find(item => item.id === master.id)) {
            return;
          }
          
          // 새 지그를 맨 앞에 추가 (최신순)
          const updatedItems = [master, ...masterItems];
          
          // 캐시도 함께 업데이트
          if (cache) {
            const updatedCacheItems = [master, ...cache.masterItems];
            
            set({
              masterItems: updatedItems,
              cache: {
                ...cache,
                masterItems: updatedCacheItems
              },
              lastUpdated: Date.now()
            });
          } else {
            set({
              masterItems: updatedItems,
              lastUpdated: Date.now()
            });
          }
        },
        
        setSelectedItem: (item: JigMasterItem | null) => {
          set({ selectedItem: item });
        },
        
        setAutocompleteData: (data: JigMasterState['autocompleteData']) => {
          set({ autocompleteData: data });
        },
      }),
      {
        name: 'jig-master-storage',
        partialize: (state) => ({
          cache: state.cache,
          autocompleteData: state.autocompleteData,
          lastUpdated: state.lastUpdated,
        }),
      }
    ),
    { name: 'jig-master-store' }
  )
);
