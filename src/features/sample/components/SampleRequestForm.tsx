/**
 * 샘플 요청 등록/수정 폼 컴포넌트
 * HS-Jig SampleRequestForm 참고, Shadcn Dialog + Sheet 사용
 */

'use client';

import React, { useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/shared/components/ui/sheet';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Plus, Minus, Upload, Camera, ArrowLeft } from 'lucide-react';
import { UploadingImageGrid } from '@/shared/components/common/UploadingImageGrid';
import { useSampleForm } from '../hooks';
import { useImageUpload } from '@/shared/hooks';
import { COATING_METHODS, POST_PROCESSING_OPTIONS } from '../constants';
import { SampleRequest, SampleFormData } from '../types';
import { useDeviceType } from '@/shared/hooks/use-device';

interface SampleRequestFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: SampleFormData, images: File[]) => Promise<void>;
  existingRequest?: SampleRequest | null;
}

const inputClasses =
  'mt-1 block w-full px-3 py-2 border rounded-md bg-background';
const labelClasses = 'block text-sm font-medium';

export const SampleRequestForm: React.FC<SampleRequestFormProps> = ({
  open,
  onClose,
  onSubmit,
  existingRequest,
}) => {
  const { isSmartphone, isTablet } = useDeviceType();
  const isMobileOrTablet = isSmartphone || isTablet;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  // 이미지 업로드 훅 사용
  const imageUploadHook = useImageUpload();

  const {
    formData,
    items,
    imagePreviewItems,
    handleFormChange,
    handleItemChange,
    handlePostProcessingChange,
    addItem,
    removeItem,
    handleImageSelect,
    removeImage,
    validateForm,
    getFormData,
    resetForm,
  } = useSampleForm(existingRequest ? {
    requestDate: existingRequest.requestDate,
    requesterName: existingRequest.requesterName,
    contact: existingRequest.contact,
    clientName: existingRequest.clientName,
    productName: existingRequest.productName,
    items: existingRequest.items,
    dueDate: existingRequest.dueDate,
    remarks: existingRequest.remarks,
  } : undefined);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const error = validateForm();
    if (error) {
      alert(error);
      return;
    }

    setIsSaving(true);
    try {
      const { data, images } = getFormData();
      
      // 새로 업로드할 파일들만 추출
      const newFiles = imageUploadHook.uploadingImages
        .filter(item => item.file !== null)
        .map(item => item.file!);
      
      await onSubmit(data, [...images, ...newFiles]);
      resetForm();
      imageUploadHook.clearImages();
      onClose();
    } catch (error) {
      console.error('폼 제출 실패:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDialogChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  // 폼 내용
  const FormContent = (
    <form id="sample-request-form" onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 좌측: 요청 정보 */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold border-b pb-2">요청 정보</h3>
          
          <div>
            <Label htmlFor="requestDate" className={labelClasses}>
              요청일
            </Label>
            <Input
              type="date"
              name="requestDate"
              value={formData.requestDate}
              onChange={handleFormChange}
              required
              className={inputClasses}
            />
          </div>

          <div>
            <Label htmlFor="requesterName" className={labelClasses}>
              요청담당자명
            </Label>
            <Input
              type="text"
              name="requesterName"
              value={formData.requesterName}
              onChange={handleFormChange}
              required
              className={inputClasses}
            />
          </div>

          <div>
            <Label htmlFor="clientName" className={labelClasses}>
              고객사명
            </Label>
            <Input
              type="text"
              name="clientName"
              value={formData.clientName}
              onChange={handleFormChange}
              required
              className={inputClasses}
            />
          </div>
        </div>

        {/* 우측: 공통 사양 */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold border-b pb-2">공통 사양</h3>
          
          <div>
            <Label htmlFor="dueDate" className={labelClasses}>
              납기 요청일
            </Label>
            <Input
              type="date"
              name="dueDate"
              value={formData.dueDate}
              onChange={handleFormChange}
              required
              className={inputClasses}
            />
          </div>

          <div>
            <Label htmlFor="contact" className={labelClasses}>
              연락처
            </Label>
            <Input
              type="tel"
              name="contact"
              value={formData.contact}
              onChange={handleFormChange}
              required
              className={inputClasses}
            />
          </div>

          <div>
            <Label htmlFor="productName" className={labelClasses}>
              제품명
            </Label>
            <Input
              type="text"
              name="productName"
              value={formData.productName}
              onChange={handleFormChange}
              required
              className={inputClasses}
            />
          </div>
        </div>
      </div>

      {/* 비고 및 이미지 섹션 */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">추가 정보</h3>
        
        <div>
          <Label htmlFor="remarks" className={labelClasses}>
            비고
          </Label>
          <Textarea
            name="remarks"
            value={formData.remarks}
            onChange={handleFormChange}
            rows={3}
            className={inputClasses}
          />
        </div>

        {!existingRequest && (
          <div>
            <Label className={labelClasses}>참고 이미지</Label>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileInputChange}
                multiple
                accept="image/*"
                className="hidden"
              />
              <input
                type="file"
                ref={cameraInputRef}
                accept="image/*"
                capture="environment"
                onChange={handleFileInputChange}
                className="hidden"
              />
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
            
            {/* 이미지 미리보기 */}
            {imageUploadHook.uploadingImages.length > 0 && (
              <UploadingImageGrid
                items={imageUploadHook.uploadingImages}
                onRemove={imageUploadHook.removeImage}
              />
            )}
          </div>
        )}
      </div>

      {/* 품목 리스트 */}
      <div className="space-y-4">
        <div className="flex justify-between items-center border-b pb-2">
          <h3 className="text-lg font-semibold">품목 정보</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addItem}
          >
            <Plus className="h-4 w-4 mr-1" />
            품목 추가
          </Button>
        </div>

        {items.map((item, index) => (
          <div
            key={index}
            className="p-4 border rounded-lg space-y-3 bg-muted/30"
          >
            <div className="flex justify-between items-center">
              <h4 className="font-semibold">품목 {index + 1}</h4>
              {items.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeItem(index)}
                >
                  <Minus className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className={labelClasses}>부속명</Label>
                <Input
                  type="text"
                  value={item.partName}
                  onChange={(e) =>
                    handleItemChange(index, 'partName', e.target.value)
                  }
                  className={inputClasses}
                />
              </div>

              <div>
                <Label className={labelClasses}>색상(사양)</Label>
                <Input
                  type="text"
                  value={item.colorSpec}
                  onChange={(e) =>
                    handleItemChange(index, 'colorSpec', e.target.value)
                  }
                  className={inputClasses}
                />
              </div>

              <div>
                <Label className={labelClasses}>요청수량</Label>
                <Input
                  type="number"
                  value={item.quantity}
                  onChange={(e) =>
                    handleItemChange(index, 'quantity', e.target.value)
                  }
                  className={inputClasses}
                />
              </div>

              <div>
                <Label className={labelClasses}>코팅/증착방식</Label>
                <select
                  value={item.coatingMethod}
                  onChange={(e) =>
                    handleItemChange(index, 'coatingMethod', e.target.value)
                  }
                  className={inputClasses}
                >
                  <option value="">선택하세요</option>
                  {COATING_METHODS.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label className={labelClasses}>후가공</Label>
              <div className="flex gap-3 mt-2">
                {POST_PROCESSING_OPTIONS.map((option) => (
                  <label key={option} className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={item.postProcessing.includes(option)}
                      onChange={() =>
                        handlePostProcessingChange(index, option)
                      }
                    />
                    <span className="text-sm">{option}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </form>
  );

  // Footer 버튼
  const FormFooter = (
    <div className="flex justify-end gap-2">
      <Button type="button" variant="outline" onClick={onClose}>
        취소
      </Button>
      <Button type="submit" form="sample-request-form" disabled={isSaving}>
        {isSaving ? '저장 중...' : existingRequest ? '수정' : '등록'}
      </Button>
    </div>
  );

  return (
    <>
      {/* 데스크톱: Dialog */}
      {!isMobileOrTablet && (
        <Dialog open={open} onOpenChange={handleDialogChange}>
          <DialogContent 
            className="max-w-4xl max-h-[90vh] overflow-hidden p-0"
            stickyHeader={
              <DialogHeader>
                <DialogTitle>
                  {existingRequest ? '샘플 요청 수정' : '새 샘플 요청'}
                </DialogTitle>
                <DialogDescription>
                  샘플 요청 정보를 입력해주세요.
                </DialogDescription>
              </DialogHeader>
            }
            stickyFooter={FormFooter}
          >
            {FormContent}
          </DialogContent>
        </Dialog>
      )}

      {/* 모바일/태블릿: Sheet */}
      {isMobileOrTablet && (
        <Sheet open={open} onOpenChange={handleDialogChange}>
          <SheetContent 
            side="right"
            fullscreen
            animationVariant={isTablet ? 'tablet' : 'default'}
            hideClose
            className="w-full max-w-none overflow-hidden p-0 flex flex-col"
          >
            <div className="h-full flex flex-col max-h-[100dvh]">
              <SheetHeader className="sticky top-0 z-10 bg-background border-b p-4 text-left flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="-ml-2"
                    aria-label="뒤로가기"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <SheetTitle className="ml-1">
                    {existingRequest ? '샘플 요청 수정' : '새 샘플 요청'}
                  </SheetTitle>
                </div>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto overscroll-contain p-4 min-h-0">
                {FormContent}
              </div>
              <SheetFooter className="sticky bottom-0 bg-background border-t p-4 flex-row justify-end gap-2 flex-shrink-0 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                <Button type="button" variant="outline" onClick={onClose}>
                  취소
                </Button>
                <Button type="submit" form="sample-request-form" disabled={isSaving}>
                  {isSaving ? '저장 중...' : existingRequest ? '수정' : '등록'}
                </Button>
              </SheetFooter>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </>
  );
};
