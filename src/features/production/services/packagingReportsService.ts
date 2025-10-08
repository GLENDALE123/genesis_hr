import { db } from '@/shared/services/firebase/config';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  where, 
  getDocs, 
  onSnapshot, 
  doc, 
  deleteDoc, 
  updateDoc,
  addDoc
} from 'firebase/firestore';
import { PackagingReport, PackagingFormData, PackagedBoxFormData } from '@/features/production/types';

interface ReportUser {
  uid: string;
  displayName?: string | null;
  email?: string | null;
}

/**
 * Packaging Reports Firebase 서비스
 * HS-Jig의 packaging-reports 컬렉션과 동일한 구조 사용
 */
export class PackagingReportsService {
  /**
   * 새로운 packaging report 생성
   */
  static async createPackagingReport(formData: PackagingFormData, user: ReportUser): Promise<string> {
    try {
      if (!db) {
        throw new Error('Firebase not initialized');
      }

      // 숫자 필드 안전하게 변환하는 헬퍼 함수 (null 반환)
      const parseNumber = (value: string | undefined): number | null => {
        if (!value || value.trim() === '') return null;
        const parsed = parseInt(value.trim());
        return isNaN(parsed) ? null : parsed;
      };

      const reportData: any = {
        createdAt: new Date().toISOString(),
        workDate: formData.workDate,
        author: {
          uid: user.uid,
          displayName: user.displayName || user.email || '알 수 없음'
        },
        productionLine: formData.productionLine,
        orderNumbers: formData.orderNumbers.filter(num => num.trim() !== ''),
        supplier: formData.supplier || '',
        productName: formData.productName || '',
        partName: formData.partName || '',
        specification: formData.specification || '',
        lineRatio: formData.lineRatio || '',
        startTime: formData.startTime || '',
        endTime: formData.endTime || '',
        memo: formData.memo || '',
        imageUrls: [],
        // 숫자 필드들 (null 허용)
        orderQuantity: parseNumber(formData.orderQuantity),
        productionPerMinute: parseNumber(formData.productionPerMinute),
        uph: parseNumber(formData.uph),
        inputQuantity: parseNumber(formData.inputQuantity),
        goodQuantity: parseNumber(formData.goodQuantity),
        defectQuantity: parseNumber(formData.defectQuantity),
        personnelCount: parseNumber(formData.personnelCount),
        packagingUnit: parseNumber(formData.packagingUnit),
        boxCount: parseNumber(formData.boxCount),
        remainder: parseNumber(formData.remainder)
      };

      // PackagedBoxFormData를 PackagedBox로 변환 (null 허용)
      reportData.packagedBoxes = formData.packagedBoxes.map(box => ({
        boxNumber: box.boxNumber || '',
        type: box.type || '',
        quantity: parseNumber(box.quantity) ?? 0,
        reason: box.reason || null
      }));

      const docRef = await addDoc(collection(db, 'packaging-reports'), reportData);
      return docRef.id;
    } catch (error) {
      console.error('Error creating packaging report:', error);
      throw error;
    }
  }

  /**
   * 모든 packaging reports 가져오기 (최신순, 제한된 개수)
   */
  static async getPackagingReports(limitCount: number = 500): Promise<PackagingReport[]> {
    try {
      if (!db) {
        throw new Error('Firebase not initialized');
      }

      const q = query(
        collection(db, 'packaging-reports'),
        orderBy('workDate', 'desc'),
        limit(limitCount)
      );

      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as PackagingReport));
    } catch (error) {
      console.error('Error fetching packaging reports:', error);
      throw error;
    }
  }

  /**
   * 특정 날짜 범위의 packaging reports 가져오기
   */
  static async getPackagingReportsByDateRange(
    startDate: string, 
    endDate: string
  ): Promise<PackagingReport[]> {
    try {
      if (!db) {
        throw new Error('Firebase not initialized');
      }

      const q = query(
        collection(db, 'packaging-reports'),
        where('workDate', '>=', startDate),
        where('workDate', '<=', endDate),
        orderBy('workDate', 'desc')
      );

      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as PackagingReport));
    } catch (error) {
      console.error('Error fetching packaging reports by date range:', error);
      throw error;
    }
  }

  /**
   * 특정 생산라인의 packaging reports 가져오기
   */
  static async getPackagingReportsByLine(productionLine: string): Promise<PackagingReport[]> {
    try {
      if (!db) {
        throw new Error('Firebase not initialized');
      }

      const q = query(
        collection(db, 'packaging-reports'),
        where('productionLine', '==', productionLine),
        orderBy('workDate', 'desc')
      );

      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as PackagingReport));
    } catch (error) {
      console.error('Error fetching packaging reports by line:', error);
      throw error;
    }
  }

  /**
   * 실시간 업데이트를 위한 onSnapshot 리스너 설정
   */
  static subscribeToPackagingReports(
    callback: (reports: PackagingReport[]) => void,
    limitCount: number = 500,
    onError?: (error: Error) => void
  ): () => void {
    if (!db) {
      const error = new Error('Firebase not initialized');
      console.error('Firebase not initialized');
      if (onError) {
        onError(error);
      }
      // 빈 배열로 콜백 호출하여 로딩 상태 해제
      callback([]);
      return () => {};
    }

    try {
      const q = query(
        collection(db, 'packaging-reports'),
        orderBy('workDate', 'desc'),
        limit(limitCount)
      );

      return onSnapshot(
        q,
        (snapshot) => {
          const reports = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as PackagingReport));
          
          // HS-Jig와 동일한 정렬 로직 적용
          const sortedReports = reports.sort((a, b) => {
            const dateComparison = new Date(b.workDate).getTime() - new Date(a.workDate).getTime();
            if (dateComparison !== 0) return dateComparison;

            // 생산라인별 정렬
            const productionLineSortOrder = [
              '증착1', '증착1하도', '증착1상도', 
              '증착2', '증착2하도', '증착2상도',
              '증착1하도(아)', '증착1상도(아)', 
              '증착2하도(아)', '증착2상도(아)',
              '2코팅', '1코팅', 
              '내부코팅1호기', '내부코팅2호기', '내부코팅3호기'
            ];

            const aIndex = productionLineSortOrder.indexOf(a.productionLine);
            const bIndex = productionLineSortOrder.indexOf(b.productionLine);
            const aSortIndex = aIndex === -1 ? Infinity : aIndex;
            const bSortIndex = bIndex === -1 ? Infinity : bIndex;
            if (aSortIndex !== bSortIndex) {
              return aSortIndex - bSortIndex;
            }

            // 시작시간으로 정렬
            if (a.startTime && b.startTime) {
              return a.startTime.localeCompare(b.startTime);
            }
            if (a.startTime) return -1;
            if (b.startTime) return 1;
            return 0;
          });

          callback(sortedReports);
        },
        (error) => {
          console.error('Error in packaging reports subscription:', error);
          if (onError) {
            onError(error as Error);
          }
        }
      );
    } catch (error) {
      console.error('Error setting up packaging reports subscription:', error);
      if (onError) {
        onError(error as Error);
      }
      // 빈 배열로 콜백 호출하여 로딩 상태 해제
      callback([]);
      return () => {};
    }
  }

  /**
   * 특정 packaging report 삭제
   */
  static async deletePackagingReport(reportId: string): Promise<void> {
    try {
      if (!db) {
        throw new Error('Firebase not initialized');
      }

      await deleteDoc(doc(db, 'packaging-reports', reportId));
    } catch (error) {
      console.error('Error deleting packaging report:', error);
      throw error;
    }
  }

  /**
   * 특정 packaging report 업데이트
   */
  static async updatePackagingReport(
    reportId: string, 
    updateData: Partial<PackagingReport>
  ): Promise<void> {
    try {
      if (!db) {
        throw new Error('Firebase not initialized');
      }

      // undefined를 null로 변환
      const cleanedData = Object.fromEntries(
        Object.entries(updateData).map(([key, value]) => [
          key,
          value === undefined ? null : value
        ])
      );

      await updateDoc(doc(db, 'packaging-reports', reportId), cleanedData);
    } catch (error) {
      console.error('Error updating packaging report:', error);
      throw error;
    }
  }
}


