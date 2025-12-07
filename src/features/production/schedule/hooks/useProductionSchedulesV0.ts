/**
 * ProductionScheduleV0 훅
 * Google 스프레드시트 동기화 데이터 조회 및 관리
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import * as ProductionScheduleV0Service from '../services/productionScheduleV0Service';
import { ProductionScheduleV0 } from '../types';

export const useProductionSchedulesV0 = () => {
  const [data, setData] = useState<ProductionScheduleV0 | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // 실시간 구독
  useEffect(() => {
    setLoading(true);
    setError(null);

    unsubscribeRef.current = ProductionScheduleV0Service.subscribeToLatestSync(
      (syncData) => {
        setData(syncData);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, []);

  // 날짜 범위로 필터링된 행 가져오기
  const getRowsByDateRange = useCallback(
    (startDate: string, endDate: string) => {
      if (!data) {
        return [];
      }

      return ProductionScheduleV0Service.filterRowsByDateRange(
        data,
        startDate,
        endDate
      );
    },
    [data]
  );

  // 수동 새로고침
  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      const latestData = await ProductionScheduleV0Service.getLatestSync();
      setData(latestData);
      setLoading(false);
    } catch (err) {
      setError(err as Error);
      setLoading(false);
    }
  }, []);

  return {
    data,
    loading,
    error,
    refetch,
    getRowsByDateRange,
  };
};

