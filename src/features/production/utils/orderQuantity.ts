import { PackagingReport, ShortageRequest } from '@/features/production/types';

type OrderQuantitySource =
  | Pick<PackagingReport, 'orderQuantities' | 'orderQuantity'>
  | Pick<ShortageRequest, 'orderQuantities' | 'orderQuantity'>
  | {
      orderQuantities?: number[] | null;
      orderQuantity?: number | null;
    }
  | null
  | undefined;

const sanitizeToNumber = (value: string): number | null => {
  const digits = value.replace(/[^0-9]/g, '');
  if (!digits) {
    return null;
  }

  const parsed = parseInt(digits, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

/**
 * 입력 필드의 문자열을 개별 수량 배열로 변환
 */
export const parseOrderQuantityInput = (raw?: string): number[] => {
  if (!raw) {
    return [];
  }

  return raw
    .split(',')
    .map((part) => sanitizeToNumber(part))
    .filter((value): value is number => value !== null);
};

/**
 * 수량 배열을 모두 합산
 */
export const sumOrderQuantities = (values?: number[] | null): number | null => {
  if (!values || values.length === 0) {
    return null;
  }

  return values.reduce((acc, qty) => acc + qty, 0);
};

/**
 * 보고서/부족분 데이터에 저장된 수량 정보를 합산하여 반환
 */
export const getOrderQuantityTotal = (source?: OrderQuantitySource): number | null => {
  if (!source) {
    return null;
  }

  const totalFromArray = sumOrderQuantities(source.orderQuantities);
  if (totalFromArray !== null) {
    return totalFromArray;
  }

  return typeof source.orderQuantity === 'number' ? source.orderQuantity : null;
};

/**
 * 저장된 수량 배열을 폼 입력 필드에서 재사용할 수 있는 문자열로 변환
 */
export const formatOrderQuantitiesForInput = (
  source?: OrderQuantitySource
): string => {
  if (!source) {
    return '';
  }

  if (source.orderQuantities && source.orderQuantities.length > 0) {
    return source.orderQuantities.map((value) => value.toString()).join(', ');
  }

  return source.orderQuantity != null ? source.orderQuantity.toString() : '';
};








