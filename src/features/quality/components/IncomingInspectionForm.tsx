'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Label } from '@/shared/components/ui/label';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Separator } from '@/shared/components/ui/separator';
import { Button } from '@/shared/components/ui/button';
import { InputSelect } from '@/shared/components/common/InputSelect';
import { InspectionResult } from '../types';
import type { AutocompleteData } from '../services/autocompleteService';
import { InspectionCommonForm, useCommonFields } from './InspectionCommonForm';
import { useOrderNumberFormatter } from '@/shared/hooks/useOrderNumberFormatter';

interface IncomingInspectionFormProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  autocompleteData: AutocompleteData;
  imagePreviews: string[];
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeImage: (index: number) => void;
}

export const IncomingInspectionForm: React.FC<IncomingInspectionFormProps> = ({
  formData,
  setFormData,
  autocompleteData,
  imagePreviews,
  handleImageUpload,
  removeImage
}) => {
  // 파일 입력 refs
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);

  // 발주번호 포맷터 훅
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

  // 개별 필드들 가져오기
  const commonFields = useCommonFields(
    formData, 
    setFormData, 
    autocompleteData, 
    handleOrderNumberChange,
    imagePreviews,
    handleImageUpload,
    removeImage,
    fileInputRef,
    cameraInputRef
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">수입검사</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 기본 정보 - 자유로운 배치 */}
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {commonFields.inspectionDate}
            {commonFields.orderNumber}
            {commonFields.supplier}
            {commonFields.productName}
            {commonFields.partName}
            {commonFields.orderQuantity}
            {commonFields.injectionMaterial}
            {commonFields.injectionColor}
            {commonFields.specification}
            {commonFields.postProcess}
            {commonFields.injectionCompany}
            
            {/* 사출포장 필드 - 사출처 바로 다음에 배치 */}
            {commonFields.packagingInfo}
          </div>
        </div>


        {/* 공정/불량 키워드 */}
        {commonFields.keywordSection}

        {/* 수입검사 정보 */}
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-2">
              <Label htmlFor="appearanceHistory">외관검사이력</Label>
              <Textarea
                id="appearanceHistory"
                value={formData.appearanceHistory}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, appearanceHistory: e.target.value }))}
                placeholder="외관검사이력을 입력하세요"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="functionHistory">기능검사이력</Label>
              <Textarea
                id="functionHistory"
                value={formData.functionHistory}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, functionHistory: e.target.value }))}
                placeholder="기능검사이력을 입력하세요"
                rows={3}
              />
            </div>
          </div>

          {/* 이미지 첨부 */}
          {commonFields.imageSection}

          {/* 구분선 */}
          <Separator className="my-4" />
          
          {/* 중간 - 결과, 최종협의(소속), 최종협의(이름), 최종협의(직급) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div className="space-y-2">
              <Label htmlFor="result">검사결과</Label>
              <Select value={formData.result} onValueChange={(value) => setFormData((prev: any) => ({ ...prev, result: value as InspectionResult }))}>
                <SelectTrigger>
                  <SelectValue placeholder="검사결과를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="반출">반출</SelectItem>
                  <SelectItem value="불합격">불합격</SelectItem>
                  <SelectItem value="한도대기">한도대기</SelectItem>
                  <SelectItem value="한도승인">한도승인</SelectItem>
                  <SelectItem value="합격">합격</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="finalConsultationDept">최종협의(소속)</Label>
              <Select value={formData.finalConsultationDept} onValueChange={(value) => setFormData((prev: any) => ({ ...prev, finalConsultationDept: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="소속을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="군포">군포</SelectItem>
                  <SelectItem value="군포품질">군포품질</SelectItem>
                  <SelectItem value="사출실">사출실</SelectItem>
                  <SelectItem value="생산관리">생산관리</SelectItem>
                  <SelectItem value="안양">안양</SelectItem>
                  <SelectItem value="안양품질">안양품질</SelectItem>
                  <SelectItem value="영업부">영업부</SelectItem>
                  <SelectItem value="임원">임원</SelectItem>
                  <SelectItem value="인쇄실">인쇄실</SelectItem>
                  <SelectItem value="조립실">조립실</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="finalConsultationName">최종협의(이름)</Label>
              <InputSelect
                value={formData.finalConsultationName || ''}
                onChange={(value) => setFormData((prev: any) => ({ ...prev, finalConsultationName: value }))}
                options={[
                  '김민현', '김영권', '김을한', '김재식', '배영길', '이동엽',
                  '이현석', '전진표', '최유림', '최한수', '한상태', '한태경'
                ]}
                placeholder="이름을 입력하거나 선택하세요"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="finalConsultationRank">최종협의(직급)</Label>
              <InputSelect
                value={formData.finalConsultationRank || ''}
                onChange={(value) => setFormData((prev: any) => ({ ...prev, finalConsultationRank: value }))}
                options={[
                  '과장', '대리', '본부장', '부사장', '상무', '이사', '전무', '팀장'
                ]}
                placeholder="직급을 입력하거나 선택하세요"
              />
            </div>
          </div>

          {/* 최하단 - 결과사유 */}
          {formData.result && !['합격', '한도승인'].includes(formData.result) && (
            <div className="space-y-2">
              <Label htmlFor="resultReason">결과사유(필수)</Label>
              <Textarea
                id="resultReason"
                value={formData.resultReason}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, resultReason: e.target.value }))}
                placeholder="결과사유를 입력하세요"
                rows={3}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
