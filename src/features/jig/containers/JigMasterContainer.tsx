'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { JigMasterListView, JigMasterDetail, JigListForm } from '../components';
import { JigMasterItem, CreateJigMasterItemData } from '../types';
import { useJigMaster } from '../hooks/useJigMaster';
import { useUserRole } from '@/features/auth/hooks/useUserRole';
import { getUserDisplayName } from '@/shared/utils/userUtils';
import { useAuthStore } from '@/features/auth/store/authStore';
import { Button } from '@/shared/components/ui/button';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { AlertCircle } from 'lucide-react';

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
  const [isSaving, setIsSaving] = useState(false);

  // 모달이 열려있을 때 실시간으로 업데이트된 데이터 반영
  const currentJig = selectedJig ? masterItems.find(item => item.id === selectedJig.id) || selectedJig : null;

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
  if (isLoading && masterItems.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="border rounded-lg p-4">
          <Skeleton className="h-12 w-full mb-2" />
          {[...Array(10)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full mb-1" />
          ))}
        </div>
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
    <div className="flex flex-col h-full">
      {/* 메인 콘텐츠 */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 min-h-0">
          <JigMasterListView
            jigs={masterItems}
            onSelectJig={handleSelectJig}
            currentUserProfile={currentUserProfile}
            onOpenFormModal={handleOpenFormModal}
          />
        </div>
      </div>

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