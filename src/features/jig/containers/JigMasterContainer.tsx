'use client';

import React, { useState } from 'react';
import { JigMasterListView, JigMasterDetail } from '../components';
import { JigMasterItem } from '../types';
import { useJigMaster } from '../hooks/useJigMaster';
import { useUserRole } from '@/features/auth/hooks/useUserRole';
import { useAuthStore } from '@/features/auth/store/authStore';
import { Button } from '@/shared/components/ui/button';
import { LoadingSpinner } from '@/shared/components/common/LoadingSpinner';

export const JigMasterContainer: React.FC = () => {
  const { masterItems, isLoading, error, updateMasterItem, deleteMasterItem } = useJigMaster();
  const userRole = useUserRole() || 'Member';
  const { user } = useAuthStore();
  
  const [selectedJig, setSelectedJig] = useState<JigMasterItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const handleSelectJig = (jig: JigMasterItem) => {
    setSelectedJig(jig);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedJig(null);
  };

  const handleUpdateJig = async (id: string, updates: Partial<Omit<JigMasterItem, 'id' | 'createdAt'>>) => {
    try {
      await updateMasterItem(id, updates);
    } catch (error) {
      console.error('지그 업데이트 실패:', error);
      throw error;
    }
  };

  const handleDeleteJig = async (id: string) => {
    try {
      await deleteMasterItem(id);
    } catch (error) {
      console.error('지그 삭제 실패:', error);
      throw error;
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
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="flex-1 px-6 pb-6 flex flex-col min-h-0">
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
              currentUserProfile={user ? { uid: user.uid, displayName: user.displayName || '', email: user.email || '', role: userRole } : null}
            />
          </div>
        )}
      </div>

      {/* 지그 상세 모달 */}
      <JigMasterDetail
        jig={selectedJig}
        onSave={handleUpdateJig}
        onDelete={handleDeleteJig}
        currentUserProfile={user ? { uid: user.uid, displayName: user.displayName || '', email: user.email || '', role: userRole } : null}
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
      />
    </div>
  );
};