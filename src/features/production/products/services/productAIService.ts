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
    
    // 비용 효율적인 모델 우선 사용: gemini-2.0-flash (가장 저렴)
    // 2.0 Flash: 입력 $0.15/1M, 출력 $0.60/1M
    // 2.5 Flash: 입력 $0.30/1M, 출력 $2.50/1M (약 4배 비쌈)
    let model;
    try {
      // gemini-2.0-flash 우선 사용 (비용 효율적)
      model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    } catch (error) {
      try {
        // fallback: gemini-2.5-flash
        model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      } catch (error2) {
        try {
          // 최종 fallback: gemini-1.5-flash
          model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        } catch (error3) {
          throw new Error('사용 가능한 Gemini 모델을 찾을 수 없습니다.');
        }
      }
    }

    // 생산추이 데이터 요약 (최근 30일)
    const recentTrend = productionTrend.slice(-30);
    const trendSummary = recentTrend.map(item => ({
      date: item.date,
      uph: item.uph
    }));

    // 생산이력 요약 (최근 20건)
    const recentHistory = productionHistory.slice(0, 20).map(item => ({
      date: item.workDate,
      orderNumber: item.orderNumber,
      line: item.productionLine,
      input: item.inputQuantity || 0,
      good: item.goodQuantity || 0,
      defect: item.defectQuantity || 0,
      defectRate: item.inputQuantity && item.inputQuantity > 0 
        ? ((item.defectQuantity || 0) / item.inputQuantity * 100).toFixed(2) 
        : '0.00',
      personnelCount: item.personnelCount || null, // 생산인원
      lineRatio: item.lineRatio || null, // 스핀들 비율 (라인 비율)
      startTime: item.startTime || null, // 시작시간
      endTime: item.endTime || null // 종료시간
    }));

    // 품질이력 요약 (최근 20건)
    const recentInspections = qualityInspections.slice(0, 20).map(item => ({
      date: item.inspectionDate,
      type: item.inspectionType === 'incoming' ? '수입' : item.inspectionType === 'inProcess' ? '공정' : '출하',
      result: item.result,
      keywords: item.keywordPairs?.map(p => `${p.process}-${p.defect}`).join(', ') || ''
    }));

    // 품질이슈 요약 (최근 10건)
    const recentIssues = qualityIssues.slice(0, 10).map(item => ({
      date: item.createdAt.split('T')[0],
      orderNumber: item.orderNumber,
      status: item.status,
      issues: item.issues?.map(i => typeof i === 'string' ? i : i.content).join(', ') || ''
    }));

    // 도료사용이력 요약 (최근 10건)
    const recentCoating = coatingHistory.slice(0, 10).map(item => ({
      date: item.workDate,
      type: item.coatingType === 'undercoat' ? '하도' : item.coatingType === 'topcoat' ? '상도' : '하도+상도',
      conditions: item.coatingData.conditions || item.coatingData.undercoat?.conditions || ''
    }));

    const prompt = `다음은 "${supplier}"의 "${productName}" (${partName}, ${specification}) 제품의 생산 데이터입니다.

**중요: 우리는 사출업체가 아닌 코팅/증착 후가공 업체입니다.**
- 사출물은 외부에서 구매한 것으로, 우리는 이를 코팅/증착 후가공하는 업체입니다.
- 생산 공정은 주로 코팅(하도/상도), 증착, 후가공 공정으로 구성됩니다.
- 사출 관련 불량(사출-기름, 사출-찍힘 등)은 사출물 자체의 문제이거나, 코팅/증착 공정에서 발생하는 문제입니다.
- 품질 검사 용어: "입고 검사"가 아닌 "수입검사"로 명칭합니다. (수입검사, 공정검사, 출하검사)

## 시간당생산량(UPH) 추이 데이터 (최근 30일):
${JSON.stringify(trendSummary, null, 2)}

## 생산이력 (최근 20건):
${JSON.stringify(recentHistory, null, 2)}

## 품질이력 (최근 20건):
${JSON.stringify(recentInspections, null, 2)}

## 품질이슈 (최근 10건):
${JSON.stringify(recentIssues, null, 2)}

## 도료사용이력 (최근 10건):
${JSON.stringify(recentCoating, null, 2)}

위의 모든 데이터를 종합적으로 분석하여, 시간당생산량(UPH) 추이가 이렇게 나타나는 이유를 추측하고, 개선 방안을 제시해주세요.

**특히 다음 사항을 반드시 고려해주세요:**
- 우리는 코팅/증착 후가공 업체이므로, 코팅 공정과 증착 공정의 효율성이 UPH에 직접적인 영향을 미칩니다.
- 생산인원(personnelCount)과 스핀들 비율(lineRatio)이 UPH에 미치는 영향
- 생산인원 대비 생산량 비율 (인원 효율성)
- 스핀들 비율과 실제 생산량의 관계
- 가동시간(startTime, endTime)과 생산량의 관계
- 생산인원, 스핀들 비율, 불량률의 상관관계
- 코팅/증착 공정 조건(도료사용이력)이 생산성과 품질에 미치는 영향
- 사출물 품질 문제가 코팅/증착 공정에 미치는 영향

다음 형식으로 답변해주세요:
1. **추이 분석**: 시간당생산량이 증가/감소/변동하는 패턴과 그 이유 (코팅/증착 공정 관점, 생산인원, 스핀들 비율 포함)
2. **주요 원인 추측**: 생산이력(생산인원, 스핀들 비율 포함), 품질이력, 도료사용이력 등을 종합하여 추정되는 원인 (코팅/증착 공정 중심으로 분석)
3. **개선 방안**: 구체적인 개선 제안사항 (코팅/증착 공정 개선, 생산인원 배치, 스핀들 비율 최적화 포함)

간결하고 실용적인 분석을 제공해주세요. (500자 이내)`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
    return text;
  } catch (error: any) {
    // 429 에러 (할당량 초과)는 조용히 처리
    if (error?.message?.includes('429') || error?.message?.includes('quota') || error?.message?.includes('Quota exceeded')) {
      console.warn('[AI Service] API 할당량 초과 - 분석을 건너뜁니다.');
      return null;
    }
    // 다른 에러는 로그만 남기고 null 반환
    console.error('Error analyzing production trend:', error);
    return null;
  }
};

