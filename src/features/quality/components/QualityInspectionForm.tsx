'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { InputSelect } from '@/shared/components/common/InputSelect';
import { QualityInspection, InspectionType, InspectionResult } from '../types';
import { INSPECTION_RESULTS, INSPECTION_TYPE_LABELS, INSPECTION_RESULT_COLORS } from '../constants';
import { subscribeToAutocompleteData, updateAutocompleteData, AutocompleteData } from '../services/autocompleteService';
import { InspectionCommonForm } from './InspectionCommonForm';
import { IncomingInspectionForm } from './IncomingInspectionForm';
import { useAuthStore } from '@/features/auth/store/authStore';
import { getUserDisplayName } from '@/shared/utils/userUtils';
import '../utils/migrationTool'; // 마이그레이션 도구 로드
import { cn } from '@/shared/lib/utils';
import { getCollectionRef } from '../services/qualityInspectionService';
import { onSnapshot, limit } from 'firebase/firestore';

interface QualityInspectionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (inspection: Omit<QualityInspection, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

// HS-Jig 타입 정의들
interface TestResultDetail {
  result: string;
  action?: string;
  decisionMaker?: string;
}


interface ReliabilityReview {
  method: '투명테이프' | '616테이프' | 'AP방식테스트' | '';
  result: '양호' | '부분박리' | '박리' | '';
  action?: string;
  decisionMaker?: string;
}

interface ProcessLineData {
  workLine?: string;
  lineSpeed?: string;
  lineConditions?: { type: '하도' | '상도'; value: string }[];
  lampUsage?: number[];
}

interface KeywordPair {
  process: string;
  defect: string;
}

interface WorkerInspectionData {
  name: string;
  totalInspected: number;
  defectQuantity: number;
  result: '합격' | '불합격';
  defectReasons: string[];
  directInputResult: string;
  action: string;
  decisionMaker: string;
}

// 기본 옵션들 (HS-Jig와 동일)
const injectionColorOptions = ['검정', '백색', '원색', '잡색', '투명'];

/**
 * 품질검사 작성 폼 컴포넌트
 * HS-Jig의 실제 구조를 완전히 반영
 */
export const QualityInspectionForm: React.FC<QualityInspectionFormProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  const { user, userProfile } = useAuthStore();
  const [activeTab, setActiveTab] = useState<InspectionType>('incoming');
  const [isSaving, setIsSaving] = useState(false);
  const [autocompleteData, setAutocompleteData] = useState<AutocompleteData>({
    suppliers: [],
    productNames: [],
    partNames: [],
    injectionColors: [],
    specifications: [],
    injectionCompanies: [],
    lastUpdated: ''
  });
  
  // 이미지 관련 상태
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  // 폼 상태 - HS-Jig 구조 완전 반영
  const [formData, setFormData] = useState({
    // 공통 필드
    orderNumber: 'T',
    supplier: '',
    productName: '',
    partName: '',
    orderQuantity: '',
    injectionMaterial: '',
    injectionColor: '',
    specification: '',
    postProcess: '',
    injectionCompany: '',
    inspector: getUserDisplayName(userProfile || user, ''),
    inspectionDate: new Date().toISOString().split('T')[0],
    imageUrls: [] as string[],
    
    // 수입검사 필드
    packagingInfo: '',
    appearanceHistory: '',
    functionHistory: '',
    result: '합격' as InspectionResult,
    resultReason: '',
    finalConsultationDept: '',
    finalConsultationName: '',
    finalConsultationRank: '',
    
    // 공정검사 필드
    jigUsed1: '',
    jigUsed2: '',
    internalJigLower: '',
    internalJigUpper: '',
    dryerUsed: '미사용' as '사용' | '미사용' | '',
    flameTreatment: '미사용' as '사용' | '미사용' | '',
    processLines: [{ workLine: '', lineSpeed: '', lineConditions: [{ type: '하도' as const, value: '' }, { type: '상도' as const, value: '' }], lampUsage: [] }] as ProcessLineData[],
    reliabilityTestResult: { result: '양호', action: '', decisionMaker: '' } as TestResultDetail,
    colorCheckResult: { result: '견본과 색상동일', action: '', decisionMaker: '' } as TestResultDetail,
    injectionPackaging: '',
    postProcessPackaging: '',
    preInspectionHistory: '',
    inProcessInspectionHistory: '',
    keywordPairs: [{ process: '', defect: '' }] as KeywordPair[],
    
    // 출하검사 필드
    workerCount: '1',
    workers: [{ name: '', totalInspected: 0, defectQuantity: 0, result: '합격' as '합격' | '불합격', defectReasons: [], directInputResult: '', action: '', decisionMaker: '' }] as WorkerInspectionData[],
    reliabilityReview: { method: '' as ReliabilityReview['method'], result: '양호' as ReliabilityReview['result'], action: '', decisionMaker: '' } as ReliabilityReview,
    reinspectionKeyword: '',
    reinspectionContent: ''
  });

  // 임시저장 키 생성
  const getTempSaveKey = () => `temp_${activeTab}_inspection_anonymous`;
  
  // 임시저장 데이터 저장
  const saveTempData = useCallback((data: Record<string, unknown>) => {
    try {
      localStorage.setItem(getTempSaveKey(), JSON.stringify(data));
    } catch (error) {
      console.error('임시저장 데이터 저장 실패:', error);
    }
  }, [activeTab]);
  
  // 임시저장 데이터 삭제
  const clearTempData = () => {
    try {
      localStorage.removeItem(getTempSaveKey());
    } catch (error) {
      console.error('임시저장 데이터 삭제 실패:', error);
    }
  };

  // 자동 임시저장을 위한 디바운스 타이머
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // autocompleteData 구독
  useEffect(() => {
    const unsubscribe = subscribeToAutocompleteData((data) => {
      if (data) {
        setAutocompleteData({
          suppliers: data.suppliers || [],
          productNames: data.productNames || [],
          partNames: data.partNames || [],
          injectionColors: data.injectionColors || [],
          specifications: data.specifications || [],
          injectionCompanies: data.injectionCompanies || [],
          lastUpdated: data.lastUpdated || ''
        });
      } else {
        // 데이터가 없는 경우 기본값 사용
        setAutocompleteData({
          suppliers: [],
          productNames: [],
          partNames: [],
          injectionColors: injectionColorOptions, // 기본 색상 옵션 사용
          specifications: [],
          injectionCompanies: [],
          lastUpdated: ''
        });
      }
    });

    return () => unsubscribe();
  }, []);
  
  // formData 변경시 자동 임시저장
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      saveTempData(formData);
    }, 1000); // 1초 후 저장
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [formData, saveTempData]);

  // 이미지 처리 함수들
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const result = event.target?.result as string;
          setImagePreviews(prev => [...prev, result]);
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const removeImage = (index: number) => {
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };


  // 키워드 페어 관리
  const handleKeywordPairChange = (index: number, field: 'process' | 'defect', value: string) => {
    setFormData(prev => {
      const newKeywordPairs = [...prev.keywordPairs];
      newKeywordPairs[index] = { ...newKeywordPairs[index], [field]: value };
      return { ...prev, keywordPairs: newKeywordPairs };
    });
  };

  const addKeywordPair = () => {
    setFormData(prev => ({ ...prev, keywordPairs: [...prev.keywordPairs, { process: '', defect: '' }] }));
  };

  const removeKeywordPair = (index: number) => {
    setFormData(prev => ({ ...prev, keywordPairs: prev.keywordPairs.filter((_, i) => i !== index) }));
  };

  // 공정라인 관리
  const handleProcessLineChange = (lineIndex: number, field: 'workLine' | 'lineSpeed', value: string) => {
    const newProcessLines = [...formData.processLines];
    if (field === 'lineSpeed') {
      newProcessLines[lineIndex][field] = value.replace(/[^0-9]/g, '');
    } else {
      newProcessLines[lineIndex][field] = value;
    }
    setFormData(prev => ({ ...prev, processLines: newProcessLines }));
  };

  const handleLineConditionChange = (lineIndex: number, condIndex: number, value: string) => {
    const newProcessLines = [...formData.processLines];
    const newLineConditions = [...(newProcessLines[lineIndex].lineConditions || [])];
    newLineConditions[condIndex].value = value;
    newProcessLines[lineIndex].lineConditions = newLineConditions;
    setFormData(prev => ({ ...prev, processLines: newProcessLines }));
  };
  
  const addLineCondition = (lineIndex: number, type: '하도' | '상도') => {
    const newProcessLines = [...formData.processLines];
    const lineConditions = [...(newProcessLines[lineIndex].lineConditions || [])];
    if (lineConditions.length < 4) {
      lineConditions.push({ type, value: '' });
      newProcessLines[lineIndex].lineConditions = lineConditions;
      setFormData(prev => ({ ...prev, processLines: newProcessLines }));
    }
  };
  
  const removeLineCondition = (lineIndex: number, condIndex: number) => {
    const newProcessLines = [...formData.processLines];
    const lineConditions = (newProcessLines[lineIndex].lineConditions || []).filter((_, i) => i !== condIndex);
    newProcessLines[lineIndex].lineConditions = lineConditions;
    setFormData(prev => ({ ...prev, processLines: newProcessLines }));
  };
  
  const handleLampUsageChange = (lineIndex: number, lampNumber: number) => {
    setFormData(prev => {
      const newProcessLines = [...prev.processLines];
      const currentUsage = newProcessLines[lineIndex].lampUsage || [];
      const newUsage = currentUsage.includes(lampNumber)
        ? currentUsage.filter(n => n !== lampNumber)
        : [...currentUsage, lampNumber];
      newProcessLines[lineIndex].lampUsage = newUsage.sort((a, b) => a - b);
      return { ...prev, processLines: newProcessLines };
    });
  };
  
  const addProcessLine = () => {
    setFormData(prev => ({
      ...prev,
      processLines: [
        ...prev.processLines,
        { workLine: '', lineSpeed: '', lineConditions: [{ type: '하도', value: '' }, { type: '상도', value: '' }], lampUsage: [] }
      ]
    }));
  };
  
  const removeProcessLine = (lineIndex: number) => {
    setFormData(prev => ({
      ...prev,
      processLines: prev.processLines.filter((_, i) => i !== lineIndex)
    }));
  };

  // 복합 필드 변경 (신뢰성 테스트, 색상 체크)
  const handleComplexChange = (field: 'reliabilityTestResult' | 'colorCheckResult', subField: 'result' | 'action' | 'decisionMaker', value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        [subField]: value
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const inspectionData: Omit<QualityInspection, 'id' | 'createdAt' | 'updatedAt'> = {
        inspectionType: activeTab,
        orderNumber: formData.orderNumber,
        supplier: formData.supplier,
        productName: formData.productName,
        partName: formData.partName,
        orderQuantity: formData.orderQuantity,
        injectionMaterial: formData.injectionMaterial,
        injectionColor: formData.injectionColor,
        specification: formData.specification,
        postProcess: formData.postProcess,
        injectionCompany: formData.injectionCompany,
        inspector: formData.inspector,
        inspectionDate: formData.inspectionDate,
        imageUrls: formData.imageUrls,
        
        // 수입검사 필드
        packagingInfo: formData.packagingInfo,
        appearanceHistory: formData.appearanceHistory,
        functionHistory: formData.functionHistory,
        result: formData.result,
        resultReason: formData.resultReason,
        finalConsultationDept: formData.finalConsultationDept,
        finalConsultationName: formData.finalConsultationName,
        finalConsultationRank: formData.finalConsultationRank,
        
        // 공정검사 필드
        jigUsed1: formData.jigUsed1,
        jigUsed2: formData.jigUsed2,
        internalJigLower: formData.internalJigLower,
        internalJigUpper: formData.internalJigUpper,
        dryerUsed: formData.dryerUsed,
        flameTreatment: formData.flameTreatment,
        processLines: formData.processLines,
        reliabilityTestResult: formData.reliabilityTestResult,
        colorCheckResult: formData.colorCheckResult,
        injectionPackaging: formData.injectionPackaging,
        postProcessPackaging: formData.postProcessPackaging,
        preInspectionHistory: formData.preInspectionHistory,
        inProcessInspectionHistory: formData.inProcessInspectionHistory,
        keywordPairs: formData.keywordPairs,
        
        // 출하검사 필드
        workerCount: parseInt(formData.workerCount) || 1,
        workers: formData.workers,
        reliabilityReview: formData.reliabilityReview,
        reinspectionKeyword: formData.reinspectionKeyword,
        reinspectionContent: formData.reinspectionContent
      };

      await onSubmit(inspectionData);
      
      // autocomplete-data 업데이트 (백그라운드에서 실행)
      updateAutocompleteData({
        supplier: formData.supplier,
        productName: formData.productName,
        partName: formData.partName,
        injectionColor: formData.injectionColor,
        specification: formData.specification,
        injectionCompany: formData.injectionCompany
      });
      
      clearTempData();
      handleClose();
    } catch (error) {
      console.error('저장 실패:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setFormData({
      orderNumber: 'T',
      supplier: '',
      productName: '',
      partName: '',
      orderQuantity: '',
      injectionMaterial: '',
      injectionColor: '',
      specification: '',
      postProcess: '',
      injectionCompany: '',
      inspector: '',
      inspectionDate: new Date().toISOString().split('T')[0],
      imageUrls: [],
      packagingInfo: '',
      appearanceHistory: '',
      functionHistory: '',
      result: '합격' as InspectionResult,
      resultReason: '',
      finalConsultationDept: '',
      finalConsultationName: '',
      finalConsultationRank: '',
      jigUsed1: '',
      jigUsed2: '',
      internalJigLower: '',
      internalJigUpper: '',
      dryerUsed: '미사용' as '사용' | '미사용' | '',
      flameTreatment: '미사용' as '사용' | '미사용' | '',
      processLines: [{ workLine: '', lineSpeed: '', lineConditions: [{ type: '하도' as const, value: '' }, { type: '상도' as const, value: '' }], lampUsage: [] }],
      reliabilityTestResult: { result: '양호', action: '', decisionMaker: '' },
      colorCheckResult: { result: '견본과 색상동일', action: '', decisionMaker: '' },
      injectionPackaging: '',
      postProcessPackaging: '',
      preInspectionHistory: '',
      inProcessInspectionHistory: '',
      keywordPairs: [{ process: '', defect: '' }],
      workerCount: '1',
      workers: [{ name: '', totalInspected: 0, defectQuantity: 0, result: '합격' as '합격' | '불합격', defectReasons: [], directInputResult: '', action: '', decisionMaker: '' }],
      reliabilityReview: { method: '' as ReliabilityReview['method'], result: '양호' as ReliabilityReview['result'], action: '', decisionMaker: '' },
      reinspectionKeyword: '',
      reinspectionContent: ''
    });
    setImagePreviews([]);
    onClose();
  };


  const renderFormFields = () => {
    const commonFields = (
      <InspectionCommonForm
        formData={formData}
        setFormData={setFormData}
        autocompleteData={autocompleteData}
        showKeywordSection={activeTab === 'in-process'}
        onKeywordPairChange={handleKeywordPairChange}
        onAddKeywordPair={addKeywordPair}
        onRemoveKeywordPair={removeKeywordPair}
        imagePreviews={imagePreviews}
        handleImageUpload={handleImageUpload}
        removeImage={removeImage}
      />
    );

    const specificFields = () => {
      switch (activeTab) {
        case 'incoming':
          return (
            <IncomingInspectionForm 
              formData={formData} 
              setFormData={setFormData}
              autocompleteData={autocompleteData}
              imagePreviews={imagePreviews}
              handleImageUpload={handleImageUpload}
              removeImage={removeImage}
            />
          );

        case 'in-process':
          return (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">공정검사 정보</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="jigUsed1">사용지그-1</Label>
                      <div className="relative">
                        <Input
                          id="jigUsed1"
                          value={formData.jigUsed1}
                          onChange={(e) => setFormData(prev => ({ ...prev, jigUsed1: e.target.value }))}
                          placeholder="사용지그-1을 입력하세요"
                        />
                        <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-500 dark:text-slate-400">번지그</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="jigUsed2">사용지그-2</Label>
                      <Select value={formData.jigUsed2} onValueChange={(value) => setFormData(prev => ({ ...prev, jigUsed2: value }))}>
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

                    <div className="space-y-2">
                      <Label htmlFor="internalJigLower">내부코팅 사용지그 (하)</Label>
                      <div className="relative">
                        <Input
                          id="internalJigLower"
                          value={formData.internalJigLower}
                          onChange={(e) => setFormData(prev => ({ ...prev, internalJigLower: e.target.value }))}
                          placeholder="내부코팅 사용지그 (하)를 입력하세요"
                        />
                        <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-500 dark:text-slate-400">번지그</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="internalJigUpper">내부코팅 사용지그 (상)</Label>
                      <div className="relative">
                        <Input
                          id="internalJigUpper"
                          value={formData.internalJigUpper}
                          onChange={(e) => setFormData(prev => ({ ...prev, internalJigUpper: e.target.value }))}
                          placeholder="내부코팅 사용지그 (상)를 입력하세요"
                        />
                        <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-500 dark:text-slate-400">번지그</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>드라이기 사용</Label>
                      <div className="flex items-center space-x-4 h-10 bg-slate-50 dark:bg-slate-700/50 p-2 rounded-md">
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input 
                            type="radio" 
                            name="dryerUsed" 
                            value="사용" 
                            checked={formData.dryerUsed === '사용'} 
                            onChange={(e) => setFormData(prev => ({ ...prev, dryerUsed: e.target.value as '사용' | '미사용' | '' }))} 
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
                            onChange={(e) => setFormData(prev => ({ ...prev, dryerUsed: e.target.value as '사용' | '미사용' | '' }))} 
                            className="form-radio text-primary-600 focus:ring-primary-500 bg-transparent" 
                          />
                          <span>미사용</span>
                        </label>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>화염처리 진행</Label>
                      <div className="flex items-center space-x-4 h-10 bg-slate-50 dark:bg-slate-700/50 p-2 rounded-md">
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input 
                            type="radio" 
                            name="flameTreatment" 
                            value="사용" 
                            checked={formData.flameTreatment === '사용'} 
                            onChange={(e) => setFormData(prev => ({ ...prev, flameTreatment: e.target.value as '사용' | '미사용' | '' }))} 
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
                            onChange={(e) => setFormData(prev => ({ ...prev, flameTreatment: e.target.value as '사용' | '미사용' | '' }))} 
                            className="form-radio text-primary-600 focus:ring-primary-500 bg-transparent" 
                          />
                          <span>미사용</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>



              {/* 라인 정보 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">라인 정보</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {formData.processLines.map((line, lineIndex) => (
                      <div key={lineIndex} className="p-4 border dark:border-slate-700 rounded-lg space-y-4 bg-slate-50 dark:bg-slate-900/50 relative">
                        {formData.processLines.length > 1 && (
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute -top-2 -right-2 w-6 h-6 rounded-full text-xs"
                            onClick={() => removeProcessLine(lineIndex)}
                          >
                            ×
                          </Button>
                        )}
                        <div className="grid grid-cols-1 lg:grid-cols-6 gap-5 items-start">
                          <div className="space-y-2 lg:col-span-1">
                            <Label>작업라인</Label>
                            <Select value={line.workLine || ''} onValueChange={(value) => handleProcessLineChange(lineIndex, 'workLine', value)}>
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
                                onChange={(e) => handleProcessLineChange(lineIndex, 'lineSpeed', e.target.value)}
                                placeholder="라인속도를 입력하세요"
                              />
                              <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-500 dark:text-slate-400">rpm</span>
                            </div>
                          </div>
                          <div className="space-y-2 lg:col-span-2">
                            <Label>라인조건(I.R)</Label>
                            <div className="space-y-2">
                              {(line.lineConditions || []).map((condition, condIndex) => (
                                <div key={condIndex} className="flex items-center gap-2">
                                  <span className="font-semibold w-12 text-center flex-shrink-0">{condition.type}</span>
                                  <div className="relative flex-grow">
                                    <Input
                                      value={condition.value}
                                      onChange={(e) => handleLineConditionChange(lineIndex, condIndex, e.target.value)}
                                      placeholder="온도를 입력하세요"
                                    />
                                    <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-500 dark:text-slate-400">℃</span>
                                  </div>
                                  {(line.lineConditions?.length || 0) > 2 && (
                                    <Button
                                      type="button"
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => removeLineCondition(lineIndex, condIndex)}
                                    >
                                      -
                                    </Button>
                                  )}
                                </div>
                              ))}
                              <div className="flex gap-2 pt-1">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => addLineCondition(lineIndex, '하도')}
                                  className="flex-1"
                                >
                                  하도 추가
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => addLineCondition(lineIndex, '상도')}
                                  className="flex-1"
                                >
                                  상도 추가
                                </Button>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-2 lg:col-span-2">
                            <Label>램프사용</Label>
                            <div className="grid grid-cols-4 gap-2 p-2 bg-white dark:bg-slate-700/50 rounded-md justify-items-center">
                              {Array.from({length: 8}, (_, i) => i + 1).map(num => (
                                <label key={num} className="flex items-center justify-center w-10 h-10 rounded-full has-[:checked]:bg-primary-600 has-[:checked]:text-white cursor-pointer transition-colors border border-slate-300 dark:border-slate-600 has-[:checked]:border-primary-600">
                                  <input 
                                    type="checkbox" 
                                    checked={line.lampUsage?.includes(num) || false} 
                                    onChange={() => handleLampUsageChange(lineIndex, num)} 
                                    className="sr-only"
                                  />
                                  <span>{num}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addProcessLine}
                      className="w-full"
                    >
                      라인 정보 세트 추가
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* 신뢰성 테스트 및 색상 체크 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">테스트 결과</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>신뢰성테스트결과</Label>
                      <Select value={formData.reliabilityTestResult.result} onValueChange={(value) => handleComplexChange('reliabilityTestResult', 'result', value)}>
                        <SelectTrigger>
                          <SelectValue />
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
                      <Select value={formData.colorCheckResult.result} onValueChange={(value) => handleComplexChange('colorCheckResult', 'result', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="견본과 색상동일">견본과 색상동일</SelectItem>
                          <SelectItem value="색상편차발생">색상편차발생</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="injectionPackaging">사출포장</Label>
                      <Textarea
                        id="injectionPackaging"
                        value={formData.injectionPackaging}
                        onChange={(e) => setFormData(prev => ({ ...prev, injectionPackaging: e.target.value }))}
                        placeholder="사출포장 정보를 입력하세요"
                        rows={1}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="postProcessPackaging">후가공포장</Label>
                      <Textarea
                        id="postProcessPackaging"
                        value={formData.postProcessPackaging}
                        onChange={(e) => setFormData(prev => ({ ...prev, postProcessPackaging: e.target.value }))}
                        placeholder="후가공포장 정보를 입력하세요"
                        rows={1}
                      />
                    </div>
                  </div>

                  {/* 신뢰성 테스트 결과가 부분박리 또는 박리일 때 */}
                  {(formData.reliabilityTestResult.result === '부분박리' || formData.reliabilityTestResult.result === '박리') && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-md mt-4">
                      <div className="space-y-2">
                        <Label>처리 결과 (신뢰성)</Label>
                        <Input
                          value={formData.reliabilityTestResult.action || ''}
                          onChange={(e) => handleComplexChange('reliabilityTestResult', 'action', e.target.value)}
                          placeholder="처리 결과를 입력하세요"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>결정자 (신뢰성)</Label>
                        <Input
                          value={formData.reliabilityTestResult.decisionMaker || ''}
                          onChange={(e) => handleComplexChange('reliabilityTestResult', 'decisionMaker', e.target.value)}
                          placeholder="결정자를 입력하세요"
                        />
                      </div>
                    </div>
                  )}

                  {/* 색상 체크 결과가 색상편차발생일 때 */}
                  {formData.colorCheckResult.result === '색상편차발생' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-md mt-4">
                      <div className="space-y-2">
                        <Label>처리 결과 (색상)</Label>
                        <Input
                          value={formData.colorCheckResult.action || ''}
                          onChange={(e) => handleComplexChange('colorCheckResult', 'action', e.target.value)}
                          placeholder="처리 결과를 입력하세요"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>결정자 (색상)</Label>
                        <Input
                          value={formData.colorCheckResult.decisionMaker || ''}
                          onChange={(e) => handleComplexChange('colorCheckResult', 'decisionMaker', e.target.value)}
                          placeholder="결정자를 입력하세요"
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 검사이력 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">검사이력</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="preInspectionHistory">사전검사이력</Label>
                      <Textarea
                        id="preInspectionHistory"
                        value={formData.preInspectionHistory}
                        onChange={(e) => setFormData(prev => ({ ...prev, preInspectionHistory: e.target.value }))}
                        placeholder="사전검사이력을 입력하세요"
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="inProcessInspectionHistory">공정검사이력</Label>
                      <Textarea
                        id="inProcessInspectionHistory"
                        value={formData.inProcessInspectionHistory}
                        onChange={(e) => setFormData(prev => ({ ...prev, inProcessInspectionHistory: e.target.value }))}
                        placeholder="공정검사이력을 입력하세요"
                        rows={3}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          );

        case 'outgoing':
          return (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">출하검사 정보</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="workerCount">작업자 수</Label>
                    <Input
                      id="workerCount"
                      value={formData.workerCount}
                      onChange={(e) => setFormData(prev => ({ ...prev, workerCount: e.target.value }))}
                      placeholder="작업자 수를 입력하세요"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reinspectionKeyword">재검사요청 키워드</Label>
                    <Input
                      id="reinspectionKeyword"
                      value={formData.reinspectionKeyword}
                      onChange={(e) => setFormData(prev => ({ ...prev, reinspectionKeyword: e.target.value }))}
                      placeholder="재검사요청 키워드를 입력하세요"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="reinspectionContent">재검사요청 내용</Label>
                    <Textarea
                      id="reinspectionContent"
                      value={formData.reinspectionContent}
                      onChange={(e) => setFormData(prev => ({ ...prev, reinspectionContent: e.target.value }))}
                      placeholder="재검사요청 내용을 입력하세요"
                      rows={3}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );

        default:
          return null;
      }
    };

    return (
      <>
        {activeTab !== 'incoming' && commonFields}
        {specificFields()}
        {activeTab !== 'incoming' && (
          /* 이미지 업로드 */
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">이미지 첨부</CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        )}
      </>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] h-[95vh] max-w-[1400px] overflow-hidden">
        <DialogTitle className="sr-only">품질검사 작성</DialogTitle>
        <DialogDescription className="sr-only">
          품질검사 정보를 입력하는 폼입니다.
        </DialogDescription>
        
        <div className="flex flex-col h-full">
          <DialogHeader className="flex-shrink-0 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">품질검사 작성</h2>
                <p className="text-muted-foreground">
                  {INSPECTION_TYPE_LABELS[activeTab]} 정보를 입력하세요
                </p>
              </div>
              <Badge 
                className={cn(
                  "text-sm font-medium",
                  INSPECTION_RESULT_COLORS[formData.result]
                )}
                variant="secondary"
              >
                {formData.result}
              </Badge>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as InspectionType)} className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="incoming">수입검사</TabsTrigger>
                <TabsTrigger value="in-process">공정검사</TabsTrigger>
                <TabsTrigger value="outgoing">출하검사</TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {renderFormFields()}
                </form>
              </div>
              
              {/* 버튼 영역 */}
              <div className="flex justify-end gap-2 p-6 pt-4 border-t">
                <Button type="button" variant="outline" onClick={handleClose} disabled={isSaving}>
                  취소
                </Button>
                <Button 
                  type="submit" 
                  onClick={handleSubmit}
                  disabled={isSaving}
                  className="min-w-[120px]"
                >
                  {isSaving ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      저장 중...
                    </>
                  ) : '저장하기'}
                </Button>
              </div>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};