/**
 * 품질검사 데이터 분석 스크립트
 * 
 * 각 검사 타입별로 10개씩 문서를 읽어서 데이터 구조를 파악하고,
 * 통계 기능 설계를 위한 패턴을 추출합니다.
 * 
 * 사용법:
 *   npx tsx scripts/analyze-quality-inspections.ts
 * 
 * 또는 package.json에 스크립트 추가:
 *   "analyze:quality": "tsx scripts/analyze-quality-inspections.ts"
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

// Firebase Admin SDK 초기화
function initializeFirebase() {
  if (getApps().length > 0) {
    return getFirestore();
  }

  // 서비스 계정 키 파일 경로 확인
  const possiblePaths = [
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
    path.join(process.cwd(), 'hs-jig-b2093-firebase-adminsdk-fbsvc-fa25ed9be6.json'),
    path.join(process.cwd(), 'firebase-service-account-key.json'),
    path.join(process.cwd(), 'serviceAccountKey.json'),
    path.join(process.cwd(), '..', 'firebase-service-account-key.json'),
  ].filter(Boolean) as string[];

  let serviceAccountPath: string | null = null;
  for (const possiblePath of possiblePaths) {
    if (fs.existsSync(possiblePath)) {
      serviceAccountPath = possiblePath;
      break;
    }
  }

  if (!serviceAccountPath) {
    console.error('❌ Firebase 서비스 계정 키 파일을 찾을 수 없습니다.');
    console.error('\n시도한 경로:');
    possiblePaths.forEach(p => console.error(`  - ${p}`));
    console.error('\n해결 방법:');
    console.error('1. Firebase Console > 프로젝트 설정 > 서비스 계정');
    console.error('2. "새 비공개 키 생성" 클릭');
    console.error('3. 다운로드한 JSON 파일을 프로젝트 루트에 저장');
    console.error('4. 파일명을 "firebase-service-account-key.json"으로 변경');
    console.error('\n또는 환경변수로 경로 지정:');
    console.error('  FIREBASE_SERVICE_ACCOUNT_KEY=./path/to/key.json npx tsx scripts/analyze-quality-inspections.ts');
    process.exit(1);
  }

  console.log(`📁 서비스 계정 키 파일 사용: ${serviceAccountPath}`);

  try {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    
    initializeApp({
      credential: cert(serviceAccount),
      projectId: 'hs-jig-b2093'
    });

    const db = getFirestore();
    // tms-production 데이터베이스 사용
    db.settings({ databaseId: 'tms-production' });
    
    console.log('✅ Firebase Admin SDK 초기화 완료');
    return db;
  } catch (error) {
    console.error('❌ Firebase 초기화 실패:', error);
    process.exit(1);
  }
}

const db = initializeFirebase();

// 검사 타입별 한글 매핑
const INSPECTION_TYPE_MAP: Record<string, string> = {
  'incoming': '수입검사',
  'inProcess': '공정검사',
  'outgoing': '출하검사'
};

interface InspectionSample {
  id: string;
  data: any;
  fields: {
    common: string[];
    typeSpecific: string[];
  };
}

interface InspectionStats {
  total: number;
  byResult: Record<string, number>;
  bySupplier: Record<string, number>;
  byProduct: Record<string, number>;
  byPartName: Record<string, number>;
  keywordPairs: Array<{ process: string; defect: string; count: number }>;
  dateRange: { earliest: string; latest: string };
  fieldUsage: Record<string, { exists: number; total: number; percentage: number }>;
  inspectorCount: number;
  hasImages: number;
}

interface PatternAnalysis {
  commonFields: string[];
  typeSpecificFields: Record<string, string[]>;
  resultDistribution: Record<string, number>;
  defectPatterns: Array<{
    process: string;
    defect: string;
    frequency: number;
    examples: string[];
  }>;
  datePatterns: {
    hasInspectionDate: number;
    usesCreatedAt: number;
  };
  inProcessHistoryAnalysis?: {
    hasHistory: number;
    total: number;
    averageLength: number;
    commonKeywords: Array<{ keyword: string; frequency: number }>;
    historyContents: string[];
  };
}

/**
 * 검사 타입별로 10개씩 문서 읽기
 */
async function fetchInspectionsByType(type: string, limitCount: number = 10): Promise<InspectionSample[]> {
  console.log(`\n📋 ${INSPECTION_TYPE_MAP[type] || type} 데이터 조회 중...`);
  
  try {
    const collectionRef = db.collection('quality-inspections');
    // 인덱스 없이도 조회 가능하도록 orderBy 제거
    const snapshot = await collectionRef
      .where('inspectionType', '==', type)
      .limit(limitCount)
      .get();

    if (snapshot.empty) {
      console.log(`⚠️  ${INSPECTION_TYPE_MAP[type]} 데이터가 없습니다.`);
      return [];
    }

    const samples: InspectionSample[] = snapshot.docs.map(doc => {
      const data = doc.data();
      const allFields = Object.keys(data);
      
      // 공통 필드와 타입별 특화 필드 분리
      const commonFields = [
        'id', 'inspectionType', 'orderNumber', 'supplier', 'productName', 'partName',
        'orderQuantity', 'specification', 'postProcess', 'result', 'resultReason',
        'keywordPairs', 'imageUrls', 'inspector', 'inspectionDate', 'createdAt',
        'updatedAt', 'createdBy', 'updatedBy'
      ];
      
      const typeSpecificFields: string[] = [];
      if (type === 'incoming') {
        typeSpecificFields.push('appearanceHistory', 'functionHistory', 'finalConsultationDept');
      } else if (type === 'inProcess') {
        typeSpecificFields.push('workLine', 'preInspectionHistory', 'inProcessInspectionHistory',
          'processLines', 'jigUsed', 'jigUsed1', 'jigUsed2', 'internalJigLower', 'internalJigUpper',
          'dryerUsed', 'flameTreatment');
      } else if (type === 'outgoing') {
        typeSpecificFields.push('workLine', 'workerCount', 'workers', 'reliabilityReview',
          'reliabilityTestResult', 'colorCheckResult', 'injectionPackaging', 'postProcessPackaging',
          'reinspectionKeyword', 'reinspectionContent', 'defectResultPairs');
      }

      return {
        id: doc.id,
        data,
        fields: {
          common: allFields.filter(f => commonFields.includes(f)),
          typeSpecific: allFields.filter(f => typeSpecificFields.includes(f))
        }
      };
    });

    console.log(`✅ ${samples.length}개 문서 조회 완료`);
    return samples;
  } catch (error: any) {
    console.error(`❌ ${INSPECTION_TYPE_MAP[type]} 조회 중 오류:`, error.message);
    if (error.message.includes('index')) {
      console.error('💡 인덱스가 필요할 수 있습니다. Firestore Console에서 인덱스를 생성하세요.');
    }
    return [];
  }
}

/**
 * 통계 계산
 */
function calculateStats(samples: InspectionSample[], type: string): InspectionStats {
  const stats: InspectionStats = {
    total: samples.length,
    byResult: {},
    bySupplier: {},
    byProduct: {},
    byPartName: {},
    keywordPairs: [],
    dateRange: { earliest: '', latest: '' },
    fieldUsage: {},
    inspectorCount: 0,
    hasImages: 0
  };

  const dates: string[] = [];
  const keywordPairMap = new Map<string, { count: number; examples: Set<string> }>();
  const inspectors = new Set<string>();
  const allFields = new Set<string>();

  samples.forEach(sample => {
    const inspection = sample.data;
    
    // 모든 필드 수집
    Object.keys(inspection).forEach(field => allFields.add(field));

    // 결과별 통계
    const result = inspection.result || '미지정';
    stats.byResult[result] = (stats.byResult[result] || 0) + 1;

    // 공급사별 통계
    const supplier = inspection.supplier || '미지정';
    stats.bySupplier[supplier] = (stats.bySupplier[supplier] || 0) + 1;

    // 제품별 통계
    const product = inspection.productName || '미지정';
    stats.byProduct[product] = (stats.byProduct[product] || 0) + 1;

    // 부품명별 통계
    const partName = inspection.partName || '미지정';
    stats.byPartName[partName] = (stats.byPartName[partName] || 0) + 1;

    // 날짜 범위
    const date = inspection.inspectionDate || (inspection.createdAt ? inspection.createdAt.split('T')[0] : '');
    if (date) dates.push(date);

    // 키워드 페어 통계
    if (inspection.keywordPairs && Array.isArray(inspection.keywordPairs)) {
      inspection.keywordPairs.forEach((pair: any) => {
        const process = pair.process || '미지정';
        const defect = pair.defect || '미지정';
        const key = `${process}|${defect}`;
        
        if (!keywordPairMap.has(key)) {
          keywordPairMap.set(key, { count: 0, examples: new Set() });
        }
        const entry = keywordPairMap.get(key)!;
        entry.count++;
        if (inspection.orderNumber) entry.examples.add(inspection.orderNumber);
      });
    }

    // 검사자 수집
    if (inspection.inspector) {
      if (typeof inspection.inspector === 'object') {
        inspectors.add(inspection.inspector.displayName || inspection.inspector.email || '미지정');
      } else {
        inspectors.add(inspection.inspector);
      }
    }

    // 이미지 존재 여부
    if (inspection.imageUrls && Array.isArray(inspection.imageUrls) && inspection.imageUrls.length > 0) {
      stats.hasImages++;
    }
  });

  // 키워드 페어 배열로 변환
  keywordPairMap.forEach((value, key) => {
    const [process, defect] = key.split('|');
    stats.keywordPairs.push({
      process,
      defect,
      count: value.count
    });
  });
  stats.keywordPairs.sort((a, b) => b.count - a.count);

  // 날짜 범위 계산
  if (dates.length > 0) {
    dates.sort();
    stats.dateRange.earliest = dates[0];
    stats.dateRange.latest = dates[dates.length - 1];
  }

  // 필드 사용률 계산
  allFields.forEach(field => {
    const exists = samples.filter(s => s.data[field] !== undefined && s.data[field] !== null).length;
    stats.fieldUsage[field] = {
      exists,
      total: samples.length,
      percentage: (exists / samples.length) * 100
    };
  });

  stats.inspectorCount = inspectors.size;

  return stats;
}

/**
 * 패턴 분석
 */
function analyzePatterns(samples: InspectionSample[], type: string): PatternAnalysis {
  const patterns: PatternAnalysis = {
    commonFields: [],
    typeSpecificFields: {},
    resultDistribution: {},
    defectPatterns: [],
    datePatterns: {
      hasInspectionDate: 0,
      usesCreatedAt: 0
    }
  };

  const fieldFrequency = new Map<string, number>();
  const defectMap = new Map<string, { count: number; examples: Set<string> }>();

  samples.forEach(sample => {
    const inspection = sample.data;

    // 공통 필드 수집
    sample.fields.common.forEach(field => {
      fieldFrequency.set(field, (fieldFrequency.get(field) || 0) + 1);
    });

    // 타입별 특화 필드 수집
    sample.fields.typeSpecific.forEach(field => {
      if (!patterns.typeSpecificFields[type]) {
        patterns.typeSpecificFields[type] = [];
      }
      if (!patterns.typeSpecificFields[type].includes(field)) {
        patterns.typeSpecificFields[type].push(field);
      }
    });

    // 결과 분포
    const result = inspection.result || '미지정';
    patterns.resultDistribution[result] = (patterns.resultDistribution[result] || 0) + 1;

    // 날짜 패턴
    if (inspection.inspectionDate) patterns.datePatterns.hasInspectionDate++;
    if (inspection.createdAt) patterns.datePatterns.usesCreatedAt++;

    // 불량 패턴
    if (inspection.keywordPairs && Array.isArray(inspection.keywordPairs)) {
      inspection.keywordPairs.forEach((pair: any) => {
        if (pair.defect && pair.defect !== '미지정') {
          const key = `${pair.process || '미지정'}|${pair.defect}`;
          if (!defectMap.has(key)) {
            defectMap.set(key, { count: 0, examples: new Set() });
          }
          const entry = defectMap.get(key)!;
          entry.count++;
          if (inspection.orderNumber) entry.examples.add(inspection.orderNumber);
        }
      });
    }
  });

  // 공통 필드 정렬 (빈도순)
  patterns.commonFields = Array.from(fieldFrequency.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([field]) => field);

  // 불량 패턴 정렬
  defectMap.forEach((value, key) => {
    const [process, defect] = key.split('|');
    patterns.defectPatterns.push({
      process,
      defect,
      frequency: value.count,
      examples: Array.from(value.examples).slice(0, 3)
    });
  });
  patterns.defectPatterns.sort((a, b) => b.frequency - a.frequency);

  // 공정검사이력 분석 (공정검사 타입인 경우)
  if (type === 'inProcess') {
    const historyContents: string[] = [];
    const keywordMap = new Map<string, number>();
    let totalLength = 0;
    let hasHistory = 0;

    samples.forEach(sample => {
      const inspection = sample.data;
      if (inspection.inProcessInspectionHistory) {
        hasHistory++;
        const history = inspection.inProcessInspectionHistory;
        historyContents.push(history);
        totalLength += history.length;

        // 키워드 추출 (한글 단어 중심)
        const words = history
          .replace(/[^\uAC00-\uD7A3\s]/g, ' ') // 한글과 공백만 남기기
          .split(/\s+/)
          .filter(word => word.length > 1 && word.length < 20); // 2자 이상 20자 미만

        words.forEach(word => {
          keywordMap.set(word, (keywordMap.get(word) || 0) + 1);
        });
      }
    });

    const commonKeywords = Array.from(keywordMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([keyword, frequency]) => ({ keyword, frequency }));

    patterns.inProcessHistoryAnalysis = {
      hasHistory,
      total: samples.length,
      averageLength: hasHistory > 0 ? Math.round(totalLength / hasHistory) : 0,
      commonKeywords,
      historyContents: historyContents.slice(0, 5) // 샘플 5개만 저장
    };
  }

  return patterns;
}

/**
 * 상세 샘플 데이터 출력
 */
function printSampleDetails(samples: InspectionSample[], type: string) {
  console.log(`\n📄 ${INSPECTION_TYPE_MAP[type]} 샘플 데이터 (최대 3개):`);
  samples.slice(0, 3).forEach((sample, index) => {
    console.log(`\n  [샘플 ${index + 1}] ID: ${sample.id}`);
    console.log(`    - 발주번호: ${sample.data.orderNumber || 'N/A'}`);
    console.log(`    - 공급사: ${sample.data.supplier || 'N/A'}`);
    console.log(`    - 제품명: ${sample.data.productName || 'N/A'}`);
    console.log(`    - 부품명: ${sample.data.partName || 'N/A'}`);
    console.log(`    - 검사결과: ${sample.data.result || 'N/A'}`);
    console.log(`    - 검사일: ${sample.data.inspectionDate || sample.data.createdAt?.split('T')[0] || 'N/A'}`);
    console.log(`    - 키워드 페어 수: ${Array.isArray(sample.data.keywordPairs) ? sample.data.keywordPairs.length : 0}`);
    console.log(`    - 이미지 수: ${Array.isArray(sample.data.imageUrls) ? sample.data.imageUrls.length : 0}`);
    
    // 타입별 특화 필드 출력
    if (type === 'incoming' && sample.data.appearanceHistory) {
      console.log(`    - 외관이력: ${sample.data.appearanceHistory.substring(0, 50)}...`);
    }
    if (type === 'inProcess') {
      if (sample.data.workLine) {
        console.log(`    - 작업라인: ${sample.data.workLine}`);
      }
      if (sample.data.inProcessInspectionHistory) {
        const history = sample.data.inProcessInspectionHistory;
        console.log(`    - 공정검사이력: ${history.substring(0, 80)}${history.length > 80 ? '...' : ''}`);
      }
      if (sample.data.preInspectionHistory) {
        const preHistory = sample.data.preInspectionHistory;
        console.log(`    - 사전검사이력: ${preHistory.substring(0, 50)}${preHistory.length > 50 ? '...' : ''}`);
      }
    }
    if (type === 'outgoing' && sample.data.workers) {
      console.log(`    - 작업자 수: ${Array.isArray(sample.data.workers) ? sample.data.workers.length : 0}`);
    }
  });
}

/**
 * 통계 기능 설계 제안 생성
 */
function generateStatisticsDesign(allResults: Record<string, any>) {
  console.log('\n' + '='.repeat(80));
  console.log('📊 품질이력 통계 기능 설계 제안');
  console.log('='.repeat(80));

  const design = {
    summary: {
      totalTypes: Object.keys(allResults).length,
      totalSamples: Object.values(allResults).reduce((sum: number, r: any) => sum + (r.samples?.length || 0), 0)
    },
    statistics: {
      basic: [
        '검사 타입별 통계 (수입/공정/출하 검사 수 및 비율)',
        '검사 결과별 통계 (합격/불합격/한도대기/한도승인/반출)',
        '불량률 계산 (타입별, 전체)',
        '날짜 범위별 통계 (기간별 검사 수, 불량률)'
      ],
      byDimension: [
        '공급사별 통계 (검사 수, 불량률, 주요 불량 유형)',
        '제품별 통계 (검사 수, 불량률)',
        '부품명별 통계 (검사 수, 불량률)',
        '검사자별 통계 (검사 수, 불량률)'
      ],
      patterns: [
        '공정-불량 키워드 페어 분석 (빈도순, 불량률)',
        '불량 패턴 추출 (자주 발생하는 불량 조합)',
        '시간대별/날짜별 트렌드 분석'
      ],
      typeSpecific: {
        incoming: [
          '외관이력/기능이력 분석',
          '최종협의부서별 통계'
        ],
        inProcess: [
          '작업라인별 통계',
          '지그 사용 이력 분석',
          '공정라인 조건 분석'
        ],
        outgoing: [
          '작업자별 검사 통계',
          '신뢰성 테스트 결과 분석',
          '색상 검사 결과 분석'
        ]
      }
    },
    dataStructure: {
      qualityHistoryStats: {
        period: '{ start: string; end: string }',
        totals: '{ incoming: number; inProcess: number; outgoing: number }',
        defectRates: '{ overall: number; byType: Record<InspectionType, number> }',
        byResult: 'Record<InspectionResult, number>',
        bySupplier: 'Array<{ supplier: string; count: number; defectRate: number }>',
        byProduct: 'Array<{ productName: string; count: number; defectRate: number }>',
        defectPatterns: 'Array<{ process: string; defect: string; frequency: number; defectRate: number }>',
        trends: 'Array<{ date: string; count: number; defectRate: number }>'
      }
    },
    recommendations: [
      '검사 타입별로 다른 통계 항목 제공 (타입별 특화 필드 활용)',
      '키워드 페어를 활용한 불량 패턴 분석 강화',
      '날짜 범위 필터링 기능 필수 (inspectionDate 또는 createdAt 활용)',
      '공급사별, 제품별 통계는 상위 N개만 표시하고 나머지는 "기타"로 그룹화',
      '불량률 계산 시 불합격 + 한도대기를 불량으로 간주',
      '트렌드 분석은 주별 또는 월별로 집계',
      '검사자별 통계는 개인정보 보호를 위해 익명화 옵션 제공'
    ]
  };

  console.log('\n1. 기본 통계 항목:');
  design.statistics.basic.forEach((item, index) => {
    console.log(`   ${index + 1}. ${item}`);
  });

  console.log('\n2. 차원별 통계 항목:');
  design.statistics.byDimension.forEach((item, index) => {
    console.log(`   ${index + 1}. ${item}`);
  });

  console.log('\n3. 패턴 분석 항목:');
  design.statistics.patterns.forEach((item, index) => {
    console.log(`   ${index + 1}. ${item}`);
  });

  console.log('\n4. 타입별 특화 통계:');
  Object.entries(design.statistics.typeSpecific).forEach(([type, items]) => {
    console.log(`   ${INSPECTION_TYPE_MAP[type]}:`);
    items.forEach((item, index) => {
      console.log(`     - ${item}`);
    });
  });

  console.log('\n5. 추천 사항:');
  design.recommendations.forEach((item, index) => {
    console.log(`   ${index + 1}. ${item}`);
  });

  return design;
}

/**
 * 메인 실행 함수
 */
async function main() {
  console.log('🚀 품질검사 데이터 분석 시작');
  console.log('='.repeat(80));

  const inspectionTypes = ['incoming', 'inProcess', 'outgoing'];
  const allResults: Record<string, any> = {};

  for (const type of inspectionTypes) {
    // 각 타입별로 10개씩 조회
    const samples = await fetchInspectionsByType(type, 10);
    
    if (samples.length === 0) {
      allResults[type] = { samples: [], stats: null, patterns: null };
      continue;
    }

    // 샘플 데이터 출력
    printSampleDetails(samples, type);

    // 통계 계산
    const stats = calculateStats(samples, type);
    
    // 패턴 분석
    const patterns = analyzePatterns(samples, type);

    allResults[type] = {
      samples: samples.map(s => ({ id: s.id, fields: s.fields })),
      stats,
      patterns
    };

    // 결과 출력
    console.log(`\n📊 ${INSPECTION_TYPE_MAP[type]} 통계:`);
    console.log(`  - 총 검사 수: ${stats.total}건`);
    console.log(`  - 날짜 범위: ${stats.dateRange.earliest} ~ ${stats.dateRange.latest}`);
    console.log(`  - 검사자 수: ${stats.inspectorCount}명`);
    console.log(`  - 이미지 포함: ${stats.hasImages}건 (${((stats.hasImages / stats.total) * 100).toFixed(1)}%)`);
    
    console.log(`\n  검사 결과 분포:`);
    Object.entries(stats.byResult)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .forEach(([result, count]) => {
        const percentage = ((count as number) / stats.total * 100).toFixed(1);
        console.log(`    - ${result}: ${count}건 (${percentage}%)`);
      });
    
    console.log(`\n  공급사별 분포 (상위 5개):`);
    Object.entries(stats.bySupplier)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 5)
      .forEach(([supplier, count]) => {
        console.log(`    - ${supplier}: ${count}건`);
      });
    
    console.log(`\n  주요 키워드 페어 (상위 5개):`);
    stats.keywordPairs.slice(0, 5).forEach(({ process, defect, count }) => {
      console.log(`    - ${process} → ${defect}: ${count}회`);
    });

    console.log(`\n  필드 사용률 (상위 10개):`);
    Object.entries(stats.fieldUsage)
      .sort(([, a], [, b]) => b.percentage - a.percentage)
      .slice(0, 10)
      .forEach(([field, usage]) => {
        console.log(`    - ${field}: ${usage.exists}/${usage.total} (${usage.percentage.toFixed(1)}%)`);
      });
  }

  // 통계 기능 설계 제안 생성
  const design = generateStatisticsDesign(allResults);

  // JSON 파일로 저장
  const outputPath = path.join(process.cwd(), 'quality-inspections-analysis.json');
  const outputData = {
    analyzedAt: new Date().toISOString(),
    summary: {
      totalTypes: Object.keys(allResults).length,
      totalSamples: Object.values(allResults).reduce((sum: number, r: any) => sum + (r.samples?.length || 0), 0)
    },
    results: allResults,
    design: design
  };

  fs.writeFileSync(
    outputPath,
    JSON.stringify(outputData, null, 2),
    'utf8'
  );

  console.log(`\n✅ 분석 완료!`);
  console.log(`📁 결과 파일: ${outputPath}`);
  console.log('\n' + '='.repeat(80));
}

// 실행
main().catch(error => {
  console.error('❌ 오류 발생:', error);
  process.exit(1);
});

