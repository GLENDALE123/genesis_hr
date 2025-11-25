import { useRef, useEffect } from 'react';
import { orderLookupService, type OrderData } from '@/shared/services/orderLookupService';
import { toast } from 'sonner';

interface UseOrderNumberFormatterProps {
  onAutoFill: (data: {
    supplier: string;
    productName: string;
    partName: string;
    orderQuantity: string;
    specification: string;
  }) => void;
  onClear: () => void;
}

/**
 * 발주번호 형식 변환 및 자동완성 훅
 * 
 * @description
 * - T12345-6 형식으로 자동 변환
 * - 7자리 이상 시 쉼표로 구분 (T12345-6, T78)
 * - 완성된 발주번호만 자동완성 조회
 * - 500ms 디바운싱
 */
export const useOrderNumberFormatter = ({ onAutoFill, onClear }: UseOrderNumberFormatterProps) => {
  const autoFillTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (autoFillTimerRef.current) {
        clearTimeout(autoFillTimerRef.current);
      }
    };
  }, []);

  /**
   * 발주번호 형식 변환
   * 예: 12345 → T12345, 123456 → T12345-6, 1234567 → T12345-6, T7
   */
  const formatOrderNumber = (value: string): string => {
    // 빈 문자열은 그대로 반환
    if (value === '') {
      return '';
    }

    // T 제거하고 숫자만 추출
    const withoutT = value.replace(/^T/i, '');
    const numericPart = withoutT.replace(/[^0-9-]/g, '');
    
    // 숫자만 추출 (- 제거)
    const digitsOnly = numericPart.replace(/-/g, '');

    if (digitsOnly.length === 0) {
      return 'T';
    } else if (digitsOnly.length <= 5) {
      // 5자리 이하: T12345
      return 'T' + digitsOnly;
    } else if (digitsOnly.length === 6) {
      // 6자리: T12345-6
      return `T${digitsOnly.substring(0, 5)}-${digitsOnly.substring(5)}`;
    } else {
      // 7자리 이상: T12345-6, T나머지 형식으로 쉼표 구분
      const parts: string[] = [];
      let remaining = digitsOnly;
      
      while (remaining.length > 0) {
        if (remaining.length <= 5) {
          parts.push('T' + remaining);
          break;
        } else if (remaining.length === 6) {
          parts.push(`T${remaining.substring(0, 5)}-${remaining.substring(5)}`);
          break;
        } else {
          // 6자리씩 분리
          parts.push(`T${remaining.substring(0, 5)}-${remaining.substring(5, 6)}`);
          remaining = remaining.substring(6);
        }
      }
      
      return parts.join(', ');
    }
  };

  /**
   * 모든 발주번호를 조회하여 정보 자동 채우기 (중복 제거)
   */
  const handleOrderNumberAutoFill = async (orderNumber: string) => {
    if (!orderNumber || orderNumber === 'T' || !orderNumber.trim()) {
      // 발주번호가 비어있으면 관련 정보 초기화
      onClear();
      return;
    }

    try {
      // 쉼표로 구분된 발주번호들을 분리하고, 완성된 발주번호만 필터링 (T12345-6 형식)
      const orderNumbers = orderNumber
        .split(',')
        .map(num => num.trim())
        .filter(num => {
          // T로 시작하고, 최소 8자리 이상인 완성된 발주번호만 (T12345-6)
          return num && num !== 'T' && num.length >= 8 && num.includes('-');
        });
      
      // 완성된 발주번호가 없으면 정보 초기화
      if (orderNumbers.length === 0) {
        onClear();
        return;
      }
      const startTime = performance.now();

      // 모든 발주번호를 병렬로 조회
      const orderDataPromises = orderNumbers.map(async (num) => {
        const queryStart = performance.now();
        const data = await orderLookupService.getOrderData(num);
        const queryEnd = performance.now();
        return data;
      });
      
      const orderDataList = await Promise.all(orderDataPromises);
      const endTime = performance.now();
      // null이 아닌 데이터만 필터링
      const validData = orderDataList.filter((data): data is OrderData => data !== null);

      if (validData.length > 0) {
        // 각 필드별로 고유한 값들만 수집
        const suppliers = [...new Set(validData.map((d: OrderData) => d.supplier).filter(Boolean))];
        const productNames = [...new Set(validData.map((d: OrderData) => d.productName).filter(Boolean))];
        const partNames = [...new Set(validData.map((d: OrderData) => d.partName).filter(Boolean))];
        const orderQuantities = [...new Set(validData.map((d: OrderData) => d.orderQuantity).filter(Boolean))];
        const specifications = [...new Set(validData.map((d: OrderData) => d.specification).filter(Boolean))];

        // 상태 업데이트 전 로그
        const updateStart = performance.now();
        
        onAutoFill({
          supplier: suppliers.join(', '),
          productName: productNames.join(', '),
          partName: partNames.join(', '),
          orderQuantity: orderQuantities.join(', '),
          specification: specifications.join(', '),
        });
        
        // 상태 업데이트 후 로그 (다음 틱에서)
        setTimeout(() => {
          const updateEnd = performance.now();
        }, 0);

        // 자동 입력 성공 토스트
        if (validData.length === 1) {
          toast.success(`발주번호 ${orderNumbers[0]}의 정보가 자동으로 입력되었습니다.`);
        } else {
          toast.success(`${validData.length}개의 발주번호 정보가 자동으로 입력되었습니다.`);
        }
      }
    } catch (error) {
      console.error('발주번호 자동 입력 실패:', error);
      // 조회 실패 시에는 토스트 표시 안 함 (데이터가 없을 수도 있음)
    }
  };

  /**
   * 발주번호 변경 핸들러 (형식 변환 + 디바운스 자동완성)
   */
  const handleOrderNumberChange = (value: string, callback: (formatted: string) => void) => {
    const formatted = formatOrderNumber(value);
    callback(formatted);

    // 발주번호 자동완성 디바운싱 (입력 멈춘 후 500ms 후 실행)
    if (autoFillTimerRef.current) {
      clearTimeout(autoFillTimerRef.current);
    }

    autoFillTimerRef.current = setTimeout(() => {
      handleOrderNumberAutoFill(formatted);
    }, 500);
  };

  return {
    formatOrderNumber,
    handleOrderNumberChange,
    handleOrderNumberAutoFill
  };
};

