import { useState, useEffect, useCallback } from 'react';
import { PackagingReport, PackagingFormData, PackagedBoxFormData } from '@/features/production/types';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useOrderNumberFormatter } from '@/shared/hooks/useOrderNumberFormatter';
import { usePackagingCalculations } from './usePackagingCalculations';
import { getUserDisplayName } from '@/shared/utils/userUtils';
import { getLocalDateString } from '@/shared/utils/dateUtils';

const initialFormData: PackagingFormData = {
  workDate: getLocalDateString(new Date()),
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
  const { user, userProfile } = useAuthStore();
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
        orderQuantity: (report.orderQuantity && report.orderQuantity.toString()) || '',
        specification: report.specification,
        lineRatio: report.lineRatio,
        productionPerMinute: (report.productionPerMinute && report.productionPerMinute.toString()) || '',
        uph: (report.uph && report.uph.toString()) || '',
        inputQuantity: (report.inputQuantity && report.inputQuantity.toString()) || '',
        goodQuantity: (report.goodQuantity && report.goodQuantity.toString()) || '',
        defectQuantity: (report.defectQuantity && report.defectQuantity.toString()) || '',
        yieldRate: '',
        defectRate: '',
        personnelCount: (report.personnelCount && report.personnelCount.toString()) || '',
        startTime: report.startTime,
        endTime: report.endTime,
        packagingUnit: (report.packagingUnit && report.packagingUnit.toString()) || '',
        boxCount: (report.boxCount && report.boxCount.toString()) || '',
        remainder: (report.remainder && report.remainder.toString()) || '',
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
        authorName: getUserDisplayName(user, userProfile)
      });
    }
  }, [report, isEditMode, user, userProfile]);

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

    // 시간 필드 입력 형식 보정 (입력 중 자동 형식화)
    if ((field === 'startTime' || field === 'endTime') && typeof value === 'string') {
      value = formatTimeDuringTyping(value);
    }

    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // 입력 중 시간 자동 형식화: 숫자만 허용, 최대 4자리, 3자리 이상이면 콜론 삽입, 범위 보정(시 00-23, 분 00-59)
  const formatTimeDuringTyping = (raw: string): string => {
    const digits = (raw || '').replace(/[^0-9]/g, '').slice(0, 4);
    if (digits.length <= 2) {
      return digits; // 시만 입력 중
    }
    // HH:MM 구성 (분은 입력된 만큼만 표시)
    let hh = digits.slice(0, 2);
    let mm = digits.slice(2);
    // 범위 보정 (부분 입력 시는 보정하지 않음, 최종 보정은 블러/제출에서)
    return mm ? `${hh}:${mm}` : `${hh}:`;
  };

  // 블러/제출 시 최종 시간 확정: HH:mm로 패딩 및 범위 클램프
  const finalizeTime = (raw: string): string => {
    const digits = (raw || '').replace(/[^0-9]/g, '');
    if (digits.length === 0) return '';
    const hhNum = parseInt(digits.slice(0, 2).padEnd(2, '0'), 10);
    const mmNum = parseInt(digits.slice(2, 4).padEnd(2, '0'), 10);
    const hhClamped = Math.min(23, isNaN(hhNum) ? 0 : hhNum);
    const mmClamped = Math.min(59, isNaN(mmNum) ? 0 : mmNum);
    const hh = String(hhClamped).padStart(2, '0');
    const mm = String(mmClamped).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  // 시간 입력 블러 시 최종 형식으로 확정 저장
  const handleTimeBlur = (field: 'startTime' | 'endTime', raw: string) => {
    const finalized = finalizeTime(raw);
    setFormData(prev => ({ ...prev, [field]: finalized }));
  };
  
  // 시/분 분리 파싱 함수: "HH:mm" -> ["HH", "mm"]
  const parseTime = (timeStr: string): [string, string] => {
    if (!timeStr) return ['00', '00'];
    const parts = timeStr.split(':');
    if (parts.length !== 2) return ['00', '00'];
    const hour = parts[0]?.padStart(2, '0') || '00';
    const minute = parts[1]?.padStart(2, '0') || '00';
    return [hour, minute];
  };
  
  // 시/분 결합 포맷 함수: "HH", "mm" -> "HH:mm"
  const formatTimeDisplay = (hour: string, minute: string): string => {
    const h = hour.padStart(2, '0');
    const m = minute.padStart(2, '0');
    return `${h}:${m}`;
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
      (currentBox as Record<string, unknown>)[field] = value.replace(/[^0-9]/g, '');
    } else {
      (currentBox as Record<string, unknown>)[field] = value;
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
    
    // 시간 필드 최종 형식 강제 (HH:mm)
    const normalizedStart = formData.startTime ? finalizeTime(formData.startTime) : '';
    const normalizedEnd = formData.endTime ? finalizeTime(formData.endTime) : '';

    return {
      ...formData,
      startTime: normalizedStart,
      endTime: normalizedEnd,
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
    handleTimeBlur,
    parseTime,
    formatTimeDisplay,
    validateAndPrepareSubmit
  };
};

