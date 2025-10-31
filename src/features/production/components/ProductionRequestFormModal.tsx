'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { UploadingImageGrid } from '@/shared/components/common';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/shared/components/ui/sheet';
import { useDeviceType } from '@/shared/hooks/use-device';
import { ArrowLeft } from 'lucide-react';
import { ProductionRequestType } from '../services/productionRequestService';
import { ProductionRequestForm } from './ProductionRequestForm';
import { useImageUpload } from '@/shared/hooks';
import { useOrderNumberFormatter } from '@/shared/hooks/useOrderNumberFormatter';
import { toast } from 'sonner';

interface ProductionRequestFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    requestType: ProductionRequestType;
    requester: string;
    orderNumber: string;
    supplier: string;
    productName: string;
    partName: string;
    quantity: string;
    content: string;
  }, imageFiles: File[]) => Promise<void>;
  currentUserName?: string;
  inline?: boolean; // 모바일 Sheet 등에서 Dialog 없이 인라인 렌더링
}

const ProductionRequestFormModalComponent: React.FC<ProductionRequestFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentUserName = '',
  inline = false,
}) => {
  const { isSmartphone, isTablet } = useDeviceType();
  const isMobileOrTablet = isSmartphone || isTablet;
  // 이미지 업로드 훅 사용
  const imageUploadHook = useImageUpload();
  
  const [formData, setFormData] = useState({
    requestType: ProductionRequestType.Urgent,
    requester: currentUserName,
    orderNumber: 'T',
    supplier: '',
    productName: '',
    partName: '',
    quantity: '',
    content: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // 발주번호 포맷터 훅
  const { handleOrderNumberChange: formatAndAutoFill } = useOrderNumberFormatter({
    onAutoFill: (data) => {
      setFormData(prev => ({
        ...prev,
        supplier: data.supplier || prev.supplier,
        productName: data.productName || prev.productName,
        partName: data.partName || prev.partName,
        quantity: data.orderQuantity || prev.quantity,
      }));
    },
    onClear: () => {
      setFormData(prev => ({
        ...prev,
        supplier: '',
        productName: '',
        partName: '',
        quantity: '',
      }));
    },
  });

  // 모달이 열릴 때마다 폼 초기화
  useEffect(() => {
    if (isOpen) {
      setFormData({
        requestType: ProductionRequestType.Urgent,
        requester: currentUserName,
        orderNumber: 'T',
        supplier: '',
        productName: '',
        partName: '',
        quantity: '',
        content: '',
      });
      imageUploadHook.clearImages();
      setIsSaving(false); // 저장 상태 초기화
    }
  }, [isOpen, currentUserName]); // 의존성 배열에서 imageUploadHook 제거

  // 이미지 미리보기 정리 (컴포넌트 언마운트 시)
  useEffect(() => {
    return () => {
      imageUploadHook.clearImages();
    };
  }, []); // 의존성 배열에서 imageUploadHook 제거

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


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // 발주번호는 포맷터를 통해 처리
    if (name === 'orderNumber') {
      formatAndAutoFill(value, (formatted) => {
        setFormData(prev => ({ ...prev, orderNumber: formatted }));
      });
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      // 새로 업로드할 파일들만 추출
      const imageFiles = imageUploadHook.uploadingImages
        .filter(item => item.file !== null)
        .map(item => item.file!);
      
      await onSave(formData, imageFiles);
      toast.success('생산 요청이 등록되었습니다.');
      onClose();
    } catch (error) {
      console.error('생산 요청 등록 실패:', error);
      toast.error('생산 요청 등록에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsSaving(false);
    }
  };

  // 물류이동을 제외한 요청 타입
  const requestTypeOptions = Object.values(ProductionRequestType).filter(
    type => type !== ProductionRequestType.LogisticsTransfer
  );

  const FormContent = (
    <ProductionRequestForm
      defaultRequester={currentUserName}
      onSave={async (data, images) => {
        setIsSaving(true);
        try {
          await onSave(data, images);
          onClose();
        } finally {
          setIsSaving(false);
        }
      }}
      onCancel={onClose}
      showFooter={false}
    />
  );

  const FormFooter = (
    <div className="flex justify-end gap-2">
      <Button type="button" variant="outline" onClick={onClose}>
        취소
      </Button>
      <Button type="submit" form="production-request-form" disabled={isSaving}>
        {isSaving ? '저장 중...' : '요청 저장'}
      </Button>
    </div>
  );

  if (inline) {
    return FormContent;
  }

  return (
    <>
      {!isMobileOrTablet && (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent 
            className="max-w-3xl max-h-[90vh] flex flex-col p-0"
            stickyHeader={
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">신규 생산관리부 요청</DialogTitle>
              </DialogHeader>
            }
            stickyFooter={FormFooter}
          >
            {FormContent}
          </DialogContent>
        </Dialog>
      )}

      {isMobileOrTablet && (
        <Sheet open={isOpen} onOpenChange={onClose}>
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
                    신규 생산관리부 요청
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
                <Button type="submit" form="production-request-form" disabled={isSaving}>
                  {isSaving ? '저장 중...' : '요청 저장'}
                </Button>
              </SheetFooter>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </>
  );
};

// React.memo로 최적화하여 불필요한 리렌더링 방지
export const ProductionRequestFormModal = React.memo(ProductionRequestFormModalComponent);

