'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { JigMasterListView, JigMasterDetail, JigListForm, JigMasterFilterPanel } from '../components';
import { JigMasterItem, CreateJigMasterItemData } from '../types';
import { useJigMaster } from '../hooks/useJigMaster';
import { useJigMasterFilters } from '../hooks/useJigMasterFilters';
import { useUserRole } from '@/features/auth/hooks/useUserRole';
import { getUserDisplayName } from '@/shared/utils/userUtils';
import { useAuthStore } from '@/features/auth/store/authStore';
import { Button } from '@/shared/components/ui/button';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export const JigMasterContainer: React.FC = () => {
  const { masterItems, isLoading, isFetching, error, updateMasterItem, deleteMasterItem, createMasterItem, autocompleteData, subscribeToMastersByDateRange, subscribeToMasters } = useJigMaster();
  const userRole = useUserRole() || 'Member';
  const { user, userProfile } = useAuthStore();
  
  // 필터 훅 사용
  const {
    filters,
    setStartDate,
    setEndDate,
    setSearchTerm,
    resetFilters,
    today,
    yesterday,
    isSearching
  } = useJigMasterFilters();
  
  const unsubscribeRef = useRef<(() => void) | null>(null);
  
  // currentUserProfile 메모이제이션 최적화
  const currentUserProfile = useMemo(() => {
    if (!user) return null;
    
    const displayName = getUserDisplayName(userProfile, user, '로딩 중...');
    
    return {
      uid: user.uid,
      displayName,
      email: user.email || '',
      role: userRole,
      isLoading: !userProfile
    };
  }, [user?.uid, user?.email, userProfile?.displayName, userRole]); // 더 구체적인 의존성
  
  const [selectedJig, setSelectedJig] = useState<JigMasterItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 날짜 필터 또는 검색어 변경 시 구독 업데이트
  useEffect(() => {
    // 이전 구독 해제
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    const hasSearch = filters.searchTerm.trim().length > 0;

    if (hasSearch) {
      // 검색어가 있으면 전체 데이터 구독
      unsubscribeRef.current = subscribeToMasters();
    } else if (filters.startDate && filters.endDate) {
      // 검색어가 없으면 날짜 필터 적용
      unsubscribeRef.current = subscribeToMastersByDateRange(
        filters.startDate,
        filters.endDate
      );
    }

    // 컴포넌트 언마운트 시 구독 해제
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [filters.startDate, filters.endDate, filters.searchTerm, subscribeToMastersByDateRange, subscribeToMasters]);

  // 검색 필터링
  const filteredJigs = useMemo(() => {
    if (!filters.searchTerm.trim()) return masterItems;
    
    const search = filters.searchTerm.toLowerCase().trim();
    if (search.length < 2) return masterItems;
    
    const normalizedSearch = search.replace(/\s+/g, '');
    
    return masterItems.filter(jig => {
      const productName = (jig.productName || jig.itemName || '').toLowerCase().replace(/\s+/g, '');
      const partName = jig.partName.toLowerCase().replace(/\s+/g, '');
      const jigNumber = (jig.jigNumber || jig.itemNumber || '').toLowerCase().replace(/\s+/g, '');
      const orderNumber = (jig.orderNumber || '').toLowerCase().replace(/\s+/g, '');
      const supplier = (jig.supplier || '').toLowerCase().replace(/\s+/g, '');
      const requestType = jig.requestType.toLowerCase().replace(/\s+/g, '');
      const remarks = (jig.remarks || '').toLowerCase().replace(/\s+/g, '');
      
      return productName.includes(normalizedSearch) ||
             partName.includes(normalizedSearch) ||
             jigNumber.includes(normalizedSearch) ||
             orderNumber.includes(normalizedSearch) ||
             supplier.includes(normalizedSearch) ||
             requestType.includes(normalizedSearch) ||
             remarks.includes(normalizedSearch);
    });
  }, [masterItems, filters.searchTerm]);

  // 모달이 열려있을 때 실시간으로 업데이트된 데이터 반영
  const currentJig = selectedJig ? filteredJigs.find(item => item.id === selectedJig.id) || selectedJig : null;

  // 이벤트 핸들러들을 useCallback으로 메모이제이션
  const handleSelectJig = useCallback((jig: JigMasterItem) => {
    setSelectedJig(jig);
    setIsDetailModalOpen(true);
  }, []);

  const handleCloseDetailModal = useCallback(() => {
    setIsDetailModalOpen(false);
    setSelectedJig(null);
  }, []);

  const handleUpdateJig = useCallback(async (id: string, updates: Partial<Omit<JigMasterItem, 'id' | 'createdAt'>>) => {
    try {
      await updateMasterItem(id, updates);
    } catch (error) {
      console.error('지그 업데이트 실패:', error);
      throw error;
    }
  }, [updateMasterItem]);

  const handleDeleteJig = useCallback(async (id: string) => {
    try {
      await deleteMasterItem(id);
    } catch (error) {
      console.error('지그 삭제 실패:', error);
      throw error;
    }
  }, [deleteMasterItem]);

  const handleCreateJig = useCallback(async (data: CreateJigMasterItemData, imageFiles: File[]) => {
    setIsSaving(true);
    try {
      await createMasterItem(data, imageFiles);
      setIsFormModalOpen(false);
    } catch (error) {
      console.error('지그 생성 실패:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [createMasterItem]);

  const handleOpenFormModal = useCallback(() => {
    setIsFormModalOpen(true);
  }, []);

  const handleCloseFormModal = useCallback(() => {
    setIsFormModalOpen(false);
    setIsSaving(false);
  }, []);

  // 로딩 상태 - 초기 로딩 시에만 스켈레톤 표시
  if (isLoading && filteredJigs.length === 0) {
    return (
      <div className="h-full flex flex-col space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="flex-1" />
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          데이터를 불러오는 중 오류가 발생했습니다: {error}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-4 p-0">
      {/* 필터 패널 */}
      <JigMasterFilterPanel
        startDate={filters.startDate}
        endDate={filters.endDate}
        searchTerm={filters.searchTerm}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onSearchTermChange={setSearchTerm}
        onReset={resetFilters}
        today={today}
        yesterday={yesterday}
        totalCount={filteredJigs.length}
        isSearching={isSearching}
        isFetching={isFetching}
        onOpenFormModal={handleOpenFormModal}
      />

      {/* 지그 목록 테이블 */}
      <JigMasterListView
        jigs={filteredJigs}
        onSelectJig={handleSelectJig}
        currentUserProfile={currentUserProfile}
        totalCount={filteredJigs.length}
      />

      {/* 지그 상세 모달 */}
      <JigMasterDetail
        jig={currentJig}
        onSave={handleUpdateJig}
        onDelete={handleDeleteJig}
        currentUserProfile={currentUserProfile}
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
      />

      {/* 지그 등록 폼 모달 */}
      <JigListForm
        isOpen={isFormModalOpen}
        onClose={handleCloseFormModal}
        onSave={handleCreateJig}
        isLoading={isSaving}
      />
    </div>
  );
};