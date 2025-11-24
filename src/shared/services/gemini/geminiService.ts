import { GoogleGenerativeAI } from '@google/generative-ai';
import { QualityInspection } from '@/features/quality/types';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// 캐시 키 생성 함수
const generateCacheKey = (supplier: string, productName: string, partName: string, inspections: QualityInspection[]) => {
  // 조건이 모두 같고, 데이터 상태(최신 이력 ID + 전체 개수)가 같으면 캐시 사용
  // 최신순 정렬되어 있다고 가정하거나, 날짜순 정렬
  const sorted = [...inspections].sort((a, b) => 
    new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()
  );
  const latestId = sorted[0]?.id || 'empty';
  const count = inspections.length;
  
  // 특수문자 제거 및 공백 처리로 안전한 키 생성
  const safeKey = `${supplier}_${productName}_${partName}`.replace(/[^a-zA-Z0-9가-힣_]/g, '');
  return `gemini_analysis_v2:${safeKey}:${count}:${latestId}`;
};

/**
 * 사용 가능한 모델 목록 조회 (디버깅용)
 */
async function listAvailableModels(apiKey: string): Promise<string[]> {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();
    if (data.models) {
      return data.models
        .filter((model: any) => model.supportedGenerationMethods?.includes('generateContent'))
        .map((model: any) => model.name.replace('models/', ''));
    }
    return [];
  } catch (error) {
    console.error('모델 목록 조회 실패:', error);
    return [];
  }
}

export interface InspectionSummary {
  summary: string;
  warnings: string[];
  checklist: string[];
}

/**
 * Gemini API를 사용하여 품질 이력 데이터를 분석하고 요약 생성
 */
export async function analyzeInspectionHistory(
  supplier: string,
  productName: string,
  partName: string,
  inspections: QualityInspection[]
): Promise<InspectionSummary | null> {
  // API 키 확인
  if (!API_KEY || API_KEY.trim() === '') {
    console.warn('Gemini API 키가 설정되지 않았습니다. VITE_GEMINI_API_KEY 환경 변수를 확인해주세요.');
    return null;
  }

  // API 키 형식 확인 (일반적으로 AIza로 시작)
  if (!API_KEY.startsWith('AIza')) {
    console.warn('Gemini API 키 형식이 올바르지 않을 수 있습니다. Google AI Studio에서 발급받은 키를 확인해주세요.');
  }

  // 이력이 없으면 null 반환
  if (!inspections || inspections.length === 0) {
    return null;
  }

  // 1. 캐시 확인 (성능 최적화: 동일 조건/데이터면 즉시 반환)
  const cacheKey = generateCacheKey(supplier, productName, partName, inspections);
  try {
    const cachedData = sessionStorage.getItem(cacheKey);
    if (cachedData) {
      console.log('Gemini 분석 결과 캐시 사용:', cacheKey);
      return JSON.parse(cachedData) as InspectionSummary;
    }
  } catch (e) {
    console.warn('캐시 읽기 실패:', e);
    sessionStorage.removeItem(cacheKey);
  }

  try {
    const genAI = new GoogleGenerativeAI(API_KEY);
    
    // 모든 이력 데이터를 포함하되, 각 이력의 데이터를 간결하게 정리 (성능 향상)
    const inspectionData = inspections.map((inspection) => {
      const baseData: any = {
        타입: inspection.inspectionType === 'incoming' ? '수입' : 
              inspection.inspectionType === 'inProcess' ? '공정' : '출하',
        날짜: inspection.inspectionDate || inspection.createdAt?.split('T')[0] || '',
      };

      // 수입검사는 합격/불합격 결과가 중요
      if (inspection.inspectionType === 'incoming') {
        baseData.결과 = inspection.result;
        if (inspection.resultReason) {
          baseData.사유 = inspection.resultReason.substring(0, 80);
        }
      }

      // 불량 키워드 (모든 단계에서 중요)
      if (inspection.keywordPairs && inspection.keywordPairs.length > 0) {
        baseData.불량 = inspection.keywordPairs
          .filter(pair => pair.process && pair.defect)
          .map(pair => `${pair.process}-${pair.defect}`)
          .join(',');
      }

      // 공정검사: 작업라인, 이력 내용, 불량률 중요
      if (inspection.inspectionType === 'inProcess') {
        if (inspection.workLine) baseData.라인 = inspection.workLine;
        // 공정검사 이력 내용 요약
        const history = [inspection.preInspectionHistory, inspection.inProcessInspectionHistory]
          .filter(Boolean).join(' / ');
        if (history) baseData.내용 = history.substring(0, 100);
      }

      // 출하검사: 작업자별 불량 수량, 이력 내용 중요
      if (inspection.inspectionType === 'outgoing') {
        if (inspection.workers && inspection.workers.length > 0) {
          const totalInspected = inspection.workers.reduce((sum, w) => sum + w.totalInspected, 0);
          const totalDefect = inspection.workers.reduce((sum, w) => sum + w.defectQuantity, 0);
          if (totalInspected > 0) {
            baseData.불량률 = `${((totalDefect / totalInspected) * 100).toFixed(1)}%`;
            baseData.불량수 = totalDefect;
          }
        }
        // 재검사 등 이력 내용
        const history = [inspection.reinspectionContent, inspection.reinspectionKeyword]
          .filter(Boolean).join(' / ');
        if (history) baseData.내용 = history.substring(0, 100);
      }

      return baseData;
    });

    // 프롬프트 구성 - 템플릿 강제 (속도 및 가독성 최적화)
    const prompt = `품질검사 이력 분석. 아래 템플릿 양식을 그대로 채워서 응답해.

역할: 사출물 코팅/증착 후공정 업체.
데이터: ${JSON.stringify(inspectionData)}

규칙:
1. 모든 텍스트는 짧은 명사형 종결.
2. 숫자를 적극 활용.
3. **절대 데이터에 없는 일반적인 조언 금지** (예: "검사 철저", "협의 필요" 등 금지).
4. 데이터에서 구체적인 행동 지침을 찾을 수 없으면 해당 항목은 "특이사항 없음" 또는 생략.
5. **요약 시 "사출불량 6종" 같이 뭉뚱그리지 말고 "사출-찍힘(3), 사출-수축(3)" 처럼 구체적인 불량명 명시.**

JSON 응답 예시 (이 형식을 따를 것):
{
  "summary": "[주요불량] 사출-수축(3건), 증착-이물(2건) / [불량률] 공정 5.2%",
  "warnings": [
    "[공정] 이력에 기록된 '지그 오염' 주의"
  ],
  "checklist": [
    "이력에 기록된 '진공도 5.0' 준수"
  ]
}`;

    // 타임아웃 설정 (10초로 단축 - 빠른 응답 유도)
    const createTimeout = () => new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('API 호출 타임아웃 (10초)')), 10000);
    });

    // REST API 직접 호출을 우선 시도 (SDK 오버헤드 제거)
    // 가장 빠르고 안정적인 모델만 선정
    const modelsToTry = ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-flash-latest'];
    
    // 1. REST API 시도 (가장 빠름)
    for (const modelName of modelsToTry) {
      try {
        const restApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10초 타임아웃
        
        const response = await fetch(restApiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          
          if (text) {
             const jsonText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
             const parsed = JSON.parse(jsonText) as InspectionSummary;
             console.log(`Gemini REST API 성공 (${modelName})`);
             
             // 캐시 저장
             sessionStorage.setItem(cacheKey, JSON.stringify(parsed));
             return parsed;
          }
        }
      } catch (e) {
        console.warn(`REST API 실패 (${modelName}):`, e);
        continue;
      }
    }

    // 2. REST 실패 시 SDK 시도 (백업)
    console.warn('REST API 실패, SDK로 재시도...');
    const sdkGenAI = new GoogleGenerativeAI(API_KEY);
    
    for (const modelName of modelsToTry) {
      try {
        const model = sdkGenAI.getGenerativeModel({ model: modelName });
        const result = await Promise.race([
          model.generateContent(prompt),
          createTimeout()
        ]);
        
        const text = result.response.text();
        const jsonText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(jsonText) as InspectionSummary;
        
        // 캐시 저장
        sessionStorage.setItem(cacheKey, JSON.stringify(parsed));
        return parsed;
      } catch (e) {
        console.warn(`SDK 실패 (${modelName}):`, e);
        continue;
      }
    }

    return null;
  } catch (error) {
    console.error('Gemini API 호출 실패:', error);
    return null;
  }
}

