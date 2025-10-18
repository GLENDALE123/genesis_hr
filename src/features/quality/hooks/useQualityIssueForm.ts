import { useState } from 'react';
import { createQualityIssue } from '../services/qualityIssueService';
import { QualityIssueFormData } from '../types';
import { useAuthStore } from '@/features/auth/store/authStore';
import { toast } from 'sonner';

export const useQualityIssueForm = () => {
  const { user, userProfile } = useAuthStore();
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveIssue = async (formData: QualityIssueFormData, imageFiles: File[]) => {
    if (!user) {
      toast.error('로그인이 필요합니다.');
      return;
    }


    setIsSaving(true);
    try {

      await createQualityIssue(formData, imageFiles, {
        uid: user.uid,
        displayName: userProfile?.name || userProfile?.displayName || user.displayName || user.email?.split('@')[0] || '사용자',
        email: user.email || '',
      });
      
      setIsFormModalOpen(false);
      toast.success('품질이슈가 성공적으로 등록되었습니다.');
      
    } catch {
      toast.error('품질이슈 저장에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelForm = () => {
    setIsFormModalOpen(false);
  };

  const openFormModal = () => {
    setIsFormModalOpen(true);
  };

  return {
    isFormModalOpen,
    isSaving,
    handleSaveIssue,
    handleCancelForm,
    openFormModal,
  };
};
