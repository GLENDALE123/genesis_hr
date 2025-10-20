'use client';

import React, { useState } from 'react';
import { JigMasterListView } from '../components';
import { JigMasterItem, CreateJigMasterItemData } from '../types';
import { useJigMaster } from '../hooks/useJigMaster';
import { useUserRole } from '@/features/auth/hooks/useUserRole';
import { useAuthStore } from '@/features/auth/store/authStore';
import { Button } from '@/shared/components/ui/button';
import { Plus } from 'lucide-react';

export const JigMasterContainer: React.FC = () => {
  const { masterItems, isLoading, error, setSelectedItem, createMasterItem } = useJigMaster();
  const userRole = useUserRole() || 'Member';
  const { user } = useAuthStore();
  
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);

  const canAddNew = userRole === 'Admin' || userRole === 'Manager';

  const handleSelectJig = (jig: JigMasterItem) => {
    setSelectedItem(jig);
    console.log('선택된 지그:', jig);
  };

  const handleAddNewJig = () => {
    setIsFormModalOpen(true);
  };

  const handleCloseFormModal = () => {
    setIsFormModalOpen(false);
  };

  const handleSaveNewJig = async (data: CreateJigMasterItemData, imageFiles: File[]) => {
    if (!user) {
      console.error('사용자 정보가 없습니다.');
      return;
    }
    
    try {
      await createMasterItem(data, imageFiles);
      setIsFormModalOpen(false);
      console.log('새 지그 등록 완료');
    } catch (error) {
      console.error('새 지그 등록 실패:', error);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">지그목록표</h1>
          <p className="text-muted-foreground">지그 마스터 데이터를 관리하세요</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canAddNew && (
            <Button onClick={handleAddNewJig} className="flex-shrink-0">
              <Plus className="h-4 w-4 mr-2" />
              신규 지그 등록
            </Button>
          )}
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="flex-1 px-6 pb-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">로딩 중...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-destructive mb-4">오류가 발생했습니다: {error}</p>
              <Button onClick={() => window.location.reload()}>새로고침</Button>
            </div>
          </div>
        ) : (
          <JigMasterListView
            jigs={masterItems}
            onSelectJig={handleSelectJig}
            onAddNewJig={handleAddNewJig}
            currentUserProfile={user ? { uid: user.uid, displayName: user.displayName || '', email: user.email || '', role: userRole } : null}
          />
        )}
      </div>
    </div>
  );
};