'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Label } from '@/shared/components/ui/label';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Button } from '@/shared/components/ui/button';
import { InputSelect } from '@/shared/components/common/InputSelect';
import type { AutocompleteData } from '../services/autocompleteService';
import { useCommonFields, UseImageUploadReturn } from './InspectionCommonForm';
import { QualityInspection, KeywordPair, ProcessLineData, TestResultDetail } from '../types';

interface ProcessInspectionFormProps {
  formData: Partial<QualityInspection>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<QualityInspection>>>;
  autocompleteData: AutocompleteData;
  imageUploadHook: UseImageUploadReturn;
  isViewMode?: boolean;
  isEditMode?: boolean;
}

export const ProcessInspectionForm: React.FC<ProcessInspectionFormProps> = ({
  formData,
  setFormData,
  autocompleteData,
  imageUploadHook,
  isViewMode = false,
  isEditMode = false
}) => {
  // TestResultDetail 타입 가드 함수
  const isTestResultDetail = (value: string | TestResultDetail | undefined): value is TestResultDetail => {
    return typeof value === 'object' && value !== null;
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">공정검사</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 기본 정보 - HS-Jig와 동일한 4열 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {commonFields.inspectionDate}
          {commonFields.orderNumber}
          {commonFields.supplier}
          {commonFields.productName}
          {commonFields.partName}
          {commonFields.injectionMaterial}
          {commonFields.injectionColor}
          {commonFields.orderQuantity}
        </div>

        {/* 사양, 후공정, 사출처, 사용지그-1, 사용지그-2 - 5열 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {commonFields.specification}
          {commonFields.postProcess}
          {commonFields.injectionCompany}
          
          <div className="space-y-2">
            <Label htmlFor="jigUsed1">사용지그-1</Label>
            <div className="relative">
              <Input
                id="jigUsed1"
                value={formData.jigUsed1 || ''}
                onChange={(e) => setFormData((prev: Partial<QualityInspection>) => ({ ...prev, jigUsed1: e.target.value }))}
                placeholder="사용지그-1을 입력하세요"
                className="pr-12"
              />
              <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-500 dark:text-slate-400">번지그</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="jigUsed2">사용지그-2</Label>
            <Select value={formData.jigUsed2 || ''} onValueChange={(value) => setFormData((prev: Partial<QualityInspection>) => ({ ...prev, jigUsed2: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="사용지그-2를 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="외주지그">외주지그</SelectItem>
                <SelectItem value="지그번호없음">지그번호없음</SelectItem>
                <SelectItem value="테이프지그(소)">테이프지그(소)</SelectItem>
                <SelectItem value="테이프지그(중)">테이프지그(중)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 내부지그 및 기타 필드 - HS-Jig와 동일한 4열 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="internalJigLower">내부코팅 사용지그 (하측지그)</Label>
            <div className="relative">
              <Input
                id="internalJigLower"
                value={formData.internalJigLower || ''}
                onChange={(e) => setFormData((prev: Partial<QualityInspection>) => ({ ...prev, internalJigLower: e.target.value }))}
                placeholder="내부코팅 사용지그 (하측지그)를 입력하세요"
                className="pr-12"
              />
              <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-500 dark:text-slate-400">번지그</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="internalJigUpper">내부코팅 사용지그 (상측지그)</Label>
            <div className="relative">
              <Input
                id="internalJigUpper"
                value={formData.internalJigUpper || ''}
                onChange={(e) => setFormData((prev: Partial<QualityInspection>) => ({ ...prev, internalJigUpper: e.target.value }))}
                placeholder="내부코팅 사용지그 (상측지그)를 입력하세요"
                className="pr-12"
              />
              <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-500 dark:text-slate-400">번지그</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>드라이기사용</Label>
            <div className="flex items-center space-x-4 h-10 bg-slate-50 dark:bg-slate-700/50 p-2 rounded-md">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="dryerUsed" 
                  value="사용" 
                  checked={formData.dryerUsed === '사용'} 
                  onChange={(e) => setFormData((prev: Partial<QualityInspection>) => ({ ...prev, dryerUsed: e.target.value as '사용' | '미사용' | '' }))} 
                  className="form-radio text-primary-600 focus:ring-primary-500 bg-transparent" 
                />
                <span>사용</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="dryerUsed" 
                  value="미사용" 
                  checked={formData.dryerUsed === '미사용'} 
                  onChange={(e) => setFormData((prev: Partial<QualityInspection>) => ({ ...prev, dryerUsed: e.target.value as '사용' | '미사용' | '' }))} 
                  className="form-radio text-primary-600 focus:ring-primary-500 bg-transparent" 
                />
                <span>미사용</span>
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <Label>화염처리진행</Label>
            <div className="flex items-center space-x-4 h-10 bg-slate-50 dark:bg-slate-700/50 p-2 rounded-md">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="flameTreatment" 
                  value="사용" 
                  checked={formData.flameTreatment === '사용'} 
                  onChange={(e) => setFormData((prev: Partial<QualityInspection>) => ({ ...prev, flameTreatment: e.target.value as '사용' | '미사용' | '' }))} 
                  className="form-radio text-primary-600 focus:ring-primary-500 bg-transparent" 
                />
                <span>사용</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="flameTreatment" 
                  value="미사용" 
                  checked={formData.flameTreatment === '미사용'} 
                  onChange={(e) => setFormData((prev: Partial<QualityInspection>) => ({ ...prev, flameTreatment: e.target.value as '사용' | '미사용' | '' }))} 
                  className="form-radio text-primary-600 focus:ring-primary-500 bg-transparent" 
                />
                <span>미사용</span>
              </label>
            </div>
          </div>
        </div>

        {/* 공정/불량 키워드 */}
        <div className="space-y-2">
          <Label>공정/불량 키워드</Label>
          <div className="space-y-3">
            {(formData.keywordPairs || [{ process: '', defect: '' }]).map((pair: KeywordPair, index: number) => (
              <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                <InputSelect
                  value={pair.process}
                  onChange={(value) => {
                    const newPairs = [...(formData.keywordPairs || [])];
                    newPairs[index] = { ...newPairs[index], process: value };
                    setFormData((prev: Partial<QualityInspection>) => ({ ...prev, keywordPairs: newPairs }));
                  }}
                  options={['DP', '내부코팅', '박', '사출', '인쇄', '조립', '증착', '코팅']}
                  placeholder="공정 키워드"
                />
                <InputSelect
                  value={pair.defect}
                  onChange={(value) => {
                    const newPairs = [...(formData.keywordPairs || [])];
                    newPairs[index] = { ...newPairs[index], defect: value };
                    setFormData((prev: Partial<QualityInspection>) => ({ ...prev, keywordPairs: newPairs }));
                  }}
                  options={['가스', '기름', '기포', '기능불량', '내부코팅', '미성형', '미증착', '변형', '색상차이', '수축', '스크레치', '웰드', '과열', '찍힘', '침식', '크랙', '흑점', 'wetting']}
                  placeholder="불량 키워드"
                />
                {(formData.keywordPairs?.length || 1) > 1 ? (
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
                    -
                  </Button>
                ) : <div className="w-10"></div>}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const newPairs = [...(formData.keywordPairs || []), { process: '', defect: '' }];
                setFormData((prev: Partial<QualityInspection>) => ({ ...prev, keywordPairs: newPairs }));
              }}
              className="w-full"
            >
              키워드 쌍 추가
            </Button>
          </div>
        </div>

        {/* 라인 정보 - HS-Jig와 동일한 구조 */}
        <div className="space-y-4">
          {(formData.processLines || [{ workLine: '', lineSpeed: '', lineConditions: [{ type: '하도' as const, value: 0 }, { type: '상도' as const, value: 0 }], lampUsage: [] }]).map((line: ProcessLineData, lineIndex: number) => (
            <div key={lineIndex} className="p-4 border dark:border-slate-700 rounded-lg space-y-4 bg-slate-50 dark:bg-slate-900/50 relative">
              {(formData.processLines?.length || 1) > 1 && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full text-xs"
                  onClick={() => {
                    const newLines = [...(formData.processLines || [])];
                    newLines.splice(lineIndex, 1);
                    setFormData((prev: Partial<QualityInspection>) => ({ ...prev, processLines: newLines }));
                  }}
                >
                  ×
                </Button>
              )}
              <div className="grid grid-cols-1 lg:grid-cols-6 gap-5 items-start">
                <div className="space-y-2 lg:col-span-1">
                  <Label>작업라인</Label>
                  <Select value={line.workLine || ''} onValueChange={(value) => {
                    const newLines = [...(formData.processLines || [])];
                    newLines[lineIndex] = { ...newLines[lineIndex], workLine: value };
                    setFormData((prev: Partial<QualityInspection>) => ({ ...prev, processLines: newLines }));
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="작업라인을 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1코팅">1코팅</SelectItem>
                      <SelectItem value="2코팅">2코팅</SelectItem>
                      <SelectItem value="내부코팅1호기">내부코팅1호기</SelectItem>
                      <SelectItem value="내부코팅2호기">내부코팅2호기</SelectItem>
                      <SelectItem value="내부코팅3호기">내부코팅3호기</SelectItem>
                      <SelectItem value="증착1">증착1</SelectItem>
                      <SelectItem value="증착1상도">증착1상도</SelectItem>
                      <SelectItem value="증착1하도">증착1하도</SelectItem>
                      <SelectItem value="증착2">증착2</SelectItem>
                      <SelectItem value="증착2상도">증착2상도</SelectItem>
                      <SelectItem value="증착2하도">증착2하도</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 lg:col-span-1">
                  <Label>라인속도</Label>
                  <div className="relative">
                    <Input
                      value={line.lineSpeed || ''}
                      onChange={(e) => {
                        const newLines = [...(formData.processLines || [])];
                        newLines[lineIndex] = { ...newLines[lineIndex], lineSpeed: e.target.value };
                        setFormData((prev: Partial<QualityInspection>) => ({ ...prev, processLines: newLines }));
                      }}
                      placeholder="라인속도를 입력하세요"
                      className="pr-12"
                    />
                    <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-500 dark:text-slate-400">rpm</span>
                  </div>
                </div>
                <div className="space-y-2 lg:col-span-2">
                  <Label>라인조건(I.R)</Label>
                  <div className="space-y-2">
                    {(line.lineConditions || []).map((condition: { type: '하도' | '상도'; value: number }, condIndex: number) => (
                      <div key={condIndex} className="flex items-center gap-2">
                        <span className="font-semibold w-12 text-center flex-shrink-0">{condition.type}</span>
                        <div className="relative flex-grow">
                          <Input
                            type="number"
                            step="0.1"
                            value={condition.value || ''}
                            onChange={(e) => {
                              const newLines = [...(formData.processLines || [])];
                              if (!newLines[lineIndex].lineConditions) newLines[lineIndex].lineConditions = [];
                              newLines[lineIndex].lineConditions[condIndex] = { 
                                ...newLines[lineIndex].lineConditions[condIndex], 
                                value: parseFloat(e.target.value) || 0 
                              };
                              setFormData((prev: Partial<QualityInspection>) => ({ ...prev, processLines: newLines }));
                            }}
                            placeholder="온도를 입력하세요"
                            className="[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                          />
                          <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-500 dark:text-slate-400">℃</span>
                        </div>
                        {(line.lineConditions?.length || 0) > 2 && (
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              const newLines = [...(formData.processLines || [])];
                              if (newLines[lineIndex].lineConditions) {
                                newLines[lineIndex].lineConditions.splice(condIndex, 1);
                              }
                              setFormData((prev: Partial<QualityInspection>) => ({ ...prev, processLines: newLines }));
                            }}
                          >
                            ×
                          </Button>
                        )}
                      </div>
                    ))}
                    <div className="flex gap-2 pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newLines = [...(formData.processLines || [])];
                          if (!newLines[lineIndex].lineConditions) newLines[lineIndex].lineConditions = [];
                          newLines[lineIndex].lineConditions.push({ type: '하도' as const, value: 0 });
                          setFormData((prev: Partial<QualityInspection>) => ({ ...prev, processLines: newLines }));
                        }}
                        className="flex-1"
                      >
                        하도 추가
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newLines = [...(formData.processLines || [])];
                          if (!newLines[lineIndex].lineConditions) newLines[lineIndex].lineConditions = [];
                          newLines[lineIndex].lineConditions.push({ type: '상도' as const, value: 0 });
                          setFormData((prev: Partial<QualityInspection>) => ({ ...prev, processLines: newLines }));
                        }}
                        className="flex-1"
                      >
                        상도 추가
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="space-y-2 lg:col-span-2">
                  <Label>램프사용</Label>
                  <div className="grid grid-cols-4 gap-2 p-2 bg-slate-50 dark:bg-slate-900/50 rounded-md justify-items-center">
                    {Array.from({length: 8}, (_, i) => i + 1).map(num => {
                      const isChecked = (line.lampUsage || []).includes(num);
                      return (
                        <label 
                          key={num} 
                          className={`flex items-center justify-center w-10 h-10 rounded-full cursor-pointer transition-colors border-2 ${
                            isChecked 
                              ? 'bg-primary-600 text-white border-primary-600' 
                              : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:border-primary-400'
                          }`}
                          style={{
                            backgroundColor: isChecked ? 'rgb(37 99 235)' : undefined,
                            color: isChecked ? 'white' : undefined,
                            borderColor: isChecked ? 'rgb(37 99 235)' : undefined
                          }}
                        >
                          <input 
                            type="checkbox" 
                            checked={isChecked}
                            onChange={() => {
                              const newLines = [...(formData.processLines || [])];
                              if (!newLines[lineIndex].lampUsage) newLines[lineIndex].lampUsage = [];
                              const lampUsage = [...(newLines[lineIndex].lampUsage || [])];
                              const index = lampUsage.indexOf(num);
                              if (index > -1) {
                                lampUsage.splice(index, 1);
                              } else {
                                lampUsage.push(num);
                              }
                              newLines[lineIndex].lampUsage = lampUsage;
                              setFormData((prev: Partial<QualityInspection>) => ({ ...prev, processLines: newLines }));
                            }} 
                            className="sr-only"
                          />
                          <span className="text-sm font-medium">{num}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const newLines = [...(formData.processLines || []), { 
                workLine: '', 
                lineSpeed: '', 
                lineConditions: [{ type: '하도' as const, value: 0 }, { type: '상도' as const, value: 0 }], 
                lampUsage: [] 
              }];
              setFormData((prev: Partial<QualityInspection>) => ({ ...prev, processLines: newLines }));
            }}
            className="w-full"
          >
            라인 정보 세트 추가
          </Button>
        </div>

        {/* 이미지 첨부 */}
        {commonFields.imageSection}

        {/* 신뢰성 테스트 및 색상 체크 결과 - HS-Jig와 동일한 4열 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>신뢰성테스트결과</Label>
            <Select value={isTestResultDetail(formData.reliabilityTestResult) ? formData.reliabilityTestResult.result : (formData.reliabilityTestResult || '양호')} onValueChange={(value) => setFormData((prev: Partial<QualityInspection>) => ({ ...prev, reliabilityTestResult: isTestResultDetail(prev.reliabilityTestResult) ? { ...prev.reliabilityTestResult, result: value } : { result: value } }))}>
              <SelectTrigger>
                <SelectValue placeholder="신뢰성 테스트 결과를 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="양호">양호</SelectItem>
                <SelectItem value="부분박리">부분박리</SelectItem>
                <SelectItem value="박리">박리</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>색상체크결과</Label>
            <Select value={isTestResultDetail(formData.colorCheckResult) ? formData.colorCheckResult.result : (formData.colorCheckResult || '견본과 색상동일')} onValueChange={(value) => setFormData((prev: Partial<QualityInspection>) => ({ ...prev, colorCheckResult: isTestResultDetail(prev.colorCheckResult) ? { ...prev.colorCheckResult, result: value } : { result: value } }))}>
              <SelectTrigger>
                <SelectValue placeholder="색상 체크 결과를 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="견본과 색상동일">견본과 색상동일</SelectItem>
                <SelectItem value="색상편차발생">색상편차발생</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>사출포장</Label>
            <Input
              value={formData.packagingInfo || ''}
              onChange={(e) => setFormData((prev: Partial<QualityInspection>) => ({ ...prev, packagingInfo: e.target.value }))}
              placeholder="사출포장 정보를 입력하세요"
            />
          </div>

          <div className="space-y-2">
            <Label>후가공포장</Label>
            <Input
              value={formData.postProcessPackaging || ''}
              onChange={(e) => setFormData((prev: Partial<QualityInspection>) => ({ ...prev, postProcessPackaging: e.target.value }))}
              placeholder="후가공포장 정보를 입력하세요"
            />
          </div>
        </div>

        {/* 신뢰성 테스트 결과가 부분박리 또는 박리일 때 추가 필드 */}
        {((isTestResultDetail(formData.reliabilityTestResult) && (formData.reliabilityTestResult.result === '부분박리' || formData.reliabilityTestResult.result === '박리')) || 
          (!isTestResultDetail(formData.reliabilityTestResult) && (formData.reliabilityTestResult === '부분박리' || formData.reliabilityTestResult === '박리'))) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
            <div className="space-y-2">
              <Label>처리 결과 (신뢰성)</Label>
              <Input
                value={isTestResultDetail(formData.reliabilityTestResult) ? formData.reliabilityTestResult.action || '' : ''}
                onChange={(e) => setFormData((prev: Partial<QualityInspection>) => ({ ...prev, reliabilityTestResult: isTestResultDetail(prev.reliabilityTestResult) ? { ...prev.reliabilityTestResult, action: e.target.value } : { result: prev.reliabilityTestResult || '', action: e.target.value } }))}
                placeholder="처리 결과를 입력하세요"
              />
            </div>
            <div className="space-y-2">
              <Label>결정자 (신뢰성)</Label>
              <InputSelect
                value={isTestResultDetail(formData.reliabilityTestResult) ? formData.reliabilityTestResult.decisionMaker || '' : ''}
                onChange={(value) => setFormData((prev: Partial<QualityInspection>) => ({ ...prev, reliabilityTestResult: isTestResultDetail(prev.reliabilityTestResult) ? { ...prev.reliabilityTestResult, decisionMaker: value } : { result: prev.reliabilityTestResult || '', decisionMaker: value } }))}
                options={['김민현', '김영권', '김을한', '김재식', '배영길', '이동엽', '이현석', '전진표', '최유림', '최한수', '한상태', '한태경']}
                placeholder="결정자를 선택하세요"
              />
            </div>
          </div>
        )}

        {/* 색상 체크 결과가 색상편차발생일 때 추가 필드 */}
        {((isTestResultDetail(formData.colorCheckResult) && formData.colorCheckResult.result === '색상편차발생') || 
          (!isTestResultDetail(formData.colorCheckResult) && formData.colorCheckResult === '색상편차발생')) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
            <div className="space-y-2">
              <Label>처리 결과 (색상)</Label>
              <Input
                value={isTestResultDetail(formData.colorCheckResult) ? formData.colorCheckResult.action || '' : ''}
                onChange={(e) => setFormData((prev: Partial<QualityInspection>) => ({ ...prev, colorCheckResult: isTestResultDetail(prev.colorCheckResult) ? { ...prev.colorCheckResult, action: e.target.value } : { result: prev.colorCheckResult || '', action: e.target.value } }))}
                placeholder="처리 결과를 입력하세요"
              />
            </div>
            <div className="space-y-2">
              <Label>결정자 (색상)</Label>
              <InputSelect
                value={isTestResultDetail(formData.colorCheckResult) ? formData.colorCheckResult.decisionMaker || '' : ''}
                onChange={(value) => setFormData((prev: Partial<QualityInspection>) => ({ ...prev, colorCheckResult: isTestResultDetail(prev.colorCheckResult) ? { ...prev.colorCheckResult, decisionMaker: value } : { result: prev.colorCheckResult || '', decisionMaker: value } }))}
                options={['김민현', '김영권', '김을한', '김재식', '배영길', '이동엽', '이현석', '전진표', '최유림', '최한수', '한상태', '한태경']}
                placeholder="결정자를 선택하세요"
              />
            </div>
          </div>
        )}

        {/* 사전검사이력 및 공정검사이력 - HS-Jig와 동일한 전체 너비 */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>사전검사이력</Label>
            <Textarea
              value={formData.preInspectionHistory || ''}
              onChange={(e) => setFormData((prev: Partial<QualityInspection>) => ({ ...prev, preInspectionHistory: e.target.value }))}
              placeholder="사전검사이력을 입력하세요"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>공정검사이력</Label>
            <Textarea
              value={formData.inProcessInspectionHistory || ''}
              onChange={(e) => setFormData((prev: Partial<QualityInspection>) => ({ ...prev, inProcessInspectionHistory: e.target.value }))}
              placeholder="공정검사이력을 입력하세요"
              rows={3}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};