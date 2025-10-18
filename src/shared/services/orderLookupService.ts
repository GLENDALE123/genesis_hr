import { getDocumentsWithQuery } from '@/shared/services/firebase/firestore';

/**
 * 발주번호로 생산일정 데이터를 조회하는 서비스
 * 캐시 없이 Firebase에서 직접 조회
 */

export interface OrderData {
  orderNumber: string;
  supplier: string;
  productName: string;
  partName: string;
  orderQuantity: string;
  specification: string;
}

class OrderLookupService {
  /**
   * 생산일정에서 발주번호로 데이터 조회
   */
  async getOrderData(orderNumber: string): Promise<OrderData | null> {
    if (!orderNumber || orderNumber === 'T' || !orderNumber.trim()) {
      return null;
    }

    try {
      // ✅ 공통 서비스 사용
      const docs = await getDocumentsWithQuery(
        'production-schedules',
        [{ field: 'orderNumber', operator: '==', value: orderNumber }],
        undefined,
        'asc',
        1
      );

      if (docs.length > 0) {
        const data = docs[0] as Record<string, unknown>;

        // 발주처 필드 확인 - 다양한 가능한 필드명 체크
        const supplierValue = (data.client || data.supplier || data.발주처 || data.clientName || '') as string;

        // 부속명에서 괄호 부분 제거 (예: "외캡(원색(ABS))" → "외캡")
        const rawPartName = data.partName || data.부속명 || '';
        const cleanPartName = (rawPartName as string).replace(/\(.*$/g, '').trim();

        const orderData: OrderData = {
          orderNumber: orderNumber,
          supplier: supplierValue,
          productName: (data.productName || '') as string,
          partName: cleanPartName,
          orderQuantity: (data.orderQuantity || data.발주 || '') as string,
          specification: (data.specification || data.사양 || '') as string
        };

        return orderData;
      }

      return null;
    } catch (error) {
      console.error('생산일정에서 발주번호 조회 실패:', error);
      throw error;
    }
  }
}

// 싱글톤 인스턴스 생성
export const orderLookupService = new OrderLookupService();

