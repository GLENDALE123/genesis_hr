'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/shared/components/ui/sheet';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { InputSelect } from '@/shared/components/common/InputSelect';
import { UploadingImageGrid } from '@/shared/components/common/UploadingImageGrid';
import { LoadingSpinner } from '@/shared/components/common/LoadingSpinner';
import { Spinner } from '@/shared/components/ui/spinner';
import { toast } from 'sonner';
import { 
  updateProgressToast, 
  createTimeoutPromise,
  createRetryableUploadPromise
} from '@/shared/components/common/ProgressToast';
import { JigStatus, CreateJigRequestData, JigRequest } from '../types';
import { PRODUCTION_TYPES } from '../constants';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useImageUpload } from '@/shared/hooks';
import { getUserDisplayName } from '@/shared/utils/userUtils';
import { useDeviceType } from '@/shared/hooks/use-device';
import { ArrowLeft } from 'lucide-react';

interface JigRequestFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateJigRequestData, imageFiles: File[]) => void;
  isLoading?: boolean;
  editingRequest?: JigRequest | null; // 수정 모드용
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
  editingRequest = null,
  autocompleteData,
}) => {
  const { isSmartphone, isTablet } = useDeviceType();
  const isMobileOrTablet = isSmartphone || isTablet;
  const { user, userProfile } = useAuthStore();
  
  // 이미지 업로드 훅 사용
  const imageUploadHook = useImageUpload();
  
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

  // 업로드 진행 상태 추적
  const [currentUploadCount, setCurrentUploadCount] = useState(0);

  // 폼 초기화
  useEffect(() => {
    if (isOpen) {
      if (editingRequest) {
        // 수정 모드: 기존 데이터 로드
        setFormData({
          requestDate: editingRequest.requestDate.split('T')[0],
          requestType: editingRequest.requestType,
          requester: editingRequest.requester,
          destination: editingRequest.destination,
          deliveryDate: editingRequest.deliveryDate,
          itemName: editingRequest.itemName,
          partName: editingRequest.partName,
          itemNumber: editingRequest.itemNumber || '',
          jigHandleLength: editingRequest.jigHandleLength,
          specification: editingRequest.specification || '',
          quantity: editingRequest.quantity,
          receivedQuantity: editingRequest.receivedQuantity,
          coreCost: editingRequest.coreCost,
          unitPrice: editingRequest.unitPrice,
          remarks: editingRequest.remarks || '',
          status: editingRequest.status,
        });
        
        // 기존 이미지 로드
        if (editingRequest.imageUrls && editingRequest.imageUrls.length > 0) {
          imageUploadHook.setExistingImages(editingRequest.imageUrls);
        } else {
          imageUploadHook.clearImages();
        }
      } else {
        // 신규 모드: 기본값으로 초기화
        const currentUserDisplayName = getUserDisplayName(user, userProfile, '');
        
        setFormData({
          requestDate: new Date().toISOString().split('T')[0],
          requestType: '증착용',
          requester: currentUserDisplayName,
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
        
        // 이미지 상태 완전 초기화
        imageUploadHook.clearImages();
      }
      
      imageUploadHook.clearDeletedUrls();
      setCurrentUploadCount(0);
      
      // 진행 중인 업로드가 있으면 중단
      if (imageUploadHook.isUploading) {
        imageUploadHook.cancelUpload();
      }
    }
  }, [isOpen, editingRequest, user, userProfile]);

  // 파일 선택 핸들러
  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length > 0) {
      try {
        await imageUploadHook.handleFileSelect(files);
      } catch (error) {
        console.error('파일 선택 처리 실패:', error);
        toast.error(error instanceof Error ? error.message : '파일 선택에 실패했습니다.');
      }
    }
    
    // input 초기화 (같은 파일을 다시 선택할 수 있도록)
    if (e.target) {
      e.target.value = '';
    }
  };

  // 폼 제출
  const handleSubmit = async () => {
    if (!user) {
      toast.error('로그인이 필요합니다.');
      return;
    }

    // 필수 필드 검증
    if (!formData.requester || !formData.destination || !formData.itemName) {
      toast.error('필수 항목을 모두 입력해주세요.');
      return;
    }

    try {
      // 이미지 업로드 처리
      let imageUrls: string[] = [];
      if (imageUploadHook.uploadingImages.length > 0) {
        // 업로드 시작 시 현재 파일 수 초기화
        setCurrentUploadCount(0);
        
        const folder = 'jig-images';
        
        try {
          // 타임아웃과 재시도 로직을 포함한 업로드 Promise 생성
          const uploadFunction = () => imageUploadHook.uploadImages(folder, (progress) => {
            // 진행률을 안정적으로 처리 (디바운싱)
            const stableProgress = Math.min(100, Math.max(0, progress));
            const currentCount = Math.round((stableProgress / 100) * imageUploadHook.uploadingImages.length);
            
            // 진행률이 이전보다 낮아지는 것을 방지
            setCurrentUploadCount(prev => Math.max(prev, currentCount));
            
            // 진행률 업데이트 (취소 기능 포함)
            updateProgressToast(toast, stableProgress, imageUploadHook.uploadingImages.length, () => {
              // 취소 시 이미지 업로드 중단 및 완전 초기화
              imageUploadHook.cancelUpload();
              imageUploadHook.clearUploadingImages();
            }, Math.max(currentUploadCount, currentCount));
          });
          
          // 재시도 가능한 업로드 Promise
          const retryableUploadPromise = createRetryableUploadPromise(uploadFunction, 3, 1000);
          
          // 타임아웃 Promise와 경쟁
          const timeoutPromise = createTimeoutPromise(30000); // 30초 타임아웃
          
          imageUrls = await Promise.race([
            retryableUploadPromise,
            timeoutPromise
          ]) as string[];
          
          // 이미지 업로드 성공 토스트는 제거 (등록 완료 토스트로 대체)
          toast.dismiss('image-upload-progress');
          
        } catch (error: any) {
          console.error('이미지 업로드 실패:', error);
          
          // 에러 타입에 따른 처리
          if (error.message?.includes('취소')) {
            toast.error('이미지 업로드가 취소되었습니다.');
          } else if (error.message?.includes('시간이 초과')) {
            toast.error('업로드 시간이 초과되었습니다. 네트워크 연결을 확인해주세요.');
          } else {
            toast.error(`이미지 업로드에 실패했습니다: ${error.message || '알 수 없는 오류'}`);
          }
          
          // 업로드 실패 시 폼 제출 중단
          toast.dismiss('image-upload-progress');
          return;
        }
      }

      // 폼 데이터와 이미지 URL 결합
      const submitData = {
        ...formData,
        imageUrls,
      };

      // 새로 업로드할 파일들만 추출
      const newFiles = imageUploadHook.uploadingImages
        .filter(item => item.file !== null)
        .map(item => item.file!);

      await onSave(submitData, newFiles);
      toast.success('지그 요청이 등록되었습니다.');
      onClose();
    } catch (error) {
      console.error('지그 요청 등록 실패:', error);
      toast.error('지그 요청 등록에 실패했습니다. 다시 시도해주세요.');
    }
  };

  // 취소
  const handleCancel = () => {
    // 진행 중인 토스트 정리
    toast.dismiss('image-upload-progress');
    
    // 이미지 상태 완전 정리 (업로드 진행 상태 포함)
    imageUploadHook.clearImages();
    imageUploadHook.clearDeletedUrls();
    
    // 업로드 진행 상태 강제 초기화 (추가 안전장치)
    if (imageUploadHook.isUploading) {
      imageUploadHook.cancelUpload();
    }
    
    onClose();
  };

  // 입력 변경
  const handleInputChange = (field: keyof CreateJigRequestData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleDialogChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  const FormContent = (
    <div className="space-y-6">
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
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.multiple = true;
                input.onchange = (e) => handleFileInputChange(e as any);
                input.click();
              }}
            >
              파일 선택
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.capture = 'environment';
                input.onchange = (e) => handleFileInputChange(e as any);
                input.click();
              }}
            >
              사진 촬영
            </Button>
          </div>
          
          {/* 이미지 그리드 */}
          {imageUploadHook.uploadingImages.length > 0 && (
            <UploadingImageGrid
              items={imageUploadHook.uploadingImages}
              onRemove={imageUploadHook.removeImage}
              gridClassName="grid-cols-[repeat(auto-fill,minmax(100px,1fr))]"
              imageClassName="h-24"
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
  );

  const FormFooter = (
    <div className="flex justify-end gap-2">
      <Button variant="outline" onClick={handleCancel} disabled={isLoading || imageUploadHook.isUploading}>
        취소
      </Button>
      <Button onClick={handleSubmit} disabled={isLoading || imageUploadHook.isUploading}>
        {isLoading || imageUploadHook.isUploading ? (
          <div className="flex items-center gap-2">
            <Spinner className="size-4 text-inherit" />
            {imageUploadHook.isUploading ? '업로드 중...' : '저장 중...'}
          </div>
        ) : (
          editingRequest ? '수정' : '등록'
        )}
      </Button>
    </div>
  );

  return (
    <>
      {/* 데스크톱: Dialog */}
      {!isMobileOrTablet && (
        <Dialog open={isOpen} onOpenChange={handleDialogChange}>
          <DialogContent 
            className="max-w-4xl max-h-[90vh] overflow-hidden p-0"
            stickyHeader={
              <DialogHeader>
                <DialogTitle>{editingRequest ? '지그 요청 수정' : '지그 요청 등록'}</DialogTitle>
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
        <Sheet open={isOpen} onOpenChange={handleDialogChange}>
          <SheetContent 
            side="right"
            fullscreen
            animationVariant={isTablet ? 'tablet' : 'default'}
            hideClose
            className="w-full max-w-none overflow-hidden p-0 flex flex-col"
          >
            <div className="h-full flex flex-col max-h-[100dvh] pb-[env(safe-area-inset-bottom)]">
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
                    {editingRequest ? '지그 요청 수정' : '지그 요청 등록'}
                  </SheetTitle>
                </div>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto overscroll-contain p-4 min-h-0">
                {FormContent}
              </div>
              <SheetFooter className="sticky bottom-0 bg-background border-t p-4 flex-row justify-end gap-2 flex-shrink-0 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                <Button type="button" onClick={handleCancel} disabled={isLoading || imageUploadHook.isUploading}>
                  취소
                </Button>
                <Button onClick={handleSubmit} disabled={isLoading || imageUploadHook.isUploading}>
                  {isLoading || imageUploadHook.isUploading ? (
                    <div className="flex items-center gap-2">
                      <Spinner className="size-4 text-inherit" />
                      {imageUploadHook.isUploading ? '업로드 중...' : '저장 중...'}
                    </div>
                  ) : (
                    editingRequest ? '수정' : '등록'
                  )}
                </Button>
              </SheetFooter>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </>
  );
};