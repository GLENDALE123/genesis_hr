/**
 * 제품 AI 보고서 서비스
 * 생산일정 확인 및 AI 보고서 백그라운드 생성
 */

import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  doc, 
  getDoc,
  updateDoc,
  orderBy,
  limit as firestoreLimit
} from 'firebase/firestore';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { db } from '@/shared/services/firebase/config';
import { ProductionSchedule } from '@/features/production/schedule';
import { QualityInspection } from '@/features/quality/types';
import { QualityIssue } from '@/features/quality/types';
import { AIReport, ProductionTrendData, ProductionHistoryItem, CoatingHistoryItem, QualityInspectionItem, QualityIssueItem } from '../types';
import { analyzeInspectionHistory, InspectionSummary } from '@/shared/services/gemini/geminiService';

const PRODUCT_AI_REPORTS_COLLECTION = 'product-ai-reports';
const PRODUCTION_SCHEDULES_COLLECTION = 'production-schedules';

/**
 * 생산일정에서 제품 확인
 * 4개 필드(supplier, productName, partName, specification) 모두 일치하는 항목 조회
 */
export const checkProductInSchedule = async (
  supplier: string,
  productName: string,
  partName: string,
  specification: string
): Promise<ProductionSchedule | null> => {
  try {
    if (!db) {
      throw new Error('Firebase not initialized');
    }

    // Firestore는 복합 쿼리 제한이 있으므로, 
    // 클라이언트 사이드에서 필터링하는 방식 사용
    const q = query(
      collection(db, PRODUCTION_SCHEDULES_COLLECTION),
      orderBy('planDate', 'desc'),
      firestoreLimit(2000)
    );

    const snapshot = await getDocs(q);
    const schedules = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ProductionSchedule));

    // 4개 필드 모두 일치하는 항목 찾기
    const matchingSchedule = schedules.find(schedule => 
      schedule.client === supplier &&
      schedule.productName === productName &&
      schedule.partName === partName &&
      schedule.specification === specification
    );

    return matchingSchedule || null;
  } catch (error) {
    console.error('Error checking product in schedule:', error);
    return null;
  }
};

/**
 * AI 보고서 백그라운드 생성
 * 모달이 열리면 생산일정과 관계없이 AI 보고서 생성 후 Firestore에 저장
 * inspections와 qualityIssues가 비어있으면 Firestore에서 조회
 */
export const generateAIReportInBackground = async (
  productId: string,
  supplier: string,
  productName: string,
  partName: string,
  specification: string,
  inspections: QualityInspection[] = [],
  qualityIssues: QualityIssue[] = []
): Promise<AIReport | null> => {
  try {
    if (!db) {
      throw new Error('Firebase not initialized');
    }

    // inspections가 비어있으면 Firestore에서 조회
    let finalInspections = inspections;
    if (finalInspections.length === 0) {
      try {
        const q = query(
          collection(db, 'quality-inspections'),
          orderBy('createdAt', 'desc'),
          firestoreLimit(1000)
        );
        const snapshot = await getDocs(q);
        finalInspections = snapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          } as QualityInspection))
          .filter(inspection => 
            inspection.supplier === supplier &&
            inspection.productName === productName &&
            inspection.partName === partName &&
            (inspection.specification || '') === specification
          );
      } catch (error) {
        console.error('Error fetching quality inspections:', error);
      }
    }

    // qualityIssues가 비어있으면 Firestore에서 조회
    let finalQualityIssues = qualityIssues;
    if (finalQualityIssues.length === 0) {
      try {
        const q = query(
          collection(db, 'quality-issues'),
          orderBy('createdAt', 'desc'),
          firestoreLimit(1000)
        );
        const snapshot = await getDocs(q);
        finalQualityIssues = snapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          } as QualityIssue))
          .filter(issue => 
            issue.supplier === supplier &&
            issue.productName === productName &&
            issue.partName === partName
          );
      } catch (error) {
        console.error('Error fetching quality issues:', error);
      }
    }

    // 품질이력이 없으면 null 반환
    if (!finalInspections || finalInspections.length === 0) {
      console.log('품질이력이 없어 AI 보고서를 생성하지 않습니다.');
      return null;
    }

    // AI 보고서 생성
    const aiSummary = await analyzeInspectionHistory(
      supplier,
      productName,
      partName,
      specification,
      finalInspections,
      finalQualityIssues,
      false // forceRefresh는 false (캐시 사용)
    );

    if (!aiSummary) {
      console.log('AI 보고서 생성 실패');
      return null;
    }

    // Firestore에 저장
    const now = new Date().toISOString();
    const reportData: Omit<AIReport, 'id'> = {
      productId,
      createdAt: now,
      updatedAt: now,
      summary: aiSummary.summary,
      warnings: aiSummary.warnings,
      report: aiSummary.report || '',
      qualityIssues: aiSummary.qualityIssues || undefined,
      // defectStats가 undefined면 필드를 포함하지 않음
      ...(aiSummary.defectStats ? { defectStats: aiSummary.defectStats } : {})
    };

    // 기존 보고서 확인
    const existingReport = await getAIReport(productId);
    
    let reportId: string;
    if (existingReport) {
      // 기존 보고서 업데이트
      const reportRef = doc(db, PRODUCT_AI_REPORTS_COLLECTION, existingReport.id);
      // undefined 필드 제거
      const updateData: any = {
        ...reportData,
        updatedAt: now
      };
      // undefined 필드 제거
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });
      await updateDoc(reportRef, updateData);
      reportId = existingReport.id;
    } else {
      // 새 보고서 생성
      // undefined 필드 제거
      const createData: any = { ...reportData };
      Object.keys(createData).forEach(key => {
        if (createData[key] === undefined) {
          delete createData[key];
        }
      });
      const docRef = await addDoc(
        collection(db, PRODUCT_AI_REPORTS_COLLECTION),
        createData
      );
      reportId = docRef.id;
    }

    return {
      id: reportId,
      ...reportData
    };
  } catch (error) {
    console.error('Error generating AI report:', error);
    return null;
  }
};

/**
 * AI 보고서 조회
 * Firestore에서 저장된 보고서 조회
 */
export const getAIReport = async (productId: string): Promise<AIReport | null> => {
  try {
    if (!db) {
      throw new Error('Firebase not initialized');
    }

    // 인덱스 없이 조회 (orderBy 제거)
    const q = query(
      collection(db, PRODUCT_AI_REPORTS_COLLECTION),
      where('productId', '==', productId),
      firestoreLimit(100) // 최대 100개 조회 후 클라이언트에서 정렬
    );

    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return null;
    }

    // 클라이언트에서 updatedAt 기준으로 정렬
    const docs = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      } as AIReport))
      .sort((a, b) => {
        const dateA = new Date(a.updatedAt || a.createdAt || '').getTime();
        const dateB = new Date(b.updatedAt || b.createdAt || '').getTime();
        return dateB - dateA; // 내림차순
      });

    if (docs.length === 0) {
      return null;
    }

    return docs[0] as AIReport;
  } catch (error) {
    console.error('Error fetching AI report:', error);
    return null;
  }
};

/**
 * 생산추이 분석 (시간당생산량 추이 분석)
 * Gemini API를 사용하여 생산추이 데이터를 분석하고 인사이트 제공
 */
export const analyzeProductionTrend = async (
  supplier: string,
  productName: string,
  partName: string,
  specification: string,
  productionTrend: ProductionTrendData[],
  productionHistory: ProductionHistoryItem[],
  coatingHistory: CoatingHistoryItem[],
  qualityInspections: QualityInspectionItem[],
  qualityIssues: QualityIssueItem[]
): Promise<string | null> => {
  try {
    const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
    
    if (!API_KEY || API_KEY.trim() === '') {
      console.warn('Gemini API 키가 설정되지 않았습니다.');
      return null;
    }

    const genAI = new GoogleGenerativeAI(API_KEY);
    
    // 비용 효율적인 모델 우선 사용: gemini-2.0-flash-lite (가장 저렴하고 빠름)
    // 2.0 Flash-Lite: 입력 $0.10/1M, 출력 $0.40/1M
    // 여러 모델을 순차적으로 시도 (429 에러 시 다음 모델로 자동 전환)
    const modelsToTry = ['gemini-2.0-flash-lite', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-flash-latest'];

    // 인당생산량 추이 데이터 계산 (생산이력 기반, 최근 30일)
    const historyByDate = new Map<string, { totalGood: number; totalPersonnel: number; count: number }>();
    
    productionHistory.forEach(item => {
      const date = item.workDate;
      const goodQuantity = item.goodQuantity || 0;
      const personnelCount = item.personnelCount || 0;
      
      if (!historyByDate.has(date)) {
        historyByDate.set(date, { totalGood: 0, totalPersonnel: 0, count: 0 });
      }
      
      const dayData = historyByDate.get(date)!;
      dayData.totalGood += goodQuantity;
      dayData.totalPersonnel += personnelCount;
      dayData.count += 1;
    });
    
    const trendSummary = Array.from(historyByDate.entries())
      .map(([date, data]) => {
        const perPerson = data.totalPersonnel > 0 
          ? Math.round((data.totalGood / data.totalPersonnel) * 10) / 10
          : 0;
        return {
          date,
          perPerson,
          sortDate: new Date(date).getTime()
        };
      })
      .sort((a, b) => a.sortDate - b.sortDate)
      .slice(-30)
      .map(item => ({
        date: item.date,
        perPerson: item.perPerson
      }));

    // 생산이력 상세 요약 (최근 20건) - 더 많은 정보 포함
    const recentHistory = productionHistory.slice(0, 20).map(item => {
      const inputQty = item.inputQuantity || 0;
      const goodQty = item.goodQuantity || 0;
      const defectQty = item.defectQuantity || 0;
      const personnel = item.personnelCount || 0;
      const defectRate = inputQty > 0 ? ((defectQty / inputQty) * 100).toFixed(2) : '0.00';
      
      // 가동시간 계산
      let workingHours = null;
      if (item.startTime && item.endTime) {
        const start = item.startTime.split(':').map(Number);
        const end = item.endTime.split(':').map(Number);
        if (start.length === 2 && end.length === 2) {
          const startMinutes = start[0] * 60 + start[1];
          const endMinutes = end[0] * 60 + end[1];
          const diffMinutes = endMinutes >= startMinutes 
            ? endMinutes - startMinutes 
            : (24 * 60 - startMinutes) + endMinutes;
          workingHours = (diffMinutes / 60).toFixed(1);
        }
      }
      
      return {
        date: item.workDate,
        orderNumber: item.orderNumber,
        line: item.productionLine || '-',
        orderQty: item.orderQuantity || 0,
        inputQty: inputQty,
        goodQty: goodQty,
        defectQty: defectQty,
        defectRate: `${defectRate}%`,
        personnelCount: personnel,
        perPerson: personnel > 0 && goodQty
          ? Math.round((goodQty / personnel) * 10) / 10
          : null,
        lineRatio: item.lineRatio || '-',
        workingHours: workingHours,
        memo: item.memo || null
      };
    });

    // 통계 데이터 계산
    const validPerPerson = trendSummary
      .map(t => t.perPerson)
      .filter(p => p > 0);
    
    const stats = validPerPerson.length > 0 ? {
      average: Math.round((validPerPerson.reduce((a, b) => a + b, 0) / validPerPerson.length) * 10) / 10,
      max: Math.max(...validPerPerson),
      min: Math.min(...validPerPerson),
      trend: validPerPerson.length >= 2 
        ? (validPerPerson[validPerPerson.length - 1] > validPerPerson[0] ? '증가' : '감소')
        : '변동없음',
      volatility: validPerPerson.length >= 2
        ? Math.round((Math.max(...validPerPerson) - Math.min(...validPerPerson)) * 10) / 10
        : 0
    } : null;

    // 품질이력 상세 요약 (최근 15건)
    const recentInspections = qualityInspections.slice(0, 15).map(item => ({
      date: item.inspectionDate,
      orderNumber: item.orderNumber,
      type: item.inspectionType === 'incoming' ? '수입' : item.inspectionType === 'inProcess' ? '공정' : '출하',
      result: item.result,
      keywords: item.keywordPairs?.map(p => `${p.process}-${p.defect}`).join(', ') || ''
    }));

    // 품질이슈 상세 요약 (최근 10건)
    const recentIssues = qualityIssues.slice(0, 10).map(item => ({
      date: item.createdAt.split('T')[0],
      orderNumber: item.orderNumber,
      status: item.status,
      issues: item.issues?.map(i => typeof i === 'string' ? i : i.content).join(' | ') || '',
      keywords: item.keywordPairs?.map(p => `${p.process}-${p.defect}`).join(', ') || ''
    }));

    // 도료사용이력 상세 요약 (최근 10건)
    const recentCoating = coatingHistory.slice(0, 10).map(item => {
      const data = item.coatingType === 'both' 
        ? {
            undercoat: item.coatingData.undercoat ? {
              conditions: item.coatingData.undercoat.conditions || '-',
              remarks: item.coatingData.undercoat.remarks || null
            } : null,
            topcoat: item.coatingData.topcoat ? {
              conditions: item.coatingData.topcoat.conditions || '-',
              remarks: item.coatingData.topcoat.remarks || null
            } : null,
            // 공통 정보는 최상위에서 가져오기
            material: item.coatingData.coatingMaterial || '-',
            color: item.coatingData.coatingColor || '-',
            thickness: item.coatingData.coatingThickness || '-'
          }
        : {
            material: item.coatingData.coatingMaterial || '-',
            color: item.coatingData.coatingColor || '-',
            thickness: item.coatingData.coatingThickness || '-',
            conditions: item.coatingData.conditions || '-',
            remarks: item.coatingData.remarks || null
          };
      
      return {
        date: item.workDate,
        orderNumber: item.orderNumber,
        line: item.productionLine || '-',
        type: item.coatingType === 'undercoat' ? '하도' : item.coatingType === 'topcoat' ? '상도' : '하도+상도',
        data: data
      };
    });

    // 생산이력 메모 요약 (최근 10건)
    const recentMemos = productionHistory
      .filter(item => item.memo && item.memo.trim() !== '')
      .slice(0, 10)
      .map(item => ({
        date: item.workDate,
        orderNumber: item.orderNumber,
        memo: item.memo
      }));

    const prompt = `당신은 코팅/증착 후가공 업체의 생산 분석 전문가입니다. 다음 데이터를 종합적으로 분석하여 전문가 수준의 생산성 분석 보고서를 작성해주세요.

**업체 정보:**
- 업체명: ${supplier}
- 제품명: ${productName}
- 부속명: ${partName}
- 사양: ${specification}
- 업종: 코팅/증착 후가공 (사출물을 코팅/증착하여 후가공하는 업체)

## 📊 인당생산량 추이 통계 (최근 30일)
${JSON.stringify(trendSummary, null, 2)}

${stats ? `### 통계 요약:
- 평균 인당생산량: ${stats.average}
- 최대값: ${stats.max}
- 최소값: ${stats.min}
- 전체 추세: ${stats.trend}
- 변동폭: ${stats.volatility}` : ''}

## 📋 생산이력 상세 (최근 20건)
${JSON.stringify(recentHistory, null, 2)}

## 🔍 품질이력 (최근 15건)
${JSON.stringify(recentInspections, null, 2)}

## ⚠️ 품질이슈 (최근 10건)
${JSON.stringify(recentIssues, null, 2)}

## 🎨 도료사용이력 상세 (최근 10건)
${JSON.stringify(recentCoating, null, 2)}

${recentMemos.length > 0 ? `## 📝 생산 메모 (최근 10건)
${JSON.stringify(recentMemos, null, 2)}` : ''}

**분석 요청사항:**

주어진 데이터만을 기반으로 객관적이고 전문가 수준의 현황 분석을 제공해주세요. 개선 방안이나 제안은 포함하지 마세요.

**반드시 다음 형식으로 간결하고 한눈에 파악 가능하게 작성해주세요:**

## 📊 핵심 요약
- 평균: [수치] | 최대: [수치] ([날짜]) | 최소: [수치] ([날짜]) | 변동폭: [수치]
- 전반적 추세: [한 줄 요약]

## 📈 주요 변화 시점
**중요: 각 날짜별로 해당 날짜의 데이터만 참조하고, 이전 날짜와 비교하여 증가/감소를 정확히 판단하세요.**

| 날짜 | 인당생산량 | 변화 | 주요 원인 |
|------|-----------|------|----------|
| [날짜] | [수치] | [증가/감소] | [해당 날짜 데이터 기반, 한 줄 요약] |
| [날짜] | [수치] | [증가/감소] | [해당 날짜 데이터 기반, 한 줄 요약] |

## 🔍 주요 요인 분석

### 생산 인원
- 평균: [수치]명 | 고인원([수치]명↑): [수치] | 저인원([수치]명↓): [수치]
- 패턴: [한 줄 요약]

### 불량률
- 평균: [수치]% | 최고([날짜]): [수치]% ([수치]) | 최저([날짜]): [수치]% ([수치])
- 패턴: [한 줄 요약]

### 스핀들비율
- 주요 비율: [비율들] | 각 비율별 평균: [데이터]
- 패턴: [한 줄 요약]

### 가동시간
- 평균: [수치]시간 | 패턴: [데이터 기반 사실 또는 "데이터 부족"]

### 도료조건
- 변경 시점: [날짜들] | 영향: [한 줄 요약]

### 품질이슈
- 발생 시점: [날짜들] | 연관성: [한 줄 요약]

### 생산라인
- 라인별 평균: [라인명: 수치] | 차이: [한 줄 요약 또는 "데이터 부족"]

## 📊 패턴 분석

**고생산량 날 특징**
- 날짜: [날짜들]
- 특징: 인원 [수치]명, 스핀들비율 [비율], 불량률 [수치]%, [기타 핵심 요인]

**저생산량 날 특징**
- 날짜: [날짜들]
- 특징: 인원 [수치]명, 스핀들비율 [비율], 불량률 [수치]%, [기타 핵심 요인]

**반복 패턴**
- [핵심 패턴 1]: [한 줄 설명]
- [핵심 패턴 2]: [한 줄 설명]

## ⚠️ 위험 요소

| 날짜 | 인당생산량 | 동시 발생 현상 |
|------|-----------|---------------|
| [날짜] | [수치] | [불량률 증가/품질이슈/도료조건 변경 등, 한 줄] |

**공정 불안정성**
- 변동성: [수치] | 이상치: [날짜들] | 주요 요인: [핵심 요인 나열]

**중요 지침 (반드시 준수):**
1. **간결하고 명확하게 작성하세요.** 불필요한 반복 설명을 제거하고 핵심만 기술하세요.
2. **표 형식을 활용하세요.** 데이터 비교는 표로 작성하여 한눈에 파악 가능하게 하세요.
3. **한 줄 요약을 원칙으로 하세요.** 각 항목은 한 줄로 핵심만 기술하세요.
4. **날짜와 데이터를 정확히 매칭하세요.** 각 날짜별 분석 시 반드시 해당 날짜의 생산이력 상세 데이터만 참조하세요.
5. **증가/감소를 정확히 판단하세요.** 이전 날짜와 비교하여 증가인지 감소인지 명확히 구분하세요.
6. 주어진 데이터만을 분석하세요. 데이터에 없는 내용은 추측하지 마세요.
7. 개선 방안, 제안, 권장사항은 포함하지 마세요.
8. 객관적 사실과 데이터 패턴만 기술하세요.
9. 각 분석은 구체적인 수치와 날짜를 근거로 제시하세요.
10. 데이터가 없는 항목은 "데이터 부족"으로 표시하세요.
11. **800-1000자 내외로 간결하게 작성하세요.** 핵심만 담아 가독성을 높이세요.

**작성 예시:**
- ❌ 잘못된 예: 
  - "2025-09-24: 인당생산량 493.9 → 감소 원인: 2025년 12월 3일 생산이력 상세 데이터 확인 결과, 벨트 끊김으로 인한 조치 및 재작업, 마무리 시간 증가 (38분) 등의 요인 발생으로 인한 생산 차질..." (날짜 혼동, 너무 장황함)
- ✅ 올바른 예: 
  - 핵심 요약: 평균: 417.4 | 최대: 493.9 (2025-09-24) | 최소: 340.8 (2025-12-03) | 변동폭: 153.1
  - 표 형식:
    | 날짜 | 인당생산량 | 변화 | 주요 원인 |
    |------|-----------|------|----------|
    | 2025-09-24 | 493.9 | 증가 | 인원 14명, 불량률 2.62%, 스핀들비율 1:4 |
    | 2025-12-03 | 340.8 | 감소 | 벨트 끊김, 불량률 41.24%, 인원 10명 |

**반드시 다음 순서대로 모든 섹션을 작성하세요:**
1. 📊 핵심 요약 (한 줄)
2. 📈 주요 변화 시점 (표 형식)
3. 🔍 주요 요인 분석 (간결한 항목별 요약)
4. 📊 패턴 분석 (고/저생산량 특징, 반복 패턴)
5. ⚠️ 위험 요소 (표 형식)

분석 결과를 한국어로 작성해주세요. 800-1000자 내외로 간결하게.`;

    // 여러 모델을 순차적으로 시도 (429 에러 시 다음 모델로 자동 전환)
    for (const modelName of modelsToTry) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();
        console.log(`[AI Service] 생산추이 분석 성공 (${modelName})`);
        return text;
      } catch (error: any) {
        // 429 에러인 경우 다음 모델로 넘어가기
        const isQuotaError = error?.message?.includes('429') || 
                            error?.message?.includes('quota') || 
                            error?.message?.includes('Quota exceeded') ||
                            error?.response?.status === 429 ||
                            error?.status === 429;
        
        if (isQuotaError) {
          console.warn(`[AI Service] API 할당량 초과 (${modelName}) - 다음 모델로 시도...`);
          continue; // 다음 모델로 넘어가기
        }
        
        // 다른 에러는 로그만 남기고 다음 모델 시도
        console.warn(`[AI Service] 모델 실패 (${modelName}):`, error?.message || error);
        continue;
      }
    }
    
    // 모든 모델 실패
    console.warn('[AI Service] 모든 모델 시도 실패 - 분석을 건너뜁니다.');
    return null;
  } catch (error: any) {
    // 429 에러 (할당량 초과) - 재시도 후에도 실패
    if (error?.message?.includes('429') || 
        error?.message?.includes('quota') || 
        error?.message?.includes('Quota exceeded') ||
        error?.response?.status === 429 ||
        error?.status === 429) {
      console.warn('[AI Service] API 할당량 초과 - 모든 재시도 실패. 결제 후 할당량 반영까지 몇 분~몇 시간이 걸릴 수 있습니다.');
      return null;
    }
    // 모델을 찾을 수 없는 경우도 조용히 처리
    if (error?.message?.includes('모델을 찾을 수 없') || 
        error?.message?.includes('model not found') ||
        error?.message?.includes('404')) {
      console.warn('[AI Service] 모델을 찾을 수 없습니다 - 분석을 건너뜁니다.');
      return null;
    }
    // 다른 에러는 로그만 남기고 null 반환
    console.error('Error analyzing production trend:', error);
    return null;
  }
};

