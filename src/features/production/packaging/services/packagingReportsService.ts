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
import { PackagingReport, PackagingFormData, ProductionStatus } from '../types';
import { db } from '@/shared/services/firebase/config';
import { getUserDisplayName } from '@/shared/utils/user/userUtils';
import { DailyReportNotificationService } from '@/shared/services/notifications/notificationService';
import { parseOrderQuantityInput, sumOrderQuantities } from '../../utils/orderQuantity';

// 기존 상태 계산 함수 (startTime, endTime 기반)
const calculateStatus = (startTime: string, endTime: string): ProductionStatus => {
  if (endTime && endTime.trim() !== '') {
    return ProductionStatus.Completed; // 생산완료
  } else if (startTime && startTime.trim() !== '') {
    return ProductionStatus.InProgress; // 작업중
  } else {
    return ProductionStatus.Pending; // 대기
  }
};

interface ReportUser {
  uid: string;
  displayName?: string | null;
  email?: string | null;
  userProfile?: {
    displayName?: string | null;
    name?: string | null;
    email?: string | null;
  } | null;
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

      const nowIso = new Date().toISOString();
      const orderQuantityList = parseOrderQuantityInput(formData.orderQuantity);
      const totalOrderQuantity =
        sumOrderQuantities(orderQuantityList) ?? parseNumber(formData.orderQuantity);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const reportData: any = {
        createdAt: nowIso,
        updatedAt: nowIso,
        lastSyncedAt: null,
        needsSheetSync: true,
        workDate: formData.workDate,
        author: {
          uid: user.uid,
          displayName: user.displayName || '알 수 없음'
        },
        productionLine: formData.productionLine,
        orderNumbers: formData.orderNumbers.filter(num => num.trim() !== ''),
        orderQuantities: orderQuantityList,
        supplier: formData.supplier || '',
        productName: formData.productName || '',
        partName: formData.partName || '',
        specification: formData.specification || '',
        lineRatio: formData.lineRatio || '',
        startTime: formData.startTime || '',
        endTime: formData.endTime || '',
        memo: formData.memo || '',
        imageUrls: [],
        status: calculateStatus(formData.startTime || '', formData.endTime || ''), // 시간 기반 상태 계산
        // 숫자 필드들 (undefined 방지를 위해 null 사용)
        orderQuantity: totalOrderQuantity,
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
      reportData.packagedBoxes = formData.packagedBoxes.map(box => {
        const parsedQuantity = parseNumber(box.quantity);
        return {
          boxNumber: box.boxNumber || '',
          type: box.type || '',
          quantity: parsedQuantity != null ? parsedQuantity : 0,
          reason: box.reason || null
        };
      });

      const docRef = await addDoc(collection(db, 'packaging-reports'), reportData);
      
      // 생산일보 생성 시 알림 전송 (모든 상태에서 발송)
      try {
        const createdReport: PackagingReport = {
          id: docRef.id,
          ...reportData
        } as PackagingReport;
        
        const initialStatus = calculateStatus(formData.startTime || '', formData.endTime || '');
        
        await DailyReportNotificationService.sendDailyReportStatusChangeNotification(
          undefined, // 이전 상태 없음
          initialStatus,
          createdReport,
          {
            uid: user.uid,
            displayName: user.displayName || 'Unknown User',
            photoURL: undefined
          }
        );
      } catch (notificationError) {
        console.error('생산일보 생성 알림 전송 실패:', notificationError);
        // 알림 실패해도 생성은 성공으로 처리
      }
      
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
   * 
   * @param limitCount - 조회할 최대 문서 수 (기본값: 2000, 전체 검색용)
   */
  static async getPackagingReportsByDateRange(
    startDate: string, 
    endDate: string,
    limitCount: number = 2000
  ): Promise<PackagingReport[]> {
    try {
      if (!db) {
        throw new Error('Firebase not initialized');
      }

      const q = query(
        collection(db, 'packaging-reports'),
        where('workDate', '>=', startDate),
        where('workDate', '<=', endDate),
        orderBy('workDate', 'desc'),
        limit(limitCount)
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
   * 날짜 범위별 실시간 업데이트 리스너 (성능 최적화)
   * 
   * @param limitCount - 조회할 최대 문서 수 (기본값: 2000, 전체 검색용)
   */
  static subscribeToPackagingReportsByDateRange(
    startDate: string,
    endDate: string,
    callback: (reports: PackagingReport[]) => void,
    onError?: (error: Error) => void,
    limitCount: number = 2000
  ): () => void {
    if (!db) {
      const error = new Error('Firebase not initialized');
      console.error('Firebase not initialized');
      if (onError) {
        onError(error);
      }
      callback([]);
      return () => {};
    }

    try {
      let q = query(
        collection(db, 'packaging-reports'),
        where('workDate', '>=', startDate),
        where('workDate', '<=', endDate),
        orderBy('workDate', 'desc')
      );
      
      // limitCount가 0 이하이면 limit을 적용하지 않음 (모든 문서 조회)
      if (limitCount > 0) {
        q = query(q, limit(limitCount));
      }

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
          console.error('Error in packaging reports date range subscription:', error);
          if (onError) {
            onError(error as Error);
          }
        }
      );
    } catch (error) {
      console.error('Error setting up packaging reports date range subscription:', error);
      if (onError) {
        onError(error as Error);
      }
      callback([]);
      return () => {};
    }
  }

  /**
   * 특정 packaging report 삭제
   */
  static async deletePackagingReport(
    reportId: string,
    user?: ReportUser,
    reportData?: PackagingReport
  ): Promise<void> {
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
    updateData: Partial<PackagingReport>,
    user?: ReportUser
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

      const nowIso = new Date().toISOString();
      cleanedData.updatedAt = nowIso;
      cleanedData.needsSheetSync = true;

      await updateDoc(doc(db, 'packaging-reports', reportId), cleanedData);
      
      // 생산일보 수정 알림 전송 (user 정보가 있을 때만)
      if (user) {
        try {
          // 현재 보고서 정보 조회 (이전 상태 확인용)
          const currentReportDoc = await getDocs(query(
            collection(db, 'packaging-reports'),
            where('__name__', '==', reportId)
          ));
          
          if (!currentReportDoc.empty) {
            const currentReport = { id: reportId, ...currentReportDoc.docs[0].data() } as PackagingReport;
            
            // 시간 필드가 변경되었는지 확인
            const oldStartTime = currentReport.startTime || '';
            const oldEndTime = currentReport.endTime || '';
            const newStartTime = cleanedData.startTime || oldStartTime;
            const newEndTime = cleanedData.endTime || oldEndTime;
            
            // 상태 변경 확인
            const oldStatus = calculateStatus(oldStartTime, oldEndTime);
            const newStatus = calculateStatus(String(newStartTime), String(newEndTime));
            
            // 상태가 변경된 경우에만 상태 변경 알림 발송
            if (oldStatus !== newStatus) {
              const updatedReport: PackagingReport = {
                ...currentReport,
                ...cleanedData,
                status: newStatus
              };
              
              await DailyReportNotificationService.sendDailyReportStatusChangeNotification(
                oldStatus,
                newStatus,
                updatedReport,
                {
                  uid: user.uid,
                  displayName: user.displayName || 'Unknown User',
                  photoURL: undefined
                }
              );
            }
          }
        } catch (notificationError) {
          console.error('생산일보 수정 알림 전송 실패:', notificationError);
          // 알림 실패해도 수정은 성공으로 처리
        }
      }
    } catch (error) {
      console.error('Error updating packaging report:', error);
      throw error;
    }
  }

  /**
   * 생산일보 작업 상태 변경
   */
  static async updatePackagingReportStatus(
    reportId: string,
    newStatus: ProductionStatus,
    user: ReportUser
  ): Promise<void> {
    try {
      if (!db) {
        throw new Error('Firebase not initialized');
      }

      // 현재 상태 조회
      const reportDoc = await getDocs(query(
        collection(db, 'packaging-reports'),
        where('__name__', '==', reportId)
      ));
      
      if (reportDoc.empty) {
        throw new Error('Report not found');
      }

      const currentReport = { id: reportId, ...reportDoc.docs[0].data() } as PackagingReport;
      const oldStatus = currentReport.status;

      // 상태 업데이트
      await updateDoc(doc(db, 'packaging-reports', reportId), {
        status: newStatus,
        updatedAt: new Date().toISOString(),
        needsSheetSync: true,
      });

      // 상태 변경 알림 전송
      try {
        const updatedReport = { ...currentReport, status: newStatus };
        await DailyReportNotificationService.sendDailyReportStatusChangeNotification(
          oldStatus,
          newStatus,
          updatedReport,
          {
            uid: user.uid,
            displayName: user.displayName || 'Unknown User',
            photoURL: undefined
          }
        );
      } catch (notificationError) {
        console.error('생산일보 상태 변경 알림 전송 실패:', notificationError);
        // 알림 실패해도 상태 변경은 성공으로 처리
      }
    } catch (error) {
      console.error('Error updating packaging report status:', error);
      throw error;
    }
  }
}


