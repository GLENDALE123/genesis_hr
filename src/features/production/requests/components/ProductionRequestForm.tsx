
import React, { useEffect, useRef, useState } from 'react';
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
import { Upload, Camera } from 'lucide-react';
import { useImageUpload } from '@/shared/hooks';
import { useOrderNumberFormatter } from '@/shared/hooks/useOrderNumberFormatter';
import { toast } from 'sonner';
import { ProductionRequestType } from '../types';

interface ProductionRequestFormProps {
  defaultRequester?: string;
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
  onCancel?: () => void;
  showFooter?: boolean; // 푸터 표시 여부 (기본값 true)
}

export const ProductionRequestForm: React.FC<ProductionRequestFormProps> = ({
  defaultRequester = '',
  onSave,
  onCancel,
  showFooter = true,
}) => {
  const imageUploadHook = useImageUpload();

  const [formData, setFormData] = useState({
    requestType: ProductionRequestType.Urgent,
    requester: defaultRequester,
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

  const { handleOrderNumberChange: formatAndAutoFill } = useOrderNumberFormatter({
    onAutoFill: (data) => {
      setFormData((prev) => ({
        ...prev,
        supplier: data.supplier || prev.supplier,
        productName: data.productName || prev.productName,
        partName: data.partName || prev.partName,
        quantity: data.orderQuantity || prev.quantity,
      }));
    },
    onClear: () => {
      setFormData((prev) => ({
        ...prev,
        supplier: '',
        productName: '',
        partName: '',
        quantity: '',
      }));
    },
  });

  useEffect(() => {
    imageUploadHook.clearImages();
    setIsSaving(false);
  }, []);

  // defaultRequester가 변경되면 requester 업데이트
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      requester: defaultRequester
    }));
  }, [defaultRequester]);

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      try {
        await imageUploadHook.handleFileSelect(files);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : '파일 선택에 실패했습니다.');
      }
    }
    if (e.target) e.target.value = '';
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'orderNumber') {
      formatAndAutoFill(value, (formatted) => setFormData((prev) => ({ ...prev, orderNumber: formatted })));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 중복 제출 방지
    if (isSaving || imageUploadHook.isUploading) {
      return;
    }

    setIsSaving(true);
    try {
      const imageFiles = imageUploadHook.uploadingImages
        .filter((item) => item.file !== null)
        .map((item) => item.file!);
      await onSave(formData, imageFiles);
    } catch (error) {
      toast.error('생산 요청 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const requestTypeOptions = Object.values(ProductionRequestType).filter(
    (type) => type !== ProductionRequestType.LogisticsTransfer
  );

  return (
    <>
      <form id="production-request-form" onSubmit={handleSubmit} className="px-0 py-0 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="requestType">요청 유형 *</Label>
            <Select
              value={formData.requestType}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, requestType: value as ProductionRequestType }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="요청 유형 선택" />
              </SelectTrigger>
              <SelectContent>
                {requestTypeOptions.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="requester">요청자 *</Label>
            <Input id="requester" name="requester" value={formData.requester} onChange={handleChange} required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="orderNumber">발주번호 *</Label>
            <Input id="orderNumber" name="orderNumber" value={formData.orderNumber} onChange={handleChange} placeholder="예: T12345-6" required />
            <p className="text-xs text-muted-foreground">숫자 입력 시 자동으로 T12345-6 형식으로 변환됩니다</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="supplier">발주처 *</Label>
            <Input id="supplier" name="supplier" value={formData.supplier} onChange={handleChange} required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="productName">제품명 *</Label>
            <Input id="productName" name="productName" value={formData.productName} onChange={handleChange} required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="partName">부속명 *</Label>
            <Input id="partName" name="partName" value={formData.partName} onChange={handleChange} required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="quantity">요청수량 *</Label>
            <Input id="quantity" name="quantity" type="number" value={formData.quantity} onChange={handleChange} required />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="content">요청 내용 *</Label>
          <Textarea id="content" name="content" value={formData.content} onChange={handleChange} rows={4} required />
        </div>

        <div className="space-y-1.5">
          <Label>이미지 첨부</Label>
          <div className="flex items-center gap-2">
            <input type="file" ref={fileInputRef} onChange={handleFileInputChange} multiple accept="image/*,image/heic,image/heif" className="hidden" />
            <input type="file" ref={cameraInputRef} onChange={handleFileInputChange} accept="image/*,image/heic,image/heif" className="hidden" />
            <Button type="button" variant="outline" onClick={() => fileInputRef.current && fileInputRef.current.click()} className="gap-2">
              <Upload className="h-4 w-4" />
              파일 선택
            </Button>
            <Button type="button" variant="outline" onClick={() => cameraInputRef.current && cameraInputRef.current.click()} className="gap-2">
              <Camera className="h-4 w-4" />
              사진 촬영
            </Button>
          </div>
          {imageUploadHook.uploadingImages.length > 0 && (
            <UploadingImageGrid
              items={imageUploadHook.uploadingImages}
              onRemove={imageUploadHook.removeImage}
              gridClassName="grid-cols-[repeat(auto-fill,minmax(100px,1fr))]"
              imageClassName="h-24"
            />
          )}
        </div>
      </form>

      {showFooter && (
        <div className="flex-shrink-0 flex justify-end gap-2 px-6 py-4 border-t">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              취소
            </Button>
          )}
          <Button type="submit" form="production-request-form" disabled={isSaving}>
            {isSaving ? '저장 중...' : '요청 저장'}
          </Button>
        </div>
      )}
    </>
  );
};



