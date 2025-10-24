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
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { InputSelect } from '@/shared/components/common/InputSelect';
import { UploadingImageGrid, UploadingImageItem } from '@/shared/components/common/UploadingImageGrid';
import { LoadingSpinner } from '@/shared/components/common/LoadingSpinner';
import { createImagePreview, ImageUploadState } from '@/shared/utils/imageUpload';
import { uploadImageFilesParallel } from '@/shared/services/firebase/storage';
import { toast } from 'sonner';
import { updateProgressToast } from '@/shared/components/common/ProgressToast';
import { JigStatus, CreateJigRequestData } from '../types';
import { PRODUCTION_TYPES } from '../constants';
import { useAuthStore } from '@/features/auth/store/authStore';

interface JigRequestFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateJigRequestData, imageFiles: File[]) => void;
  isLoading?: boolean;
  autocompleteData?: {
    requesters: string[];
    destinations: string[];
    itemNames: string[];
    partNames: string[];
    itemNumbers: string[];
  };
}

export const JigRequestForm: React.FC<JigRequestFormProps> = ({
  isOpen,
  onClose,
  onSave,
  isLoading = false,
  autocompleteData,
}) => {
  const { user } = useAuthStore();
  
  // 폼 상태
  const [formData, setFormData] = useState<CreateJigRequestData>({
    requestDate: new Date().toISOString().split('T')[0],
    requestType: '증착용',
    requester: '',
    destination: '',
    deliveryDate: '',
    itemName: '',
    partName: '',
    itemNumber: '',
    jigHandleLength: undefined,
    specification: '',
    quantity: 1,
    receivedQuantity: 0,
    coreCost: undefined,
    unitPrice: undefined,
    remarks: '',
    status: 'pending' as JigStatus,
  });

  // 이미지 상태
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<UploadingImageItem[]>([]);
  const [imageUploadState, setImageUploadState] = useState<ImageUploadState | null>(null);

  // 폼 초기화
  useEffect(() => {
    if (isOpen) {
      setFormData({
        requestDate: new Date().toISOString().split('T')[0],
        requestType: '증착용',
        requester: '',
        destination: '',
        deliveryDate: '',
        itemName: '',
        partName: '',
        itemNumber: '',
        jigHandleLength: undefined,
        specification: '',
        quantity: 1,
        receivedQuantity: 0,
        coreCost: undefined,
        unitPrice: undefined,
        remarks: '',
        status: 'pending' as JigStatus,
      });
      setImageFiles([]);
      setImagePreviews([]);
      setImageUploadState(null);
    }
  }, [isOpen]);

  // 이미지 파일 처리
  const handleImageChange = async (files: FileList | null) => {
    if (!files) return;

    const newFiles = Array.from(files);
    const totalFiles = imageFiles.length + newFiles.length;
    
    if (totalFiles > 10) {
      alert('최대 10개의 이미지만 업로드할 수 있습니다.');
      return;
    }

    setImageFiles(prev => [...prev, ...newFiles]);
    
    // 이미지 미리보기 생성
    const newPreviews = await Promise.all(
      newFiles.map(async (file) => {
        const preview = await createImagePreview(file);
        return {
          file,
          preview: preview.previewUrl,
        };
      })
    );

    setImagePreviews(prev => [...prev, ...newPreviews]);
  };

  // 이미지 제거
  const handleRemoveImage = (index: number) => {
    if (index >= 0 && index < imagePreviews.length) {
      const fileToRemove = imagePreviews[index].file;
      setImageFiles(prev => prev.filter(file => file !== fileToRemove));
      setImagePreviews(prev => prev.filter((_, i) => i !== index));
    }
  };

  // 폼 제출
  const handleSubmit = async () => {
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }

    // 필수 필드 검증
    if (!formData.requester || !formData.destination || !formData.itemName) {
      alert('필수 항목을 모두 입력해주세요.');
      return;
    }

    try {
      setImageUploadState(null);
      
      // 이미지 업로드
      let imageUrls: string[] = [];
      if (imageFiles.length > 0) {
        imageUrls = await uploadImagesParallel(imageFiles, 'jig-images');
      }

      // 폼 데이터와 이미지 URL 결합
      const submitData = {
        ...formData,
        imageUrls,
      };

      await onSave(submitData, imageFiles);
    } catch (error) {
      console.error('이미지 업로드 실패:', error);
      alert('이미지 업로드에 실패했습니다.');
    } finally {
      setImageUploadState(null);
    }
  };

  // 취소
  const handleCancel = () => {
    onClose();
  };

  // 입력 변경
  const handleInputChange = (field: keyof CreateJigRequestData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>지그 요청 등록</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6 p-1">
            {/* 기본 정보 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">기본 정보</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="requestDate">요청일</Label>
                  <Input
                    id="requestDate"
                    type="date"
                    value={formData.requestDate}
                    onChange={(e) => handleInputChange('requestDate', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="requestType">요청 유형</Label>
                  <InputSelect
                    value={formData.requestType}
                    onChange={(value) => handleInputChange('requestType', value)}
                    options={PRODUCTION_TYPES}
                    placeholder="요청 유형 선택"
                  />
                </div>
                <div>
                  <Label htmlFor="requester">요청자</Label>
                  <InputSelect
                    value={formData.requester}
                    onChange={(value) => handleInputChange('requester', value)}
                    options={autocompleteData?.requesters || []}
                    placeholder="요청자 선택"
                  />
                </div>
                <div>
                  <Label htmlFor="destination">수신처</Label>
                  <InputSelect
                    value={formData.destination}
                    onChange={(value) => handleInputChange('destination', value)}
                    options={autocompleteData?.destinations || []}
                    placeholder="수신처 선택"
                  />
                </div>
                <div>
                  <Label htmlFor="deliveryDate">납기일</Label>
                  <Input
                    id="deliveryDate"
                    type="date"
                    value={formData.deliveryDate}
                    onChange={(e) => handleInputChange('deliveryDate', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* 지그 정보 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">지그 정보</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="itemName">품목명</Label>
                  <InputSelect
                    value={formData.itemName}
                    onChange={(value) => handleInputChange('itemName', value)}
                    options={autocompleteData?.itemNames || []}
                    placeholder="품목명 입력"
                  />
                </div>
                <div>
                  <Label htmlFor="partName">부품명</Label>
                  <InputSelect
                    value={formData.partName}
                    onChange={(value) => handleInputChange('partName', value)}
                    options={autocompleteData?.partNames || []}
                    placeholder="부품명 입력"
                  />
                </div>
                <div>
                  <Label htmlFor="itemNumber">품번</Label>
                  <InputSelect
                    value={formData.itemNumber}
                    onChange={(value) => handleInputChange('itemNumber', value)}
                    options={autocompleteData?.itemNumbers || []}
                    placeholder="품번 입력"
                  />
                </div>
                <div>
                  <Label htmlFor="jigHandleLength">지그 핸들 길이</Label>
                  <Input
                    id="jigHandleLength"
                    type="number"
                    value={formData.jigHandleLength || ''}
                    onChange={(e) => handleInputChange('jigHandleLength', e.target.value ? Number(e.target.value) : 0)}
                    placeholder="지그 핸들 길이"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="specification">규격</Label>
                  <Textarea
                    id="specification"
                    value={formData.specification}
                    onChange={(e) => handleInputChange('specification', e.target.value)}
                    placeholder="규격 입력"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* 수량 및 비용 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">수량 및 비용</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="quantity">수량</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => handleInputChange('quantity', Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="coreCost">코어비</Label>
                  <Input
                    id="coreCost"
                    type="number"
                    value={formData.coreCost || ''}
                    onChange={(e) => handleInputChange('coreCost', e.target.value ? Number(e.target.value) : 0)}
                    placeholder="코어비"
                  />
                </div>
                <div>
                  <Label htmlFor="unitPrice">단가</Label>
                  <Input
                    id="unitPrice"
                    type="number"
                    value={formData.unitPrice || ''}
                    onChange={(e) => handleInputChange('unitPrice', e.target.value ? Number(e.target.value) : 0)}
                    placeholder="단가"
                  />
                </div>
              </div>
            </div>

            {/* 이미지 업로드 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">이미지 첨부</h3>
              <div>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => handleImageChange(e.target.files)}
                  className="mb-4"
                />
                {imagePreviews.length > 0 && (
                  <UploadingImageGrid
                    items={imagePreviews}
                    onRemove={handleRemoveImage}
                  />
                )}
              </div>
            </div>

            {/* 비고 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">비고</h3>
              <div>
                <Label htmlFor="remarks">비고</Label>
                <Textarea
                  id="remarks"
                  value={formData.remarks}
                  onChange={(e) => handleInputChange('remarks', e.target.value)}
                  placeholder="비고 입력"
                  rows={4}
                />
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? (
              <div className="flex items-center gap-2">
                <LoadingSpinner size="sm" variant="secondary" />
                저장 중...
              </div>
            ) : (
              '등록'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};