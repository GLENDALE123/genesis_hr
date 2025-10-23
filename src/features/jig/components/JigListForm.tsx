'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { InputSelect } from '@/shared/components/common/InputSelect';
import { UploadingImageGrid, type UploadingImageItem } from '@/shared/components/common/UploadingImageGrid';
import { LoadingSpinner } from '@/shared/components/common/LoadingSpinner';
import { createImagePreview } from '@/shared/utils/imageUpload';
import { CreateJigMasterItemData } from '../types';
import { PRODUCTION_TYPES } from '../constants';
import { useAuthStore } from '@/features/auth/store/authStore';

interface JigListFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateJigMasterItemData, imageFiles: File[]) => void;
  isLoading?: boolean;
  autocompleteData?: {
    itemNames: string[];
    partNames: string[];
    itemNumbers: string[];
  };
}

export const JigListForm: React.FC<JigListFormProps> = ({
  isOpen,
  onClose,
  onSave,
  isLoading = false,
  autocompleteData,
}) => {
  const { user } = useAuthStore();
  
  // 폼 상태
  const [formData, setFormData] = useState<CreateJigMasterItemData>({
    requestType: '',
    itemName: '',
    partName: '',
    itemNumber: '',
    remarks: '',
  });

  // 이미지 업로드 상태
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imageItems, setImageItems] = useState<UploadingImageItem[]>([]);

  // 폼 초기화
  useEffect(() => {
    if (isOpen) {
      setFormData({
        requestType: '',
        itemName: '',
        partName: '',
        itemNumber: '',
        remarks: '',
      });
      setImageFiles([]);
      setImageItems([]);
    }
  }, [isOpen]);

  // 폼 데이터 업데이트
  const handleInputChange = (field: keyof CreateJigMasterItemData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // 이미지 파일 선택
  const handleImageSelect = async (files: FileList | null) => {
    if (!files) return;

    const fileArray = Array.from(files);
    const newItems = fileArray.map(file => ({ file, preview: null }));
    
    setImageFiles(prev => [...prev, ...fileArray]);
    setImageItems(prev => [...prev, ...newItems]);
    
    // 썸네일 생성
    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      const previewState = await createImagePreview(file);
      setImageItems(prev => {
        const updated = [...prev];
        const itemIndex = updated.findIndex(item => item.file === file);
        if (itemIndex !== -1) {
          updated[itemIndex] = { file, preview: previewState.previewUrl };
        }
        return updated;
      });
    }
  };

  // 이미지 제거
  const handleImageRemove = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImageItems(prev => prev.filter((_, i) => i !== index));
  };

  // 폼 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.itemName.trim()) {
      alert('품목명을 입력해주세요.');
      return;
    }

    if (!formData.partName.trim()) {
      alert('부품명을 입력해주세요.');
      return;
    }

    if (!formData.itemNumber.trim()) {
      alert('품목번호를 입력해주세요.');
      return;
    }

    try {
      await onSave(formData, imageFiles);
      onClose();
    } catch (error) {
      console.error('지그 등록 실패:', error);
    }
  };

  // 폼 리셋
  const handleReset = () => {
    setFormData({
      requestType: '',
      itemName: '',
      partName: '',
      itemNumber: '',
      remarks: '',
    });
    setImageFiles([]);
    setImageItems([]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]" onOpenAutoFocus={(e: Event) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>새 지그 등록</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-6">
              {/* 생산 구분 */}
              <div className="space-y-2">
                <Label htmlFor="requestType">생산 구분</Label>
                <InputSelect
                  id="requestType"
                  value={formData.requestType}
                  onChange={(value: string) => handleInputChange('requestType', value)}
                  options={PRODUCTION_TYPES}
                  placeholder="생산 구분을 선택하세요"
                />
              </div>

              {/* 품목명 */}
              <div className="space-y-2">
                <Label htmlFor="itemName">품목명 *</Label>
                <InputSelect
                  id="itemName"
                  value={formData.itemName}
                  onChange={(value: string) => handleInputChange('itemName', value)}
                  options={autocompleteData?.itemNames || []}
                  placeholder="품목명을 입력하세요"
                  allowCustomInput
                />
              </div>

              {/* 부품명 */}
              <div className="space-y-2">
                <Label htmlFor="partName">부품명 *</Label>
                <InputSelect
                  id="partName"
                  value={formData.partName}
                  onChange={(value: string) => handleInputChange('partName', value)}
                  options={autocompleteData?.partNames || []}
                  placeholder="부품명을 입력하세요"
                  allowCustomInput
                />
              </div>

              {/* 품목번호 */}
              <div className="space-y-2">
                <Label htmlFor="itemNumber">품목번호 *</Label>
                <InputSelect
                  id="itemNumber"
                  value={formData.itemNumber}
                  onChange={(value: string) => handleInputChange('itemNumber', value)}
                  options={autocompleteData?.itemNumbers || []}
                  placeholder="품목번호를 입력하세요"
                  allowCustomInput
                />
              </div>

              {/* 비고 */}
              <div className="space-y-2">
                <Label htmlFor="remarks">비고</Label>
                <Textarea
                  id="remarks"
                  value={formData.remarks}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange('remarks', e.target.value)}
                  placeholder="비고사항을 입력하세요"
                  rows={3}
                />
              </div>

              {/* 이미지 업로드 */}
              <div className="space-y-2">
                <Label>이미지 첨부</Label>
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => handleImageSelect(e.target.files)}
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className="cursor-pointer flex flex-col items-center justify-center py-4"
                  >
                    <div className="text-muted-foreground text-sm">
                      이미지를 선택하거나 드래그하여 업로드하세요
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      JPG, PNG, GIF 파일만 지원됩니다
                    </div>
                  </label>
                </div>

                {/* 이미지 미리보기 */}
                {imageItems.length > 0 && (
                  <UploadingImageGrid
                    items={imageItems}
                    onRemove={handleImageRemove}
                  />
                )}
              </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={isLoading}
            >
              초기화
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !formData.itemName.trim() || !formData.partName.trim() || !formData.itemNumber.trim()}
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  등록 중...
                </>
              ) : (
                '등록'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};