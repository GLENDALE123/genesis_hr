import { useState } from 'react';
import { createQualityIssue, updateQualityIssue } from '../services/qualityIssueService';
import { QualityIssueFormData, QualityIssue } from '../types';
import { useAuthStore } from '@/features/auth/store/authStore';
import { getUserDisplayName } from '@/shared/utils/user/userUtils';
import { toast } from 'sonner';

export const useQualityIssueForm = () => {
  const { user, userProfile } = useAuthStore();
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingIssue, setEditingIssue] = useState<QualityIssue | null>(null);

  const handleSaveIssue = async (
    formData: QualityIssueFormData, 
    imageFiles: File[], 
    existingImageUrls?: string[],
    issueItems?: Array<{ content: string; status: string; createdAt?: string }>
  ) => {
    if (!user) {
      toast.error('로그인이 필요합니다.');
      return;
    }

    setIsSaving(true);
    try {
      if (editingIssue) {
        // 수정 모드
        // 새 이미지 업로드
        let newImageUrls: string[] = [];
        if (imageFiles.length > 0) {
          const { uploadImageFilesParallel } = await import('@/shared/services/firebase/storage');
          try {
            newImageUrls = await uploadImageFilesParallel(imageFiles, `quality-issues/${Date.now()}`);
          } catch (error) {
            console.error('이미지 업로드 실패:', error);
            throw new Error(`이미지 업로드 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
          }
        }

        // 기존 이미지 + 새 이미지 합치기
        const allImageUrls = [...(existingImageUrls || []), ...newImageUrls];

        // 모든 이슈사항을 IssueItem 형식으로 변환 (issueItems 사용)
        const existingIssues = editingIssue.issues;
        
        // status 매핑 (한국어 -> 영어)
        const statusMapping: Record<string, string> = {
          '대기중': 'open',
          '진행중': 'in-progress',
          '해결완료': 'resolved',
        };
        
        let updatedIssues: Array<{ content: string; createdAt: string; status?: string }>;
        
        if (issueItems && issueItems.length > 0) {
          // issueItems를 사용하여 업데이트 (상태 정보 포함)
          updatedIssues = issueItems
            .filter(item => item.content.trim() !== '')
            .map((item, index) => {
              // 기존 이슈사항의 createdAt 유지 (새로 추가된 것은 현재 시간)
              let createdAt: string;
              if (index < existingIssues.length) {
                const existingIssue = existingIssues[index];
                createdAt = typeof existingIssue === 'string' 
                  ? (editingIssue.createdAt as string)
                  : (existingIssue.createdAt || new Date().toISOString());
              } else {
                createdAt = item.createdAt || new Date().toISOString();
              }
              
              const englishStatus = statusMapping[item.status] || item.status || 'in-progress';
              
              return {
                content: item.content.trim(),
                createdAt,
                status: englishStatus
              };
            });
        } else {
          // issueItems가 없으면 기존 로직 사용 (호환성)
          const formIssues = formData.issues.filter(issue => issue.trim() !== '');
          if (formIssues.length > 0) {
            updatedIssues = formIssues.map((issueContent, index) => {
              if (index < existingIssues.length) {
                const existingIssue = existingIssues[index];
                if (typeof existingIssue === 'string') {
                  return {
                    content: issueContent,
                    createdAt: editingIssue.createdAt as string,
                    status: 'in-progress'
                  };
                } else {
                  return {
                    ...existingIssue,
                    content: issueContent
                  };
                }
              } else {
                return {
                  content: issueContent,
                  createdAt: new Date().toISOString(),
                  status: 'in-progress'
                };
              }
            }) as Array<{ content: string; createdAt: string; status?: string }>;
          } else {
            updatedIssues = (existingIssues.length > 0 
              ? existingIssues.map(issue => typeof issue === 'string' 
                  ? { content: issue, createdAt: editingIssue.createdAt as string, status: 'in-progress' }
                  : issue
                )
              : [{
                  content: '',
                  createdAt: new Date().toISOString(),
                  status: 'in-progress'
                }]
            ) as Array<{ content: string; createdAt: string; status?: string }>;
          }
        }

        await updateQualityIssue(editingIssue.id, {
          department: formData.department,
          registrationKeyword: formData.registrationKeyword,
          orderNumber: formData.orderNumber,
          supplier: formData.supplier,
          productName: formData.productName,
          partName: formData.partName,
          keywordPairs: formData.keywordPairs,
          imageUrls: allImageUrls,
          issues: updatedIssues,
          category: formData.category,
          priority: formData.priority,
          assignedTo: formData.assignedTo,
          shippingWaitType: formData.shippingWaitType,
          shippingWaitQuantity: formData.shippingWaitQuantity,
        });

        setIsFormModalOpen(false);
        setEditingIssue(null);
        toast.success('품질이슈가 성공적으로 수정되었습니다.');
      } else {
        // 생성 모드
        await createQualityIssue(formData, imageFiles, {
          uid: user.uid,
          displayName: getUserDisplayName(user, userProfile, '사용자'),
          email: user.email || '',
        }, userProfile ? { displayName: (userProfile as any).displayName, email: (userProfile as any).email } : null, issueItems);
        
        setIsFormModalOpen(false);
        toast.success('품질이슈가 성공적으로 등록되었습니다.');
      }
      
    } catch (error) {
      console.error('품질이슈 저장 실패:', error);
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
      toast.error(`품질이슈 저장에 실패했습니다: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelForm = () => {
    setIsFormModalOpen(false);
    setEditingIssue(null);
  };

  const openFormModal = () => {
    setIsFormModalOpen(true);
    setEditingIssue(null);
  };

  const openEditModal = (issue: QualityIssue) => {
    setEditingIssue(issue);
    setIsFormModalOpen(true);
  };

  return {
    isFormModalOpen,
    isSaving,
    editingIssue,
    handleSaveIssue,
    handleCancelForm,
    openFormModal,
    openEditModal,
  };
};


