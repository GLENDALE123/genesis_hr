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
import { Spinner } from '@/shared/components/ui/spinner';
import { CreateJigMasterItemData } from '../types';
import { PRODUCTION_TYPES } from '../constants';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useImageUpload } from '@/shared/hooks';
import { useOrderNumberFormatter } from '@/shared/hooks/useOrderNumberFormatter';
import { subscribeToAutocompleteData, type AutocompleteData } from '@/features/quality/services/autocompleteService';
import { Upload, Camera } from 'lucide-react';

interface JigListFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateJigMasterItemData, imageFiles: File[]) => void;
  isLoading?: boolean;
}

export const JigListForm: React.FC<JigListFormProps> = ({
  isOpen,
  onClose,
  onSave,
  isLoading = false,
}) => {
  const { user } = useAuthStore();
  
  // 이미지 업로드 훅 사용
  const imageUploadHook = useImageUpload();
  
  // autocomplete 데이터 상태
  const [autocompleteData, setAutocompleteData] = useState<AutocompleteData>({
    suppliers: [],
    productNames: [],
    partNames: [],
    injectionColors: [],
    specifications: [],
    injectionCompanies: [],
    shippingWaitTypes: [],
    lastUpdated: ''
  });
  
  // 파일 입력 ref
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);
  
  // 폼 상태
  const [formData, setFormData] = useState<CreateJigMasterItemData>({
    requestType: '',
    orderNumber: 'T',
    supplier: '',
    productName: '',
    partName: '',
    jigNumber: '',
    remarks: '',
  });

  // 발주번호 포맷터 훅 사용
  const { handleOrderNumberChange } = useOrderNumberFormatter({
    onAutoFill: (data) => {
      setFormData(prev => ({
        ...prev,
        supplier: data.supplier || prev.supplier,
        productName: data.productName || prev.productName,
        partName: data.partName || prev.partName,
      }));
    },
    onClear: () => {
      // 발주번호가 비어있을 때는 다른 필드를 초기화하지 않음
    }
  });

  // autocomplete 데이터 구독
  useEffect(() => {
    const unsubscribe = subscribeToAutocompleteData((data) => {
      if (data) {
        setAutocompleteData(data);
      } else {
        setAutocompleteData({
          suppliers: [],
          productNames: [],
          partNames: [],
          injectionColors: [],
          specifications: [],
          injectionCompanies: [],
          shippingWaitTypes: [],
          lastUpdated: ''
        });
      }
    });

    return () => unsubscribe();
  }, []);

  // 폼 초기화
  useEffect(() => {
    if (isOpen) {
      setFormData({
        requestType: '',
        orderNumber: 'T',
        supplier: '',
        productName: '',
        partName: '',
        jigNumber: '',
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

  // 발주번호 입력 핸들러
  const handleOrderNumberInputChange = (value: string) => {
    handleOrderNumberChange(value, (formatted) => {
      setFormData(prev => ({ ...prev, orderNumber: formatted }));
    });
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
    
    if (!formData.orderNumber?.trim()) {
      alert('발주번호를 입력해주세요.');
      return;
    }

    if (!formData.supplier?.trim()) {
      alert('발주처를 입력해주세요.');
      return;
    }

    if (!formData.productName?.trim()) {
      alert('제품명을 입력해주세요.');
      return;
    }

    if (!formData.partName?.trim()) {
      alert('부속명을 입력해주세요.');
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
      orderNumber: 'T',
      supplier: '',
      productName: '',
      partName: '',
      jigNumber: '',
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
      <DialogContent 
        className="max-w-2xl max-h-[90vh]" 
        onOpenAutoFocus={(e: Event) => e.preventDefault()}
        stickyFooter={
          <div className="flex justify-end gap-2">
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
              form="jig-form"
              disabled={isLoading || !formData.orderNumber?.trim() || !formData.supplier?.trim() || !formData.productName?.trim() || !formData.partName?.trim()}
            >
              {isLoading ? (
                <>
                  <Spinner className="mr-2 size-4 text-inherit" />
                  저장 중...
                </>
              ) : (
                '등록'
              )}
            </Button>
          </div>
        }
      >
        <DialogHeader>
          <DialogTitle>새 지그 등록</DialogTitle>
        </DialogHeader>

        <form id="jig-form" onSubmit={handleSubmit} className="space-y-6">
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

              {/* 발주번호 */}
              <div className="space-y-2">
                <Label htmlFor="orderNumber">발주번호 *</Label>
                <Input
                  id="orderNumber"
                  value={formData.orderNumber}
                  onChange={(e) => handleOrderNumberInputChange(e.target.value)}
                  placeholder="T로 시작하는 발주번호"
                />
              </div>

              {/* 발주처 */}
              <div className="space-y-2">
                <Label htmlFor="supplier">발주처 *</Label>
                <InputSelect
                  value={formData.supplier}
                  onChange={(value: string) => handleInputChange('supplier', value)}
                  options={autocompleteData.suppliers}
                  placeholder="발주처를 입력하거나 선택하세요"
                  allowCustomInput
                />
              </div>

              {/* 제품명 */}
              <div className="space-y-2">
                <Label htmlFor="productName">제품명 *</Label>
                <InputSelect
                  value={formData.productName}
                  onChange={(value: string) => handleInputChange('productName', value)}
                  options={autocompleteData.productNames}
                  placeholder="제품명을 입력하거나 선택하세요"
                  allowCustomInput
                />
              </div>

              {/* 부속명 */}
              <div className="space-y-2">
                <Label htmlFor="partName">부속명 *</Label>
                <InputSelect
                  value={formData.partName}
                  onChange={(value: string) => handleInputChange('partName', value)}
                  options={autocompleteData.partNames}
                  placeholder="부속명을 입력하거나 선택하세요"
                  allowCustomInput
                />
              </div>

              {/* 지그번호 */}
              <div className="space-y-2">
                <Label htmlFor="jigNumber">지그번호</Label>
                <Input
                  id="jigNumber"
                  value={formData.jigNumber}
                  onChange={(e) => handleInputChange('jigNumber', e.target.value)}
                  placeholder="지그번호를 입력하세요"
                />
              </div>

              {/* 특이사항 */}
              <div className="space-y-2">
                <Label htmlFor="remarks">특이사항</Label>
                <Textarea
                  id="remarks"
                  value={formData.remarks}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange('remarks', e.target.value)}
                  placeholder="특이사항을 입력하세요"
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
        </form>
      </DialogContent>
    </Dialog>
  );
};