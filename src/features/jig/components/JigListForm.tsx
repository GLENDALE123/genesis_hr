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
import { UploadingImageGrid } from '@/shared/components/common/UploadingImageGrid';
import { LoadingSpinner } from '@/shared/components/common/LoadingSpinner';
import { CreateJigMasterItemData } from '../types';
import { PRODUCTION_TYPES } from '../constants';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useImageUpload } from '@/shared/hooks';
import { Upload, Camera } from 'lucide-react';

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
  
  // 이미지 업로드 훅 사용
  const imageUploadHook = useImageUpload();
  
  // 파일 입력 ref
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);
  
  // 폼 상태
  const [formData, setFormData] = useState<CreateJigMasterItemData>({
    requestType: '',
    itemName: '',
    partName: '',
    itemNumber: '',
    remarks: '',
  });

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
      
      // 이미지 상태 완전 초기화
      imageUploadHook.clearImages();
      imageUploadHook.clearDeletedUrls();
      
      // 진행 중인 업로드가 있으면 중단
      if (imageUploadHook.isUploading) {
        imageUploadHook.cancelUpload();
      }
    }
  }, [isOpen]);

  // 폼 데이터 업데이트
  const handleInputChange = (field: keyof CreateJigMasterItemData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // 파일 선택 핸들러
  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length > 0) {
      try {
        await imageUploadHook.handleFileSelect(files);
      } catch (error) {
        console.error('파일 선택 처리 실패:', error);
      }
    }
    
    // input 초기화 (같은 파일을 다시 선택할 수 있도록)
    if (e.target) {
      e.target.value = '';
    }
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
      // 새로 업로드할 파일들만 추출
      const newFiles = imageUploadHook.uploadingImages
        .filter(item => item.file !== null)
        .map(item => item.file!);

      await onSave(formData, newFiles);
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
    
    // 이미지 상태 완전 정리
    imageUploadHook.clearImages();
    imageUploadHook.clearDeletedUrls();
    
    // 업로드 진행 상태 강제 초기화
    if (imageUploadHook.isUploading) {
      imageUploadHook.cancelUpload();
    }
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
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current && fileInputRef.current.click()}
                    className="gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    파일 선택
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => cameraInputRef.current && cameraInputRef.current.click()}
                    className="gap-2"
                  >
                    <Camera className="h-4 w-4" />
                    사진 촬영
                  </Button>
                </div>
                
                {/* 숨겨진 파일 입력 */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                {/* 이미지 미리보기 */}
                {imageUploadHook.uploadingImages.length > 0 && (
                  <UploadingImageGrid
                    items={imageUploadHook.uploadingImages}
                    onRemove={imageUploadHook.removeImage}
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