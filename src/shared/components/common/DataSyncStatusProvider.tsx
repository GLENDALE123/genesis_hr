import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useNetworkStatus } from '@/shared/hooks/useNetworkStatus';
import { toast } from 'sonner';

export type DataSyncStatus = 'online' | 'offline' | 'syncing' | 'cache-only';

interface DataSyncState {
  status: DataSyncStatus;
  hasCacheData: boolean;
  lastSyncTime: Date | null;
  isStale: boolean; // 오래된 데이터인지
  cacheDataCount: number; // 캐시 데이터 소스 개수
}

interface DataSyncContextValue {
  state: DataSyncState;
  setCacheDataDetected: (fromCache: boolean) => void;
  setSyncComplete: () => void;
  resetCacheCount: () => void;
}

const DataSyncContext = createContext<DataSyncContextValue | undefined>(undefined);

/**
 * 데이터 동기화 상태를 전역적으로 추적하는 Provider
 * Firestore의 metadata.fromCache를 활용하여 캐시 데이터 감지
 */
export const DataSyncStatusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isOnline, isOffline } = useNetworkStatus();
  const [state, setState] = useState<DataSyncState>({
    status: isOnline ? 'online' : 'offline',
    hasCacheData: false,
    lastSyncTime: null,
    isStale: false,
    cacheDataCount: 0,
  });

  const cacheDataSources = useRef<Set<string>>(new Set());
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 네트워크 상태 변경 시 상태 업데이트
  useEffect(() => {
    if (isOffline) {
      setState(prev => ({
        ...prev,
        status: 'offline',
        isStale: prev.cacheDataCount > 0, // 캐시 데이터가 있으면 오래된 것으로 표시
      }));
    } else {
      // 온라인으로 전환 시 동기화 중 상태로 전환
      if (state.cacheDataCount > 0) {
        setState(prev => ({
          ...prev,
          status: 'syncing',
        }));
        
        // 동기화 완료 시뮬레이션 (실제로는 Firestore 리스너가 업데이트함)
        if (syncTimeoutRef.current) {
          clearTimeout(syncTimeoutRef.current);
        }
        
        syncTimeoutRef.current = setTimeout(() => {
          setState(prev => ({
            ...prev,
            status: prev.cacheDataCount > 0 ? 'cache-only' : 'online',
            lastSyncTime: new Date(),
            isStale: false,
          }));
        }, 2000);
      } else {
        setState(prev => ({
          ...prev,
          status: 'online',
          lastSyncTime: new Date(),
          isStale: false,
        }));
      }
    }

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [isOnline, isOffline, state.cacheDataCount]);

  // 캐시 데이터 감지
  const setCacheDataDetected = useCallback((fromCache: boolean, sourceId?: string) => {
    setState(prev => {
      const newCacheDataSources = new Set<string>(prev.cacheDataCount > 0 ? Array.from(cacheDataSources.current) : []);
      
      if (fromCache) {
        if (sourceId) {
          newCacheDataSources.add(sourceId);
        } else {
          newCacheDataSources.add(`source-${Date.now()}-${Math.random()}`);
        }
        cacheDataSources.current = newCacheDataSources;
        
        return {
          ...prev,
          hasCacheData: true,
          cacheDataCount: newCacheDataSources.size,
          status: isOffline ? 'offline' : prev.status === 'online' ? 'cache-only' : prev.status,
          isStale: true, // 캐시 데이터는 오래된 것으로 표시
        };
      } else {
        // 서버 데이터이면 해당 소스 제거
        if (sourceId && newCacheDataSources.has(sourceId)) {
          newCacheDataSources.delete(sourceId);
        } else if (newCacheDataSources.size > 0) {
          // sourceId가 없으면 랜덤으로 하나 제거 (Fallback)
          const firstKey = Array.from(newCacheDataSources)[0];
          newCacheDataSources.delete(firstKey);
        }
        cacheDataSources.current = newCacheDataSources;
        
        const hasRemainingCache = newCacheDataSources.size > 0;
        
        return {
          ...prev,
          cacheDataCount: newCacheDataSources.size,
          hasCacheData: hasRemainingCache,
          status: hasRemainingCache 
            ? (isOffline ? 'offline' : 'cache-only')
            : 'online',
          isStale: hasRemainingCache,
          lastSyncTime: hasRemainingCache ? prev.lastSyncTime : new Date(),
        };
      }
    });
  }, [isOffline]);

  // 동기화 완료
  const setSyncComplete = useCallback(() => {
    setState(prev => ({
      ...prev,
      status: 'online',
      hasCacheData: false,
      cacheDataCount: 0,
      lastSyncTime: new Date(),
      isStale: false,
    }));
    cacheDataSources.current.clear();
  }, []);

  // 캐시 카운트 리셋
  const resetCacheCount = useCallback(() => {
    setState(prev => ({
      ...prev,
      cacheDataCount: 0,
      hasCacheData: false,
      status: isOffline ? 'offline' : 'online',
      isStale: false,
    }));
    cacheDataSources.current.clear();
  }, [isOffline]);

  // 오프라인 상태에서 캐시 데이터를 보고 있을 때 경고 표시
  const cacheWarningShown = useRef(false);
  useEffect(() => {
    if (isOffline && state.isStale && state.hasCacheData && !cacheWarningShown.current) {
      toast.warning('오프라인 상태입니다. 캐시된 데이터를 보고 있습니다. 최신 데이터가 아닐 수 있습니다.', {
        duration: Infinity,
        id: 'cache-warning',
        description: state.lastSyncTime 
          ? `마지막 동기화: ${new Date(state.lastSyncTime).toLocaleString('ko-KR')}`
          : '캐시된 데이터를 보고 있습니다.',
      });
      cacheWarningShown.current = true;
    } else if ((!isOffline || !state.isStale) && cacheWarningShown.current) {
      // 온라인 상태이거나 최신 데이터면 경고 제거
      toast.dismiss('cache-warning');
      cacheWarningShown.current = false;
    }
  }, [isOffline, state.isStale, state.hasCacheData, state.lastSyncTime]);

  return (
    <DataSyncContext.Provider
      value={{
        state,
        setCacheDataDetected,
        setSyncComplete,
        resetCacheCount,
      }}
    >
      {children}
    </DataSyncContext.Provider>
  );
};

/**
 * 데이터 동기화 상태를 사용하는 훅
 */
export const useDataSyncStatus = () => {
  const context = useContext(DataSyncContext);
  if (!context) {
    throw new Error('useDataSyncStatus must be used within DataSyncStatusProvider');
  }
  return context;
};















