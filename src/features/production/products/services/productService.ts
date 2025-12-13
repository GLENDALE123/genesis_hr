/**
 * 제품관리 서비스
 * Firestore의 여러 컬렉션에서 제품 정보를 조회 및 집계
 */

import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy,
  limit as firestoreLimit
} from 'firebase/firestore';
import { db } from '@/shared/services/firebase/config';
import { Product } from '../types';
import { PackagingReport } from '@/features/production/packaging';
import type { QualityInspection } from '@/features/quality/types';
import type { QualityIssue } from '@/features/quality/types';
import { 
  ProductDetail,
  ProductionHistoryItem,
  CoatingHistoryItem,
  MemoItem,
  ShortageHistoryItem,
  QualityIssueItem,
  QualityInspectionItem,
  JigHistoryItem,
  ProductionTrendData
} from '../types';
import { getCachedProducts, cacheProducts } from '@/shared/services/cache/productSummaryCache';
import { ShortageRequest } from '@/features/production/shortage';

/**
 * 제품 고유 ID 생성
 * supplier+productName+partName+specification 조합
 */
export const generateProductId = (
  supplier: string,
  productName: string,
  partName: string,
  specification: string
): string => {
  const safeKey = `${supplier}_${productName}_${partName}_${specification}`
    .replace(/[^a-zA-Z0-9가-힣_]/g, '')
    .replace(/\s+/g, '_');
  return safeKey;
};

/**
 * 제품 목록 조회 (캐시 컬렉션에서)
 * product-summary 컬렉션에서 사전 집계된 데이터 조회
 * 필드 선택적 조회로 네트워크 비용 최적화
 * 
 * @param searchTerm 검색어 (supplier, productName, partName에서 검색)
 * @param filters 필터 옵션 (supplier, productName, partName)
 */
export const getProductsFromCache = async (
  searchTerm?: string,
  filters?: {
    supplier?: string;
    productName?: string;
    partName?: string;
  }
): Promise<Product[]> => {
  try {
    // 로컬 캐시 확인 (필터나 검색어가 없을 때만)
    if (!searchTerm && !filters?.supplier && !filters?.productName && !filters?.partName) {
      const cached = await getCachedProducts();
      if (cached) {
        return cached;
      }
    }

    if (!db) {
      throw new Error('Firebase not initialized');
    }

    let q = query(
      collection(db, 'product-summary')
    );

    // 서버 사이드 필터링: supplier 필터
    if (filters?.supplier) {
      q = query(q, where('supplier', '==', filters.supplier));
    }

    // 서버 사이드 필터링: productName 필터
    if (filters?.productName) {
      q = query(q, where('productName', '==', filters.productName));
    }

    // 서버 사이드 필터링: partName 필터
    if (filters?.partName) {
      q = query(q, where('partName', '==', filters.partName));
    }

    // 정렬: supplier, productName 순서
    q = query(q, orderBy('supplier', 'asc'), orderBy('productName', 'asc'));

    const snapshot = await getDocs(q);
    
    let products: Product[] = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: data.id || doc.id,
        supplier: data.supplier || '',
        productName: data.productName || '',
        partName: data.partName || '',
        specification: data.specification || '',
        latestJig: data.latestJig,
        latestUndercoatData: data.latestUndercoatData,
        latestTopcoatData: data.latestTopcoatData,
        averagePersonnelCount: data.averagePersonnelCount,
        latestLineRatio: data.latestLineRatio,
        averageRPM: data.averageRPM
      };
    });

    // 클라이언트 사이드 검색: 검색어가 있으면 필터링
    // (Firestore의 텍스트 검색은 제한적이므로 클라이언트에서 부분 검색 수행)
    if (searchTerm && searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      products = products.filter(product => {
        return (
          product.supplier.toLowerCase().includes(searchLower) ||
          product.productName.toLowerCase().includes(searchLower) ||
          product.partName.toLowerCase().includes(searchLower) ||
          product.specification.toLowerCase().includes(searchLower)
        );
      });
    }

    // 로컬 캐시에 저장 (필터나 검색어가 없을 때만)
    if (!searchTerm && !filters?.supplier && !filters?.productName && !filters?.partName) {
      cacheProducts(products).catch(() => {
        // 캐시 저장 실패는 무시
      });
    }

    return products;
  } catch (error) {
    console.error('Error fetching products from cache:', error);
    // 캐시 조회 실패 시 기존 방식으로 fallback
    return getProducts();
  }
};

/**
 * 제품 목록 조회 (중복 제거)
 * packaging-reports에서 고유한 제품 목록 추출
 * 최신 사용지그, 최신 하도데이터, 최신 상도데이터 포함
 * @deprecated 캐시 컬렉션이 구축되면 getProductsFromCache 사용 권장
 */
export const getProducts = async (limitCount: number = 2000): Promise<Product[]> => {
  try {
    if (!db) {
      throw new Error('Firebase not initialized');
    }

    // packaging-reports 조회
    const q = query(
      collection(db, 'packaging-reports'),
      orderBy('workDate', 'desc'),
      firestoreLimit(limitCount)
    );

    const snapshot = await getDocs(q);
    const reports = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as PackagingReport));

    // quality-inspections 조회 (최신 지그 정보용)
    const qualityInspectionsQuery = query(
      collection(db, 'quality-inspections'),
      orderBy('createdAt', 'desc'),
      firestoreLimit(limitCount)
    );

    const qualityInspectionsSnapshot = await getDocs(qualityInspectionsQuery);
    const qualityInspections = qualityInspectionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as QualityInspection));

    // 제품 중복 제거 및 최신 정보 수집 (Map 사용)
    const productMap = new Map<string, {
      product: Product;
      latestJig?: string;
      latestJigDate?: string; // 최신 지그 정보의 날짜
      latestUndercoatData?: string;
      latestTopcoatData?: string;
      personnelCounts: number[]; // 평균작업인원 계산용
      latestLineRatio?: string; // 최근 비율(스핀들비율)
      rpmValues: number[]; // 평균 작업속도(RPM) 계산용
    }>();

    // packaging-reports에서 제품 정보 및 최신 도료 정보 수집
    reports.forEach(report => {
      if (!report.supplier || !report.partName || !report.specification) {
        return; // 필수 필드가 없으면 스킵
      }

      // 발주번호별로 제품 분리
      const orderNumbers = report.orderNumbers || [];
      const productNames = report.productName 
        ? report.productName.split(',').map(name => name.trim()).filter(Boolean)
        : [];

      // 발주번호와 제품명이 모두 있는 경우, 각 발주번호별로 제품 생성
      if (orderNumbers.length > 0 && productNames.length > 0) {
        // 발주번호와 제품명의 개수가 다를 수 있으므로, 최대 개수만큼 처리
        const maxLength = Math.max(orderNumbers.length, productNames.length);
        
        for (let i = 0; i < maxLength; i++) {
          const orderNumber = orderNumbers[i] || '';
          const productName = productNames[i] || productNames[0] || report.productName || '';
          
          if (!productName) continue;

          const productId = generateProductId(
            report.supplier,
            productName,
            report.partName,
            report.specification
          );

          if (!productMap.has(productId)) {
          productMap.set(productId, {
            product: {
              id: productId,
              supplier: report.supplier,
              productName: productName,
              partName: report.partName,
              specification: report.specification
            },
            personnelCounts: [],
            rpmValues: []
          });
          }

          const productData = productMap.get(productId)!;
          
          // 최신 하도데이터 업데이트
          if (report.processConditions?.undercoat?.conditions && !productData.latestUndercoatData) {
            productData.latestUndercoatData = report.processConditions.undercoat.conditions;
          }

          // 최신 상도데이터 업데이트
          if (report.processConditions?.topcoat?.conditions && !productData.latestTopcoatData) {
            productData.latestTopcoatData = report.processConditions.topcoat.conditions;
          }

          // 평균작업인원 계산용 데이터 수집 (0도 유효한 값)
          if (typeof report.personnelCount === 'number' && report.personnelCount >= 0) {
            productData.personnelCounts.push(report.personnelCount);
          }

          // 최근 비율(스핀들비율) 업데이트 (가장 최근 데이터, 빈 문자열이 아닐 때만)
          if (!productData.latestLineRatio && report.lineRatio && report.lineRatio.trim() !== '') {
            productData.latestLineRatio = report.lineRatio.trim();
          }
        }
      } else {
        // 발주번호나 제품명이 없는 경우 기존 로직 사용
        if (!report.productName) {
          return;
        }

        const productId = generateProductId(
          report.supplier,
          report.productName,
          report.partName,
          report.specification
        );

        if (!productMap.has(productId)) {
          productMap.set(productId, {
            product: {
              id: productId,
              supplier: report.supplier,
              productName: report.productName,
              partName: report.partName,
              specification: report.specification
            },
            personnelCounts: [],
            rpmValues: []
          });
        }

        const productData = productMap.get(productId)!;
        
        // 최신 하도데이터 업데이트
        if (report.processConditions?.undercoat?.conditions && !productData.latestUndercoatData) {
          productData.latestUndercoatData = report.processConditions.undercoat.conditions;
        }

        // 최신 상도데이터 업데이트
        if (report.processConditions?.topcoat?.conditions && !productData.latestTopcoatData) {
          productData.latestTopcoatData = report.processConditions.topcoat.conditions;
        }

        // 평균작업인원 계산용 데이터 수집 (0도 유효한 값)
        if (typeof report.personnelCount === 'number' && report.personnelCount >= 0) {
          productData.personnelCounts.push(report.personnelCount);
        }

        // 최근 비율(스핀들비율) 업데이트 (가장 최근 데이터, 빈 문자열이 아닐 때만)
        if (!productData.latestLineRatio && report.lineRatio && report.lineRatio.trim() !== '') {
          productData.latestLineRatio = report.lineRatio.trim();
        }
      }
    });

    // quality-inspections에서 최신 지그 정보 및 RPM 정보 수집
    qualityInspections.forEach(inspection => {
      if (!inspection.supplier || !inspection.productName || !inspection.partName) {
        return;
      }

      const productId = generateProductId(
        inspection.supplier,
        inspection.productName,
        inspection.partName,
        inspection.specification || ''
      );

      if (!productMap.has(productId)) {
        return; // 해당 제품이 packaging-reports에 없으면 스킵
      }

      const productData = productMap.get(productId)!;

      // 최신 지그 정보 업데이트 (날짜 비교하여 최신 정보로 업데이트)
      let inspectionDate = inspection.inspectionDate || '';
      if (!inspectionDate && inspection.createdAt) {
        if (typeof inspection.createdAt === 'string') {
          inspectionDate = inspection.createdAt;
        } else if (inspection.createdAt && typeof inspection.createdAt === 'object' && 'toISOString' in inspection.createdAt) {
          inspectionDate = (inspection.createdAt as Date).toISOString();
        }
      }
      
      const jigInfo = [
        inspection.jigUsed,
        inspection.jigUsed1,
        inspection.jigUsed2,
        inspection.internalJigLower,
        inspection.internalJigUpper
      ].filter(Boolean).join(', ');

      if (jigInfo) {
        // 기존 지그 정보가 없거나, 현재 검사가 더 최신인 경우 업데이트
        if (!productData.latestJig) {
          productData.latestJig = jigInfo;
          if (inspectionDate) {
            productData.latestJigDate = inspectionDate;
          }
        } else {
          // 날짜 비교하여 최신 정보로 업데이트
          const existingDate = productData.latestJigDate || '';
          if (inspectionDate && (!existingDate || inspectionDate > existingDate)) {
            productData.latestJig = jigInfo;
            productData.latestJigDate = inspectionDate;
          }
        }
      }

      // 평균 작업속도(RPM) 계산용 데이터 수집 (공정검사에서만)
      if (inspection.inspectionType === 'inProcess' && inspection.processLines && inspection.processLines.length > 0) {
        inspection.processLines.forEach(processLine => {
          if (processLine.lineSpeed) {
            // lineSpeed는 문자열일 수 있으므로 숫자로 변환
            const lineSpeedStr = String(processLine.lineSpeed).trim();
            // "rpm" 같은 단위 제거
            const cleanedSpeed = lineSpeedStr.replace(/[^\d.]/g, '');
            const rpm = parseFloat(cleanedSpeed);
            if (!isNaN(rpm) && rpm > 0) {
              productData.rpmValues.push(rpm);
            }
          }
        });
      }
    });

    // Product 배열로 변환
    return Array.from(productMap.values()).map(data => {
      // 평균작업인원 계산
      const averagePersonnelCount = data.personnelCounts.length > 0
        ? Math.round(data.personnelCounts.reduce((sum, count) => sum + count, 0) / data.personnelCounts.length * 10) / 10
        : undefined;

      // 평균 작업속도(RPM) 계산
      const averageRPM = data.rpmValues.length > 0
        ? Math.round(data.rpmValues.reduce((sum, rpm) => sum + rpm, 0) / data.rpmValues.length * 10) / 10
        : undefined;

      return {
        ...data.product,
        latestJig: data.latestJig,
        latestUndercoatData: data.latestUndercoatData,
        latestTopcoatData: data.latestTopcoatData,
        averagePersonnelCount,
        latestLineRatio: data.latestLineRatio,
        averageRPM
      };
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
};

/**
 * 제품 상세 정보 조회
 * 여러 컬렉션에서 데이터를 병렬로 조회하여 집계
 */
export const getProductDetail = async (
  productId: string,
  productInfo?: { supplier?: string; productName?: string; partName?: string; specification?: string }
): Promise<ProductDetail | null> => {
  try {
    if (!db) {
      throw new Error('Firebase not initialized');
    }

    let supplier: string;
    let productName: string;
    let partName: string;
    let specification: string;

    // 이미 알고 있는 기본 정보가 있으면 재사용 (중복 조회 방지)
    if (productInfo?.supplier && productInfo?.productName && productInfo?.partName && productInfo?.specification) {
      supplier = productInfo.supplier;
      productName = productInfo.productName;
      partName = productInfo.partName;
      specification = productInfo.specification;
    } else {
      // product-summary에서 기본 정보 조회 (빠른 조회)
      const productSummaryRef = collection(db, 'product-summary');
      const productSummaryDoc = await getDocs(
        query(productSummaryRef, where('id', '==', productId), firestoreLimit(1))
      );

      if (!productSummaryDoc.empty) {
        // product-summary에서 정보 가져오기
        const summaryData = productSummaryDoc.docs[0].data();
        supplier = summaryData.supplier || '';
        productName = summaryData.productName || '';
        partName = summaryData.partName || '';
        specification = summaryData.specification || '';
      } else {
        // product-summary에 없으면 packaging-reports에서 찾기 (fallback)
        const packagingQuery = query(
          collection(db, 'packaging-reports'),
          orderBy('workDate', 'desc'),
          firestoreLimit(2000)
        );

        const packagingSnapshot = await getDocs(packagingQuery);
        const allReports = packagingSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as PackagingReport));

        const matchingReport = allReports.find(report => {
          if (!report.supplier || !report.productName || !report.partName || !report.specification) {
            return false;
          }
          const id = generateProductId(
            report.supplier,
            report.productName,
            report.partName,
            report.specification
          );
          return id === productId;
        });

        if (!matchingReport) {
          return null;
        }

        supplier = matchingReport.supplier;
        productName = matchingReport.productName;
        partName = matchingReport.partName;
        specification = matchingReport.specification;
      }
    }

    // 병렬로 모든 컬렉션 조회 (서버 사이드 필터링 사용)
    const [
      packagingReports,
      qualityInspections,
      shortageRequests,
      qualityIssues
    ] = await Promise.all([
      // packaging-reports 조회 (서버 사이드 필터링)
      (async () => {
        try {
          // 1) 기준 쿼리: supplier + productName + partName + specification
          const baseQuery = query(
            collection(db, 'packaging-reports'),
            where('supplier', '==', supplier),
            where('productName', '==', productName),
            where('partName', '==', partName),
            where('specification', '==', specification),
            orderBy('workDate', 'desc'),
            firestoreLimit(2000)
          );
          let snapshot = await getDocs(baseQuery);

          // 2) 결과가 없으면 완화 쿼리: supplier + partName (productName/사양 표기 차이 대응)
          if (snapshot.empty) {
            const relaxedQuery = query(
              collection(db, 'packaging-reports'),
              where('supplier', '==', supplier),
              where('partName', '==', partName),
              orderBy('workDate', 'desc'),
              firestoreLimit(2000)
            );
            snapshot = await getDocs(relaxedQuery);
          }

          return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as PackagingReport));
        } catch (error) {
          console.error('Error fetching packaging reports:', error);
          // 인덱스가 없을 수 있으므로 fallback으로 전체 조회
          const q = query(
            collection(db, 'packaging-reports'),
            orderBy('workDate', 'desc'),
            firestoreLimit(2000)
          );
          const snapshot = await getDocs(q);
          return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as PackagingReport));
        }
      })(),
      // quality-inspections 조회 (서버 사이드 필터링)
      (async () => {
        try {
          const q = query(
            collection(db, 'quality-inspections'),
            where('supplier', '==', supplier),
            where('productName', '==', productName),
            where('partName', '==', partName),
            orderBy('createdAt', 'desc'),
            firestoreLimit(2000)
          );
          const snapshot = await getDocs(q);
          return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as QualityInspection));
        } catch (error) {
          console.error('Error fetching quality inspections:', error);
          // 인덱스가 없을 수 있으므로 fallback으로 전체 조회
          const q = query(
            collection(db, 'quality-inspections'),
            orderBy('createdAt', 'desc'),
            firestoreLimit(2000)
          );
          const snapshot = await getDocs(q);
          return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as QualityInspection));
        }
      })(),
      // shortage-requests 조회 (서버 사이드 필터링)
      (async () => {
        try {
          const q = query(
            collection(db, 'shortage-requests'),
            where('supplier', '==', supplier),
            where('productName', '==', productName),
            where('partName', '==', partName),
            where('specification', '==', specification),
            orderBy('createdAt', 'desc'),
            firestoreLimit(1000)
          );
          const snapshot = await getDocs(q);
          return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as ShortageRequest));
        } catch (error) {
          console.error('Error fetching shortage requests:', error);
          return [];
        }
      })(),
      // quality-issues 조회 (서버 사이드 필터링)
      (async () => {
        try {
          // specification 필터 포함 시도
          const q = query(
            collection(db, 'quality-issues'),
            where('supplier', '==', supplier),
            where('productName', '==', productName),
            where('partName', '==', partName),
            where('specification', '==', specification),
            orderBy('createdAt', 'desc'),
            firestoreLimit(1000)
          );
          const snapshot = await getDocs(q);
          return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as QualityIssue));
        } catch (error) {
          console.error('Error fetching quality issues with specification:', error);
          // specification 필터가 실패하면 (인덱스 없음 등) specification 없이 재시도
          try {
            const q = query(
              collection(db, 'quality-issues'),
              where('supplier', '==', supplier),
              where('productName', '==', productName),
              where('partName', '==', partName),
              orderBy('createdAt', 'desc'),
              firestoreLimit(1000)
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            } as QualityIssue));
          } catch (error2) {
            console.error('Error fetching quality issues without specification:', error2);
            return [];
          }
        }
      })()
    ]);

    // 제품 정보와 일치하는 항목들 필터링
    const isProductMatch = (
      itemSupplier: string,
      itemProductName: string,
      itemPartName: string,
      itemSpecification: string
    ): boolean => {
      const norm = (v: string | undefined | null) => (v || '').trim().toLowerCase();
      const aSupplier = norm(itemSupplier);
      const aProduct = norm(itemProductName);
      const aPart = norm(itemPartName);
      const aSpec = norm(itemSpecification);
      const bSupplier = norm(supplier);
      const bProduct = norm(productName);
      const bPart = norm(partName);
      const bSpec = norm(specification);

      // supplier, partName는 정확히 일치 (대소문자 무시)
      if (aSupplier !== bSupplier || aPart !== bPart) {
        return false;
      }

      // productName은 포함/포함당함 허용 (쉼표로 이어진 케이스 대응)
      const productMatch =
        aProduct === bProduct ||
        aProduct.includes(bProduct) ||
        bProduct.includes(aProduct);

      if (!productMatch) {
        return false;
      }

      // specification은 둘 중 하나가 비어도 통과, 있으면 일치 필요
      const specMatch = !aSpec || !bSpec ? true : aSpec === bSpec;

      return specMatch;
    };

    // 생산이력
    const productionHistory: ProductionHistoryItem[] = packagingReports
      .filter(report => isProductMatch(
        report.supplier,
        report.productName,
        report.partName,
        report.specification
      ))
      .map(report => ({
        id: report.id,
        orderNumber: report.orderNumbers?.[0] || '',
        workDate: report.workDate,
        productionLine: report.productionLine,
        orderQuantity: report.orderQuantity || 0,
        inputQuantity: report.inputQuantity,
        goodQuantity: report.goodQuantity,
        defectQuantity: report.defectQuantity,
        status: report.status || '대기',
        personnelCount: report.personnelCount,
        lineRatio: report.lineRatio,
        startTime: report.startTime,
        endTime: report.endTime,
        memo: report.memo
      }))
      .sort((a, b) => b.workDate.localeCompare(a.workDate));

    // 도료사용이력 (같은 날짜의 하도/상도를 하나로 묶고, 변경될 때만 기록)
    const coatingHistory: CoatingHistoryItem[] = [];
    const coatingMap = new Map<string, { undercoat?: any; topcoat?: any; orderNumber: string; workDate: string; productionLine?: string }>();
    
    packagingReports
      .filter(report => isProductMatch(
        report.supplier,
        report.productName,
        report.partName,
        report.specification
      ))
      .forEach(report => {
        const orderNumber = report.orderNumbers?.[0] || '';
        const key = `${report.workDate}_${orderNumber}`;
        
        if (!coatingMap.has(key)) {
          coatingMap.set(key, {
            orderNumber,
            workDate: report.workDate,
            productionLine: report.productionLine
          });
        }
        
        const entry = coatingMap.get(key)!;
        
        // 생산라인 업데이트 (없을 때만)
        if (!entry.productionLine && report.productionLine) {
          entry.productionLine = report.productionLine;
        }
        
        // 하도 데이터
        if (report.processConditions?.undercoat) {
          entry.undercoat = {
            conditions: report.processConditions.undercoat.conditions,
            remarks: report.processConditions.undercoat.remarks
          };
        }
        
        // 상도 데이터
        if (report.processConditions?.topcoat) {
          entry.topcoat = {
            conditions: report.processConditions.topcoat.conditions,
            remarks: report.processConditions.topcoat.remarks
          };
        }
      });
    
    // Map을 배열로 변환하고 날짜순으로 정렬
    const coatingEntries = Array.from(coatingMap.entries())
      .map(([key, entry]) => ({ key, ...entry }))
      .sort((a, b) => a.workDate.localeCompare(b.workDate));
    
    // 변경 감지를 위해 이전 항목과 비교
    let lastCoatingEntry: { undercoat?: any; topcoat?: any } | null = null;
    
    coatingEntries.forEach((entry) => {
      const hasUndercoat = !!entry.undercoat;
      const hasTopcoat = !!entry.topcoat;
      
      // 이전 항목과 비교하여 변경되었는지 확인
      const isChanged = !lastCoatingEntry ||
        JSON.stringify(lastCoatingEntry.undercoat) !== JSON.stringify(entry.undercoat) ||
        JSON.stringify(lastCoatingEntry.topcoat) !== JSON.stringify(entry.topcoat);
      
      if (isChanged) {
        if (hasUndercoat && hasTopcoat) {
          // 하도와 상도가 모두 있으면 하나로 묶기
          coatingHistory.push({
            id: entry.key,
            productionLine: entry.productionLine,
            workDate: entry.workDate,
            orderNumber: entry.orderNumber,
            coatingType: 'both',
            coatingData: {
              undercoat: entry.undercoat,
              topcoat: entry.topcoat
            }
          });
        } else if (hasUndercoat) {
          coatingHistory.push({
            id: `${entry.key}_undercoat`,
            workDate: entry.workDate,
            orderNumber: entry.orderNumber,
            productionLine: entry.productionLine,
            coatingType: 'undercoat',
            coatingData: entry.undercoat
          });
        } else if (hasTopcoat) {
          coatingHistory.push({
            id: `${entry.key}_topcoat`,
            workDate: entry.workDate,
            orderNumber: entry.orderNumber,
            productionLine: entry.productionLine,
            coatingType: 'topcoat',
            coatingData: entry.topcoat
          });
        }
        
        lastCoatingEntry = { undercoat: entry.undercoat, topcoat: entry.topcoat };
      }
    });
    
    coatingHistory.sort((a, b) => b.workDate.localeCompare(a.workDate));

    // 생산일보 메모
    const memos: MemoItem[] = packagingReports
      .filter(report => 
        isProductMatch(
          report.supplier,
          report.productName,
          report.partName,
          report.specification
        ) && report.memo && report.memo.trim() !== ''
      )
      .map(report => ({
        id: report.id,
        workDate: report.workDate,
        orderNumber: report.orderNumbers?.[0] || '',
        memo: report.memo || '',
        author: report.author
      }))
      .sort((a, b) => b.workDate.localeCompare(a.workDate));

    // 부족분 진행 이력
    const shortageHistory: ShortageHistoryItem[] = shortageRequests
      .filter(request => isProductMatch(
        request.supplier,
        request.productName,
        request.partName,
        request.specification
      ))
      .map(request => ({
        id: request.id,
        createdAt: request.createdAt,
        requestedShortageQuantity: request.requestedShortageQuantity,
        shortageReason: request.shortageReason,
        status: request.status,
        orderNumber: request.orderNumbers?.[0] || ''
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    // 품질이슈 (발주처, 제품명, 부속명, 사양으로 필터링 + 발주번호 매칭)
    const qualityIssueItems: QualityIssueItem[] = qualityIssues
      .filter(issue => {
        // 기본 매칭: supplier, productName, partName
        const basicMatch = issue.supplier === supplier &&
                       issue.productName === productName &&
                       issue.partName === partName;

        // specification 매칭: 제품에 spec이 있으면 issue에도 spec이 있고 같아야 함
        const issueSpec = (issue as any).specification;
        const specMatch = specification
          ? (issueSpec ? issueSpec === specification : false)
          : !issueSpec; // 제품에 spec이 없으면 issue에도 spec이 없어야 함

        // 발주번호 매칭: issue.orderNumber와 생산일보 orderNumbers가 하나라도 겹치면 매칭
        const matchesOrderNumber = (() => {
          if (!issue.orderNumber) return false;
          const issueOrderNumbers = issue.orderNumber
            .split(/[,\s]+/)
            .map(s => s.trim())
            .filter(Boolean);
          return issueOrderNumbers.some(num => orderNumbersFromReports.has(num));
        })();

        // 기본+사양 매칭 OR 발주번호 매칭 중 하나라도 true이면 포함
        return (basicMatch && specMatch) || matchesOrderNumber;
      })
      .map(issue => ({
        id: issue.id,
        orderNumber: issue.orderNumber,
        createdAt: typeof issue.createdAt === 'string' 
          ? issue.createdAt 
          : issue.createdAt instanceof Date 
            ? issue.createdAt.toISOString() 
            : new Date().toISOString(),
        updatedAt: typeof issue.updatedAt === 'string'
          ? issue.updatedAt
          : issue.updatedAt instanceof Date
            ? issue.updatedAt.toISOString()
            : undefined,
        status: issue.status,
        issues: Array.isArray(issue.issues)
          ? issue.issues.map(item => 
              typeof item === 'string' 
                ? { content: item } 
                : { content: (item as any).content || '' }
            )
          : [],
        keywordPairs: issue.keywordPairs || []
      }))
      .sort((a, b) => {
        const dateA = a.updatedAt || a.createdAt;
        const dateB = b.updatedAt || b.createdAt;
        return dateB.localeCompare(dateA);
      });

    // 품질이력 (2단계 검색)
    // 1차: 발주처, 제품명, 부속명, 사양 조합으로 검색
    const primaryMatchedInspections = qualityInspections.filter(inspection => 
      isProductMatch(
        inspection.supplier,
        inspection.productName,
        inspection.partName,
        inspection.specification || ''
      )
    );
    
    // 생산일보에서 발주번호 수집
    const orderNumbersFromReports = new Set<string>();
    packagingReports
      .filter(report => isProductMatch(
        report.supplier,
        report.productName,
        report.partName,
        report.specification
      ))
      .forEach(report => {
        if (report.orderNumbers && report.orderNumbers.length > 0) {
          report.orderNumbers.forEach(orderNum => {
            if (orderNum && orderNum.trim() !== '') {
              orderNumbersFromReports.add(orderNum.trim());
            }
          });
        }
      });
    
    // 2차: 1차에서 찾지 못한 경우, 생산일보의 발주번호로 검색
    // 다중 발주번호 지원: 쉼표로 구분된 발주번호 각각 확인
    const primaryMatchedOrderNumbers = new Set(primaryMatchedInspections.map(i => i.orderNumber));
    const secondaryMatchedInspections = qualityInspections.filter(inspection => {
      // 1차에서 이미 매칭된 것은 제외
      if (primaryMatchedOrderNumbers.has(inspection.orderNumber)) {
        return false;
      }
      
      // 생산일보의 발주번호와 일치하는지 확인
      // inspection.orderNumber가 "T50229-2, T50230-2" 형태일 경우 각각 확인
      if (inspection.orderNumber) {
        const inspectionOrderNumbers = inspection.orderNumber
          .split(/[,\s]+/)
          .map(s => s.trim())
          .filter(s => s);
        
        // 하나라도 일치하면 매칭
        return inspectionOrderNumbers.some(orderNum => 
          orderNumbersFromReports.has(orderNum)
        );
      }
      
      return false;
    });
    
    // 1차 + 2차 결과 합치기
    const allMatchedInspections = [...primaryMatchedInspections, ...secondaryMatchedInspections];
    
    const qualityInspectionItems: QualityInspectionItem[] = allMatchedInspections
      .map(inspection => ({
        id: inspection.id,
        orderNumber: inspection.orderNumber,
        inspectionType: inspection.inspectionType,
        inspectionDate: inspection.inspectionDate || 
          (inspection.createdAt ? inspection.createdAt.split('T')[0] : ''),
        result: inspection.result,
        keywordPairs: inspection.keywordPairs
      }))
      .sort((a, b) => b.inspectionDate.localeCompare(a.inspectionDate));

    // 지그사용이력 (품질이력에서 추출, 변경될 때만 기록)
    // allMatchedInspections 사용 (1차 + 2차 검색 결과)
    const jigHistory: JigHistoryItem[] = [];
    
    // 먼저 필터링하고 날짜순으로 정렬
    const filteredInspections = allMatchedInspections
      .filter(inspection => 
        (
          inspection.jigUsed ||
          inspection.jigUsed1 ||
          inspection.jigUsed2 ||
          inspection.internalJigLower ||
          inspection.internalJigUpper
        )
      )
      .map(inspection => {
        const createdAt = typeof inspection.createdAt === 'string' 
          ? inspection.createdAt 
          : (inspection.createdAt && typeof inspection.createdAt === 'object' && 'toISOString' in inspection.createdAt)
            ? (inspection.createdAt as Date).toISOString()
            : new Date().toISOString();
        
        return {
          ...inspection,
          inspectionDate: inspection.inspectionDate || createdAt.split('T')[0]
        };
      })
      .sort((a, b) => a.inspectionDate.localeCompare(b.inspectionDate));
    
    // 변경 감지를 위해 이전 항목과 비교
    let lastJigData: {
      jigUsed?: string;
      jigUsed1?: string;
      jigUsed2?: string;
      internalJigLower?: string;
      internalJigUpper?: string;
    } | null = null;
    
    filteredInspections.forEach(inspection => {
      const currentJigData = {
        jigUsed: inspection.jigUsed,
        jigUsed1: inspection.jigUsed1,
        jigUsed2: inspection.jigUsed2,
        internalJigLower: inspection.internalJigLower,
        internalJigUpper: inspection.internalJigUpper
      };
      
      // 이전 지그 데이터와 비교하여 변경되었을 때만 기록
      const isChanged = !lastJigData ||
        JSON.stringify(lastJigData) !== JSON.stringify(currentJigData);
      
      if (isChanged) {
        jigHistory.push({
          id: inspection.id,
          orderNumber: inspection.orderNumber,
          inspectionDate: inspection.inspectionDate,
          inspectionType: inspection.inspectionType,
          jigUsed: inspection.jigUsed,
          jigUsed1: inspection.jigUsed1,
          jigUsed2: inspection.jigUsed2,
          internalJigLower: inspection.internalJigLower,
          internalJigUpper: inspection.internalJigUpper,
          workLine: inspection.workLine
        });
        
        lastJigData = currentJigData;
      }
    });
    
    jigHistory.sort((a, b) => b.inspectionDate.localeCompare(a.inspectionDate));

    // 생산추이 (날짜별 시간당생산량 계산)
    // 시간 문자열(HH:mm)을 분으로 변환하는 헬퍼 함수
    const timeToMinutes = (timeStr: string): number | null => {
      if (!timeStr || timeStr.trim() === '') return null;
      const parts = timeStr.trim().split(':');
      if (parts.length !== 2) return null;
      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);
      if (isNaN(hours) || isNaN(minutes)) return null;
      return hours * 60 + minutes;
    };

    // 가동시간 계산 (분 단위)
    const calculateWorkingMinutes = (startTime: string, endTime: string): number | null => {
      const start = timeToMinutes(startTime);
      const end = timeToMinutes(endTime);
      if (start === null || end === null) return null;
      // 자정을 넘어가는 경우 처리
      if (end < start) {
        return (24 * 60 - start) + end; // 다음날까지의 시간
      }
      return end - start;
    };

    // 날짜별 시간당생산량 데이터 수집 (총 투입수량과 총 가동시간)
    const trendMap = new Map<string, { totalInput: number; totalMinutes: number }>();
    
    packagingReports
      .filter(report => isProductMatch(
        report.supplier,
        report.productName,
        report.partName,
        report.specification
      ))
      .forEach(report => {
        const date = report.workDate;
        const workingMinutes = calculateWorkingMinutes(report.startTime || '', report.endTime || '');
        const inputQuantity = report.inputQuantity || 0;
        
        // 가동시간과 투입수량이 모두 있어야 계산 가능
        // startTime과 endTime이 없어도 uph가 있으면 사용
        if (workingMinutes !== null && workingMinutes > 0 && inputQuantity > 0) {
          const existing = trendMap.get(date) || { totalInput: 0, totalMinutes: 0 };
          trendMap.set(date, {
            totalInput: existing.totalInput + inputQuantity,
            totalMinutes: existing.totalMinutes + workingMinutes
          });
        } else if (report.uph && report.uph > 0) {
          // startTime/endTime이 없어도 uph가 있으면 직접 사용
          const existing = trendMap.get(date);
          if (!existing) {
            // uph가 있으면 가상의 가동시간 계산 (투입수량 / uph = 시간)
            const inputQty = report.inputQuantity || 0;
            if (inputQty > 0) {
              const estimatedHours = inputQty / report.uph;
              trendMap.set(date, {
                totalInput: inputQty,
                totalMinutes: estimatedHours * 60
              });
            }
          }
        }
      });

    // 날짜별 시간당생산량 계산 (총 투입수량 / 총 가동시간)
    const productionTrend: ProductionTrendData[] = Array.from(trendMap.entries())
      .map(([date, data]) => {
        // 총 가동시간을 시간 단위로 변환
        const totalHours = data.totalMinutes / 60;
        // 시간당생산량 = 총 투입수량 / 총 가동시간(시간)
        const uph = totalHours > 0 ? Math.round(data.totalInput / totalHours) : 0;
        
        return {
          date,
          uph
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      id: productId,
      supplier,
      productName,
      partName,
      specification,
      productionHistory,
      coatingHistory,
      memos,
      shortageHistory,
      qualityIssues: qualityIssueItems,
      qualityInspections: qualityInspectionItems,
      fullQualityInspections: allMatchedInspections,
      jigHistory,
      productionTrend
    };
  } catch (error) {
    console.error('Error fetching product detail:', error);
    throw error;
  }
};

