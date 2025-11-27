import {
  GoogleGenerativeAI,
  FunctionDeclaration,
  FunctionCallingMode,
  SchemaType,
} from '@google/generative-ai';
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
  return `gemini_analysis_v6:${safeKey}:${count}:${latestId}:${timestampHash}:${issueCount}:${latestIssueId}`;
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
  report?: string; // 체크리스트 대신 사용할 종합 분석 보고서
  // checklist: string[]; // 더 이상 사용하지 않음
  qualityIssues?: Array<{
    orderNumber?: string;
    issue: string;
    action?: string;
    status?: string;
    date?: string;
  }>;
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
  qualityIssues: QualityIssue[] = [],
  forceRefresh: boolean = false
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
  // forceRefresh가 true이면 캐시 무시
  const cacheKey = generateCacheKey(supplier, productName, partName, inspections, qualityIssues);
  if (!forceRefresh) {
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
  } else {
    console.log('Gemini 분석 결과 강제 새로고침 (캐시 무시)');
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
        날짜: (typeof issue.updatedAt === 'string'
          ? issue.updatedAt.split('T')[0]
          : issue.updatedAt instanceof Date
            ? issue.updatedAt.toISOString().split('T')[0]
            : typeof issue.createdAt === 'string'
              ? issue.createdAt.split('T')[0]
              : issue.createdAt instanceof Date
                ? issue.createdAt.toISOString().split('T')[0]
                : '') || '',
        발주번호: issue.orderNumber || '',
        제품명: issue.productName || '',
        부속명: issue.partName || '',
        등록키워드: issue.registrationKeyword || '',
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

      // 처리 수량/대기 정보
      if (typeof issue.shippingWaitQuantity === 'number') {
        baseIssue.대기수량 = issue.shippingWaitQuantity;
      }
      if (typeof issue.processedQuantity === 'number') {
        baseIssue.처리수량 = issue.processedQuantity;
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
   - 품질이슈가 있으면 요약에 품질이슈 요약도 한 줄 포함 (예: "품질이슈: 발주 T10955-1 코팅 얼룩 진행중")
2. 품질이슈 분석:
   - 최대 3건, 최신순
   - 각 항목은 {orderNumber, issue, action, status, date} 형식으로 반환
   - orderNumber는 없으면 "-"로 표기
   - issue: 어떤 문제가 발생했는지 (불량유형/상황 포함)
   - action: 조치/대기 내용 (예: "증착 재작업 예정", "선별 완료")
   - status: 진행 상태 (open/in-progress/resolved 등)
   - date: YYYY-MM-DD
3. 위치/비교/조치 정보는 데이터에 있을 때만 포함
4. 짧은 명사형 종결
5. 데이터에 없는 조언 금지
6. 없으면 생략
7. 요약은 날짜별로 줄바꿈 (\\n 사용, 날짜 형식: YYYY-MM-DD)
8. 품질이슈는 검사이력과 함께 종합적으로 분석하여 요약에 반영하되 qualityIssues 필드에도 구조화해 반환

보고서 및 분석 규칙 (필수):
- "품질 관리 전문가" 역할로 전체적인 품질 흐름과 개선 추이를 분석하세요.
- 단편적인 사실 나열 대신, 과거 대비 현재 상태를 비교 분석하세요.
- **개선 사항 명시**: 과거에 빈번했으나 최근 사라진 불량은 "개선됨" 또는 "해소됨"으로 명확히 언급하세요.
- **주의사항**: 일시적인 문제보다는 만성적인 문제나 재발 가능성이 높은 사항 위주로 작성하세요. (예: "8번 캐비티 냉유" -> "사출 초기 금형 온도 관리 필요")
- **보고서 내용**:
  1) **전체 불량 흐름**: 주요 불량 유형의 발생 빈도 변화 (증가/감소/유지)
  2) **개선 및 조치 현황**: 과거 문제점 중 해결된 사항과 여전히 진행 중인 사항 구분
  3) **향후 중점 관리 사항**: 데이터 흐름상 앞으로 주의해야 할 공정이나 포인트 제안

analyzeInspectionHistory 함수를 호출하여 분석 결과를 반환하세요.`;

    // Function Calling 스키마 정의
    const functionSchema: FunctionDeclaration = {
      name: 'analyzeInspectionHistory',
      description: '품질 검사 이력 데이터를 분석하여 요약, 경고, 보고서를 생성합니다.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          summary: {
            type: SchemaType.STRING,
            description: '이력 요약 (날짜별 줄바꿈 포함, 불량률이 있으면 반드시 불량 유형도 함께 표시, 형식: "불량률 X%, 불량유형1, 불량유형2")'
          },
          warnings: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
            description: '주의사항 목록 (2-3개, 각 항목 최대 30자)'
          },
          report: {
            type: SchemaType.STRING,
            description: '종합 분석 보고서 (150자 내외, 전체 불량 흐름 분석 -> 개선/미해결 현황 -> 향후 중점 관리 사항 순으로 서술)'
          },
          qualityIssues: {
            type: SchemaType.ARRAY,
            description: '품질이슈 분석 (최대 3건, 최신순)',
            items: {
              type: SchemaType.OBJECT,
              properties: {
                orderNumber: { type: SchemaType.STRING, description: '발주번호, 없으면 "-"' },
                issue: { type: SchemaType.STRING, description: '어떤 품질이슈인지 (불량유형 포함)' },
                action: { type: SchemaType.STRING, description: '조치/대기 내용' },
                status: { type: SchemaType.STRING, description: '진행 상태' },
                date: { type: SchemaType.STRING, description: 'YYYY-MM-DD' }
              },
              required: ['issue']
            }
          }
        },
        required: ['summary', 'warnings', 'report', 'qualityIssues']
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
                mode: FunctionCallingMode.ANY, // 함수를 반드시 호출하도록 설정
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
            if (!args.qualityIssues) {
              args.qualityIssues = [];
            }
            
            // 캐시 저장
            sessionStorage.setItem(cacheKey, JSON.stringify(args));
            return args;
          }
          
          // Function Calling 실패 시 텍스트 응답으로 폴백
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            const jsonText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const parsed = JSON.parse(jsonText) as InspectionSummary;
            if (!parsed.qualityIssues) {
              parsed.qualityIssues = [];
            }
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
              mode: FunctionCallingMode.ANY,
              allowedFunctionNames: ['analyzeInspectionHistory']
            }
          }
        });
        
        const result = await Promise.race([
          model.generateContent(prompt),
          createTimeout()
        ]);
        
        // Function Calling 응답 파싱
        const functionCalls = result.response.functionCalls?.();
        const functionCall = functionCalls?.find(
          (fc: any) => fc.name === 'analyzeInspectionHistory'
        );
        
        if (functionCall && functionCall.args) {
          const parsed = functionCall.args as InspectionSummary;
          console.log(`Gemini Function Calling 성공 (SDK, ${modelName})`);
          if (!parsed.qualityIssues) {
            parsed.qualityIssues = [];
          }
          
          // 캐시 저장
          sessionStorage.setItem(cacheKey, JSON.stringify(parsed));
          return parsed;
        }
        
        // Function Calling 실패 시 텍스트 응답으로 폴백
        const text = result.response.text();
        const jsonText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(jsonText) as InspectionSummary;
        if (!parsed.qualityIssues) {
          parsed.qualityIssues = [];
        }
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

