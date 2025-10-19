'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { QualityInspection, InspectionType, InspectionResult, TestResultDetail, ReliabilityReview, ProcessLineData, KeywordPair, WorkerInspectionData } from '../types';
import { INSPECTION_TYPE_LABELS, INSPECTION_RESULT_COLORS, INJECTION_COLOR_OPTIONS } from '../constants';
import { subscribeToAutocompleteData, updateAutocompleteData, AutocompleteData } from '../services/autocompleteService';
import { updateQualityInspection } from '../services/qualityInspectionService';
import { createUnifiedImagePath, deleteImagesWithThumbnails } from '@/shared/utils/imagePathMigration';
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
  onSubmit: (inspection: Omit<QualityInspection, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  // 수정/삭제 모드 추가
  mode?: 'create' | 'edit' | 'view';
  inspectionData?: QualityInspection;
  onUpdate?: (id: string, inspection: Partial<QualityInspection>) => void;
  onDelete?: (id: string) => void;
  // 초기 탭 설정
  initialTab?: InspectionType;
  // 초기 데이터 설정 (추가입력용)
  initialData?: Partial<QualityInspection>;
  // 모든 처리가 완료된 후 호출되는 콜백
  onComplete?: () => void;
}

/**
 * 품질검사 작성 폼 컴포넌트
 * HS-Jig의 실제 구조를 완전히 반영
 */
export const QualityInspectionForm: React.FC<QualityInspectionFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  mode = 'create',
  inspectionData,
  onUpdate,
  onDelete,
  initialTab,
  initialData,
  onComplete
}) => {
  const { user, userProfile } = useAuthStore();
  const [activeTab, setActiveTab] = useState<InspectionType>(() => {
    // 수정 모드인 경우 해당 검사 타입으로 초기화
    if (mode === 'edit' && inspectionData?.inspectionType) {
      return inspectionData.inspectionType;
    }
    // initialTab이 제공된 경우 사용
    if (initialTab) {
      return initialTab;
    }
    // 기본값
    return 'incoming';
  });
  const [isSaving, setIsSaving] = useState(false);
  
  // 이미지 설정 완료 여부 추적
  const imagesInitializedRef = useRef(false);
  
  // 권한 체크 함수들
  const canEdit = () => {
    if (!user || !inspectionData) return false;
    // 작성자 본인이거나 Admin 권한이 있는 경우
    return inspectionData.createdBy === user.uid || userProfile?.role === 'Admin';
  };
  
  const canDelete = () => {
    if (!user || !inspectionData) return false;
    // Admin 권한이 있는 경우만 삭제 가능
    return userProfile?.role === 'Admin';
  };
  
  const isViewMode = mode === 'view';
  const isEditMode = mode === 'edit';
  const isCreateMode = mode === 'create';
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
  const [formData, setFormData] = useState<Partial<QualityInspection>>(() => {
    // 수정 모드인 경우 기존 데이터로 초기화
    if (isEditMode && inspectionData) {
      return {
        ...inspectionData,
        // 이미지 URL을 업로드 훅에 설정
        imageUrls: inspectionData.imageUrls || []
      };
    }

    // 생성 모드이고 initialData가 있는 경우 (추가입력)
    if (isCreateMode && initialData) {
      return {
        // 기본값 먼저 설정
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
        processLines: [{ workLine: '', lineSpeed: '', lineConditions: [{ type: '하도' as const, value: 0 }, { type: '상도' as const, value: 0 }], lampUsage: [] }] as ProcessLineData[],
        
        // 출하검사 필드
        workerCount: '',
        injectionPackaging: '',
        postProcessPackaging: '',
        
        // 공통 필드
        keywordPairs: [] as KeywordPair[],
        
        // initialData로 덮어쓰기
        ...initialData
      };
    }

    // 일반 생성 모드인 경우 기본값으로 초기화
    return {
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
    processLines: [{ workLine: '', lineSpeed: '', lineConditions: [{ type: '하도' as const, value: 0 }, { type: '상도' as const, value: 0 }], lampUsage: [] }] as ProcessLineData[],
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
    };
  });

  // 수정 모드에서 inspectionData가 변경될 때 formData 업데이트
  useEffect(() => {
    if (isEditMode && inspectionData) {
      setFormData({
        ...inspectionData,
        imageUrls: inspectionData.imageUrls || []
      });
    }
  }, [isEditMode, inspectionData]);

  // 수정 모드에서 기존 이미지 설정
  useEffect(() => {
    if (isEditMode && inspectionData?.imageUrls && inspectionData.imageUrls.length > 0 && !imagesInitializedRef.current) {
      imageUploadHook.setExistingImages(inspectionData.imageUrls);
      imagesInitializedRef.current = true;
    }
  }, [isEditMode, inspectionData?.imageUrls]);

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

  // 모달이 열릴 때마다 초기화 및 탭 설정
  useEffect(() => {
    if (isOpen) {
      // 모달이 열릴 때 초기화
      setIsSaving(false);
      imagesInitializedRef.current = false;
      
      // 수정 모드인 경우 해당 검사 타입으로 탭 설정
      if (mode === 'edit' && inspectionData?.inspectionType) {
        setActiveTab(inspectionData.inspectionType);
        // 수정 모드에서는 해당 검사 데이터로 폼 초기화
        setFormData({
          ...inspectionData,
          imageUrls: inspectionData.imageUrls || []
        });
      } else if (initialTab) {
        setActiveTab(initialTab);
      }
    }
  }, [isOpen, mode, inspectionData?.inspectionType, initialTab]);

  // 수정 모드에서 탭 변경 시 폼 데이터 초기화 방지
  useEffect(() => {
    if (mode === 'edit' && inspectionData) {
      setFormData({
        ...inspectionData,
        imageUrls: inspectionData.imageUrls || []
      });
    }
  }, [mode, inspectionData]);





  // 수정 핸들러
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectionData?.id || !onUpdate) return;
    
    setIsSaving(true);
    
    try {
      // 이미지 업로드 처리
      let imageUrls: string[] = formData.imageUrls || [];
      if (imageUploadHook.uploadingImages.length > 0) {
        const folder = createUnifiedImagePath(inspectionData.id);
        const newImageUrls = await imageUploadHook.uploadImages(folder);
        imageUrls = [...imageUrls, ...newImageUrls];
      }

      // 삭제된 이미지 URL 처리 (썸네일 포함)
      if (imageUploadHook.deletedImageUrls.length > 0) {
        console.log('🔍 [QualityInspectionForm] 이미지 삭제 시작:', {
          deletedUrls: imageUploadHook.deletedImageUrls,
          count: imageUploadHook.deletedImageUrls.length,
          timestamp: new Date().toISOString()
        });
        
        try {
          const deleteResult = await deleteImagesWithThumbnails(imageUploadHook.deletedImageUrls);
          
          console.log('🔍 [QualityInspectionForm] 이미지 삭제 완료:', {
            success: deleteResult.success,
            failed: deleteResult.failed,
            thumbnailResults: deleteResult.thumbnailResults
          });
          
          // 삭제 성공한 이미지들을 imageUrls에서 제거
          const originalImageUrls = [...imageUrls];
          imageUrls = imageUrls.filter(url => !deleteResult.success.includes(url));
          
          // 삭제된 URL 목록 초기화
          imageUploadHook.clearDeletedUrls();
        } catch (error) {
          console.error('❌ 이미지 삭제 실패:', error);
        }
      }

      // Storage 폴더 내용 확인 (디버깅용)
      const { listStorageFiles } = await import('@/shared/utils/imagePathMigration');
      const folderPath = createUnifiedImagePath(inspectionData.id);
      const storageFiles = await listStorageFiles(folderPath);

      // 존재하지 않는 이미지 URL들을 자동으로 필터링
      const { filterExistingImageURLs } = await import('@/shared/utils/imagePathMigration');
      const originalImageUrls = [...imageUrls];
      imageUrls = await filterExistingImageURLs(imageUrls);

      const updateData: Partial<QualityInspection> = {
        ...formData,
        imageUrls,
        updatedAt: new Date().toISOString(),
        updatedBy: user?.uid || ''
      };

      await onUpdate(inspectionData.id, updateData);
      onClose();
    } catch (error) {
      console.error('수정 실패:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // 삭제 핸들러
  const handleDelete = async () => {
    if (!inspectionData?.id || !onDelete) return;
    
    const confirmed = window.confirm('정말로 이 품질검사를 삭제하시겠습니까?');
    if (!confirmed) return;
    
    setIsSaving(true);
    
    try {
      await onDelete(inspectionData.id);
      onClose();
    } catch (error) {
      console.error('삭제 실패:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      // 1단계: 먼저 문서 생성 (이미지 없이)
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
        imageUrls: [], // 먼저 빈 배열로 생성
        
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
        reinspectionContent: formData.reinspectionContent,
        
        // 메타데이터
        createdBy: user?.uid || '',
        updatedBy: user?.uid || ''
      };

      const docId = await onSubmit(inspectionData);
      console.log('✅ 문서 저장 완료:', docId);
      
      // 2단계: 이미지가 있으면 업로드 후 문서 업데이트
      if (imageUploadHook.uploadingImages.length > 0) {
        console.log('📤 이미지 업로드 시작:', imageUploadHook.uploadingImages.length, '개 파일');
        const folder = createUnifiedImagePath(docId, '');
        const imageUrls = await imageUploadHook.uploadImages(folder);
        console.log('✅ 이미지 업로드 완료:', imageUrls.length, '개 URL');
        
        // 이미지 URL로 문서 업데이트
        await updateQualityInspection(docId, { imageUrls });
        console.log('✅ 이미지 URL 업데이트 완료');
      }
      
      // 삭제된 이미지가 있다면 처리 (새로 생성하는 경우에는 없어야 함)
      if (imageUploadHook.deletedImageUrls.length > 0) {
        console.warn('⚠️ 새로 생성하는 경우에 삭제된 이미지가 있습니다:', imageUploadHook.deletedImageUrls);
        imageUploadHook.clearDeletedUrls();
      }
      
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
      console.log('🎉 모든 저장 작업 완료');
      
      // onComplete가 있으면 호출 (모달 닫기 등)
      if (onComplete) {
        console.log('📋 onComplete 콜백 호출');
        onComplete();
      } else {
        // onComplete가 없으면 기본 동작 (모달 닫기)
        console.log('📋 기본 handleClose 호출');
        handleClose();
      }
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
      processLines: [{ workLine: '', lineSpeed: '', lineConditions: [{ type: '하도' as const, value: 0 }, { type: '상도' as const, value: 0 }], lampUsage: [] }],
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
              imageUploadHook={imageUploadHook}
            />
          );

        case 'inProcess':
          return (
            <ProcessInspectionForm 
              formData={formData} 
              setFormData={setFormData}
              autocompleteData={autocompleteData}
              imageUploadHook={imageUploadHook}
            />
          );

        case 'outgoing':
          return (
            <OutgoingInspectionForm 
              formData={formData} 
              setFormData={setFormData}
              autocompleteData={autocompleteData}
              imageUploadHook={imageUploadHook}
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
        <DialogTitle className="sr-only">
          {isCreateMode ? '품질검사 작성' : isEditMode ? '품질검사 수정' : '품질검사 상세'}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {isCreateMode ? '품질검사 정보를 입력하는 폼입니다.' : 
           isEditMode ? '품질검사 정보를 수정하는 폼입니다.' : 
           '품질검사 상세 정보를 확인하는 폼입니다.'}
        </DialogDescription>
        
        <div className="flex flex-col h-full">
          <DialogHeader className="flex-shrink-0 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">
                  {isCreateMode ? '품질검사 작성' : isEditMode ? '품질검사 수정' : '품질검사 상세'}
                </h2>
                <p className="text-muted-foreground">
                  {isViewMode ? `${INSPECTION_TYPE_LABELS[activeTab]} 정보를 확인하세요` :
                   `${INSPECTION_TYPE_LABELS[activeTab]} 정보를 ${isEditMode ? '수정' : '입력'}하세요`}
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
            <Tabs value={activeTab} onValueChange={(value) => {
              // 수정 모드에서는 탭 변경을 허용하지 않음 (해당 검사 타입만 수정 가능)
              if (mode === 'edit') {
                return;
              }
              
              setActiveTab(value as InspectionType);
            }} className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger 
                  value="incoming" 
                  disabled={mode === 'edit' && inspectionData?.inspectionType !== 'incoming'}
                >
                  수입검사
                </TabsTrigger>
                <TabsTrigger 
                  value="inProcess" 
                  disabled={mode === 'edit' && inspectionData?.inspectionType !== 'inProcess'}
                >
                  공정검사
                </TabsTrigger>
                <TabsTrigger 
                  value="outgoing" 
                  disabled={mode === 'edit' && inspectionData?.inspectionType !== 'outgoing'}
                >
                  출하검사
                </TabsTrigger>
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
                
                {/* 삭제 버튼 - Admin만 표시 */}
                {canDelete() && (
                  <Button 
                    type="button" 
                    variant="destructive" 
                    onClick={handleDelete}
                    disabled={isSaving}
                  >
                    {isSaving ? '삭제 중...' : '삭제'}
                  </Button>
                )}
                
                {/* 수정/저장 버튼 */}
                {!isViewMode && (
                <Button 
                  type="submit" 
                    onClick={isEditMode ? handleUpdate : handleSubmit}
                  disabled={isSaving}
                  className="min-w-[120px]"
                >
                  {isSaving ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                        {isEditMode ? '수정 중...' : '저장 중...'}
                    </>
                    ) : (
                      isEditMode ? '수정' : '저장하기'
                    )}
                </Button>
                )}
              </div>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};