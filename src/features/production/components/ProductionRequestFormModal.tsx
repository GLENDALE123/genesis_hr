'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Upload, Camera } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { ImagePreviewGrid, ImagePreviewItem } from '@/shared/components/common';
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
import { ProductionRequestType } from '../services/productionRequestService';
import { useOrderNumberFormatter } from '@/shared/hooks/useOrderNumberFormatter';

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
}

export const ProductionRequestFormModal: React.FC<ProductionRequestFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentUserName = '',
}) => {
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
  const [imagePreviewItems, setImagePreviewItems] = useState<ImagePreviewItem[]>([]);
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
      setImagePreviewItems([]);
    }
  }, [isOpen, currentUserName]);

  // 이미지 미리보기 정리 (컴포넌트 언마운트 시)
  useEffect(() => {
    return () => {
      imagePreviewItems.forEach(item => {
        if (item.preview && item.preview.startsWith('blob:')) {
          URL.revokeObjectURL(item.preview);
        }
      });
    };
  }, [imagePreviewItems]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      
      // 1단계: 즉시 로딩 상태로 추가 (preview: null)
      const newItems: ImagePreviewItem[] = files.map(file => ({
        file,
        preview: null, // null = 로딩 중
      }));
      setImagePreviewItems(prev => [...prev, ...newItems]);
      
      // 2단계: 썸네일 생성 (200x200px, 60% quality) - 0.1~0.2초
      const { createQuickThumbnail } = await import('@/shared/utils/imageUpload');
      const startIndex = imagePreviewItems.length;
      
      // 각 이미지를 순차적으로 처리하여 UX 개선
      for (let i = 0; i < files.length; i++) {
        const thumbnail = await createQuickThumbnail(files[i]);
        const targetIndex = startIndex + i;
        
        // 썸네일 생성 완료 → preview 업데이트
        setImagePreviewItems(prev => {
          const updated = [...prev];
          updated[targetIndex] = {
            file: files[i],
            preview: thumbnail,
          };
          return updated;
        });
      }
    }
  };

  const removeImage = (index: number) => {
    setImagePreviewItems(prev => {
      const item = prev[index];
      // Blob URL 메모리 해제
      if (item.preview && item.preview.startsWith('blob:')) {
        URL.revokeObjectURL(item.preview);
      }
      return prev.filter((_, i) => i !== index);
    });
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
      const imageFiles = imagePreviewItems.map(item => item.file);
      await onSave(formData, imageFiles);
      onClose();
    } catch (error) {
      setIsSaving(false);
    }
  };

  // 물류이동을 제외한 요청 타입
  const requestTypeOptions = Object.values(ProductionRequestType).filter(
    type => type !== ProductionRequestType.LogisticsTransfer
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-xl font-bold">신규 생산 요청</DialogTitle>
        </DialogHeader>

        <form id="production-request-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 요청 유형 */}
            <div className="space-y-1.5">
              <Label htmlFor="requestType">요청 유형 *</Label>
              <Select
                value={formData.requestType}
                onValueChange={(value) => setFormData(prev => ({ ...prev, requestType: value as ProductionRequestType }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="요청 유형 선택" />
                </SelectTrigger>
                <SelectContent>
                  {requestTypeOptions.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 요청자 */}
            <div className="space-y-1.5">
              <Label htmlFor="requester">요청자 *</Label>
              <Input
                id="requester"
                name="requester"
                value={formData.requester}
                onChange={handleChange}
                required
              />
            </div>

            {/* 발주번호 */}
            <div className="space-y-1.5">
              <Label htmlFor="orderNumber">발주번호 *</Label>
              <Input
                id="orderNumber"
                name="orderNumber"
                value={formData.orderNumber}
                onChange={handleChange}
                placeholder="예: T12345-6"
                required
              />
              <p className="text-xs text-muted-foreground">
                숫자 입력 시 자동으로 T12345-6 형식으로 변환됩니다
              </p>
            </div>

            {/* 발주처 */}
            <div className="space-y-1.5">
              <Label htmlFor="supplier">발주처 *</Label>
              <Input
                id="supplier"
                name="supplier"
                value={formData.supplier}
                onChange={handleChange}
                required
              />
            </div>

            {/* 제품명 */}
            <div className="space-y-1.5">
              <Label htmlFor="productName">제품명 *</Label>
              <Input
                id="productName"
                name="productName"
                value={formData.productName}
                onChange={handleChange}
                required
              />
            </div>

            {/* 부속명 */}
            <div className="space-y-1.5">
              <Label htmlFor="partName">부속명 *</Label>
              <Input
                id="partName"
                name="partName"
                value={formData.partName}
                onChange={handleChange}
                required
              />
            </div>

            {/* 요청수량 */}
            <div className="space-y-1.5">
              <Label htmlFor="quantity">요청수량 *</Label>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                value={formData.quantity}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {/* 요청 내용 */}
          <div className="space-y-1.5">
            <Label htmlFor="content">요청 내용 *</Label>
            <Textarea
              id="content"
              name="content"
              value={formData.content}
              onChange={handleChange}
              rows={4}
              required
            />
          </div>

          {/* 이미지 첨부 */}
          <div className="space-y-1.5">
            <Label>이미지 첨부</Label>
            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageChange}
                multiple
                accept="image/*,image/heic,image/heif"
                className="hidden"
              />
              <input
                type="file"
                ref={cameraInputRef}
                onChange={handleImageChange}
                accept="image/*,image/heic,image/heif"
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
            <ImagePreviewGrid
              items={imagePreviewItems}
              onRemove={removeImage}
            />
          </div>
        </form>

        {/* 하단 버튼 */}
        <div className="flex-shrink-0 flex justify-end gap-2 px-6 py-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button
            type="submit"
            form="production-request-form"
            disabled={isSaving}
          >
            {isSaving ? '저장 중...' : '요청 저장'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

