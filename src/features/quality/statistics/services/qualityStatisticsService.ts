/**
 * 품질이력 통계 계산 서비스
 * 
 * 품질검사 데이터를 기반으로 다양한 통계를 계산합니다.
 */

import { QualityInspection, InspectionType, InspectionResult } from '../../types';
import {
  QualityHistoryStatistics,
  TypeStatistics,
  ResultStatistics,
  SupplierStatistics,
  ProductStatistics,
  PartStatistics,
  InspectorStatistics,
  KeywordPairStatistics,
  DateTrend,
  IncomingSpecificStats,
  InProcessSpecificStats,
  OutgoingSpecificStats,
  StatisticsFilterOptions,
  StatisticsCalculationOptions,
  AggregationUnit
} from '../types/statistics.types';

/**
 * 불량으로 간주되는 검사 결과
 */
const DEFECT_RESULTS: InspectionResult[] = ['불합격', '한도대기'];

/**
 * 불량률 계산
 */
function calculateDefectRate(inspections: QualityInspection[]): number {
  if (inspections.length === 0) return 0;
  
  const defectCount = inspections.filter(inspection => 
    DEFECT_RESULTS.includes(inspection.result)
  ).length;
  
  return (defectCount / inspections.length) * 100;
}

/**
 * 검사 타입별 통계 계산
 */
function calculateTypeStatistics(inspections: QualityInspection[]): TypeStatistics {
  const incoming = inspections.filter(i => i.inspectionType === 'incoming');
  const inProcess = inspections.filter(i => i.inspectionType === 'inProcess');
  const outgoing = inspections.filter(i => i.inspectionType === 'outgoing');

  const stats: TypeStatistics = {
    incoming: {
      count: incoming.length,
      defectCount: incoming.filter(i => DEFECT_RESULTS.includes(i.result)).length,
      defectRate: calculateDefectRate(incoming)
    },
    inProcess: {
      count: inProcess.length,
      defectCount: inProcess.filter(i => DEFECT_RESULTS.includes(i.result)).length,
      defectRate: calculateDefectRate(inProcess)
    },
    outgoing: {
      count: outgoing.length,
      defectCount: outgoing.filter(i => DEFECT_RESULTS.includes(i.result)).length,
      defectRate: calculateDefectRate(outgoing)
    },
    total: {
      count: inspections.length,
      defectCount: inspections.filter(i => DEFECT_RESULTS.includes(i.result)).length,
      defectRate: calculateDefectRate(inspections)
    }
  };

  return stats;
}

/**
 * 검사 결과별 통계 계산
 */
function calculateResultStatistics(inspections: QualityInspection[]): ResultStatistics {
  const stats: ResultStatistics = {
    합격: 0,
    불합격: 0,
    한도대기: 0,
    한도승인: 0,
    반출: 0
  };

  inspections.forEach(inspection => {
    const result = inspection.result;
    if (result in stats) {
      stats[result as keyof ResultStatistics]++;
    }
  });

  return stats;
}

/**
 * 공급사별 통계 계산
 */
function calculateSupplierStatistics(
  inspections: QualityInspection[],
  topN?: number
): SupplierStatistics[] {
  const supplierMap = new Map<string, {
    inspections: QualityInspection[];
    byType: {
      incoming: QualityInspection[];
      inProcess: QualityInspection[];
      outgoing: QualityInspection[];
    };
  }>();

  inspections.forEach(inspection => {
    const supplier = inspection.supplier || '미지정';
    
    if (!supplierMap.has(supplier)) {
      supplierMap.set(supplier, {
        inspections: [],
        byType: {
          incoming: [],
          inProcess: [],
          outgoing: []
        }
      });
    }

    const entry = supplierMap.get(supplier)!;
    entry.inspections.push(inspection);
    entry.byType[inspection.inspectionType].push(inspection);
  });

  const statistics: SupplierStatistics[] = Array.from(supplierMap.entries()).map(([supplier, data]) => {
    // 주요 불량 유형 추출 (키워드 페어에서)
    const defectMap = new Map<string, number>();
    data.inspections.forEach(inspection => {
      if (inspection.keywordPairs) {
        inspection.keywordPairs.forEach(pair => {
          if (pair.defect) {
            const key = pair.defect;
            defectMap.set(key, (defectMap.get(key) || 0) + 1);
          }
        });
      }
    });

    const topDefects = Array.from(defectMap.entries())
      .map(([defect, count]) => ({
        defect,
        count,
        process: data.inspections
          .find(i => i.keywordPairs?.some(p => p.defect === defect))?.keywordPairs
          ?.find(p => p.defect === defect)?.process
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      supplier,
      totalCount: data.inspections.length,
      defectCount: data.inspections.filter(i => DEFECT_RESULTS.includes(i.result)).length,
      defectRate: calculateDefectRate(data.inspections),
      byType: {
        incoming: {
          count: data.byType.incoming.length,
          defectRate: calculateDefectRate(data.byType.incoming)
        },
        inProcess: {
          count: data.byType.inProcess.length,
          defectRate: calculateDefectRate(data.byType.inProcess)
        },
        outgoing: {
          count: data.byType.outgoing.length,
          defectRate: calculateDefectRate(data.byType.outgoing)
        }
      },
      topDefects
    };
  });

  // 정렬 및 상위 N개만 반환
  statistics.sort((a, b) => b.totalCount - a.totalCount);
  return topN ? statistics.slice(0, topN) : statistics;
}

/**
 * 제품별 통계 계산
 */
function calculateProductStatistics(
  inspections: QualityInspection[],
  topN?: number
): ProductStatistics[] {
  const productMap = new Map<string, {
    inspections: QualityInspection[];
    suppliers: Set<string>;
    byType: {
      incoming: QualityInspection[];
      inProcess: QualityInspection[];
      outgoing: QualityInspection[];
    };
  }>();

  inspections.forEach(inspection => {
    const key = `${inspection.productName || '미지정'}|${inspection.partName || '미지정'}`;
    
    if (!productMap.has(key)) {
      productMap.set(key, {
        inspections: [],
        suppliers: new Set(),
        byType: {
          incoming: [],
          inProcess: [],
          outgoing: []
        }
      });
    }

    const entry = productMap.get(key)!;
    entry.inspections.push(inspection);
    if (inspection.supplier) entry.suppliers.add(inspection.supplier);
    entry.byType[inspection.inspectionType].push(inspection);
  });

  const statistics: ProductStatistics[] = Array.from(productMap.entries()).map(([key, data]) => {
    const [productName, partName] = key.split('|');
    
    return {
      productName: productName || '미지정',
      partName: partName || '미지정',
      totalCount: data.inspections.length,
      defectCount: data.inspections.filter(i => DEFECT_RESULTS.includes(i.result)).length,
      defectRate: calculateDefectRate(data.inspections),
      byType: {
        incoming: {
          count: data.byType.incoming.length,
          defectRate: calculateDefectRate(data.byType.incoming)
        },
        inProcess: {
          count: data.byType.inProcess.length,
          defectRate: calculateDefectRate(data.byType.inProcess)
        },
        outgoing: {
          count: data.byType.outgoing.length,
          defectRate: calculateDefectRate(data.byType.outgoing)
        }
      },
      suppliers: Array.from(data.suppliers)
    };
  });

  statistics.sort((a, b) => b.totalCount - a.totalCount);
  return topN ? statistics.slice(0, topN) : statistics;
}

/**
 * 부품명별 통계 계산
 */
function calculatePartStatistics(inspections: QualityInspection[]): PartStatistics[] {
  const partMap = new Map<string, {
    inspections: QualityInspection[];
    products: Set<string>;
  }>();

  inspections.forEach(inspection => {
    const partName = inspection.partName || '미지정';
    
    if (!partMap.has(partName)) {
      partMap.set(partName, {
        inspections: [],
        products: new Set()
      });
    }

    const entry = partMap.get(partName)!;
    entry.inspections.push(inspection);
    if (inspection.productName) entry.products.add(inspection.productName);
  });

  const statistics: PartStatistics[] = Array.from(partMap.entries()).map(([partName, data]) => ({
    partName,
    totalCount: data.inspections.length,
    defectCount: data.inspections.filter(i => DEFECT_RESULTS.includes(i.result)).length,
    defectRate: calculateDefectRate(data.inspections),
    products: Array.from(data.products)
  }));

  statistics.sort((a, b) => b.totalCount - a.totalCount);
  return statistics;
}

/**
 * 검사자별 통계 계산
 */
function calculateInspectorStatistics(inspections: QualityInspection[]): InspectorStatistics[] {
  const inspectorMap = new Map<string, {
    inspections: QualityInspection[];
    byType: {
      incoming: QualityInspection[];
      inProcess: QualityInspection[];
      outgoing: QualityInspection[];
    };
  }>();

  inspections.forEach(inspection => {
    let inspectorName = '미지정';
    
    if (typeof inspection.inspector === 'object' && inspection.inspector) {
      inspectorName = inspection.inspector.displayName || inspection.inspector.email || '미지정';
    } else if (typeof inspection.inspector === 'string') {
      inspectorName = inspection.inspector;
    }

    if (!inspectorMap.has(inspectorName)) {
      inspectorMap.set(inspectorName, {
        inspections: [],
        byType: {
          incoming: [],
          inProcess: [],
          outgoing: []
        }
      });
    }

    const entry = inspectorMap.get(inspectorName)!;
    entry.inspections.push(inspection);
    entry.byType[inspection.inspectionType].push(inspection);
  });

  const statistics: InspectorStatistics[] = Array.from(inspectorMap.entries()).map(([inspector, data]) => ({
    inspector,
    totalCount: data.inspections.length,
    defectCount: data.inspections.filter(i => DEFECT_RESULTS.includes(i.result)).length,
    defectRate: calculateDefectRate(data.inspections),
    byType: {
      incoming: {
        count: data.byType.incoming.length,
        defectRate: calculateDefectRate(data.byType.incoming)
      },
      inProcess: {
        count: data.byType.inProcess.length,
        defectRate: calculateDefectRate(data.byType.inProcess)
      },
      outgoing: {
        count: data.byType.outgoing.length,
        defectRate: calculateDefectRate(data.byType.outgoing)
      }
    }
  }));

  statistics.sort((a, b) => b.totalCount - a.totalCount);
  return statistics;
}

/**
 * 키워드 페어 통계 계산
 */
function calculateKeywordPairStatistics(inspections: QualityInspection[]): KeywordPairStatistics[] {
  const pairMap = new Map<string, {
    count: number;
    defectCount: number;
    orders: Set<string>;
    byType: {
      incoming: number;
      inProcess: number;
      outgoing: number;
    };
  }>();

  inspections.forEach(inspection => {
    if (!inspection.keywordPairs || inspection.keywordPairs.length === 0) return;

    const isDefect = DEFECT_RESULTS.includes(inspection.result);

    inspection.keywordPairs.forEach(pair => {
      const key = `${pair.process || '미지정'}|${pair.defect || '미지정'}`;
      
      if (!pairMap.has(key)) {
        pairMap.set(key, {
          count: 0,
          defectCount: 0,
          orders: new Set(),
          byType: {
            incoming: 0,
            inProcess: 0,
            outgoing: 0
          }
        });
      }

      const entry = pairMap.get(key)!;
      entry.count++;
      entry.byType[inspection.inspectionType]++;
      
      if (isDefect) {
        entry.defectCount++;
      }
      
      if (inspection.orderNumber) {
        entry.orders.add(inspection.orderNumber);
      }
    });
  });

  const statistics: KeywordPairStatistics[] = Array.from(pairMap.entries()).map(([key, value]) => {
    const [process, defect] = key.split('|');
    return {
      process,
      defect,
      frequency: value.count,
      defectRate: value.count > 0 ? (value.defectCount / value.count) * 100 : 0,
      affectedOrders: Array.from(value.orders).slice(0, 10),
      byType: value.byType
    };
  });

  statistics.sort((a, b) => b.frequency - a.frequency);
  return statistics;
}

/**
 * 날짜별 트렌드 계산
 */
function calculateDateTrends(
  inspections: QualityInspection[],
  unit: AggregationUnit = 'day'
): DateTrend[] {
  const dateMap = new Map<string, {
    inspections: QualityInspection[];
    byType: {
      incoming: QualityInspection[];
      inProcess: QualityInspection[];
      outgoing: QualityInspection[];
    };
  }>();

  inspections.forEach(inspection => {
    // 날짜 추출 (inspectionDate 우선, 없으면 createdAt)
    let dateStr = inspection.inspectionDate;
    if (!dateStr && inspection.createdAt) {
      dateStr = inspection.createdAt.split('T')[0];
    }
    if (!dateStr) return;

    // 집계 단위에 따라 날짜 변환
    let dateKey = dateStr;
    if (unit === 'week') {
      // 주 시작일 계산 (월요일)
      const date = new Date(dateStr);
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(date.setDate(diff));
      dateKey = monday.toISOString().split('T')[0];
    } else if (unit === 'month') {
      // 년-월만 추출
      dateKey = dateStr.substring(0, 7);
    }

    if (!dateMap.has(dateKey)) {
      dateMap.set(dateKey, {
        inspections: [],
        byType: {
          incoming: [],
          inProcess: [],
          outgoing: []
        }
      });
    }

    const entry = dateMap.get(dateKey)!;
    entry.inspections.push(inspection);
    entry.byType[inspection.inspectionType].push(inspection);
  });

  const trends: DateTrend[] = Array.from(dateMap.entries()).map(([date, data]) => ({
    date,
    totalCount: data.inspections.length,
    defectCount: data.inspections.filter(i => DEFECT_RESULTS.includes(i.result)).length,
    defectRate: calculateDefectRate(data.inspections),
    byType: {
      incoming: data.byType.incoming.length,
      inProcess: data.byType.inProcess.length,
      outgoing: data.byType.outgoing.length
    }
  }));

  trends.sort((a, b) => a.date.localeCompare(b.date));
  return trends;
}

/**
 * 수입검사 특화 통계 계산
 */
function calculateIncomingSpecificStats(inspections: QualityInspection[]): IncomingSpecificStats {
  const incoming = inspections.filter(i => i.inspectionType === 'incoming');
  
  const deptMap = new Map<string, QualityInspection[]>();
  let appearanceHistoryCount = 0;
  let functionHistoryCount = 0;

  incoming.forEach(inspection => {
    if (inspection.finalConsultationDept) {
      const dept = inspection.finalConsultationDept;
      if (!deptMap.has(dept)) {
        deptMap.set(dept, []);
      }
      deptMap.get(dept)!.push(inspection);
    }

    if (inspection.appearanceHistory) appearanceHistoryCount++;
    if (inspection.functionHistory) functionHistoryCount++;
  });

  const byConsultationDept = Array.from(deptMap.entries()).map(([dept, deptInspections]) => ({
    dept,
    count: deptInspections.length,
    defectRate: calculateDefectRate(deptInspections)
  }));

  return {
    byConsultationDept: byConsultationDept.sort((a, b) => b.count - a.count),
    appearanceHistoryAnalysis: {
      hasHistory: appearanceHistoryCount,
      total: incoming.length
    },
    functionHistoryAnalysis: {
      hasHistory: functionHistoryCount,
      total: incoming.length
    }
  };
}

/**
 * 공정검사 특화 통계 계산
 */
function calculateInProcessSpecificStats(inspections: QualityInspection[]): InProcessSpecificStats {
  const inProcess = inspections.filter(i => i.inspectionType === 'inProcess');
  
  const workLineMap = new Map<string, QualityInspection[]>();
  const jigMap = new Map<string, QualityInspection[]>();
  const dryerUsed: QualityInspection[] = [];
  const dryerNotUsed: QualityInspection[] = [];
  const flameUsed: QualityInspection[] = [];
  const flameNotUsed: QualityInspection[] = [];
  
  // 공정검사이력 분석 (중요!)
  const withHistory: QualityInspection[] = [];
  const withoutHistory: QualityInspection[] = [];
  const historyKeywordMap = new Map<string, number>();
  let totalHistoryLength = 0;

  inProcess.forEach(inspection => {
    if (inspection.workLine) {
      const line = inspection.workLine;
      if (!workLineMap.has(line)) {
        workLineMap.set(line, []);
      }
      workLineMap.get(line)!.push(inspection);
    }

    const jig = inspection.jigUsed || inspection.jigUsed1 || inspection.jigUsed2;
    if (jig) {
      if (!jigMap.has(jig)) {
        jigMap.set(jig, []);
      }
      jigMap.get(jig)!.push(inspection);
    }

    if (inspection.dryerUsed === '사용') {
      dryerUsed.push(inspection);
    } else if (inspection.dryerUsed === '미사용') {
      dryerNotUsed.push(inspection);
    }

    if (inspection.flameTreatment === '사용') {
      flameUsed.push(inspection);
    } else if (inspection.flameTreatment === '미사용') {
      flameNotUsed.push(inspection);
    }

    // 공정검사이력 분석
    if (inspection.inProcessInspectionHistory) {
      withHistory.push(inspection);
      const history = inspection.inProcessInspectionHistory;
      totalHistoryLength += history.length;

      // 키워드 추출 (한글 단어 중심)
      const words = history
        .replace(/[^\uAC00-\uD7A3\s]/g, ' ') // 한글과 공백만 남기기
        .split(/\s+/)
        .filter(word => word.length > 1 && word.length < 20); // 2자 이상 20자 미만

      words.forEach(word => {
        historyKeywordMap.set(word, (historyKeywordMap.get(word) || 0) + 1);
      });
    } else {
      withoutHistory.push(inspection);
    }
  });

  const byWorkLine = Array.from(workLineMap.entries()).map(([workLine, lineInspections]) => ({
    workLine,
    count: lineInspections.length,
    defectRate: calculateDefectRate(lineInspections)
  }));

  const byJigUsed = Array.from(jigMap.entries()).map(([jig, jigInspections]) => ({
    jig,
    count: jigInspections.length,
    defectRate: calculateDefectRate(jigInspections)
  }));

  // 공정검사이력 키워드 정렬
  const commonHistoryKeywords = Array.from(historyKeywordMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([keyword, frequency]) => ({ keyword, frequency }));

  return {
    byWorkLine: byWorkLine.sort((a, b) => b.count - a.count),
    byJigUsed: byJigUsed.sort((a, b) => b.count - a.count),
    dryerUsage: {
      used: dryerUsed.length,
      notUsed: dryerNotUsed.length,
      defectRateByUsage: {
        used: calculateDefectRate(dryerUsed),
        notUsed: calculateDefectRate(dryerNotUsed)
      }
    },
    flameTreatment: {
      used: flameUsed.length,
      notUsed: flameNotUsed.length,
      defectRateByUsage: {
        used: calculateDefectRate(flameUsed),
        notUsed: calculateDefectRate(flameNotUsed)
      }
    },
    // 공정검사이력 분석 추가
    inProcessHistoryAnalysis: {
      hasHistory: withHistory.length,
      total: inProcess.length,
      averageLength: withHistory.length > 0 ? Math.round(totalHistoryLength / withHistory.length) : 0,
      defectRateWithHistory: calculateDefectRate(withHistory),
      defectRateWithoutHistory: calculateDefectRate(withoutHistory),
      commonKeywords: commonHistoryKeywords
    }
  };
}

/**
 * 출하검사 특화 통계 계산
 */
function calculateOutgoingSpecificStats(inspections: QualityInspection[]): OutgoingSpecificStats {
  const outgoing = inspections.filter(i => i.inspectionType === 'outgoing');
  
  const workerMap = new Map<string, {
    totalInspected: number;
    defectQuantity: number;
  }>();
  const reliabilityResults = { 양호: 0, 부분박리: 0, 박리: 0 };
  const colorResults = { 색상동일: 0, 색상차이: 0 };
  const workLineMap = new Map<string, QualityInspection[]>();

  outgoing.forEach(inspection => {
    // 작업자별 통계
    if (inspection.workers && Array.isArray(inspection.workers)) {
      inspection.workers.forEach(worker => {
        if (!workerMap.has(worker.name)) {
          workerMap.set(worker.name, {
            totalInspected: 0,
            defectQuantity: 0
          });
        }
        const entry = workerMap.get(worker.name)!;
        entry.totalInspected += worker.totalInspected || 0;
        entry.defectQuantity += worker.defectQuantity || 0;
      });
    }

    // 신뢰성 테스트 결과
    if (inspection.reliabilityReview?.result) {
      const result = inspection.reliabilityReview.result;
      if (result in reliabilityResults) {
        reliabilityResults[result as keyof typeof reliabilityResults]++;
      }
    }

    // 색상 검사 결과
    if (typeof inspection.colorCheckResult === 'object' && inspection.colorCheckResult?.result) {
      const result = inspection.colorCheckResult.result;
      if (result.includes('색상동일')) {
        colorResults.색상동일++;
      } else if (result.includes('색상차이')) {
        colorResults.색상차이++;
      }
    }

    // 작업라인별 통계
    if (inspection.workLine) {
      const line = inspection.workLine;
      if (!workLineMap.has(line)) {
        workLineMap.set(line, []);
      }
      workLineMap.get(line)!.push(inspection);
    }
  });

  const byWorker = Array.from(workerMap.entries()).map(([workerName, data]) => ({
    workerName,
    totalInspected: data.totalInspected,
    defectQuantity: data.defectQuantity,
    defectRate: data.totalInspected > 0 ? (data.defectQuantity / data.totalInspected) * 100 : 0
  }));

  const byWorkLine = Array.from(workLineMap.entries()).map(([workLine, lineInspections]) => ({
    workLine,
    count: lineInspections.length,
    defectRate: calculateDefectRate(lineInspections)
  }));

  return {
    byWorker: byWorker.sort((a, b) => b.totalInspected - a.totalInspected),
    reliabilityTestResults: reliabilityResults,
    colorCheckResults: colorResults,
    byWorkLine: byWorkLine.sort((a, b) => b.count - a.count)
  };
}

/**
 * 데이터 필터링
 */
function filterInspections(
  inspections: QualityInspection[],
  filters: StatisticsFilterOptions
): QualityInspection[] {
  let filtered = [...inspections];

  // 날짜 필터
  if (filters.startDate || filters.endDate) {
    filtered = filtered.filter(inspection => {
      const date = inspection.inspectionDate || (inspection.createdAt ? inspection.createdAt.split('T')[0] : '');
      if (!date) return false;
      
      if (filters.startDate && date < filters.startDate) return false;
      if (filters.endDate && date > filters.endDate) return false;
      return true;
    });
  }

  // 검사 타입 필터
  if (filters.inspectionTypes && filters.inspectionTypes.length > 0) {
    filtered = filtered.filter(i => filters.inspectionTypes!.includes(i.inspectionType));
  }

  // 검사 결과 필터
  if (filters.results && filters.results.length > 0) {
    filtered = filtered.filter(i => filters.results!.includes(i.result));
  }

  // 공급사 필터
  if (filters.suppliers && filters.suppliers.length > 0) {
    filtered = filtered.filter(i => filters.suppliers!.includes(i.supplier));
  }

  // 제품 필터
  if (filters.products && filters.products.length > 0) {
    filtered = filtered.filter(i => filters.products!.includes(i.productName));
  }

  // 부품명 필터
  if (filters.partNames && filters.partNames.length > 0) {
    filtered = filtered.filter(i => filters.partNames!.includes(i.partName));
  }

  return filtered;
}

/**
 * 품질이력 통계 계산 메인 함수
 */
export function calculateQualityStatistics(
  inspections: QualityInspection[],
  filters?: StatisticsFilterOptions,
  options?: StatisticsCalculationOptions
): QualityHistoryStatistics {
  // 필터링
  const filteredInspections = filters 
    ? filterInspections(inspections, filters)
    : inspections;

  if (filteredInspections.length === 0) {
    throw new Error('필터링된 검사 데이터가 없습니다.');
  }

  // 날짜 범위 계산
  const dates = filteredInspections
    .map(i => i.inspectionDate || (i.createdAt ? i.createdAt.split('T')[0] : ''))
    .filter(Boolean)
    .sort();
  
  const period = {
    start: dates[0] || '',
    end: dates[dates.length - 1] || ''
  };

  // 기본 통계
  const typeStatistics = calculateTypeStatistics(filteredInspections);
  const resultStatistics = calculateResultStatistics(filteredInspections);

  // 차원별 통계
  const topN = options?.topN;
  const bySupplier = calculateSupplierStatistics(filteredInspections, topN);
  const byProduct = calculateProductStatistics(filteredInspections, topN);
  const byPart = calculatePartStatistics(filteredInspections);
  const byInspector = calculateInspectorStatistics(filteredInspections);

  // 불량 패턴
  const keywordPairStatistics = calculateKeywordPairStatistics(filteredInspections);

  // 트렌드
  const trends = options?.includeTrends !== false
    ? calculateDateTrends(filteredInspections, options?.trendUnit || 'day')
    : [];

  // 타입별 특화 통계
  const incomingSpecific = options?.includeTypeSpecific !== false
    ? calculateIncomingSpecificStats(filteredInspections)
    : undefined;
  const inProcessSpecific = options?.includeTypeSpecific !== false
    ? calculateInProcessSpecificStats(filteredInspections)
    : undefined;
  const outgoingSpecific = options?.includeTypeSpecific !== false
    ? calculateOutgoingSpecificStats(filteredInspections)
    : undefined;

  return {
    period,
    typeStatistics,
    resultStatistics,
    bySupplier,
    byProduct,
    byPart,
    byInspector,
    keywordPairStatistics,
    trends,
    incomingSpecific,
    inProcessSpecific,
    outgoingSpecific
  };
}

