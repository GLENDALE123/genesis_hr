'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Label } from '@/shared/components/ui/label';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Button } from '@/shared/components/ui/button';
import { InputSelect } from '@/shared/components/common/InputSelect';
import { QualityInspection, WorkerInspectionData, DefectResultPair, SimpleDefectResultPair } from '../types';
import type { AutocompleteData } from '../services/autocompleteService';
import { useCommonFields } from './InspectionCommonForm';
import type { UseImageUploadReturn } from '@/shared/hooks';
import { PRODUCTION_LINE_OPTIONS } from '@/features/production/constants';

interface OutgoingInspectionFormProps {
  formData: Partial<QualityInspection>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<QualityInspection>>>;
  autocompleteData: AutocompleteData;
  imageUploadHook: UseImageUploadReturn;
  isViewMode?: boolean;
  isEditMode?: boolean;
}

export const OutgoingInspectionForm: React.FC<OutgoingInspectionFormProps> = ({
  formData,
  setFormData,
  autocompleteData,
  imageUploadHook,
  isViewMode = false,
  isEditMode = false
}) => {
  // 타입 가드 함수
  const isDefectResultPair = (pair: DefectResultPair | SimpleDefectResultPair): pair is DefectResultPair => {
    return 'defectKeyword' in pair;
  };
  // 파일 입력 refs
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);

  // 개별 필드들 가져오기
  const commonFields = useCommonFields(
    formData, 
    setFormData, 
    autocompleteData, 
    imageUploadHook,
    fileInputRef,
    cameraInputRef
  );

  // 불량키워드 & 검사결과 세트 추가/제거 함수들
  const addDefectResultPair = () => {
    const newPairs = [...(formData.defectResultPairs || []), { defectKeyword: '', inspectionResult: '양호', limitApprovalContent: '', limitApprovalDecisionMaker: '' }];
    setFormData((prev: Partial<QualityInspection>) => ({ ...prev, defectResultPairs: newPairs as DefectResultPair[] }));
  };

  const removeDefectResultPair = (index: number) => {
    const newPairs = [...(formData.defectResultPairs || [])];
    newPairs.splice(index, 1);
    setFormData((prev: Partial<QualityInspection>) => ({ ...prev, defectResultPairs: newPairs as DefectResultPair[] }));
  };

  const handleDefectResultPairChange = (index: number, field: string, value: string) => {
    const newPairs = [...(formData.defectResultPairs || [])];
    newPairs[index] = { ...newPairs[index], [field]: value };
    setFormData((prev: Partial<QualityInspection>) => ({ ...prev, defectResultPairs: newPairs as DefectResultPair[] }));
  };

  // 작업자 인원수 변경 핸들러
  const handleWorkerCountChange = (value: string) => {
    const count = parseInt(value) || 0;
    
    // 현재 작업자 배열
    const currentWorkers = formData.workers || [];
    
    // 새로운 작업자 배열 생성
    const newWorkers: WorkerInspectionData[] = [];
    
    for (let i = 0; i < count; i++) {
      if (i < currentWorkers.length) {
        // 기존 작업자 정보 유지
        newWorkers.push(currentWorkers[i]);
      } else {
        // 새로운 작업자 추가
        newWorkers.push({
          name: '',
          totalInspected: 0,
          defectQuantity: 0,
          result: '합격' as const,
          defectReasons: [],
          action: '',
          decisionMaker: '',
          directInputResult: ''
        });
      }
    }
    
    setFormData((prev: Partial<QualityInspection>) => ({ 
      ...prev, 
      workerCount: value,
      workers: newWorkers
    }));
  };

  // 작업자 추가/제거 함수들 (제거 예정) - 제거됨
  // const addWorker = () => { ... };
  // const removeWorker = (index: number) => { ... };

  const handleWorkerChange = (index: number, field: string, value: string | number) => {
    const newWorkers = [...(formData.workers || [])];
    newWorkers[index] = { ...newWorkers[index], [field]: value };
    setFormData((prev: Partial<QualityInspection>) => ({ ...prev, workers: newWorkers as WorkerInspectionData[] }));
  };

  const handleWorkerDefectReasonChange = (index: number, reason: string) => {
    const newWorkers = [...(formData.workers || [])];
    const currentReasons = newWorkers[index].defectReasons || [];
    const updatedReasons = currentReasons.includes(reason)
      ? currentReasons.filter((r: string) => r !== reason)
      : [...currentReasons, reason];
    newWorkers[index] = { ...newWorkers[index], defectReasons: updatedReasons };
    setFormData((prev: Partial<QualityInspection>) => ({ ...prev, workers: newWorkers as WorkerInspectionData[] }));
  };

  // 신뢰성 검토 변경 함수
  const handleReliabilityReviewChange = (field: string, value: string) => {
    setFormData((prev: Partial<QualityInspection>) => ({
      ...prev,
      reliabilityReview: {
        ...prev.reliabilityReview,
        [field]: value
      }
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">출하검사</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 기본 정보 - 4열 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {commonFields.inspectionDate}
          {commonFields.orderNumber}
          {commonFields.supplier}
          {commonFields.productName}
          {commonFields.partName}
          {commonFields.injectionMaterial}
          {commonFields.injectionColor}
          {commonFields.orderQuantity}
          {commonFields.specification}
          {commonFields.postProcess}
          {commonFields.injectionCompany}
          
          {/* 작업라인 */}
          <div className="space-y-2">
            <Label htmlFor="workLine">작업라인</Label>
            <Select 
              value={formData.workLine || ''} 
              onValueChange={(value) => setFormData((prev: Partial<QualityInspection>) => ({ ...prev, workLine: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="작업라인을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {PRODUCTION_LINE_OPTIONS.map((line) => (
                  <SelectItem key={line} value={line}>
                    {line}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 재검사 요청 정보 - 2열 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="reinspectionKeyword">재검사요청 키워드</Label>
            <InputSelect
              value={formData.reinspectionKeyword || ''}
              onChange={(value) => setFormData((prev: Partial<QualityInspection>) => ({ ...prev, reinspectionKeyword: value }))}
              options={['재검사', '품질확인', '불량확인', '재작업']}
              placeholder="재검사요청 키워드를 선택하세요"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reinspectionContent">재검사요청 내용</Label>
            <Textarea
              id="reinspectionContent"
              value={formData.reinspectionContent || ''}
              onChange={(e) => setFormData((prev: Partial<QualityInspection>) => ({ ...prev, reinspectionContent: e.target.value }))}
              placeholder="재검사요청 내용을 입력하세요"
              rows={3}
            />
          </div>
        </div>

        {/* 불량키워드 & 검사결과 세트 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">불량키워드 & 검사결과</h3>
          </div>
          {(formData.defectResultPairs || [{ defectKeyword: '', inspectionResult: '양호', limitApprovalContent: '', limitApprovalDecisionMaker: '' }]).map((pair, index: number) => {
            if (!isDefectResultPair(pair)) return null;
            return (
            <div key={index} className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-900/50 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">세트 {index + 1}</h4>
                {(formData.defectResultPairs?.length || 1) > 1 && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => removeDefectResultPair(index)}
                  >
                    -
                  </Button>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>불량키워드</Label>
                  <InputSelect
                    value={pair.defectKeyword}
                    onChange={(value) => handleDefectResultPairChange(index, 'defectKeyword', value)}
                    options={['가스', '기름', '기포', '기능불량', '내부코팅', '미성형', '미증착', '변형', '색상차이', '수축', '스크레치', '웰드', '과열', '찍힘', '침식', '크랙', '흑점', 'wetting']}
                    placeholder="불량키워드를 선택하세요"
                  />
                </div>
                <div className="space-y-2">
                  <Label>검사결과</Label>
                  <Select value={pair.inspectionResult} onValueChange={(value) => handleDefectResultPairChange(index, 'inspectionResult', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="검사결과를 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="양호">양호</SelectItem>
                      <SelectItem value="한도승인">한도승인</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {pair.inspectionResult === '한도승인' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>한도승인 내용</Label>
                    <Textarea
                      value={pair.limitApprovalContent}
                      onChange={(e) => handleDefectResultPairChange(index, 'limitApprovalContent', e.target.value)}
                      placeholder="한도승인 내용을 입력하세요"
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>한도결정자</Label>
                    <InputSelect
                      value={pair.limitApprovalDecisionMaker}
                      onChange={(value) => handleDefectResultPairChange(index, 'limitApprovalDecisionMaker', value)}
                      options={['김민현', '김영권', '김을한', '김재식', '배영길', '이동엽', '이현석', '전진표', '최유림', '최한수', '한상태', '한태경']}
                      placeholder="한도결정자를 선택하세요"
                    />
                  </div>
                </div>
              )}
            </div>
            );
          })}
          
          <Button
            type="button"
            variant="outline"
            onClick={addDefectResultPair}
            className="w-full"
          >
            + 불량키워드 & 검사결과 세트 추가
          </Button>
        </div>

        {/* 이미지 첨부 */}
        {commonFields.imageSection}

        {/* 작업자 인원수 */}
        <div className="pt-4 border-t">
          <div className="space-y-2">
            <Label htmlFor="workerCount">작업자 인원수</Label>
            <Input
              id="workerCount"
              type="number"
              min="0"
              value={formData.workerCount || ''}
              onChange={(e) => handleWorkerCountChange(e.target.value)}
              placeholder="작업자 인원수를 입력하세요"
            />
          </div>
        </div>

        {/* 작업자 정보 */}
        {(formData.workers || []).map((worker: WorkerInspectionData, index: number) => (
          <div key={index} className="p-4 border rounded-lg space-y-4 bg-slate-50 dark:bg-slate-900/50">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">작업자 {index + 1}</h4>
              {/* 개별 작업자 제거 버튼 제거 */}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>이름</Label>
                <InputSelect
                  value={worker.name}
                  onChange={(value) => handleWorkerChange(index, 'name', value)}
                  options={['김민현', '김영권', '김을한', '김재식', '배영길', '이동엽', '이현석', '전진표', '최유림', '최한수', '한상태', '한태경']}
                  placeholder="이름을 선택하세요"
                />
              </div>
              <div className="space-y-2">
                <Label>총 검사 수량</Label>
                <Input
                  value={worker.totalInspected?.toLocaleString() ?? '0'}
                  onChange={(e) => handleWorkerChange(index, 'totalInspected', parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0)}
                  placeholder="총 검사 수량"
                />
              </div>
              <div className="space-y-2">
                <Label>불량 수량</Label>
                <Input
                  value={worker.defectQuantity?.toLocaleString() ?? '0'}
                  onChange={(e) => handleWorkerChange(index, 'defectQuantity', parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0)}
                  placeholder="불량 수량"
                />
              </div>
              <div className="space-y-2">
                <Label>결과</Label>
                <Select value={worker.result} onValueChange={(value) => handleWorkerChange(index, 'result', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="결과를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="합격">합격</SelectItem>
                    <SelectItem value="불합격">불합격</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {worker.result === '불합격' && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-md space-y-4">
                <div className="space-y-2">
                  <Label>불합격 사유 (복수 선택 가능)</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {['선별미흡', '지문자국', '취급불량', '조건불량'].map(reason => (
                      <label key={reason} className="flex items-center space-x-2 text-sm">
                        <input 
                          type="checkbox" 
                          checked={worker.defectReasons?.includes(reason)} 
                          onChange={() => handleWorkerDefectReasonChange(index, reason)} 
                        />
                        <span>{reason}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>처리</Label>
                    <Input
                      value={worker.action || ''}
                      onChange={(e) => handleWorkerChange(index, 'action', e.target.value)}
                      placeholder="처리 내용"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>결정자</Label>
                    <InputSelect
                      value={worker.decisionMaker || ''}
                      onChange={(value) => handleWorkerChange(index, 'decisionMaker', value)}
                      options={['김민현', '김영권', '김을한', '김재식', '배영길', '이동엽', '이현석', '전진표', '최유림', '최한수', '한상태', '한태경']}
                      placeholder="결정자를 선택하세요"
                    />
                  </div>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>직접 입력 결과</Label>
              <Textarea
                value={worker.directInputResult}
                onChange={(e) => handleWorkerChange(index, 'directInputResult', e.target.value)}
                placeholder="직접 입력 결과를 입력하세요"
                rows={3}
              />
            </div>
          </div>
        ))}

        {/* 작업자 추가 버튼 제거 */}

        {/* 신뢰성 검토 */}
        <div className="pt-4 border-t">
          <h4 className="font-semibold mb-4">신뢰성 검토</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>방식</Label>
              <Select value={formData.reliabilityReview?.method || ''} onValueChange={(value) => handleReliabilityReviewChange('method', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="방식을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="투명테이프">투명테이프</SelectItem>
                  <SelectItem value="616테이프">616테이프</SelectItem>
                  <SelectItem value="AP방식테스트">AP방식테스트</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>결과</Label>
              <Select value={formData.reliabilityReview?.result || ''} onValueChange={(value) => handleReliabilityReviewChange('result', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="결과를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="양호">양호</SelectItem>
                  <SelectItem value="부분박리">부분박리</SelectItem>
                  <SelectItem value="박리">박리</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(formData.reliabilityReview?.result === '부분박리' || formData.reliabilityReview?.result === '박리') && (
              <>
                <div className="space-y-2">
                  <Label>처리</Label>
                  <Input
                    value={formData.reliabilityReview?.action || ''}
                    onChange={(e) => handleReliabilityReviewChange('action', e.target.value)}
                    placeholder="처리 내용"
                  />
                </div>
                <div className="space-y-2">
                  <Label>결정자</Label>
                  <InputSelect
                    value={formData.reliabilityReview?.decisionMaker || ''}
                    onChange={(value) => handleReliabilityReviewChange('decisionMaker', value)}
                    options={['김민현', '김영권', '김을한', '김재식', '배영길', '이동엽', '이현석', '전진표', '최유림', '최한수', '한상태', '한태경']}
                    placeholder="결정자를 선택하세요"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
