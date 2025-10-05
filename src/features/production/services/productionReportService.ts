import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  query, 
  orderBy, 
  where, 
  limit,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/shared/services/firebase/config';
import { 
  PackagingReport, 
  ExcelProductionReport, 
  PackagingFormData,
  ProductionReportStats 
} from '@/features/production/types';

const COLLECTION_NAME = 'production-reports';
const EXCEL_COLLECTION_NAME = 'excel-production-reports';

export class ProductionReportService {
  // 생산일보 생성
  static async createReport(formData: PackagingFormData, user: any): Promise<string> {
    try {
      const reportData: Omit<PackagingReport, 'id'> = {
        createdAt: new Date().toISOString(),
        workDate: formData.workDate,
        author: {
          uid: user.uid,
          displayName: user.displayName || user.email
        },
        productionLine: formData.productionLine,
        orderNumbers: formData.orderNumbers.filter(num => num.trim() !== ''),
        supplier: formData.supplier,
        productName: formData.productName,
        partName: formData.partName,
        orderQuantity: formData.orderQuantity ? parseInt(formData.orderQuantity) : undefined,
        specification: formData.specification,
        lineRatio: formData.lineRatio,
        productionPerMinute: formData.productionPerMinute ? parseInt(formData.productionPerMinute) : undefined,
        uph: formData.uph ? parseInt(formData.uph) : undefined,
        inputQuantity: formData.inputQuantity ? parseInt(formData.inputQuantity) : undefined,
        goodQuantity: formData.goodQuantity ? parseInt(formData.goodQuantity) : undefined,
        defectQuantity: formData.defectQuantity ? parseInt(formData.defectQuantity) : undefined,
        personnelCount: formData.personnelCount ? parseInt(formData.personnelCount) : undefined,
        startTime: formData.startTime,
        endTime: formData.endTime,
        packagingUnit: formData.packagingUnit ? parseInt(formData.packagingUnit) : undefined,
        boxCount: formData.boxCount ? parseInt(formData.boxCount) : undefined,
        remainder: formData.remainder ? parseInt(formData.remainder) : undefined,
        packagedBoxes: formData.packagedBoxes,
        memo: formData.memo,
        imageUrls: []
      };

      const docRef = await addDoc(collection(db, COLLECTION_NAME), reportData);
      return docRef.id;
    } catch (error) {
      console.error('생산일보 생성 실패:', error);
      throw new Error('생산일보 생성에 실패했습니다.');
    }
  }

  // 생산일보 수정
  static async updateReport(reportId: string, formData: PackagingFormData): Promise<void> {
    try {
      const reportRef = doc(db, COLLECTION_NAME, reportId);
      
      const updateData = {
        workDate: formData.workDate,
        productionLine: formData.productionLine,
        orderNumbers: formData.orderNumbers.filter(num => num.trim() !== ''),
        supplier: formData.supplier,
        productName: formData.productName,
        partName: formData.partName,
        orderQuantity: formData.orderQuantity ? parseInt(formData.orderQuantity) : null,
        specification: formData.specification,
        lineRatio: formData.lineRatio,
        productionPerMinute: formData.productionPerMinute ? parseInt(formData.productionPerMinute) : null,
        uph: formData.uph ? parseInt(formData.uph) : null,
        inputQuantity: formData.inputQuantity ? parseInt(formData.inputQuantity) : null,
        goodQuantity: formData.goodQuantity ? parseInt(formData.goodQuantity) : null,
        defectQuantity: formData.defectQuantity ? parseInt(formData.defectQuantity) : null,
        personnelCount: formData.personnelCount ? parseInt(formData.personnelCount) : null,
        startTime: formData.startTime,
        endTime: formData.endTime,
        packagingUnit: formData.packagingUnit ? parseInt(formData.packagingUnit) : null,
        boxCount: formData.boxCount ? parseInt(formData.boxCount) : null,
        remainder: formData.remainder ? parseInt(formData.remainder) : null,
        packagedBoxes: formData.packagedBoxes,
        memo: formData.memo
      };

      await updateDoc(reportRef, updateData);
    } catch (error) {
      console.error('생산일보 수정 실패:', error);
      throw new Error('생산일보 수정에 실패했습니다.');
    }
  }

  // 생산일보 삭제
  static async deleteReport(reportId: string): Promise<void> {
    try {
      const reportRef = doc(db, COLLECTION_NAME, reportId);
      await deleteDoc(reportRef);
    } catch (error) {
      console.error('생산일보 삭제 실패:', error);
      throw new Error('생산일보 삭제에 실패했습니다.');
    }
  }

  // 생산일보 목록 조회
  static async getReports(limitCount: number = 100): Promise<PackagingReport[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        orderBy('workDate', 'desc'),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as PackagingReport));
    } catch (error) {
      console.error('생산일보 목록 조회 실패:', error);
      throw new Error('생산일보 목록을 불러오는데 실패했습니다.');
    }
  }

  // 생산일보 상세 조회
  static async getReport(reportId: string): Promise<PackagingReport | null> {
    try {
      const reportRef = doc(db, COLLECTION_NAME, reportId);
      const reportSnap = await getDoc(reportRef);
      
      if (reportSnap.exists()) {
        return {
          id: reportSnap.id,
          ...reportSnap.data()
        } as PackagingReport;
      }
      return null;
    } catch (error) {
      console.error('생산일보 상세 조회 실패:', error);
      throw new Error('생산일보 상세 정보를 불러오는데 실패했습니다.');
    }
  }

  // 생산일보 통계 조회
  static async getReportStats(): Promise<ProductionReportStats> {
    try {
      const reports = await this.getReports(1000); // 최근 1000건으로 통계 계산
      
      const totalReports = reports.length;
      const totalInputQuantity = reports.reduce((sum, report) => sum + (report.inputQuantity || 0), 0);
      const totalGoodQuantity = reports.reduce((sum, report) => sum + (report.goodQuantity || 0), 0);
      const totalDefectQuantity = reports.reduce((sum, report) => sum + (report.defectQuantity || 0), 0);
      
      // 수율 계산
      const averageYieldRate = totalInputQuantity > 0 ? (totalGoodQuantity / totalInputQuantity) * 100 : 0;
      const averageDefectRate = totalInputQuantity > 0 ? (totalDefectQuantity / totalInputQuantity) * 100 : 0;

      // 생산라인별 통계
      const lineStats = new Map<string, { count: number; totalQuantity: number }>();
      reports.forEach(report => {
        const current = lineStats.get(report.productionLine) || { count: 0, totalQuantity: 0 };
        lineStats.set(report.productionLine, {
          count: current.count + 1,
          totalQuantity: current.totalQuantity + (report.goodQuantity || 0)
        });
      });

      const topProductionLines = Array.from(lineStats.entries())
        .map(([line, stats]) => ({ line, ...stats }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // 발주처별 통계
      const supplierStats = new Map<string, { count: number; totalQuantity: number }>();
      reports.forEach(report => {
        const current = supplierStats.get(report.supplier) || { count: 0, totalQuantity: 0 };
        supplierStats.set(report.supplier, {
          count: current.count + 1,
          totalQuantity: current.totalQuantity + (report.goodQuantity || 0)
        });
      });

      const topSuppliers = Array.from(supplierStats.entries())
        .map(([supplier, stats]) => ({ supplier, ...stats }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        totalReports,
        totalInputQuantity,
        totalGoodQuantity,
        totalDefectQuantity,
        averageYieldRate,
        averageDefectRate,
        topProductionLines,
        topSuppliers
      };
    } catch (error) {
      console.error('생산일보 통계 조회 실패:', error);
      throw new Error('생산일보 통계를 불러오는데 실패했습니다.');
    }
  }

  // 실시간 생산일보 목록 구독
  static subscribeToReports(
    callback: (reports: PackagingReport[]) => void,
    limitCount: number = 100
  ): () => void {
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy('workDate', 'desc'),
      limit(limitCount)
    );

    return onSnapshot(q, (querySnapshot) => {
      const reports = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as PackagingReport));
      callback(reports);
    });
  }

  // 엑셀 생산일보 업로드
  static async uploadExcelReports(
    reports: ExcelProductionReport[], 
    fileName: string
  ): Promise<void> {
    try {
      const batch = reports.map(report => {
        const reportData = {
          ...report,
          excelFileName: fileName,
          isFromExcel: true,
          createdAt: new Date().toISOString()
        };
        
        return addDoc(collection(db, EXCEL_COLLECTION_NAME), reportData);
      });

      await Promise.all(batch);
    } catch (error) {
      console.error('엑셀 생산일보 업로드 실패:', error);
      throw new Error('엑셀 생산일보 업로드에 실패했습니다.');
    }
  }

  // 엑셀 생산일보 목록 조회
  static async getExcelReports(limitCount: number = 100): Promise<ExcelProductionReport[]> {
    try {
      const q = query(
        collection(db, EXCEL_COLLECTION_NAME),
        orderBy('workDate', 'desc'),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ExcelProductionReport));
    } catch (error) {
      console.error('엑셀 생산일보 목록 조회 실패:', error);
      throw new Error('엑셀 생산일보 목록을 불러오는데 실패했습니다.');
    }
  }
}
