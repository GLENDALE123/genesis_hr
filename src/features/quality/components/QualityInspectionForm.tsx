'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/shared/components/ui/sheet';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { ArrowLeft } from 'lucide-react';
import { QualityInspection, InspectionType, InspectionResult, TestResultDetail, ReliabilityReview, ProcessLineData, KeywordPair, WorkerInspectionData } from '../types';
import { INSPECTION_TYPE_LABELS, INSPECTION_RESULT_COLORS, INJECTION_COLOR_OPTIONS } from '../constants';
import { subscribeToAutocompleteData, updateAutocompleteData, AutocompleteData } from '../services/autocompleteService';
import { updateQualityInspection } from '../services/qualityInspectionService';
import { createUnifiedImagePath, deleteImagesWithThumbnails } from '@/shared/utils/imagePathMigration';
import { InspectionCommonForm } from './InspectionCommonForm';
import { useImageUpload } from '@/shared/hooks';
import { IncomingInspectionForm } from './IncomingInspectionForm';
import { ProcessInspectionForm } from './ProcessInspectionForm';
import { OutgoingInspectionForm } from './OutgoingInspectionForm';
import { useAuthStore } from '@/features/auth/store/authStore';
import '../utils/migrationTool'; // 마이그레이션 도구 로드
import { cn } from '@/shared/lib/utils';
import { useDeviceType } from '@/shared/hooks/use-device';
import { toast } from 'sonner';
import { 
  updateProgressToast, 
  createTimeoutPromise
} from '@/shared/components/common/ProgressToast';

// 재시도 로직을 포함한 업로드 함수 (직접 정의)
const createRetryableUploadPromise = (
  uploadFunction: () => Promise<string[]>,
  maxRetries: number = 3,
  delayMs: number = 1000
) => {
  return new Promise<string[]>(async (resolve, reject) => {
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await uploadFunction();
        resolve(result);
        return;
      } catch (error) {
        lastError = error;
        
        if (attempt < maxRetries) {
          // 재시도 전 대기
          await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
        }
      }
    }
    
    reject(lastError);
  });
};

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
  const { isSmartphone, isTablet } = useDeviceType();
  const isMobileOrTablet = isSmartphone || isTablet;
  // 이메일로 fallback하지 않고, 명시적인 표시 이름만 사용
  const defaultInspectorName = (userProfile && (userProfile as any).displayName) || (user && (user as any).displayName) || '';
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
  const [currentUploadCount, setCurrentUploadCount] = useState(0); // 현재 업로드 완료된 파일 수
  
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
    shippingWaitTypes: [],
    lastUpdated: ''
  });
  
  // initialTab이 변경될 때 activeTab 업데이트 (수정 모드에서도 적용)
  useEffect(() => {
    if (initialTab && initialTab !== activeTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, activeTab]);

  // 수정 모드에서 inspectionData가 변경될 때 activeTab 업데이트
  useEffect(() => {
    if (isEditMode && inspectionData?.inspectionType) {
      setActiveTab(inspectionData.inspectionType);
    }
  }, [isEditMode, inspectionData?.inspectionType]);

  // 모달이 열릴 때 activeTab 초기화 (수정 모드 우선)
  useEffect(() => {
    if (isOpen) {
      if (isEditMode && inspectionData?.inspectionType) {
        setActiveTab(inspectionData.inspectionType);
      } else if (initialTab) {
        setActiveTab(initialTab);
      }
    }
  }, [isOpen, isEditMode, inspectionData?.inspectionType, initialTab]);
  
  // 이미지 업로드 훅 사용
  const imageUploadHook = useImageUpload();
  
  // 폼 상태 - HS-Jig 구조 완전 반영
  const [formData, setFormData] = useState<Partial<QualityInspection>>(() => {
    // 수정 모드인 경우 기존 데이터로 초기화
    if (isEditMode && inspectionData) {
      return {
        ...inspectionData,
        // 이미지 URL을 업로드 훅에 설정
        imageUrls: inspectionData.imageUrls || [],
        // 중요한 기본값들 보호
        reliabilityTestResult: inspectionData.reliabilityTestResult || { result: '양호', action: '', decisionMaker: '' } as TestResultDetail,
        colorCheckResult: inspectionData.colorCheckResult || { result: '견본과 색상동일', action: '', decisionMaker: '' } as TestResultDetail,
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
        inspector: defaultInspectorName,
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
        reinspectionContent: '',
        
        // initialData로 덮어쓰기
        ...initialData,
        // 중요한 기본값들은 보호 - initialData에 값이 없으면 기본값 사용
        reliabilityTestResult: initialData.reliabilityTestResult || { result: '양호', action: '', decisionMaker: '' } as TestResultDetail,
        colorCheckResult: initialData.colorCheckResult || { result: '견본과 색상동일', action: '', decisionMaker: '' } as TestResultDetail,
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
      inspector: defaultInspectorName,
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
      // 이미지 상태 완전 초기화
      imageUploadHook.clearImages();
      imageUploadHook.clearDeletedUrls();
      
      setFormData({
        ...inspectionData,
        imageUrls: inspectionData.imageUrls || [],
        // 중요한 기본값들 보호
        reliabilityTestResult: inspectionData.reliabilityTestResult || { result: '양호', action: '', decisionMaker: '' } as TestResultDetail,
        colorCheckResult: inspectionData.colorCheckResult || { result: '견본과 색상동일', action: '', decisionMaker: '' } as TestResultDetail,
      });
      
      // 기존 이미지 설정
      if (inspectionData.imageUrls && inspectionData.imageUrls.length > 0) {
        imageUploadHook.setExistingImages(inspectionData.imageUrls);
        imagesInitializedRef.current = true;
      } else {
        imagesInitializedRef.current = false;
      }
    }
  }, [isEditMode, inspectionData]);


  // 임시저장 키 생성 (useRef로 안정화)
  const tempSaveKeyRef = useRef(`temp_${activeTab}_inspection_anonymous`);
  
  // activeTab이 변경될 때만 키 업데이트
  useEffect(() => {
    tempSaveKeyRef.current = `temp_${activeTab}_inspection_anonymous`;
  }, [activeTab]);
  
  // 임시저장 데이터 저장 (이미지 URL 제외)
  const saveTempData = useCallback((data: Record<string, unknown>) => {
    try {
      // 이미지 URL과 관련된 필드들을 제외하고 저장
      const { imageUrls, ...dataWithoutImages } = data;
      localStorage.setItem(tempSaveKeyRef.current, JSON.stringify(dataWithoutImages));
    } catch (error) {
      console.error('임시저장 데이터 저장 실패:', error);
    }
  }, []);
  
  // 임시저장 데이터 삭제
  const clearTempData = useCallback(() => {
    try {
      localStorage.removeItem(tempSaveKeyRef.current);
    } catch (error) {
      console.error('임시저장 데이터 삭제 실패:', error);
    }
  }, []);

  // 임시저장 데이터 로드 (안정화된 함수)
  const loadTempData = useCallback(() => {
    try {
      const savedData = localStorage.getItem(tempSaveKeyRef.current);
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        return parsedData;
      }
    } catch (error) {
      console.error('임시저장 데이터 로드 실패:', error);
    }
    return null;
  }, []);

  // 자동 임시저장을 위한 디바운스 타이머
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // 이전 formData를 추적하여 실제 변경이 있을 때만 임시저장
  const prevFormDataRef = useRef<Partial<QualityInspection> | undefined>(undefined);
  
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
          shippingWaitTypes: data.shippingWaitTypes || [],
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
          shippingWaitTypes: [],
          lastUpdated: ''
        });
      }
    });

    return () => unsubscribe();
  }, []);
  
  // formData 변경시 자동 임시저장 (생성 모드에서만)
  useEffect(() => {
    // 수정 모드에서는 임시저장하지 않음
    if (mode === 'edit') return;
    
    // 초기 로드 시에는 임시저장하지 않음 (무한 루프 방지)
    if (!isOpen) return;
    
    // 이전 데이터와 비교하여 실제 변경이 있는지 확인
    const prevData = prevFormDataRef.current;
    if (prevData && JSON.stringify(prevData) === JSON.stringify(formData)) {
      return; // 변경사항이 없으면 임시저장하지 않음
    }
    
    // 현재 데이터를 이전 데이터로 저장
    prevFormDataRef.current = { ...formData };
    
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
  }, [formData, saveTempData, mode, isOpen]);

  // 모달이 열릴 때 기본 초기화
  useEffect(() => {
    if (isOpen) {
      // 모달이 열릴 때 기본 초기화
      setIsSaving(false);
      imagesInitializedRef.current = false;
      
      // 이전 formData 추적 초기화
      prevFormDataRef.current = undefined;
      
      // 수정 모드가 아닌 경우에만 이미지 초기화
      if (mode !== 'edit') {
        // 이미지 업로드 훅 완전 초기화 (업로드 진행 상태 포함)
        imageUploadHook.clearImages();
        imageUploadHook.clearDeletedUrls();
      }
      
      // 업로드 진행 상태 강제 초기화 (추가 안전장치)
      if (imageUploadHook.isUploading) {
        imageUploadHook.cancelUpload();
      }
      
      // 수정 모드가 아닌 경우에만 탭 설정 및 임시저장 데이터 로드
      if (mode !== 'edit') {
        if (initialTab) {
          setActiveTab(initialTab);
        }
        
        // 생성 모드에서만 임시저장 데이터 로드 (initialData가 없는 경우에만)
        if (mode === 'create' && !initialData) {
          // 약간의 지연을 두어 초기화가 완료된 후 로드
          const loadTimer = setTimeout(() => {
            const tempData = loadTempData();
            if (tempData) {
              setFormData(prev => {
                const restoredData = {
                  ...prev,
                  ...tempData,
                  // 중요한 기본값들은 보호
                  reliabilityTestResult: tempData.reliabilityTestResult || { result: '양호', action: '', decisionMaker: '' } as TestResultDetail,
                  colorCheckResult: tempData.colorCheckResult || { result: '견본과 색상동일', action: '', decisionMaker: '' } as TestResultDetail,
                };
                // 복원된 데이터를 이전 데이터로 설정하여 즉시 임시저장되지 않도록 함
                prevFormDataRef.current = { ...restoredData };
                return restoredData;
              });
            }
          }, 100); // 100ms 지연
          
          return () => clearTimeout(loadTimer);
        }
      }
    }
  }, [isOpen, mode, initialTab, loadTempData, initialData]);






  // 수정 핸들러
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectionData?.id || !onUpdate) return;
    
    setIsSaving(true);
    
    try {
      // 이미지 업로드 처리
      let imageUrls: string[] = formData.imageUrls || [];
      if (imageUploadHook.uploadingImages.length > 0) {
        // 업로드 시작 시 현재 파일 수 초기화 및 진행 토스트 초기 표시
        setCurrentUploadCount(0);
        updateProgressToast(toast, 0, imageUploadHook.uploadingImages.length, () => {
          imageUploadHook.cancelUpload();
          imageUploadHook.clearUploadingImages();
        }, 0);

        const folder = createUnifiedImagePath(inspectionData.id);

        try {
          // 타임아웃과 재시도 로직을 포함한 업로드 Promise 생성
          const uploadFunction = () => imageUploadHook.uploadImages(folder, (progress) => {
            // 진행률을 안정적으로 처리 (디바운싱)
            const stableProgress = Math.min(100, Math.max(0, progress));
            const currentCount = Math.round((stableProgress / 100) * imageUploadHook.uploadingImages.length);
            
            // 진행률이 이전보다 낮아지는 것을 방지
            setCurrentUploadCount(prev => Math.max(prev, currentCount));
            
            // 진행률 업데이트 (취소 기능 포함) - 실제 진행률을 정확히 전달
            updateProgressToast(toast, stableProgress, imageUploadHook.uploadingImages.length, () => {
              // 취소 시 이미지 업로드 중단 및 완전 초기화
              imageUploadHook.cancelUpload();
              imageUploadHook.clearUploadingImages();
            }, Math.max(currentUploadCount, currentCount));
          });
          
          // 재시도 가능한 업로드 Promise
          const retryableUploadPromise = createRetryableUploadPromise(uploadFunction, 3, 1000);
          
          // 타임아웃 Promise와 경쟁
          const timeoutPromise = createTimeoutPromise(30000); // 30초 타임아웃
          
          const newImageUrls = await Promise.race([
            retryableUploadPromise,
            timeoutPromise
          ]);
          // 업로드 완료 즉시 진행 토스트 닫기 (문서 업데이트와 분리)
          toast.dismiss('image-upload-progress');

          // 수정 모드에서는 기존 이미지와 새 이미지를 합쳐서 저장
          const existingImageUrls = imageUploadHook.uploadingImages
            .filter(item => item.file === null && item.preview) // 기존 이미지들
            .map(item => item.preview!)
            .filter(url => !imageUploadHook.deletedImageUrls.includes(url)); // 삭제된 이미지 제외
          imageUrls = [...existingImageUrls, ...(newImageUrls as string[])];
          
        } catch (error: any) {
          console.error('이미지 업로드 실패:', error);
          
          // 에러 타입에 따른 처리
          if (error.message?.includes('취소')) {
            toast.error('이미지 업로드가 취소되었습니다.');
          } else if (error.message?.includes('시간이 초과')) {
            toast.error('업로드 시간이 초과되었습니다. 네트워크 연결을 확인해주세요.');
          } else {
            toast.error(`이미지 업로드에 실패했습니다: ${error.message || '알 수 없는 오류'}`);
          }
          
          // 업로드 실패 시 폼 제출 중단
          setIsSaving(false);
          toast.dismiss('image-upload-progress');
          return;
        }
      }

      // 삭제된 이미지 URL 처리 (썸네일 포함)
      if (imageUploadHook.deletedImageUrls.length > 0) {
        try {
          // 이미지 삭제 진행 토스트는 제거
          const deleteResult = await deleteImagesWithThumbnails(imageUploadHook.deletedImageUrls);
          
          // 삭제 성공한 이미지들을 imageUrls에서 제거
          const originalImageUrls = [...imageUrls];
          imageUrls = imageUrls.filter(url => !deleteResult.success.includes(url));
          
          // 삭제된 URL 목록 초기화
          imageUploadHook.clearDeletedUrls();
          // 이미지 삭제 성공 토스트는 제거 (수정 완료 토스트로 대체)
        } catch (error) {
          console.error('❌ 이미지 삭제 실패:', error);
          toast.error('이미지 삭제에 실패했습니다.');
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
      toast.success('수정 완료');
      
      // 상태 업데이트가 완료되도록 약간의 지연
      setTimeout(() => {
        onClose();
      }, 100);
    } catch (error) {
      console.error('수정 실패:', error);
      toast.error('품질검사 수정에 실패했습니다. 다시 시도해주세요.');
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
      toast.success('삭제 완료');
      onClose();
    } catch (error) {
      console.error('삭제 실패:', error);
      toast.error('품질검사 삭제에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      // 디버깅: formData 확인
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
        inspector: formData.inspector || defaultInspectorName,
        inspectionDate: formData.inspectionDate || new Date().toISOString().split('T')[0],
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
        reliabilityTestResult: formData.reliabilityTestResult || { result: '양호', action: '', decisionMaker: '' },
        colorCheckResult: formData.colorCheckResult || { result: '견본과 색상동일', action: '', decisionMaker: '' },
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

      // 디버깅: inspectionData 확인
      const docId = await onSubmit(inspectionData);
      
      // 2단계: 이미지가 있으면 업로드 후 문서 업데이트
      if (imageUploadHook.uploadingImages.length > 0) {
        // 업로드 시작 시 현재 파일 수 초기화 및 진행 토스트 초기 표시
        setCurrentUploadCount(0);
        updateProgressToast(toast, 0, imageUploadHook.uploadingImages.length, () => {
          imageUploadHook.cancelUpload();
          imageUploadHook.clearUploadingImages();
        }, 0);

        const folder = createUnifiedImagePath(docId);

        try {
          // 타임아웃과 재시도 로직을 포함한 업로드 Promise 생성
          const uploadFunction = () => imageUploadHook.uploadImages(folder, (progress) => {
            // 진행률을 안정적으로 처리 (디바운싱)
            const stableProgress = Math.min(100, Math.max(0, progress));
            const currentCount = Math.round((stableProgress / 100) * imageUploadHook.uploadingImages.length);
            
            // 진행률이 이전보다 낮아지는 것을 방지
            setCurrentUploadCount(prev => Math.max(prev, currentCount));
            
            // 진행률 업데이트 (취소 기능 포함) - 실제 진행률을 정확히 전달
            updateProgressToast(toast, stableProgress, imageUploadHook.uploadingImages.length, () => {
              // 취소 시 이미지 업로드 중단 및 완전 초기화
              imageUploadHook.cancelUpload();
              imageUploadHook.clearUploadingImages();
            }, Math.max(currentUploadCount, currentCount));
          });
          
          // 재시도 가능한 업로드 Promise
          const retryableUploadPromise = createRetryableUploadPromise(uploadFunction, 3, 1000);
          
          // 타임아웃 Promise와 경쟁
          const timeoutPromise = createTimeoutPromise(30000); // 30초 타임아웃
          
          const imageUrls = await Promise.race([
            retryableUploadPromise,
            timeoutPromise
          ]);
          // 업로드 완료 즉시 진행 토스트 닫기 (문서 업데이트와 분리)
          toast.dismiss('image-upload-progress');

          // 이미지 URL로 문서 업데이트
          await updateQualityInspection(docId, { imageUrls: imageUrls as string[] });
          
        } catch (error: any) {
          console.error('이미지 업로드 실패:', error);
          
          // 에러 타입에 따른 처리
          if (error.message?.includes('취소')) {
            toast.error('이미지 업로드가 취소되었습니다.');
          } else if (error.message?.includes('시간이 초과')) {
            toast.error('업로드 시간이 초과되었습니다. 네트워크 연결을 확인해주세요.');
          } else {
            toast.error(`이미지 업로드에 실패했습니다: ${error.message || '알 수 없는 오류'}`);
          }
          
          // 업로드 실패 시 폼 제출 중단
          setIsSaving(false);
          toast.dismiss('image-upload-progress');
          return;
        }
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
      
      toast.success('등록 완료');
      
      // onComplete가 있으면 호출 (모달 닫기 등)
      if (onComplete) {
        onComplete();
      } else {
        // onComplete가 없으면 기본 동작 (모달 닫기)
        handleClose();
      }
    } catch (error) {
      console.error('저장 실패:', error);
      toast.error('품질검사 등록에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    // 진행 중인 토스트 정리
    toast.dismiss('image-upload-progress');
    
    // 폼 데이터 초기화
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
    
    // 이미지 상태 완전 정리 (업로드 진행 상태 포함)
    imageUploadHook.clearImages();
    imageUploadHook.clearDeletedUrls();
    
    // 업로드 진행 상태 강제 초기화 (추가 안전장치)
    if (imageUploadHook.isUploading) {
      imageUploadHook.cancelUpload();
    }
    
    // 임시저장 데이터 삭제
    clearTempData();
    
    // 모달 닫기
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

  // 폼 내용 추출
  const FormContent = (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 pb-4">
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
          >
            {formData.result}
          </Badge>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={(value: string) => {
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
        </Tabs>
      </div>
    </div>
  );

  // Footer 버튼들
  const FormFooter = (
    <div className="flex justify-end gap-2">
      <Button type="button" onClick={handleClose} disabled={isSaving}>
        취소
      </Button>
      
      {/* 삭제 버튼 - Admin만 표시 */}
      {canDelete() && (
        <Button 
          type="button" 
          onClick={handleDelete}
          disabled={isSaving}
          className="bg-red-500 text-white hover:bg-red-600"
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
  );

  const handleDialogChange = (open: boolean) => {
    if (!open) {
      handleClose();
    }
  };

  return (
    <>
      {/* 데스크톱: Dialog */}
      {!isMobileOrTablet && (
        <Dialog open={isOpen} onOpenChange={handleDialogChange}>
          <DialogContent 
            className="w-[95vw] h-[95vh] max-w-[1400px] overflow-hidden pb-0"
            stickyHeader={
              <DialogHeader>
                <DialogTitle>
                  {isCreateMode ? '품질검사 작성' : isEditMode ? '품질검사 수정' : '품질검사 상세'}
                </DialogTitle>
                <DialogDescription className="sr-only">
                  {isCreateMode ? '품질검사 정보를 입력하는 폼입니다.' : 
                   isEditMode ? '품질검사 정보를 수정하는 폼입니다.' : 
                   '품질검사 상세 정보를 확인하는 폼입니다.'}
                </DialogDescription>
              </DialogHeader>
            }
            stickyFooter={FormFooter}
          >
            {FormContent}
          </DialogContent>
        </Dialog>
      )}

      {/* 모바일/태블릿: Sheet */}
      {isMobileOrTablet && (
        <Sheet open={isOpen} onOpenChange={handleDialogChange}>
          <SheetContent 
            side="right"
            fullscreen
            animationVariant={isTablet ? 'tablet' : 'default'}
            hideClose
            className="w-full max-w-none h-screen overflow-hidden p-0"
          >
            <div className="h-full flex flex-col">
              <SheetHeader className="sticky top-0 z-10 bg-background border-b p-4 text-left">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClose}
                    className="-ml-2"
                    aria-label="뒤로가기"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <SheetTitle className="ml-1">
                    {isCreateMode ? '품질검사 작성' : isEditMode ? '품질검사 수정' : '품질검사 상세'}
                  </SheetTitle>
                </div>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto overscroll-contain p-4">
                {FormContent}
              </div>
              <SheetFooter className="sticky bottom-0 bg-background border-t p-4 flex-row justify-end gap-2">
                {FormFooter}
              </SheetFooter>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </>
  );
};