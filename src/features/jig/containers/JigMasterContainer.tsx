'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { JigMasterListView, JigMasterDetail, JigListForm } from '../components';
import { JigMasterItem, CreateJigMasterItemData } from '../types';
import { useJigMaster } from '../hooks/useJigMaster';
import { useUserRole } from '@/features/auth/hooks/useUserRole';
import { getUserDisplayName } from '@/shared/utils/userUtils';
import { useAuthStore } from '@/features/auth/store/authStore';
import { Button } from '@/shared/components/ui/button';
import { LoadingSpinner } from '@/shared/components/common/LoadingSpinner';

export const JigMasterContainer: React.FC = () => {
  const { masterItems, isLoading, error, updateMasterItem, deleteMasterItem, createMasterItem, autocompleteData } = useJigMaster();
  const userRole = useUserRole() || 'Member';
  const { user, userProfile } = useAuthStore();
  
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
    try {
      await createMasterItem(data, imageFiles);
      setIsFormModalOpen(false);
    } catch (error) {
      console.error('지그 생성 실패:', error);
      throw error;
    }
  }, [createMasterItem]);

  const handleOpenFormModal = useCallback(() => {
    setIsFormModalOpen(true);
  }, []);

  const handleCloseFormModal = useCallback(() => {
    setIsFormModalOpen(false);
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* 메인 콘텐츠 */}
      <div className="flex-1 flex flex-col min-h-0">
        {isLoading ? (
          <LoadingSpinner 
            size="lg" 
            variant="default" 
            label="로딩 중..." 
            loadingVariant="card"
            className="h-64"
          />
        ) : error ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-destructive mb-4">오류가 발생했습니다: {error}</p>
              <Button onClick={() => window.location.reload()}>새로고침</Button>
            </div>
          </div>
        ) : (
          <div className="flex-1 min-h-0">
            <JigMasterListView
              jigs={masterItems}
              onSelectJig={handleSelectJig}
              currentUserProfile={currentUserProfile}
              onOpenFormModal={handleOpenFormModal}
            />
          </div>
        )}
      </div>

      {/* 지그 상세 모달 */}
      <JigMasterDetail
        jig={selectedJig}
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
        isLoading={isLoading}
        autocompleteData={autocompleteData}
      />
    </div>
  );
};