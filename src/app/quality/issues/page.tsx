'use client';

import React, { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/shared/components/ui/alert-dialog';
// import { Plus } from 'lucide-react';
import { 
  QualityIssueForm,
  QualityIssueStatsCards,
  QualityIssueTable,
  QualityIssueDetail,
  useQualityIssues,
  useQualityIssueForm,
  QualityIssue
} from '@/features/quality';
import { IssueItem } from '@/features/quality/types';
import { addIssueItem, deleteQualityIssue } from '@/features/quality/services/qualityIssueService';
import { toast } from 'sonner';
import { useAuthStore } from '@/features/auth/store/authStore';

export default function QualityIssuesPage() {
  const { issues, isLoading, searchTerm, setSearchTerm, setStatusFilter, stats } = useQualityIssues();
  const { isFormModalOpen, isSaving, handleSaveIssue, handleCancelForm, openFormModal } = useQualityIssueForm();
  const { user, userProfile } = useAuthStore();
  
  // 상세 모달 상태
  const [selectedIssue, setSelectedIssue] = useState<QualityIssue | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  
  // 삭제 확인 모달 상태
  const [issueToDelete, setIssueToDelete] = useState<QualityIssue | null>(null);

  // 작성자 권한 체크 함수
  const canChangeStatus = (issue: QualityIssue | null): boolean => {
    if (!issue || !user) return false;
    
    // 작성자가 문자열인 경우
    if (typeof issue.author === 'string') {
      return issue.author === (userProfile?.displayName || user.email);
    }
    
    // 작성자가 객체인 경우
    if (typeof issue.author === 'object' && issue.author) {
      return issue.author.uid === user.uid || 
             issue.author.email === user.email ||
             issue.author.displayName === (userProfile?.displayName || user.displayName);
    }
    
    return false;
  };

  // 이슈 선택 핸들러
  const handleSelectIssue = (issue: QualityIssue) => {
    setSelectedIssue(issue);
    setIsDetailModalOpen(true);
  };

  // 상세 모달 닫기
  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedIssue(null);
  };

  // 이슈사항 추가 핸들러
  const handleAddIssueItem = async (issueId: string, newIssue: string, newStatus?: string) => {
    try {
      if (!newIssue.trim()) {
        console.error('이슈 내용을 입력해주세요.');
        return;
      }
      
      // 로컬 상태 즉시 업데이트 (낙관적 업데이트)
      if (selectedIssue) {
        const newIssueObject = {
          content: newIssue.trim(),
          createdAt: new Date().toISOString(),
          status: newStatus || '해결완료'
        };
        
        setSelectedIssue({
          ...selectedIssue,
          issues: [...selectedIssue.issues, newIssueObject] as IssueItem[],
          status: (newStatus || selectedIssue.status) as QualityIssue['status']
        });
      }
      
      await addIssueItem(issueId, newIssue.trim(), newStatus, {
        uid: user!.uid,
        displayName: userProfile?.displayName || user!.displayName || user!.email || 'Unknown User',
        photoURL: userProfile?.photoURL || undefined
      });
      toast.success('이슈사항이 성공적으로 추가되었습니다.');
    } catch (error) {
      console.error('Error adding issue item:', error);
      toast.error('이슈사항 추가에 실패했습니다.');
      
      // 실패시 원래 상태로 롤백
      if (selectedIssue) {
        setSelectedIssue(prev => ({
          ...prev!,
          issues: prev!.issues.slice(0, -1), // 마지막 추가된 이슈 제거
          status: prev!.status // 원래 상태로 복원
        }));
      }
    }
  };

  // 삭제 처리 함수
  const handleDeleteIssue = async () => {
    if (!issueToDelete) return;
    
    try {
      await deleteQualityIssue(issueToDelete.id);
      toast.success('품질이슈가 성공적으로 삭제되었습니다.');
      setIssueToDelete(null);
      setIsDetailModalOpen(false);
      setSelectedIssue(null);
    } catch (error) {
      console.error('Error deleting quality issue:', error);
      toast.error('품질이슈 삭제에 실패했습니다.');
    }
  };

  // 삭제 확인 모달 열기
  const handleDeleteClick = (issue: QualityIssue) => {
    setIssueToDelete(issue);
  };

  // Admin 권한 체크
  const isAdmin = userProfile?.role === 'Admin';

  // 상태별 필터링 핸들러
  const handleFilterByStatus = (status: string) => {
    setStatusFilter(status);
  };

  return (
    <div className="h-full flex flex-col space-y-6">

      {/* 통계 카드 */}
      <div className="flex-shrink-0">
        <QualityIssueStatsCards stats={stats} onFilterByStatus={handleFilterByStatus} />
      </div>


      {/* 이슈 목록 - HS-Jig와 동일한 테이블 구조 */}
      <div className="flex-1 min-h-0">
        <QualityIssueTable 
          issues={issues}
          isLoading={isLoading}
          searchTerm={searchTerm}
          onSelectIssue={handleSelectIssue}
          onSearchChange={setSearchTerm}
          onOpenFormModal={openFormModal}
        />
      </div>

      {/* 품질이슈 등록 모달 */}
      <Dialog open={isFormModalOpen} onOpenChange={handleCancelForm}>
        <DialogContent 
          className="max-w-6xl"
          stickyHeader={
            <DialogHeader>
              <DialogTitle>신규 품질이슈 등록</DialogTitle>
            </DialogHeader>
          }
          stickyFooter={
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={handleCancelForm} disabled={isSaving}>
                취소
              </Button>
              <Button 
                type="submit" 
                form="quality-issue-form"
                disabled={isSaving} 
                className="min-w-[120px]"
              >
                {isSaving ? '저장 중...' : '저장'}
              </Button>
            </div>
          }
        >
          <QualityIssueForm
            onSave={handleSaveIssue}
          />
        </DialogContent>
      </Dialog>

             {/* 품질이슈 상세 모달 */}
             <QualityIssueDetail
               issue={selectedIssue}
               isOpen={isDetailModalOpen}
               onClose={handleCloseDetailModal}
               canEdit={true}
               canDelete={isAdmin}
               canManage={true}
               canChangeStatus={canChangeStatus(selectedIssue)}
               onAddIssueItem={handleAddIssueItem}
               onDelete={handleDeleteClick}
             />

      {/* 삭제 확인 모달 */}
      <AlertDialog open={!!issueToDelete} onOpenChange={() => setIssueToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>품질이슈 삭제 확인</AlertDialogTitle>
            <AlertDialogDescription>
              &apos;{issueToDelete?.productName}&apos; 품질이슈를 정말 삭제하시겠습니까? 
              <br />
              이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteIssue}
              className="bg-red-600 hover:bg-red-700"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
