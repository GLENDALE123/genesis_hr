import { GoogleGenerativeAI } from '@google/generative-ai';
import { QualityInspection, QualityIssue } from '@/features/quality/types';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// 캐시 키 생성 함수
const generateCacheKey = (supplier: string, productName: string, partName: string, inspections: QualityInspection[], qualityIssues: QualityIssue[] = []) => {
  // 조건이 모두 같고, 데이터 상태가 같으면 캐시 사용
  // 최신순 정렬
  const sorted = [...inspections].sort((a, b) => {
    const dateA = new Date(a.updatedAt || a.createdAt || '').getTime();
    const dateB = new Date(b.updatedAt || b.createdAt || '').getTime();
    return dateB - dateA;
  });
  
  const latestId = sorted[0]?.id || 'empty';
  const count = inspections.length;
  
  // 최신 이력의 updatedAt 또는 createdAt을 포함하여 수정 시 캐시 무효화
  const latestTimestamp = sorted[0]?.updatedAt || sorted[0]?.createdAt || '';
  const timestampHash = latestTimestamp ? new Date(latestTimestamp).getTime().toString() : '0';
  
  // 품질이슈 정보 포함
  const issueCount = qualityIssues.length;
  const latestIssueId = qualityIssues.length > 0 
    ? qualityIssues.sort((a, b) => {
        const dateA = new Date(a.updatedAt || a.createdAt || '').getTime();
        const dateB = new Date(b.updatedAt || b.createdAt || '').getTime();
        return dateB - dateA;
      })[0]?.id || 'empty'
    : 'empty';
  
  // 특수문자 제거 및 공백 처리로 안전한 키 생성
  const safeKey = `${supplier}_${productName}_${partName}`.replace(/[^a-zA-Z0-9가-힣_]/g, '');
  return `gemini_analysis_v4:${safeKey}:${count}:${latestId}:${timestampHash}:${issueCount}:${latestIssueId}`;
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
  defectStats?: {
    defectTypes: Array<{ name: string; count: number }>;
    defectRates: Array<{ type: string; rate: number; failed: number; total: number }>;
  };
}

/**
 * Gemini API를 사용하여 품질 이력 데이터를 분석하고 요약 생성
 */
export async function analyzeInspectionHistory(
  supplier: string,
  productName: string,
  partName: string,
  inspections: QualityInspection[],
  qualityIssues: QualityIssue[] = []
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
  const cacheKey = generateCacheKey(supplier, productName, partName, inspections, qualityIssues);
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
          baseData.사유 = inspection.resultReason.substring(0, 60); // 60자로 제한
        }
        // 외관 이력 (최대 100자로 제한)
        if (inspection.appearanceHistory) {
          baseData.외관이력 = inspection.appearanceHistory.substring(0, 100);
        }
        // 기능 이력 (최대 100자로 제한)
        if (inspection.functionHistory) {
          baseData.기능이력 = inspection.functionHistory.substring(0, 100);
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
        // 공정검사 이력 내용 (최대 100자로 제한)
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
        // 재검사 등 이력 내용 (최대 100자로 제한)
        const history = [inspection.reinspectionContent, inspection.reinspectionKeyword]
          .filter(Boolean).join(' / ');
        if (history) baseData.내용 = history.substring(0, 100);
      }

      return baseData;
    });

    // 품질이슈 데이터 정리
    const issueData = qualityIssues.map((issue) => {
      const baseIssue: any = {
        날짜: issue.createdAt?.split('T')[0] || '',
        상태: issue.status,
        우선순위: issue.priority,
      };

      // 이슈 내용 (IssueItem 배열 또는 문자열 배열)
      if (issue.issues && issue.issues.length > 0) {
        const issueContents = issue.issues.map((item: any) => {
          if (typeof item === 'string') {
            return item.substring(0, 100);
          } else if (item && typeof item === 'object' && item.content) {
            return item.content.substring(0, 100);
          }
          return '';
        }).filter(Boolean);
        if (issueContents.length > 0) {
          baseIssue.이슈내용 = issueContents.join(' / ');
        }
      }

      // 불량 키워드
      if (issue.keywordPairs && issue.keywordPairs.length > 0) {
        baseIssue.불량 = issue.keywordPairs
          .filter(pair => pair.process && pair.defect)
          .map(pair => `${pair.process}-${pair.defect}`)
          .join(',');
      }

      // 해결 내용
      if (issue.resolution) {
        baseIssue.해결내용 = issue.resolution.substring(0, 100);
      }

      return baseIssue;
    });

    // 프롬프트 구성 - 최소화 (속도 최적화)
    const prompt = `품질검사 이력 분석. 짧고 간결하게.

역할: 사출물 코팅/증착 후공정 업체.
검사이력: ${JSON.stringify(inspectionData)}
품질이슈: ${JSON.stringify(issueData)}

규칙:
1. 요약 형식 (필수):
   - 불량률이 있으면 반드시 불량 유형도 함께 표시
   - 형식: "불량률 X%, 불량유형1, 불량유형2" 또는 "불량유형1(X%), 불량유형2(Y%)"
   - 예시: "불량률 3.6%, 코팅-이물, 사출-스크래치" 또는 "코팅-이물(2.2%), 사출-스크래치(1.4%)"
   - 불량 유형이 데이터에 있으면 반드시 포함 (누락 금지)
   - 품질이슈가 있으면 요약에 품질이슈 내용도 포함 (예: "품질이슈: [이슈내용]")
2. 위치/비교/조치 정보는 데이터에 있을 때만 포함
3. 짧은 명사형 종결
4. 데이터에 없는 조언 금지
5. 없으면 생략
6. 요약은 날짜별로 줄바꿈 (\\n 사용, 날짜 형식: YYYY-MM-DD)
7. 품질이슈는 검사이력과 함께 종합적으로 분석하여 요약에 반영

체크리스트 규칙 (중요):
- 반드시 이력 데이터에서 발견된 구체적인 불량이나 패턴에만 기반
- "담당자 확인", "공유", "점검" 같은 일반적인 조언 금지
- 데이터에 명시된 불량 위치, 불량 유형, 반복 패턴만 포함
- 예시: "측면 하단부 긁힘 확인", "코팅-이물 0.5% 모니터링", "사출-수축 재발 방지"
- 실질적인 작업 지시만 포함 (예: "하단부 전수검출", "윗면 수축 확인")
- 데이터에 해당 정보가 없으면 체크리스트는 빈 배열 []

analyzeInspectionHistory 함수를 호출하여 분석 결과를 반환하세요.`;

    // Function Calling 스키마 정의
    const functionSchema = {
      name: 'analyzeInspectionHistory',
      description: '품질 검사 이력 데이터를 분석하여 요약, 경고, 체크리스트를 생성합니다.',
      parameters: {
        type: 'object',
        properties: {
          summary: {
            type: 'string',
            description: '이력 요약 (날짜별 줄바꿈 포함, 불량률이 있으면 반드시 불량 유형도 함께 표시, 형식: "불량률 X%, 불량유형1, 불량유형2")'
          },
          warnings: {
            type: 'array',
            items: { type: 'string' },
            description: '주의사항 목록 (2-3개, 각 항목 최대 30자)'
          },
          checklist: {
            type: 'array',
            items: { type: 'string' },
            description: '다음 작업 체크리스트 (데이터 기반 구체적 불량/패턴만, 일반 조언 금지, 없으면 빈 배열)'
          }
        },
        required: ['summary', 'warnings', 'checklist']
      }
    };

    // 타임아웃 설정 (7초로 단축 - 빠른 응답 유도)
    const createTimeout = () => new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('API 호출 타임아웃 (7초)')), 7000);
    });

    // REST API 직접 호출을 우선 시도 (SDK 오버헤드 제거)
    // 가장 빠르고 안정적인 모델만 선정
    const modelsToTry = ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-flash-latest'];
    
    // 1. REST API 시도 (Function Calling 사용)
    for (const modelName of modelsToTry) {
      try {
        const restApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 7000); // 7초 타임아웃
        
        const response = await fetch(restApiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            tools: [{
              functionDeclarations: [functionSchema]
            }],
            toolConfig: {
              functionCallingConfig: {
                mode: 'ANY', // 함수를 반드시 호출하도록 설정
                allowedFunctionNames: ['analyzeInspectionHistory']
              }
            }
          }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          
          // Function Calling 응답 파싱
          const functionCall = data.candidates?.[0]?.content?.parts?.[0]?.functionCall;
          if (functionCall && functionCall.name === 'analyzeInspectionHistory') {
            const args = functionCall.args as InspectionSummary;
            console.log(`Gemini Function Calling 성공 (${modelName})`);
            
            // 캐시 저장
            sessionStorage.setItem(cacheKey, JSON.stringify(args));
            return args;
          }
          
          // Function Calling 실패 시 텍스트 응답으로 폴백
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            const jsonText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const parsed = JSON.parse(jsonText) as InspectionSummary;
            console.log(`Gemini REST API 성공 (텍스트 응답, ${modelName})`);
            
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

    // 2. REST 실패 시 SDK 시도 (Function Calling 사용)
    console.warn('REST API 실패, SDK로 재시도...');
    const sdkGenAI = new GoogleGenerativeAI(API_KEY);
    
    for (const modelName of modelsToTry) {
      try {
        const model = sdkGenAI.getGenerativeModel({ 
          model: modelName,
          tools: [{
            functionDeclarations: [functionSchema]
          }],
          toolConfig: {
            functionCallingConfig: {
              mode: 'ANY',
              allowedFunctionNames: ['analyzeInspectionHistory']
            }
          }
        });
        
        const result = await Promise.race([
          model.generateContent(prompt),
          createTimeout()
        ]);
        
        // Function Calling 응답 파싱
        const functionCall = result.response.functionCalls?.find(
          (fc: any) => fc.name === 'analyzeInspectionHistory'
        );
        
        if (functionCall && functionCall.args) {
          const parsed = functionCall.args as InspectionSummary;
          console.log(`Gemini Function Calling 성공 (SDK, ${modelName})`);
          
          // 캐시 저장
          sessionStorage.setItem(cacheKey, JSON.stringify(parsed));
          return parsed;
        }
        
        // Function Calling 실패 시 텍스트 응답으로 폴백
        const text = result.response.text();
        const jsonText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(jsonText) as InspectionSummary;
        console.log(`Gemini SDK 성공 (텍스트 응답, ${modelName})`);
        
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

