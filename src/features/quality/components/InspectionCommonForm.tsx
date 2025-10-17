'use client';

import React, { useRef } from 'react';
import { Label } from '@/shared/components/ui/label';
import { Input } from '@/shared/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { InputSelect } from '@/shared/components/common/InputSelect';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { PROCESS_KEYWORD_OPTIONS, DEFECT_KEYWORD_OPTIONS } from '../constants';
import type { AutocompleteData } from '../services/autocompleteService';
import { useOrderNumberFormatter } from '@/shared/hooks/useOrderNumberFormatter';

interface InspectionCommonFormProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  autocompleteData: AutocompleteData;
  showKeywordSection?: boolean;
  onKeywordPairChange?: (index: number, field: 'process' | 'defect', value: string) => void;
  onAddKeywordPair?: () => void;
  onRemoveKeywordPair?: (index: number) => void;
  imagePreviews: string[];
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeImage: (index: number) => void;
  withoutCard?: boolean;
}

export const InspectionCommonForm: React.FC<InspectionCommonFormProps> = ({
  formData,
  setFormData,
  autocompleteData,
  showKeywordSection = false,
  onKeywordPairChange,
  onAddKeywordPair,
  onRemoveKeywordPair,
  imagePreviews,
  handleImageUpload,
  removeImage,
  withoutCard = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  // 발주번호 포맷터 및 자동완성 훅
  const { handleOrderNumberChange } = useOrderNumberFormatter({
    onAutoFill: (data) => {
      setFormData((prev: any) => ({
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
      setFormData((prev: any) => ({
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
        onChange={(e) => setFormData((prev: any) => ({ ...prev, inspectionDate: e.target.value }))}
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
          setFormData((prev: any) => ({ ...prev, orderNumber: formatted }))
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
        onChange={(value) => setFormData((prev: any) => ({ ...prev, supplier: value }))}
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
        onChange={(value) => setFormData((prev: any) => ({ ...prev, productName: value }))}
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
        onChange={(value) => setFormData((prev: any) => ({ ...prev, partName: value }))}
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
        onChange={(e) => setFormData((prev: any) => ({ ...prev, orderQuantity: e.target.value }))}
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
        onValueChange={(value) => setFormData((prev: any) => ({ ...prev, injectionMaterial: value }))}
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
        onChange={(value) => setFormData((prev: any) => ({ ...prev, injectionColor: value }))}
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
        onChange={(value) => setFormData((prev: any) => ({ ...prev, specification: value }))}
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
        onValueChange={(value) => setFormData((prev: any) => ({ ...prev, postProcess: value }))}
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
        onChange={(value) => setFormData((prev: any) => ({ ...prev, injectionCompany: value }))}
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
                {formData.keywordPairs?.map((pair: any, index: number) => (
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
                    {formData.keywordPairs.length > 1 ? (
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
            onChange={handleImageUpload}
            className="hidden"
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleImageUpload}
            className="hidden"
          />
          
          {imagePreviews.length > 0 && (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-2">
              {imagePreviews.map((preview, index) => (
                <div key={index} className="relative">
                  <img src={preview} alt={`preview ${index}`} className="w-full h-24 object-cover rounded" />
                  <button 
                    type="button" 
                    onClick={() => removeImage(index)} 
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </>
  );

  // 개별 필드들을 export하는 객체
  const commonFields = {
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
  };

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
  formData: any,
  setFormData: React.Dispatch<React.SetStateAction<any>>,
  autocompleteData: AutocompleteData,
  handleOrderNumberChange: (value: string, callback: (formatted: string) => void) => void
) => {
  const inspectionDateField = (
    <div className="space-y-2">
      <Label htmlFor="inspectionDate">검사일시</Label>
      <Input
        id="inspectionDate"
        type="date"
        value={formData.inspectionDate}
        onChange={(e) => setFormData((prev: any) => ({ ...prev, inspectionDate: e.target.value }))}
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
          setFormData((prev: any) => ({ ...prev, orderNumber: formatted }))
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
        onChange={(value) => setFormData((prev: any) => ({ ...prev, supplier: value }))}
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
        onChange={(value) => setFormData((prev: any) => ({ ...prev, productName: value }))}
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
        onChange={(value) => setFormData((prev: any) => ({ ...prev, partName: value }))}
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
        onChange={(e) => setFormData((prev: any) => ({ ...prev, orderQuantity: e.target.value }))}
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
        onValueChange={(value) => setFormData((prev: any) => ({ ...prev, injectionMaterial: value }))}
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
        onChange={(value) => setFormData((prev: any) => ({ ...prev, injectionColor: value }))}
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
        onChange={(value) => setFormData((prev: any) => ({ ...prev, specification: value }))}
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
        onValueChange={(value) => setFormData((prev: any) => ({ ...prev, postProcess: value }))}
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
        onChange={(value) => setFormData((prev: any) => ({ ...prev, injectionCompany: value }))}
        options={autocompleteData.injectionCompanies}
        placeholder="사출처를 입력하거나 선택하세요"
      />
    </div>
  );

  // 키워드 섹션 (공정검사에서만 사용)
  const keywordSection = (
    <div className="space-y-3">
      {formData.keywordPairs?.map((pair: any, index: number) => (
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
                  setFormData((prev: any) => ({ ...prev, keywordPairs: newPairs }));
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
                setFormData((prev: any) => ({ ...prev, keywordPairs: newPairs }));
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
                    setFormData((prev: any) => ({ ...prev, keywordPairs: newPairs }));
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
            setFormData((prev: any) => ({ ...prev, keywordPairs: newPairs }));
          }}
          className="col-span-2"
        >
          키워드 쌍 추가
        </Button>
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
    keywordSection: keywordSection,
  };
};