import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { PackagingReport, PackagingFormData } from '@/features/production/types';
import { PackagingReportsService } from '@/features/production/services/packagingReportsService';
import { waitForFirebaseInit } from '@/shared/services/firebase/config';
import { getUserDisplayName } from '@/shared/utils/userUtils';
import { usePackagingReportsStore } from '@/features/production/store/packagingReportsStore';
import { useAuthStore } from '@/features/auth/store/authStore';

/**
 * Packaging Reports 데이터를 관리하는 커스텀 훅
 * HS-Jig의 packaging-reports 컬렉션과 동일한 구조 사용
 * 
 * 성능 최적화:
 * - Zustand 스토어에 날짜별 캐싱 (5분 유효)
 * - 캐시된 데이터 즉시 표시 → 백그라운드에서 최신 데이터 업데이트
 */
export const usePackagingReports = () => {
  const { user, userProfile } = useAuthStore();
  const userInfo = useMemo(() => ({
    uid: user?.uid || '',
    displayName: getUserDisplayName(userProfile, user),
    email: user?.email || ''
  }), [user, userProfile]);
  const [mounted, setMounted] = useState(false);
  
  // 현재 구독 중인 날짜 범위 (실시간 구독 관리용)
  const [currentDateRange, setCurrentDateRange] = useState<{ startDate: string; endDate: string } | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  
  // Zustand 스토어 사용
  const {
    reports,
    isLoading: loading,
    isFetching,
    error,
    getCachedReports,
    setReports,
    setLoading,
    setFetching,
    setError,
    updateReport: updateCachedReport,
    deleteReport: deleteCachedReport
  } = usePackagingReportsStore();

  // 클라이언트 사이드에서만 실행되도록 보장
  useEffect(() => {
    setMounted(true);
  }, []);

  // ✅ 초기 마운트 시 오늘 날짜로 실시간 구독 시작
  useEffect(() => {
    if (!mounted) return;

    const today = new Date().toISOString().split('T')[0];
    setCurrentDateRange({ startDate: today, endDate: today });
  }, [mounted]);

  // ✅ 캐시 확인 및 즉시 표시 + 백그라운드 동기화
  useEffect(() => {
    if (!mounted || !currentDateRange) return;
    
    const { startDate: rangeStartDate, endDate: rangeEndDate } = currentDateRange;
    
    // 캐시된 데이터 확인
    const cachedReports = getCachedReports(rangeStartDate, rangeEndDate);
    if (cachedReports) {
      console.log('📦 캐시된 생산일보 데이터 먼저 표시');
      // 백그라운드에서 최신 데이터 가져오기
      setFetching(true);
    }
  }, [mounted, currentDateRange, getCachedReports, setFetching]);

  // ✅ 날짜 범위가 변경될 때마다 실시간 구독 재시작
  useEffect(() => {
    if (!mounted || !currentDateRange) return;

    let isCancelled = false;
    const { startDate, endDate } = currentDateRange;

    const initSubscription = async () => {
      console.log(`🔄 생산일보 실시간 구독 시작: ${startDate} ~ ${endDate}`);
      
      // 로딩 시작
      setLoading(true);
      setError(null);

      // Firebase 초기화 대기
      const isFirebaseReady = await waitForFirebaseInit();
      
      if (isCancelled) return;

      if (!isFirebaseReady) {
        console.error('❌ Firebase 초기화 실패');
        setError(new Error('Firebase 초기화에 실패했습니다. 페이지를 새로고침해주세요.'));
        setLoading(false);
        setFetching(false);
        return;
      }
      
      console.log('✅ Firebase 초기화 완료 - 실시간 구독 시작');

      // 기존 구독 해제
      if (unsubscribeRef.current) {
        console.log('🔄 기존 구독 해제');
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }

      // 새로운 날짜 범위로 실시간 구독
      unsubscribeRef.current = PackagingReportsService.subscribeToPackagingReportsByDateRange(
        startDate,
        endDate,
        (newReports) => {
          if (!isCancelled) {
            console.log(`✅ 생산일보 데이터 수신 성공: ${newReports.length}건`);
            
            // Zustand 스토어에 저장
            const store = usePackagingReportsStore.getState();
            store.setReports(newReports, startDate, endDate);
          }
        },
        (err) => {
          if (!isCancelled) {
            console.error('❌ 생산일보 데이터 로드 실패:', err);
            const errorMessage = err instanceof Error ? err.message : '';
            
            if (errorMessage.includes('permission') || errorMessage.includes('insufficient')) {
              console.warn('⚠️ 권한 에러 발생:', errorMessage);
              setError(new Error('생산일보 데이터를 불러올 권한이 없습니다. 관리자에게 문의하세요.'));
            } else {
              setError(err);
            }
            setLoading(false);
            setFetching(false);
          }
        }
      );
    };

    initSubscription();

    return () => {
      isCancelled = true;
      // 컴포넌트 언마운트 또는 날짜 범위 변경 시 구독 해제
      if (unsubscribeRef.current) {
        console.log('🔄 구독 해제 (cleanup)');
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [mounted, currentDateRange, setLoading, setFetching, setError]);

  // 수동 새로고침 (현재 날짜 범위 유지하면서 재구독)
  const refetch = useCallback(() => {
    if (!mounted || !currentDateRange) return;
    
    console.log('🔄 수동 새로고침: 구독 재시작');
    
    // 동일한 날짜 범위로 재설정 → useEffect가 구독 재시작
    setCurrentDateRange({ ...currentDateRange });
  }, [mounted, currentDateRange]);

  // ✅ 특정 날짜 범위로 실시간 구독 변경
  const getReportsByDateRange = useCallback((startDate: string, endDate: string) => {
    if (!mounted) return;
    
    console.log(`📅 날짜 범위 변경 요청: ${startDate} ~ ${endDate}`);
    
    // 날짜 범위 상태 변경 → useEffect가 자동으로 구독 재시작
    setCurrentDateRange({ startDate, endDate });
  }, [mounted]);

  // 특정 생산라인으로 필터링된 데이터 가져오기
  const getReportsByLine = useCallback(async (productionLine: string) => {
    if (!mounted) return;
    
    try {
      setLoading(true);
      setError(null);
      await PackagingReportsService.getPackagingReportsByLine(
        productionLine
      );
      
      // 라인 필터는 날짜 범위와 별도로 처리 (캐싱하지 않음)
      // TODO: 필요시 라인별 캐싱도 추가 가능
    } catch (err) {
      setError(err as Error);
    }
  }, [mounted, setLoading, setError]);

  // 보고서 삭제
  const deleteReport = useCallback(async (reportId: string, reportData?: PackagingReport) => {
    if (!user) {
      const error = new Error('로그인이 필요합니다.');
      setError(error);
      throw error;
    }

    try {
      await PackagingReportsService.deletePackagingReport(reportId, {
            uid: userInfo.uid,
            displayName: userInfo.displayName,
            email: userInfo.email
      }, reportData);
      // Zustand 스토어에서도 제거 (캐시 동기화)
      deleteCachedReport(reportId);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [user, userProfile, deleteCachedReport, setError]);

  // 보고서 업데이트
  const updateReport = useCallback(async (reportId: string, updateData: Partial<PackagingReport>) => {
    if (!user) {
      const error = new Error('로그인이 필요합니다.');
      setError(error);
      throw error;
    }

    try {
      await PackagingReportsService.updatePackagingReport(reportId, updateData, {
            uid: userInfo.uid,
            displayName: userInfo.displayName,
            email: userInfo.email
      });
      // Zustand 스토어에서도 업데이트 (캐시 동기화)
      updateCachedReport(reportId, updateData);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [user, userProfile, updateCachedReport, setError]);

  // 보고서 생성
  const createReport = useCallback(async (formData: PackagingFormData) => {
    if (!user) {
      const error = new Error('로그인이 필요합니다.');
      setError(error);
      throw error;
    }

    try {
      const reportId = await PackagingReportsService.createPackagingReport(formData, {
            uid: userInfo.uid,
            displayName: userInfo.displayName,
            email: userInfo.email
      });
      // 생성 후 목록 새로고침 (실시간 구독이 자동으로 업데이트하지만, 즉시 반영 위해)
      await refetch();
      return reportId;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [user, userProfile, refetch, setError]);

  return {
    reports,
    loading,
    isFetching, // 백그라운드 fetching 상태
    error,
    refetch,
    getReportsByDateRange,
    getReportsByLine,
    createReport,
    deleteReport,
    updateReport
  };
};
