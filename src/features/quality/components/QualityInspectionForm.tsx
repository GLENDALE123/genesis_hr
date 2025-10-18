'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { QualityInspection, InspectionType, InspectionResult, TestResultDetail, ReliabilityReview, ProcessLineData, KeywordPair, WorkerInspectionData } from '../types';
import { INSPECTION_TYPE_LABELS, INSPECTION_RESULT_COLORS, INJECTION_COLOR_OPTIONS } from '../constants';
import { subscribeToAutocompleteData, updateAutocompleteData, AutocompleteData } from '../services/autocompleteService';
import { InspectionCommonForm, useImageUpload } from './InspectionCommonForm';
import { IncomingInspectionForm } from './IncomingInspectionForm';
import { ProcessInspectionForm } from './ProcessInspectionForm';
import { OutgoingInspectionForm } from './OutgoingInspectionForm';
import { useAuthStore } from '@/features/auth/store/authStore';
import { getUserDisplayName } from '@/shared/utils/userUtils';
import '../utils/migrationTool'; // 마이그레이션 도구 로드
import { cn } from '@/shared/lib/utils';

interface QualityInspectionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (inspection: Omit<QualityInspection, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

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
  
  // 이미지 업로드 훅 사용
  const imageUploadHook = useImageUpload();
  
  // 폼 상태 - HS-Jig 구조 완전 반영
  const [formData, setFormData] = useState<Partial<QualityInspection>>({
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
  const getTempSaveKey = useCallback(() => `temp_${activeTab}_inspection_anonymous`, [activeTab]);
  
  // 임시저장 데이터 저장
  const saveTempData = useCallback((data: Record<string, unknown>) => {
    try {
      localStorage.setItem(getTempSaveKey(), JSON.stringify(data));
    } catch (error) {
      console.error('임시저장 데이터 저장 실패:', error);
    }
  }, [getTempSaveKey]);
  
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
          injectionColors: [...INJECTION_COLOR_OPTIONS], // 기본 색상 옵션 사용
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





  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      // 이미지 업로드 처리
      let imageUrls: string[] = [];
      if (imageUploadHook.uploadingImages.length > 0) {
        const folder = `quality-inspections/${formData.orderNumber || 'temp'}`;
        imageUrls = await imageUploadHook.uploadImages(folder);
      }

      const inspectionData: Omit<QualityInspection, 'id' | 'createdAt' | 'updatedAt'> = {
        inspectionType: activeTab,
        orderNumber: formData.orderNumber || '',
        supplier: formData.supplier || '',
        productName: formData.productName || '',
        partName: formData.partName || '',
        orderQuantity: formData.orderQuantity || '',
        injectionMaterial: formData.injectionMaterial || '',
        injectionColor: formData.injectionColor || '',
        specification: formData.specification || '',
        postProcess: formData.postProcess || '',
        injectionCompany: formData.injectionCompany || '',
        inspector: formData.inspector || '',
        inspectionDate: formData.inspectionDate || '',
        imageUrls: imageUrls,
        
        // 수입검사 필드
        packagingInfo: formData.packagingInfo,
        appearanceHistory: formData.appearanceHistory,
        functionHistory: formData.functionHistory,
        result: formData.result || '합격',
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
        processLines: formData.processLines || [],
        reliabilityTestResult: formData.reliabilityTestResult,
        colorCheckResult: formData.colorCheckResult,
        injectionPackaging: formData.injectionPackaging,
        postProcessPackaging: formData.postProcessPackaging,
        preInspectionHistory: formData.preInspectionHistory,
        inProcessInspectionHistory: formData.inProcessInspectionHistory,
        keywordPairs: formData.keywordPairs,
        
        // 출하검사 필드
        workerCount: formData.workerCount || '1',
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
    imageUploadHook.clearImages();
    onClose();
  };


  const renderFormFields = () => {
    const specificFields = () => {
      switch (activeTab) {
        case 'incoming':
          return (
            <IncomingInspectionForm 
              formData={formData} 
              setFormData={setFormData}
              autocompleteData={autocompleteData}
            />
          );

        case 'inProcess':
          return (
            <ProcessInspectionForm 
              formData={formData} 
              setFormData={setFormData}
              autocompleteData={autocompleteData}
            />
          );

        case 'outgoing':
          return (
            <OutgoingInspectionForm 
              formData={formData} 
              setFormData={setFormData}
              autocompleteData={autocompleteData}
            />
          );

        default:
          return null;
      }
    };

    return (
      <>
        {specificFields()}
      </>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] h-[95vh] max-w-[1400px] overflow-hidden pb-0">
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
                  INSPECTION_RESULT_COLORS[formData.result || '합격']
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
                <TabsTrigger value="inProcess">공정검사</TabsTrigger>
                <TabsTrigger value="outgoing">출하검사</TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {renderFormFields()}
                </form>
              </div>
              
              {/* 버튼 영역 */}
              <div className="flex justify-end gap-2 px-4 pt-4 pb-0 border-t">
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