import { useState, useEffect, useCallback } from 'react';
import { PackagingReport, PackagingFormData, PackagedBoxFormData } from '@/features/production/types';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useOrderNumberFormatter } from '@/shared/hooks/useOrderNumberFormatter';
import { usePackagingCalculations } from './usePackagingCalculations';
import { getUserDisplayName } from '@/shared/utils/userUtils';

const initialFormData: PackagingFormData = {
  workDate: new Date().toISOString().split('T')[0],
  authorName: '',
  productionLine: '',
  orderNumbers: [''],
  supplier: '',
  productName: '',
  partName: '',
  orderQuantity: '',
  specification: '',
  lineRatio: '',
  productionPerMinute: '',
  uph: '',
  inputQuantity: '',
  goodQuantity: '',
  defectQuantity: '',
  yieldRate: '',
  defectRate: '',
  personnelCount: '',
  startTime: '',
  endTime: '',
  packagingUnit: '',
  boxCount: '',
  remainder: '',
  packagedBoxes: [{ boxNumber: '', type: '', quantity: '', reason: '' }],
  memo: ''
};

interface UseProductionFormProps {
  report?: PackagingReport | null;
  isEditMode?: boolean;
}

/**
 * 생산일보 폼 상태 관리 훅
 * 
 * @description
 * - 폼 데이터 상태 관리
 * - 자동 계산 로직 통합
 * - 발주번호 형식 변환 통합
 * - 박스 정보 관리
 */
export const usePackagingForm = ({ report, isEditMode = false }: UseProductionFormProps) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<PackagingFormData>(initialFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // 발주번호 자동완성 콜백
  const handleAutoFill = useCallback((data: {
    supplier: string;
    productName: string;
    partName: string;
    orderQuantity: string;
    specification: string;
  }) => {
    setFormData(prev => ({
      ...prev,
      supplier: data.supplier || prev.supplier,
      productName: data.productName || prev.productName,
      partName: data.partName || prev.partName,
      orderQuantity: data.orderQuantity || prev.orderQuantity,
      specification: data.specification || prev.specification,
    }));
  }, []);

  const handleClear = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      supplier: '',
      productName: '',
      partName: '',
      orderQuantity: '',
      specification: '',
    }));
  }, []);

  // 발주번호 포맷터 훅 사용
  const { handleOrderNumberChange: formatAndAutoFill } = useOrderNumberFormatter({
    onAutoFill: handleAutoFill,
    onClear: handleClear
  });

  // 자동 계산 훅 사용
  usePackagingCalculations({
    formData,
    onUpdate: useCallback((updates) => {
      setFormData(prev => ({ ...prev, ...updates }));
    }, [])
  });

  // 기존 보고서 데이터 로드 (수정 모드)
  useEffect(() => {
    if (report && isEditMode) {
      setFormData({
        workDate: report.workDate,
        authorName: report.author.displayName,
        productionLine: report.productionLine,
        // 배열을 쉼표로 연결하여 단일 필드에 표시
        orderNumbers: report.orderNumbers.length > 0 ? [report.orderNumbers.join(', ')] : [''],
        supplier: report.supplier,
        productName: report.productName,
        partName: report.partName,
        orderQuantity: report.orderQuantity?.toString() || '',
        specification: report.specification,
        lineRatio: report.lineRatio,
        productionPerMinute: report.productionPerMinute?.toString() || '',
        uph: report.uph?.toString() || '',
        inputQuantity: report.inputQuantity?.toString() || '',
        goodQuantity: report.goodQuantity?.toString() || '',
        defectQuantity: report.defectQuantity?.toString() || '',
        yieldRate: '',
        defectRate: '',
        personnelCount: report.personnelCount?.toString() || '',
        startTime: report.startTime,
        endTime: report.endTime,
        packagingUnit: report.packagingUnit?.toString() || '',
        boxCount: report.boxCount?.toString() || '',
        remainder: report.remainder?.toString() || '',
        packagedBoxes: report.packagedBoxes.length > 0 
          ? report.packagedBoxes.map(b => ({
              boxNumber: b.boxNumber,
              type: b.type,
              quantity: b.quantity.toString(),
              reason: b.reason || ''
            }))
          : [{ boxNumber: '', type: '', quantity: '', reason: '' }],
        memo: report.memo || ''
      });
    } else {
      // 새 생산일보 작성 시 로그인한 사용자 정보 자동 채우기
      setFormData({
        ...initialFormData,
        authorName: getUserDisplayName(user)
      });
    }
  }, [report, isEditMode, user]);

  // 일반 입력 필드 변경
  const handleInputChange = (field: keyof PackagingFormData, value: string | string[]) => {
    // 숫자만 입력 가능한 필드
    const numericFields = [
      'orderQuantity', 'inputQuantity', 'goodQuantity', 'personnelCount',
      'productionPerMinute', 'packagingUnit', 'boxCount', 'remainder'
    ];

    if (numericFields.includes(field) && typeof value === 'string') {
      value = value.replace(/[^0-9]/g, '');
    }

    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // 발주번호 변경
  const handleOrderNumberChange = (index: number, value: string) => {
    formatAndAutoFill(value, (formatted) => {
      const newOrderNumbers = [...formData.orderNumbers];
      newOrderNumbers[index] = formatted;
      setFormData(prev => ({ ...prev, orderNumbers: newOrderNumbers }));
    });
  };

  // 박스 정보 변경
  const handleBoxChange = (index: number, field: keyof PackagedBoxFormData, value: string) => {
    const newBoxes = [...formData.packagedBoxes];
    const currentBox = { ...newBoxes[index] };

    if (field === 'quantity' || field === 'boxNumber') {
      (currentBox as any)[field] = value.replace(/[^0-9]/g, '');
    } else {
      (currentBox as any)[field] = value;
    }

    // 정상 선택 시 사유 초기화
    if (field === 'type' && value === '정상') {
      currentBox.reason = '';
    }

    newBoxes[index] = currentBox;
    setFormData(prev => ({ ...prev, packagedBoxes: newBoxes }));
  };

  // 박스 추가
  const addBox = () => {
    setFormData(prev => ({
      ...prev,
      packagedBoxes: [...prev.packagedBoxes, { boxNumber: '', type: '', quantity: '', reason: '' }]
    }));
  };

  // 박스 삭제
  const removeBox = (index: number) => {
    if (formData.packagedBoxes.length > 1) {
      setFormData(prev => ({
        ...prev,
        packagedBoxes: prev.packagedBoxes.filter((_, i) => i !== index)
      }));
    }
  };

  // 시작 시간 설정 (현재 시간)
  const handleStartTime = () => {
    const now = new Date();
    const timeString = now.toTimeString().slice(0, 5);
    setFormData(prev => ({ ...prev, startTime: timeString }));
  };

  // 종료 시간 설정 (현재 시간)
  const handleEndTime = () => {
    const now = new Date();
    const timeString = now.toTimeString().slice(0, 5);
    setFormData(prev => ({ ...prev, endTime: timeString }));
  };

  // 폼 제출 전 데이터 검증 및 변환
  const validateAndPrepareSubmit = (): PackagingFormData | null => {
    // 필수 필드 검증
    const requiredFields = ['workDate', 'productionLine', 'supplier', 'productName'];
    const missingFields = requiredFields.filter(field => !formData[field as keyof PackagingFormData]);
    
    if (missingFields.length > 0) {
      alert('필수 필드를 모두 입력해주세요.');
      return null;
    }

    // 발주번호 필터링 (쉼표로 분리 후 빈 문자열 제거)
    const allOrderNumbers = formData.orderNumbers
      .flatMap(num => num.split(',').map(n => n.trim()))
      .filter(num => num && num !== 'T');
    
    return {
      ...formData,
      orderNumbers: allOrderNumbers.length > 0 ? allOrderNumbers : ['']
    };
  };

  return {
    // 상태
    formData,
    isSaving,
    isCalendarOpen,
    setIsSaving,
    setIsCalendarOpen,
    
    // 핸들러
    handleInputChange,
    handleOrderNumberChange,
    handleBoxChange,
    addBox,
    removeBox,
    handleStartTime,
    handleEndTime,
    validateAndPrepareSubmit
  };
};

