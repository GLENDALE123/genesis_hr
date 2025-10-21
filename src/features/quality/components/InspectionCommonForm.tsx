'use client';

import React, { useRef, useState, useCallback } from 'react';
import { Label } from '@/shared/components/ui/label';
import { Input } from '@/shared/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { InputSelect } from '@/shared/components/common/InputSelect';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { PROCESS_KEYWORD_OPTIONS, DEFECT_KEYWORD_OPTIONS } from '../constants';
import type { AutocompleteData } from '../services/autocompleteService';
import { useOrderNumberFormatter } from '@/shared/hooks/useOrderNumberFormatter';
import { QualityInspection, KeywordPair } from '../types';
import { 
  createImagePreview, 
  uploadImageWithState, 
  ImageUploadState, 
  revokePreviewUrl
} from '@/shared/utils/imageUpload';
import { UploadingImageGrid, UploadingImageItem } from '@/shared/components/common/UploadingImageGrid';

interface InspectionCommonFormProps {
  formData: Partial<QualityInspection>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<QualityInspection>>>;
  autocompleteData: AutocompleteData;
  showKeywordSection?: boolean;
  onKeywordPairChange?: (index: number, field: 'process' | 'defect', value: string) => void;
  onAddKeywordPair?: () => void;
  onRemoveKeywordPair?: (index: number) => void;
  withoutCard?: boolean;
}

// 이미지 업로드 훅 인터페이스
export interface UseImageUploadReturn {
  uploadingImages: UploadingImageItem[];
  isUploading: boolean;
  uploadProgress: number;
  handleFileSelect: (files: File[]) => Promise<void>;
  removeImage: (index: number) => void;
  uploadImages: (folder: string) => Promise<string[]>;
  clearImages: () => void;
  setExistingImages: (urls: string[]) => void;
  deletedImageUrls: string[]; // 삭제된 이미지 URL 추적
  clearDeletedUrls: () => void; // 삭제된 URL 목록 초기화
}

// 이미지 업로드 훅
export const useImageUpload = (): UseImageUploadReturn => {
  const [uploadingImages, setUploadingImages] = useState<UploadingImageItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deletedImageUrls, setDeletedImageUrls] = useState<string[]>([]); // 삭제된 이미지 URL 추적


  const handleFileSelect = useCallback(async (files: File[]) => {
    if (files.length === 0) return;

    // 1단계: 즉시 로딩 상태로 추가
    const newItems: UploadingImageItem[] = files.map(file => ({ file, preview: null }));
    setUploadingImages(prev => [...prev, ...newItems]);
    
    // 2단계: 썸네일 생성 (병렬 처리로 성능 향상)
    const startIndex = uploadingImages.length;
    
    // 각 파일에 대해 썸네일 생성
    const thumbnailPromises = files.map(async (file, index) => {
      try {
        const thumbnail = await createImagePreview(file);
        
        setUploadingImages(prev => {
          const updated = [...prev];
          updated[startIndex + index] = { file, preview: thumbnail.previewUrl };
          return updated;
        });
        
        return { success: true, index, file };
      } catch (error) {
        // 실패한 경우 원본 파일로 대체
        setUploadingImages(prev => {
          const updated = [...prev];
          updated[startIndex + index] = { file, preview: URL.createObjectURL(file) };
          return updated;
        });
        
        return { success: false, index, file, error };
      }
    });

    // 모든 썸네일 생성 완료 대기
    await Promise.allSettled(thumbnailPromises);
  }, [uploadingImages.length]);

  const removeImage = useCallback((index: number) => {
    setUploadingImages(prev => {
      const item = prev[index];
      
      // 기존 이미지 URL인 경우 삭제 목록에 추가
      if (item.file === null && item.preview && !item.preview.startsWith('blob:')) {
        setDeletedImageUrls(prevDeleted => [...prevDeleted, item.preview!]);
      }
      
      // blob URL인 경우에만 해제 (기존 이미지 URL은 해제하지 않음)
      if (item.preview && item.preview.startsWith('blob:')) {
        URL.revokeObjectURL(item.preview);
      }
      
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const uploadImages = useCallback(async (folder: string): Promise<string[]> => {
    if (uploadingImages.length === 0) return [];

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const uploadedUrls: string[] = [];
      
      for (let i = 0; i < uploadingImages.length; i++) {
        const item = uploadingImages[i];
        
        
        // 기존 이미지인 경우 (file이 null) URL을 그대로 사용
        if (item.file === null && item.preview) {
          uploadedUrls.push(item.preview);
          continue;
        }
        
        // 새로 업로드할 이미지인 경우
        if (item.file) {
          const uploadState = await createImagePreview(item.file);
          
          const uploadedState = await uploadImageWithState(uploadState, folder, (state) => {
            // 진행률 업데이트
            const currentProgress = ((i + (state.progress || 0) / 100) / uploadingImages.length) * 100;
            setUploadProgress(currentProgress);
          });

          if (uploadedState.status === 'uploaded' && uploadedState.uploadedUrl) {
            uploadedUrls.push(uploadedState.uploadedUrl);
          }
        }
      }


      return uploadedUrls;
    } catch (error) {
      console.error('이미지 업로드 실패:', error);
      throw error;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [uploadingImages]);

  const clearImages = useCallback(() => {
    // blob URL만 정리 (기존 이미지 URL은 정리하지 않음)
    uploadingImages.forEach(item => {
      if (item.preview && item.preview.startsWith('blob:')) {
        URL.revokeObjectURL(item.preview);
      }
    });
    setUploadingImages([]);
  }, [uploadingImages]);

  const setExistingImages = useCallback((urls: string[]) => {
    // 기존 이미지 URL들을 uploadingImages 형태로 변환
    const existingItems: UploadingImageItem[] = urls.map(url => ({
      file: null, // 기존 이미지는 파일이 없음
      preview: url
    }));
    
    // 기존 이미지만 추가하고, 새로 추가된 이미지들은 유지
    setUploadingImages(prev => {
      // 기존 이미지들 중에서 새로 추가된 이미지가 아닌 것들만 필터링
      const newImages = prev.filter(item => item.file !== null);
      return [...existingItems, ...newImages];
    });
    
    setDeletedImageUrls([]); // 기존 이미지 설정 시 삭제 목록 초기화
  }, []);

  const clearDeletedUrls = useCallback(() => {
    setDeletedImageUrls([]);
  }, []);

  return {
    uploadingImages,
    isUploading,
    uploadProgress,
    handleFileSelect,
    removeImage,
    uploadImages,
    clearImages,
    setExistingImages,
    deletedImageUrls,
    clearDeletedUrls
  };
};

export const InspectionCommonForm: React.FC<InspectionCommonFormProps> = ({
  formData,
  setFormData,
  autocompleteData,
  showKeywordSection = false,
  onKeywordPairChange,
  onAddKeywordPair,
  onRemoveKeywordPair,
  withoutCard = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  // 이미지 업로드 훅 사용
  const {
    uploadingImages,
    isUploading,
    uploadProgress,
    handleFileSelect,
    removeImage
  } = useImageUpload();

  // 파일 선택 핸들러
  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length > 0) {
      try {
        await handleFileSelect(files);
      } catch (error) {
        console.error('파일 선택 처리 실패:', error);
      }
    }
    
    // input 초기화 (같은 파일을 다시 선택할 수 있도록)
    if (e.target) {
      e.target.value = '';
    }
  };
  
  // 발주번호 포맷터 및 자동완성 훅
  const { handleOrderNumberChange } = useOrderNumberFormatter({
    onAutoFill: (data) => {
      setFormData((prev: Partial<QualityInspection>) => ({
        ...prev,
        supplier: data.supplier || prev.supplier,
        productName: data.productName || prev.productName,
        partName: data.partName || prev.partName,
        orderQuantity: data.orderQuantity || prev.orderQuantity,
        specification: data.specification || prev.specification,
      }));
    },
    onClear: () => {
      // 발주번호가 비어있을 때 관련 정보 초기화
      setFormData((prev: Partial<QualityInspection>) => ({
        ...prev,
        supplier: '',
        productName: '',
        partName: '',
        orderQuantity: '',
        specification: '',
      }));
    }
  });

  // 개별 필드 컴포넌트들
  const inspectionDateField = (
    <div className="space-y-2">
      <Label htmlFor="inspectionDate">검사일시</Label>
      <Input
        id="inspectionDate"
        type="date"
        value={formData.inspectionDate}
        onChange={(e) => setFormData((prev: Partial<QualityInspection>) => ({ ...prev, inspectionDate: e.target.value }))}
      />
    </div>
  );

  const orderNumberField = (
    <div className="space-y-2">
      <Label htmlFor="orderNumber">발주번호 *</Label>
      <Input
        id="orderNumber"
        value={formData.orderNumber}
        onChange={(e) => handleOrderNumberChange(e.target.value, (formatted) => 
          setFormData((prev: Partial<QualityInspection>) => ({ ...prev, orderNumber: formatted }))
        )}
        placeholder="발주번호를 입력하세요"
        required
        autoComplete="off"
        list=""
      />
    </div>
  );

  const supplierField = (
    <div className="space-y-2">
      <Label htmlFor="supplier">발주처</Label>
      <InputSelect
        value={formData.supplier}
        onChange={(value) => setFormData((prev: Partial<QualityInspection>) => ({ ...prev, supplier: value }))}
        options={autocompleteData.suppliers}
        placeholder="발주처를 입력하거나 선택하세요"
      />
    </div>
  );

  const productNameField = (
    <div className="space-y-2">
      <Label htmlFor="productName">제품명 *</Label>
      <InputSelect
        value={formData.productName}
        onChange={(value) => setFormData((prev: Partial<QualityInspection>) => ({ ...prev, productName: value }))}
        options={autocompleteData.productNames}
        placeholder="제품명을 입력하거나 선택하세요"
      />
    </div>
  );

  const partNameField = (
    <div className="space-y-2">
      <Label htmlFor="partName">부속명</Label>
      <InputSelect
        value={formData.partName}
        onChange={(value) => setFormData((prev: Partial<QualityInspection>) => ({ ...prev, partName: value }))}
        options={autocompleteData.partNames}
        placeholder="부속명을 입력하거나 선택하세요"
      />
    </div>
  );

  const orderQuantityField = (
    <div className="space-y-2">
      <Label htmlFor="orderQuantity">발주수량</Label>
      <Input
        id="orderQuantity"
        value={formData.orderQuantity}
        onChange={(e) => setFormData((prev: Partial<QualityInspection>) => ({ ...prev, orderQuantity: e.target.value }))}
        placeholder="수량을 입력하세요"
        autoComplete="off"
        list=""
      />
    </div>
  );

  const injectionMaterialField = (
    <div className="space-y-2">
      <Label htmlFor="injectionMaterial">사출원료</Label>
      <Select 
        value={formData.injectionMaterial} 
        onValueChange={(value) => setFormData((prev: Partial<QualityInspection>) => ({ ...prev, injectionMaterial: value }))}
      >
        <SelectTrigger>
          <SelectValue placeholder="사출원료를 선택하세요" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ABS">ABS</SelectItem>
          <SelectItem value="AS">AS</SelectItem>
          <SelectItem value="P.P">P.P</SelectItem>
          <SelectItem value="PC">PC</SelectItem>
          <SelectItem value="PET">PET</SelectItem>
          <SelectItem value="PETG">PETG</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  const injectionColorField = (
    <div className="space-y-2">
      <Label htmlFor="injectionColor">사출색상</Label>
      <InputSelect
        value={formData.injectionColor}
        onChange={(value) => setFormData((prev: Partial<QualityInspection>) => ({ ...prev, injectionColor: value }))}
        options={autocompleteData.injectionColors}
        placeholder="사출색상을 입력하거나 선택하세요"
      />
    </div>
  );

  const specificationField = (
    <div className="space-y-2">
      <Label htmlFor="specification">사양</Label>
      <InputSelect
        value={formData.specification}
        onChange={(value) => setFormData((prev: Partial<QualityInspection>) => ({ ...prev, specification: value }))}
        options={autocompleteData.specifications}
        placeholder="사양을 입력하거나 선택하세요"
      />
    </div>
  );

  const postProcessField = (
    <div className="space-y-2">
      <Label htmlFor="postProcess">후공정</Label>
      <Select 
        value={formData.postProcess} 
        onValueChange={(value) => setFormData((prev: Partial<QualityInspection>) => ({ ...prev, postProcess: value }))}
      >
        <SelectTrigger>
          <SelectValue placeholder="후공정을 선택하세요" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="디지털프린팅">디지털프린팅</SelectItem>
          <SelectItem value="레이져컷팅">레이져컷팅</SelectItem>
          <SelectItem value="인쇄">인쇄</SelectItem>
          <SelectItem value="인쇄/박">인쇄/박</SelectItem>
          <SelectItem value="전사">전사</SelectItem>
          <SelectItem value="조립">조립</SelectItem>
          <SelectItem value="패드인쇄">패드인쇄</SelectItem>
          <SelectItem value="출하">출하</SelectItem>
          <SelectItem value="박">박</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  const injectionCompanyField = (
    <div className="space-y-2">
      <Label htmlFor="injectionCompany">사출처</Label>
      <InputSelect
        value={formData.injectionCompany}
        onChange={(value) => setFormData((prev: Partial<QualityInspection>) => ({ ...prev, injectionCompany: value }))}
        options={autocompleteData.injectionCompanies}
        placeholder="사출처를 입력하거나 선택하세요"
      />
    </div>
  );

  // 기본 레이아웃 (기존 방식 유지)
  const formContent = (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {inspectionDateField}
        {orderNumberField}
        {supplierField}
        {productNameField}
        {partNameField}
        {orderQuantityField}
        {injectionMaterialField}
        {injectionColorField}
        {specificationField}
        {postProcessField}
        {injectionCompanyField}
      </div>

      {showKeywordSection && (
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">공정/불량 키워드</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {formData.keywordPairs?.map((pair: KeywordPair, index: number) => (
                  <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                    <InputSelect
                      value={pair.process}
                      onChange={(value) => onKeywordPairChange?.(index, 'process', value)}
                      options={PROCESS_KEYWORD_OPTIONS}
                      placeholder="공정 키워드를 입력하거나 선택하세요"
                    />
                    <InputSelect
                      value={pair.defect}
                      onChange={(value) => onKeywordPairChange?.(index, 'defect', value)}
                      options={DEFECT_KEYWORD_OPTIONS}
                      placeholder="불량 키워드를 입력하거나 선택하세요"
                    />
                    {(formData.keywordPairs || []).length > 1 ? (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => onRemoveKeywordPair?.(index)}
                      >
                        -
                      </Button>
                    ) : <div className="w-10"></div>}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={onAddKeywordPair}
                  className="w-full"
                >
                  키워드 쌍 추가
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 이미지 업로드 */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-4">이미지 첨부</h3>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              파일 선택
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => cameraInputRef.current?.click()}
            >
              사진 촬영
            </Button>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
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
          
          {/* 업로드 진행률 표시 */}
          {isUploading && (
            <div className="mt-2">
              <div className="flex justify-between text-sm text-muted-foreground mb-1">
                <span>이미지 업로드 중...</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
          
          {/* 이미지 그리드 */}
          <UploadingImageGrid
            items={uploadingImages}
            onRemove={removeImage}
            gridClassName="grid-cols-[repeat(auto-fill,minmax(100px,1fr))]"
            imageClassName="h-24"
          />
        </div>
      </div>

    </>
  );

  // 개별 필드들을 export하는 객체
  if (withoutCard) {
    return formContent;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">기본 정보</CardTitle>
      </CardHeader>
      <CardContent>
        {formContent}
      </CardContent>
    </Card>
  );
};

// 개별 필드들을 export
export const useCommonFields = (
  formData: Partial<QualityInspection>,
  setFormData: React.Dispatch<React.SetStateAction<Partial<QualityInspection>>>,
  autocompleteData: AutocompleteData,
  imageUploadHook?: UseImageUploadReturn,
  fileInputRef?: React.RefObject<HTMLInputElement | null>,
  cameraInputRef?: React.RefObject<HTMLInputElement | null>
) => {
  // 발주번호 포맷터 및 자동완성 훅
  const { handleOrderNumberChange } = useOrderNumberFormatter({
    onAutoFill: (data) => {
      setFormData((prev: Partial<QualityInspection>) => ({
        ...prev,
        supplier: data.supplier || prev.supplier,
        productName: data.productName || prev.productName,
        partName: data.partName || prev.partName,
        orderQuantity: data.orderQuantity || prev.orderQuantity,
        specification: data.specification || prev.specification,
      }));
    },
    onClear: () => {
      setFormData((prev: Partial<QualityInspection>) => ({
        ...prev,
        supplier: '',
        productName: '',
        partName: '',
        orderQuantity: '',
        specification: '',
      }));
    }
  });

  const inspectionDateField = (
    <div className="space-y-2">
      <Label htmlFor="inspectionDate">검사일시</Label>
      <Input
        id="inspectionDate"
        type="date"
        value={formData.inspectionDate}
        onChange={(e) => setFormData((prev: Partial<QualityInspection>) => ({ ...prev, inspectionDate: e.target.value }))}
      />
    </div>
  );

  const orderNumberField = (
    <div className="space-y-2">
      <Label htmlFor="orderNumber">발주번호 *</Label>
      <Input
        id="orderNumber"
        value={formData.orderNumber}
        onChange={(e) => handleOrderNumberChange(e.target.value, (formatted) => 
          setFormData((prev: Partial<QualityInspection>) => ({ ...prev, orderNumber: formatted }))
        )}
        placeholder="발주번호를 입력하세요"
        required
        autoComplete="off"
        list=""
      />
    </div>
  );

  const supplierField = (
    <div className="space-y-2">
      <Label htmlFor="supplier">발주처</Label>
      <InputSelect
        value={formData.supplier}
        onChange={(value) => setFormData((prev: Partial<QualityInspection>) => ({ ...prev, supplier: value }))}
        options={autocompleteData.suppliers}
        placeholder="발주처를 입력하거나 선택하세요"
      />
    </div>
  );

  const productNameField = (
    <div className="space-y-2">
      <Label htmlFor="productName">제품명 *</Label>
      <InputSelect
        value={formData.productName}
        onChange={(value) => setFormData((prev: Partial<QualityInspection>) => ({ ...prev, productName: value }))}
        options={autocompleteData.productNames}
        placeholder="제품명을 입력하거나 선택하세요"
      />
    </div>
  );

  const partNameField = (
    <div className="space-y-2">
      <Label htmlFor="partName">부속명</Label>
      <InputSelect
        value={formData.partName}
        onChange={(value) => setFormData((prev: Partial<QualityInspection>) => ({ ...prev, partName: value }))}
        options={autocompleteData.partNames}
        placeholder="부속명을 입력하거나 선택하세요"
      />
    </div>
  );

  const orderQuantityField = (
    <div className="space-y-2">
      <Label htmlFor="orderQuantity">발주수량</Label>
      <Input
        id="orderQuantity"
        value={formData.orderQuantity}
        onChange={(e) => setFormData((prev: Partial<QualityInspection>) => ({ ...prev, orderQuantity: e.target.value }))}
        placeholder="수량을 입력하세요"
        autoComplete="off"
        list=""
      />
    </div>
  );

  const injectionMaterialField = (
    <div className="space-y-2">
      <Label htmlFor="injectionMaterial">사출원료</Label>
      <Select 
        value={formData.injectionMaterial} 
        onValueChange={(value) => setFormData((prev: Partial<QualityInspection>) => ({ ...prev, injectionMaterial: value }))}
      >
        <SelectTrigger>
          <SelectValue placeholder="사출원료를 선택하세요" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ABS">ABS</SelectItem>
          <SelectItem value="AS">AS</SelectItem>
          <SelectItem value="P.P">P.P</SelectItem>
          <SelectItem value="PC">PC</SelectItem>
          <SelectItem value="PET">PET</SelectItem>
          <SelectItem value="PETG">PETG</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  const injectionColorField = (
    <div className="space-y-2">
      <Label htmlFor="injectionColor">사출색상</Label>
      <InputSelect
        value={formData.injectionColor}
        onChange={(value) => setFormData((prev: Partial<QualityInspection>) => ({ ...prev, injectionColor: value }))}
        options={autocompleteData.injectionColors}
        placeholder="사출색상을 입력하거나 선택하세요"
      />
    </div>
  );

  const specificationField = (
    <div className="space-y-2">
      <Label htmlFor="specification">사양</Label>
      <InputSelect
        value={formData.specification}
        onChange={(value) => setFormData((prev: Partial<QualityInspection>) => ({ ...prev, specification: value }))}
        options={autocompleteData.specifications}
        placeholder="사양을 입력하거나 선택하세요"
      />
    </div>
  );

  const postProcessField = (
    <div className="space-y-2">
      <Label htmlFor="postProcess">후공정</Label>
      <Select 
        value={formData.postProcess} 
        onValueChange={(value) => setFormData((prev: Partial<QualityInspection>) => ({ ...prev, postProcess: value }))}
      >
        <SelectTrigger>
          <SelectValue placeholder="후공정을 선택하세요" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="디지털프린팅">디지털프린팅</SelectItem>
          <SelectItem value="레이져컷팅">레이져컷팅</SelectItem>
          <SelectItem value="인쇄">인쇄</SelectItem>
          <SelectItem value="인쇄/박">인쇄/박</SelectItem>
          <SelectItem value="전사">전사</SelectItem>
          <SelectItem value="조립">조립</SelectItem>
          <SelectItem value="패드인쇄">패드인쇄</SelectItem>
          <SelectItem value="출하">출하</SelectItem>
          <SelectItem value="박">박</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  const injectionCompanyField = (
    <div className="space-y-2">
      <Label htmlFor="injectionCompany">사출처</Label>
      <InputSelect
        value={formData.injectionCompany}
        onChange={(value) => setFormData((prev: Partial<QualityInspection>) => ({ ...prev, injectionCompany: value }))}
        options={autocompleteData.injectionCompanies}
        placeholder="사출처를 입력하거나 선택하세요"
      />
    </div>
  );

  const packagingInfoField = (
    <div className="space-y-2">
      <Label htmlFor="packagingInfo">사출포장</Label>
      <Input
        id="packagingInfo"
        value={formData.packagingInfo || ''}
        onChange={(e) => setFormData((prev: Partial<QualityInspection>) => ({ ...prev, packagingInfo: e.target.value }))}
        placeholder="사출포장 정보를 입력하세요"
      />
    </div>
  );

  // 키워드 섹션
  const keywordSection = (
    <div className="space-y-3">
      {formData.keywordPairs?.map((pair: KeywordPair, index: number) => (
        <div key={index} className="space-y-2">
          <div className="grid grid-cols-[1fr_1fr_3.5rem] gap-2 items-end">
            <div className="space-y-2">
              {index === 0 && (
                <Label className="text-sm font-medium">공정/불량 키워드</Label>
              )}
              <InputSelect
                value={pair.process}
                onChange={(value) => {
                  const newPairs = [...(formData.keywordPairs || [])];
                  newPairs[index] = { ...newPairs[index], process: value };
                  setFormData((prev: Partial<QualityInspection>) => ({ ...prev, keywordPairs: newPairs }));
                }}
                options={PROCESS_KEYWORD_OPTIONS}
                placeholder="공정 키워드를 입력하거나 선택하세요"
              />
            </div>
            <InputSelect
              value={pair.defect}
              onChange={(value) => {
                const newPairs = [...(formData.keywordPairs || [])];
                newPairs[index] = { ...newPairs[index], defect: value };
                setFormData((prev: Partial<QualityInspection>) => ({ ...prev, keywordPairs: newPairs }));
              }}
              options={DEFECT_KEYWORD_OPTIONS}
              placeholder="불량 키워드를 입력하거나 선택하세요"
            />
            <div className="flex justify-end">
              {index > 0 && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    const newPairs = [...(formData.keywordPairs || [])];
                    newPairs.splice(index, 1);
                    setFormData((prev: Partial<QualityInspection>) => ({ ...prev, keywordPairs: newPairs }));
                  }}
                >
                  삭제
                </Button>
              )}
            </div>
          </div>
        </div>
      ))}
      <div className="grid grid-cols-[1fr_1fr_3.5rem] items-center">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            const newPairs = [...(formData.keywordPairs || []), { process: '', defect: '' }];
            setFormData((prev: Partial<QualityInspection>) => ({ ...prev, keywordPairs: newPairs }));
          }}
          className="col-span-2"
        >
          키워드 쌍 추가
        </Button>
      </div>
    </div>
  );

  // 파일 선택 핸들러
  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0 && imageUploadHook) {
      await imageUploadHook.handleFileSelect(files);
    }
    // input 초기화
    if (e.target) {
      e.target.value = '';
    }
  };

  const imageSection = (
    <div className="mt-4">
      <h3 className="text-sm font-medium mb-2">이미지 첨부</h3>
      <div className="space-y-4">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef?.current?.click()}
          >
            파일 선택
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => cameraInputRef?.current?.click()}
          >
            사진 촬영
          </Button>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
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
        
        {/* 업로드 진행률 표시 */}
        {imageUploadHook?.isUploading && (
          <div className="mt-2">
            <div className="flex justify-between text-sm text-muted-foreground mb-1">
              <span>이미지 업로드 중...</span>
              <span>{Math.round(imageUploadHook.uploadProgress)}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${imageUploadHook.uploadProgress}%` }}
              />
            </div>
          </div>
        )}
        
        {/* 이미지 그리드 */}
        {imageUploadHook && (
          <UploadingImageGrid
            items={imageUploadHook.uploadingImages}
            onRemove={imageUploadHook.removeImage}
            gridClassName="grid-cols-[repeat(auto-fill,minmax(100px,1fr))]"
            imageClassName="h-24"
          />
        )}
      </div>
    </div>
  );

  return {
    inspectionDate: inspectionDateField,
    orderNumber: orderNumberField,
    supplier: supplierField,
    productName: productNameField,
    partName: partNameField,
    orderQuantity: orderQuantityField,
    injectionMaterial: injectionMaterialField,
    injectionColor: injectionColorField,
    specification: specificationField,
    postProcess: postProcessField,
    injectionCompany: injectionCompanyField,
    packagingInfo: packagingInfoField,
    keywordSection: keywordSection,
    imageSection: imageSection,
  };
};