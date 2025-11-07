'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Badge } from '@/shared/components/ui/badge';
import { Plus, Minus, Camera, Upload } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { useOrderNumberFormatter } from '@/shared/hooks/useOrderNumberFormatter';
import { UploadingImageGrid, type UploadingImageItem, InputSelect } from '@/shared/components/common';
import { useImageUpload } from '@/shared/hooks';
import {
  QualityIssueFormData,
  QualityIssue
} from '../types';
import {
  DEPARTMENT_OPTIONS,
  REGISTRATION_KEYWORD_OPTIONS,
  PROCESS_KEYWORD_OPTIONS,
  DEFECT_KEYWORD_OPTIONS,
  SHIPPING_WAIT_TYPE_OPTIONS,
  STATUS_COLORS
} from '../constants';

interface QualityIssueFormProps {
  onSave: (data: QualityIssueFormData, imageFiles: File[], existingImageUrls?: string[], issueItems?: Array<{ content: string; status: string; createdAt?: string }>) => void;
  initialData?: QualityIssue | null;
  isEditMode?: boolean;
}

export const QualityIssueForm: React.FC<QualityIssueFormProps> = ({
  onSave,
  initialData,
  isEditMode = false
}) => {
  // 이미지 업로드 훅 사용
  const imageUploadHook = useImageUpload();
  
  // 이슈사항과 상태를 함께 관리하는 상태
  const [issueItems, setIssueItems] = useState<Array<{ content: string; status: string; createdAt?: string }>>(() => {
    if (initialData && isEditMode) {
      return initialData.issues.map(issue => {
        if (typeof issue === 'string') {
          return { content: issue, status: '진행중', createdAt: initialData.createdAt as string };
        } else {
          // status 매핑 (영어 -> 한국어)
        const statusMapping: Record<string, string> = {
          'open': '대기중',
          'in-progress': '진행중',
          'resolved': '해결완료',
          'closed': '해결완료',
        };
          const koreanStatus = statusMapping[issue.status || ''] || issue.status || '진행중';
          return {
            content: issue.content || '',
            status: koreanStatus,
            createdAt: issue.createdAt
          };
        }
      });
    }
    return [{ content: '', status: '진행중' }];
  });

  // 초기 데이터로 폼 초기화
  const getInitialFormData = (): QualityIssueFormData => {
    if (initialData && isEditMode) {
      // 모든 이슈사항 가져오기 (상태는 별도로 관리)
      const allIssues = initialData.issues.map(issue => {
        return typeof issue === 'string' ? issue : (issue?.content || '');
      });
      
      return {
        department: initialData.department || '',
        registrationKeyword: initialData.registrationKeyword || '',
        orderNumber: initialData.orderNumber || 'T',
        supplier: initialData.supplier || '',
        productName: initialData.productName || '',
        partName: initialData.partName || '',
        issues: allIssues.length > 0 ? allIssues : [''],
        keywordPairs: initialData.keywordPairs && initialData.keywordPairs.length > 0 
          ? initialData.keywordPairs 
          : [{ process: '', defect: '' }],
        category: initialData.category || '',
        priority: initialData.priority || 'normal',
        assignedTo: initialData.assignedTo || '',
        shippingWaitType: initialData.shippingWaitType || '',
        shippingWaitQuantity: initialData.shippingWaitQuantity
      };
    }
    
    return {
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
    };
  };

  const [formData, setFormData] = useState<QualityIssueFormData>(getInitialFormData());
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>(
    (initialData?.imageUrls && isEditMode) ? initialData.imageUrls : []
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

  // initialData가 변경되면 폼 초기화
  React.useEffect(() => {
    if (initialData && isEditMode) {
      setFormData(getInitialFormData());
      setExistingImageUrls(initialData.imageUrls || []);
      setErrors({});
      
      // 이슈사항과 상태 초기화
      const newIssueItems = initialData.issues.map(issue => {
        if (typeof issue === 'string') {
          return { content: issue, status: '진행중', createdAt: initialData.createdAt as string };
        } else {
        const statusMapping: Record<string, string> = {
          'open': '대기중',
          'in-progress': '진행중',
          'resolved': '해결완료',
          'closed': '해결완료',
        };
          const koreanStatus = statusMapping[issue.status || ''] || issue.status || '진행중';
          return {
            content: issue.content || '',
            status: koreanStatus,
            createdAt: issue.createdAt
          };
        }
      });
      setIssueItems(newIssueItems.length > 0 ? newIssueItems : [{ content: '', status: '진행중' }]);
      
      // 이미지 업로드 훅 초기화
      imageUploadHook.uploadingImages.forEach((_, index) => {
        imageUploadHook.removeImage(index);
      });
    } else if (!isEditMode) {
      // 생성 모드로 전환 시 폼 초기화
      setFormData({
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
      setExistingImageUrls([]);
      setIssueItems([{ content: '', status: '진행중' }]);
      setErrors({});
    }
  }, [initialData?.id, isEditMode]);

  // 기존 이미지 삭제 핸들러
  const handleRemoveExistingImage = (index: number) => {
    setExistingImageUrls(prev => prev.filter((_, i) => i !== index));
  };
  
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
    const newIssueItems = [...issueItems];
    newIssueItems[index] = { ...newIssueItems[index], content: value };
    setIssueItems(newIssueItems);
    
    // formData도 업데이트 (호환성 유지)
    const newIssues = [...formData.issues];
    newIssues[index] = value;
    setFormData(prev => ({ ...prev, issues: newIssues }));
  };

  const handleIssueStatusChange = (index: number, status: string) => {
    const newIssueItems = [...issueItems];
    newIssueItems[index] = { ...newIssueItems[index], status };
    setIssueItems(newIssueItems);
  };

  const addIssue = () => {
    setIssueItems(prev => [...prev, { content: '', status: '진행중' }]);
    setFormData(prev => ({ 
      ...prev, 
      issues: [...prev.issues, ''] 
    }));
  };

  const removeIssue = (index: number) => {
    if (issueItems.length > 1) {
      setIssueItems(prev => prev.filter((_, i) => i !== index));
      const newIssues = formData.issues.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, issues: newIssues }));
    }
  };

  // 상태 옵션 정의
  const statusOptions = [
    { value: '대기중', label: '대기중' },
    { value: '진행중', label: '진행중' },
    { value: '해결완료', label: '해결완료' }
  ];


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
    
    // 이슈사항과 상태 정보를 함께 전달 (커스텀 속성으로)
    onSave(submitData, newFiles, isEditMode ? existingImageUrls : undefined, issueItems);
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
            {issueItems.map((issueItem, index) => (
              <div key={index} className="space-y-2 p-4 border rounded-lg">
                <div className="flex items-start gap-2">
                  <Textarea
                    value={issueItem.content}
                    onChange={(e) => handleIssueChange(index, e.target.value)}
                    placeholder={`이슈사항 ${index + 1}을 상세히 입력하세요`}
                    rows={4}
                    className="flex-1"
                  />
                  {issueItems.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeIssue(index)}
                      className="text-red-500 hover:text-red-700 flex-shrink-0 mt-0"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground whitespace-nowrap">진행상태:</span>
                  <Select
                    value={issueItem.status}
                    onValueChange={(value) => handleIssueStatusChange(index, value)}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue>
                        {issueItem.status ? (
                          <Badge 
                            variant="outline" 
                            className={cn("text-xs", STATUS_COLORS[issueItem.status as keyof typeof STATUS_COLORS])}
                          >
                            {statusOptions.find(opt => opt.value === issueItem.status)?.label || issueItem.status}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">상태 선택</span>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant="outline" 
                              className={cn("text-xs", STATUS_COLORS[option.value as keyof typeof STATUS_COLORS])}
                            >
                              {option.label}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={addIssue}
              className="w-full border-dashed"
            >
              <Plus className="h-4 w-4 mr-2" />
              이슈사항 추가
            </Button>
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

            {/* 기존 이미지 표시 (수정 모드) */}
            {isEditMode && existingImageUrls.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">기존 이미지</p>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2">
                  {existingImageUrls.map((url, index) => (
                    <div key={index} className="relative">
                      <img
                        src={url}
                        alt={`기존 이미지 ${index + 1}`}
                        className="w-full h-24 object-cover border rounded-md"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveExistingImage(index)}
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-destructive/90 transition-colors"
                        aria-label="이미지 삭제"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* 새로 업로드하는 이미지 미리보기 */}
            {imageUploadHook.uploadingImages.length > 0 && (
              <div className="space-y-2">
                {isEditMode && <p className="text-sm text-muted-foreground">새 이미지</p>}
                <UploadingImageGrid
                  items={imageUploadHook.uploadingImages}
                  onRemove={imageUploadHook.removeImage}
                />
              </div>
            )}
          </div>
    </form>
  );
};
