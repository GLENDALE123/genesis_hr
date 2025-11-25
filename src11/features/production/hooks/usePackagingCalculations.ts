import { useEffect } from 'react';

interface ProductionCalculationsData {
  packagingUnit: string;
  boxCount: string;
  remainder: string;
  inputQuantity: string;
  goodQuantity: string;
  productionPerMinute: string;
}

interface UseProductionCalculationsProps {
  formData: ProductionCalculationsData;
  onUpdate: (updates: {
    goodQuantity?: string;
    defectQuantity?: string;
    yieldRate?: string;
    defectRate?: string;
    uph?: string;
  }) => void;
}

/**
 * 생산일보 자동 계산 훅
 * 
 * @description
 * - 포장단위 × 박스수량 + 잔량 = 양품
 * - 투입 - 양품 = 불량
 * - 양품률, 불량률 자동 계산
 * - 1분당생산량 → UPH 자동 계산
 */
export const usePackagingCalculations = ({ formData, onUpdate }: UseProductionCalculationsProps) => {
  // 포장 단위 * 박스 수 + 잔량 = 양품 자동 계산
  useEffect(() => {
    const unit = parseInt(formData.packagingUnit, 10) || 0;
    const count = parseInt(formData.boxCount, 10) || 0;
    const rem = parseInt(formData.remainder, 10) || 0;
    const totalGood = unit * count + rem;
    
    if (totalGood > 0) {
      onUpdate({ goodQuantity: totalGood.toString() });
    }
  }, [formData.packagingUnit, formData.boxCount, formData.remainder, onUpdate]);

  // 투입, 양품, 불량, 수율, 불량률 자동 계산
  useEffect(() => {
    const input = parseInt(formData.inputQuantity, 10) || 0;
    const good = parseInt(formData.goodQuantity, 10) || 0;

    if (input >= good) {
      const defect = input - good;
      const yieldRate = input > 0 ? ((good / input) * 100).toFixed(1) + '%' : '';
      const defectRate = input > 0 ? ((defect / input) * 100).toFixed(1) + '%' : '';
      
      onUpdate({
        defectQuantity: defect.toString(),
        yieldRate,
        defectRate
      });
    }
  }, [formData.inputQuantity, formData.goodQuantity, onUpdate]);

  // 분당 생산량 -> UPH 자동 계산
  useEffect(() => {
    const perMinute = parseInt(formData.productionPerMinute, 10) || 0;
    const uph = perMinute > 0 ? (perMinute * 60).toString() : '';
    
    onUpdate({ uph });
  }, [formData.productionPerMinute, onUpdate]);
};

