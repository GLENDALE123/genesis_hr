
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { JigMasterListView, JigMasterDetail, JigListForm, JigMasterFilterPanel } from '../components';
import { JigMasterItem, CreateJigMasterItemData } from '../types';
import { useJigMaster } from '../hooks/useJigMaster';
import { useJigMasterFilters } from '../hooks/useJigMasterFilters';
import { useUserRole } from '@/features/auth/hooks/useUserRole';
import { getUserDisplayName, isAdmin } from '@/shared/utils/userUtils';
import { useAuthStore } from '@/features/auth/store/authStore';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { createJigMasterItem, updateJigMasterItem, deleteJigMasterItem } from '../services/jigMasterService';

export const JigMasterContainer: React.FC = () => {
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

  // 지그 마스터 훅 - 필터 옵션 전달
  const { filteredMasterItems, isLoading, isFetching, error, getMastersByDateRange } = useJigMaster({
    searchTerm: filters.searchTerm
  });

  const userRole = useUserRole() || 'Member';
  const { user, userProfile } = useAuthStore();
  
  // currentUserProfile 메모이제이션 최적화
  const currentUserProfile = useMemo(() => {
    if (!user) return null;
    
    const displayName = getUserDisplayName(user, userProfile as any, '로딩 중...');
    
    return {
      uid: user.uid,
      displayName,
      email: user.email || '',
      role: userRole,
      isLoading: !userProfile
    };
  }, [user?.uid, user?.email, userProfile, userRole]);
  
  const [selectedJig, setSelectedJig] = useState<JigMasterItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 날짜 필터 변경 시 구독 업데이트 (검색어가 없을 때만)
  useEffect(() => {
    if (!filters.searchTerm && filters.startDate && filters.endDate) {
      getMastersByDateRange(filters.startDate, filters.endDate);
    }
  }, [filters.startDate, filters.endDate, filters.searchTerm, getMastersByDateRange]);

  // 모달이 열려있을 때 실시간으로 업데이트된 데이터 반영
  const currentJig = selectedJig ? filteredMasterItems.find(item => item.id === selectedJig.id) || selectedJig : null;

  // 이벤트 핸들러들
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
      await updateJigMasterItem(id, updates);
    } catch (error) {
      console.error('지그 업데이트 실패:', error);
      throw error;
    }
  }, []);

  const handleDeleteJig = useCallback(async (id: string) => {
    // Admin 권한 체크
    if (!isAdmin(userProfile)) {
      throw new Error('삭제 권한이 없습니다. 관리자만 삭제할 수 있습니다.');
    }

    try {
      await deleteJigMasterItem(id);
    } catch (error) {
      console.error('지그 삭제 실패:', error);
      throw error;
    }
  }, [userProfile]);

  const handleCreateJig = useCallback(async (data: CreateJigMasterItemData, imageFiles: File[]) => {
    if (!user) throw new Error('User not authenticated');
    
    setIsSaving(true);
    try {
      const displayName = getUserDisplayName(user, userProfile as any, 'Unknown User');
      await createJigMasterItem(data, imageFiles, {
        uid: user.uid,
        displayName,
      });
      setIsFormModalOpen(false);
    } catch (error) {
      console.error('지그 생성 실패:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [user, userProfile]);

  const handleOpenFormModal = useCallback(() => {
    setIsFormModalOpen(true);
  }, []);

  const handleCloseFormModal = useCallback(() => {
    setIsFormModalOpen(false);
    setIsSaving(false);
  }, []);

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
        totalCount={filteredMasterItems.length}
        isSearching={isSearching}
        isFetching={isFetching}
        onOpenFormModal={handleOpenFormModal}
      />

      {/* 지그 목록 테이블 */}
      {isLoading && filteredMasterItems.length === 0 ? (
        <Skeleton className="flex-1 w-full" />
      ) : error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            데이터를 불러오는 중 오류가 발생했습니다: {error.message}
          </AlertDescription>
        </Alert>
      ) : (
        <JigMasterListView
          jigs={filteredMasterItems}
          onSelectJig={handleSelectJig}
          currentUserProfile={currentUserProfile}
          totalCount={filteredMasterItems.length}
        />
      )}

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

