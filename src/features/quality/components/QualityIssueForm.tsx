'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Plus, Minus, Camera, Upload } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { useOrderNumberFormatter } from '@/shared/hooks/useOrderNumberFormatter';
import { UploadingImageGrid, type UploadingImageItem, InputSelect } from '@/shared/components/common';
import { useImageUpload } from '@/shared/hooks';
import {
  QualityIssueFormData
} from '../types';
import {
  DEPARTMENT_OPTIONS,
  REGISTRATION_KEYWORD_OPTIONS,
  PROCESS_KEYWORD_OPTIONS,
  DEFECT_KEYWORD_OPTIONS,
  SHIPPING_WAIT_TYPE_OPTIONS
} from '../constants';

interface QualityIssueFormProps {
  onSave: (data: QualityIssueFormData, imageFiles: File[]) => void;
}

export const QualityIssueForm: React.FC<QualityIssueFormProps> = ({
  onSave
}) => {
  // 이미지 업로드 훅 사용
  const imageUploadHook = useImageUpload();
  
  const [formData, setFormData] = useState<QualityIssueFormData>({
    department: '',
    registrationKeyword: '',
    orderNumber: 'T',
    supplier: '',
    productName: '',
    partName: '',
    issues: [''],
    keywordPairs: [{ process: '', defect: '' }],
    category: '',
    priority: 'normal',
    assignedTo: '',
    shippingWaitType: '',
    shippingWaitQuantity: undefined
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);


  const handleInputChange = useCallback((field: keyof QualityIssueFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // 에러 메시지 제거
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  }, [errors]);

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

  const handleOrderNumberInputChange = (value: string) => {
    handleOrderNumberChange(value, (formatted) => {
      setFormData(prev => ({ ...prev, orderNumber: formatted }));
    });
  };

  const handleIssueChange = (index: number, value: string) => {
    const newIssues = [...formData.issues];
    newIssues[index] = value;
    setFormData(prev => ({ ...prev, issues: newIssues }));
  };


  const handleKeywordPairChange = useCallback((index: number, field: 'process' | 'defect', value: string) => {
    const newKeywordPairs = [...formData.keywordPairs];
    newKeywordPairs[index] = { ...newKeywordPairs[index], [field]: value };
    setFormData(prev => ({ ...prev, keywordPairs: newKeywordPairs }));
  }, [formData.keywordPairs]);

  const addKeywordPair = () => {
    setFormData(prev => ({ 
      ...prev, 
      keywordPairs: [...prev.keywordPairs, { process: '', defect: '' }] 
    }));
  };

  const removeKeywordPair = (index: number) => {
    if (formData.keywordPairs.length > 1) {
      const newKeywordPairs = formData.keywordPairs.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, keywordPairs: newKeywordPairs }));
    }
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

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.department) newErrors.department = '부서를 선택해주세요';
    if (!formData.registrationKeyword) newErrors.registrationKeyword = '등록키워드를 입력해주세요';
    if (!formData.orderNumber) newErrors.orderNumber = '발주번호를 입력해주세요';
    if (!formData.supplier) newErrors.supplier = '발주처를 입력해주세요';
    if (!formData.productName) newErrors.productName = '제품명을 입력해주세요';
    if (!formData.partName) newErrors.partName = '부속명을 입력해주세요';

    // 출하대기 선택 시 세부 타입과 수량 필수
    if (formData.registrationKeyword === '출하대기') {
      if (!formData.shippingWaitType) newErrors.shippingWaitType = '출하대기 세부 타입을 선택해주세요';
      if (!formData.shippingWaitQuantity || formData.shippingWaitQuantity <= 0) {
        newErrors.shippingWaitQuantity = '출하대기 수량을 입력해주세요';
      }
    }

    const validIssues = formData.issues.filter(issue => issue.trim() !== '');
    if (validIssues.length === 0) {
      newErrors.issues = '최소 하나 이상의 이슈사항을 입력해주세요';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const finalIssues = formData.issues.filter(issue => issue.trim() !== '');
    const finalKeywordPairs = formData.keywordPairs.filter(pair => pair.process || pair.defect);
    
    const submitData: QualityIssueFormData = {
      ...formData,
      issues: finalIssues,
      keywordPairs: finalKeywordPairs
    };

    // 새로 업로드할 파일들만 추출
    const newFiles = imageUploadHook.uploadingImages
      .filter(item => item.file !== null)
      .map(item => item.file!);
    
    onSave(submitData, newFiles);
  };

  return (
    <form id="quality-issue-form" onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto p-6">
          {/* 부서 */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              부서 <span className="text-red-500">*</span>
            </label>
            <Select value={formData.department} onValueChange={(value) => handleInputChange('department', value)}>
              <SelectTrigger className={cn(errors.department && 'border-red-500')}>
                <SelectValue placeholder="부서를 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {DEPARTMENT_OPTIONS.map(dept => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.department && (
              <p className="text-sm text-red-500 mt-1">{errors.department}</p>
            )}
          </div>

          {/* 등록키워드와 출하대기 관련 필드 - 4그리드 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* 등록키워드 (2칸) */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-2">
                등록키워드 <span className="text-red-500">*</span>
              </label>
              <InputSelect
                value={formData.registrationKeyword}
                onChange={(value) => handleInputChange('registrationKeyword', value)}
                options={[...REGISTRATION_KEYWORD_OPTIONS]}
                placeholder="등록키워드를 입력하거나 선택하세요"
              />
              {errors.registrationKeyword && (
                <p className="text-sm text-red-500 mt-1">{errors.registrationKeyword}</p>
              )}
            </div>
            
            {/* 출하대기 세부 타입 (1칸) - 등록키워드가 '출하대기'일 때만 표시 */}
            {formData.registrationKeyword === '출하대기' && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  출하대기 세부 타입 <span className="text-red-500">*</span>
                </label>
                <InputSelect
                  value={formData.shippingWaitType || ''}
                  onChange={(value) => handleInputChange('shippingWaitType', value)}
                  options={[...SHIPPING_WAIT_TYPE_OPTIONS]}
                  placeholder="출하대기 세부 타입을 입력하거나 선택하세요"
                />
                {errors.shippingWaitType && (
                  <p className="text-sm text-red-500 mt-1">{errors.shippingWaitType}</p>
                )}
              </div>
            )}
            
            {/* 제품 수량 (1칸) - 등록키워드가 '출하대기'일 때만 표시 */}
            {formData.registrationKeyword === '출하대기' && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  제품 수량 <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  value={formData.shippingWaitQuantity || ''}
                  onChange={(e) => handleInputChange('shippingWaitQuantity', parseInt(e.target.value) || 0)}
                  placeholder="제품 수량을 입력하세요"
                  min="1"
                  className={cn(errors.shippingWaitQuantity && 'border-red-500')}
                />
                {errors.shippingWaitQuantity && (
                  <p className="text-sm text-red-500 mt-1">{errors.shippingWaitQuantity}</p>
                )}
              </div>
            )}
          </div>

          {/* 발주번호, 발주처, 제품명, 부속명 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                발주번호 <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.orderNumber}
                onChange={(e) => handleOrderNumberInputChange(e.target.value)}
                placeholder="T로 시작하는 발주번호"
                className={cn(errors.orderNumber && 'border-red-500')}
              />
              {errors.orderNumber && (
                <p className="text-sm text-red-500 mt-1">{errors.orderNumber}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                발주처 <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.supplier}
                onChange={(e) => handleInputChange('supplier', e.target.value)}
                placeholder="발주처를 입력하세요"
                className={cn(errors.supplier && 'border-red-500')}
              />
              {errors.supplier && (
                <p className="text-sm text-red-500 mt-1">{errors.supplier}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                제품명 <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.productName}
                onChange={(e) => handleInputChange('productName', e.target.value)}
                placeholder="제품명을 입력하세요"
                className={cn(errors.productName && 'border-red-500')}
              />
              {errors.productName && (
                <p className="text-sm text-red-500 mt-1">{errors.productName}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                부속명 <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.partName}
                onChange={(e) => handleInputChange('partName', e.target.value)}
                placeholder="부속명을 입력하세요"
                className={cn(errors.partName && 'border-red-500')}
              />
              {errors.partName && (
                <p className="text-sm text-red-500 mt-1">{errors.partName}</p>
              )}
            </div>
          </div>


          {/* 공정/불량 키워드 */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium text-foreground">공정/불량 키워드</h3>
            {formData.keywordPairs.map((pair, index) => (
              <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                <InputSelect
                  value={pair.process}
                  onChange={(value) => handleKeywordPairChange(index, 'process', value)}
                  options={[...PROCESS_KEYWORD_OPTIONS]}
                  placeholder="공정을 입력하거나 선택하세요"
                />
                <InputSelect
                  value={pair.defect}
                  onChange={(value) => handleKeywordPairChange(index, 'defect', value)}
                  options={[...DEFECT_KEYWORD_OPTIONS]}
                  placeholder="불량을 입력하거나 선택하세요"
                />
                {formData.keywordPairs.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => removeKeywordPair(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={addKeywordPair}
              className="w-full border-dashed"
            >
              <Plus className="h-4 w-4 mr-2" />
              키워드 쌍 추가
            </Button>
          </div>

          {/* 이슈사항 */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium text-foreground">이슈사항</h3>
            <Textarea
              value={formData.issues[0] || ''}
              onChange={(e) => handleIssueChange(0, e.target.value)}
              placeholder="이슈사항을 상세히 입력하세요"
              rows={4}
              className="w-full"
            />
            {errors.issues && (
              <p className="text-sm text-red-500">{errors.issues}</p>
            )}
          </div>

          {/* 이미지 첨부 */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground">이미지 첨부</h3>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                파일 선택
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => cameraInputRef.current?.click()}
                className="flex items-center gap-2"
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
    </form>
  );
};
