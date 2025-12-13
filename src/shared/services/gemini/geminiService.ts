import {
  GoogleGenerativeAI,
  FunctionDeclaration,
  FunctionCallingMode,
  SchemaType,
} from '@google/generative-ai';
import { QualityInspection, QualityIssue } from '@/features/quality/types';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

  // 캐시 키 생성 함수
const generateCacheKey = (supplier: string, productName: string, partName: string, specification: string, inspections: QualityInspection[], qualityIssues: QualityIssue[] = []) => {
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
  const safeKey = `${supplier}_${productName}_${partName}_${specification}`.replace(/[^a-zA-Z0-9가-힣_]/g, '');
  return `gemini_analysis_v15:${safeKey}:${count}:${latestId}:${timestampHash}:${issueCount}:${latestIssueId}`;
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
  specification: string,
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
  const cacheKey = generateCacheKey(supplier, productName, partName, specification, inspections, qualityIssues);
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
    
    // 성능 최적화: 클라이언트 사이드에서 통계를 미리 계산하여 AI에게 요약된 데이터만 전달
    // 날짜별로 그룹화하여 중복 제거 및 집계
    const dateGrouped = new Map<string, any>();
    
    inspections.forEach((inspection) => {
      const date = inspection.inspectionDate || inspection.createdAt?.split('T')[0] || '';
      const type = inspection.inspectionType === 'incoming' ? '수입' : 
                   inspection.inspectionType === 'inProcess' ? '공정' : '출하';
      
      const key = `${date}_${type}`;
      
      if (!dateGrouped.has(key)) {
        dateGrouped.set(key, {
          날짜: date,
          타입: type,
          불량목록: new Set<string>(),
          불량률: null as string | null,
          특이사항: [] as string[], // 지그 번호, 캐비티 번호 등 구체적 정보
        });
      }
      
      const group = dateGrouped.get(key);
      
      // 불량 키워드 수집
      if (inspection.keywordPairs && inspection.keywordPairs.length > 0) {
        inspection.keywordPairs
          .filter(pair => pair.process && pair.defect)
          .forEach(pair => {
            group.불량목록.add(`${pair.process}-${pair.defect}`);
          });
      }
      
      // 불량률 계산 (출하검사)
      if (inspection.inspectionType === 'outgoing' && inspection.workers && inspection.workers.length > 0) {
        const totalInspected = inspection.workers.reduce((sum, w) => sum + w.totalInspected, 0);
        const totalDefect = inspection.workers.reduce((sum, w) => sum + w.defectQuantity, 0);
        if (totalInspected > 0) {
          const rate = ((totalDefect / totalInspected) * 100).toFixed(2);
          // 더 높은 불량률이 있으면 업데이트
          if (!group.불량률 || parseFloat(rate) > parseFloat(group.불량률.replace('%', ''))) {
            group.불량률 = `${rate}%`;
          }
        }
      }
      
      // 특이사항 추출 (지그 번호, 캐비티 번호 등 구체적 정보가 있는 경우만)
      const allHistory = [
        inspection.resultReason,
        inspection.appearanceHistory,
        inspection.functionHistory,
        inspection.preInspectionHistory,
        inspection.inProcessInspectionHistory,
        inspection.reinspectionContent,
        inspection.reinspectionKeyword,
      ].filter(Boolean).join(' ');
      
      // 지그 번호, 캐비티 번호 등 구체적 정보 추출 (정규식으로 패턴 매칭)
      const specificInfoPatterns = [
        /\d+번\s*지그/gi,
        /\d+번\s*캐비티/gi,
        /지그\s*\d+/gi,
        /캐비티\s*\d+/gi,
      ];
      
      specificInfoPatterns.forEach(pattern => {
        const matches = allHistory.match(pattern);
        if (matches) {
          matches.forEach(match => {
            if (!group.특이사항.includes(match)) {
              group.특이사항.push(match);
            }
          });
        }
      });
      
      // 수입검사 결과
      if (inspection.inspectionType === 'incoming') {
        if (inspection.result === '불합격' && inspection.resultReason) {
          const reason = inspection.resultReason.substring(0, 80);
          if (reason && !group.특이사항.some((s: string) => s.includes(reason))) {
            group.특이사항.push(reason);
          }
        }
      }
      
      // 공정검사 특이사항 (라인, 내용)
      if (inspection.inspectionType === 'inProcess') {
        if (inspection.workLine) {
          const lineInfo = `라인: ${inspection.workLine}`;
          if (!group.특이사항.includes(lineInfo)) {
            group.특이사항.push(lineInfo);
          }
        }
        const history = [inspection.preInspectionHistory, inspection.inProcessInspectionHistory]
          .filter(Boolean).join(' / ');
        if (history) {
          const historyShort = history.substring(0, 80);
          if (historyShort && !group.특이사항.some((s: string) => s.includes(historyShort))) {
            group.특이사항.push(historyShort);
          }
        }
      }
    });
    
    // 날짜별로 정리된 데이터로 변환 (최신순 정렬)
    // 성능 최적화: 최근 40개 날짜만 보내기 (대량 데이터 처리 시간 단축)
    const inspectionData = Array.from(dateGrouped.values())
      .map(group => {
        const data: any = {
          d: group.날짜, // 날짜를 d로 축약
          t: group.타입 === '수입' ? 'I' : group.타입 === '공정' ? 'P' : 'O', // 타입 축약
        };
        
        // 불량 목록을 배열로 변환 (최대 10개만)
        if (group.불량목록.size > 0) {
          const defects = Array.from(group.불량목록);
          data.def = defects.slice(0, 10).join(','); // def로 축약, 최대 10개
        }
        
        // 불량률
        if (group.불량률) {
          data.rate = group.불량률.replace('%', ''); // rate로 축약, % 제거
        }
        
        // 특이사항 (구체적 정보만, 최대 2개, 각 50자)
        if (group.특이사항.length > 0) {
          data.note = group.특이사항.slice(0, 2)
            .map((s: string) => s.substring(0, 50))
            .join('|'); // note로 축약, | 구분자 사용
        }
        
        return data;
      })
      .sort((a, b) => b.d.localeCompare(a.d)) // 날짜 내림차순
      .slice(0, 40); // 최근 40개만

    // 품질이슈 데이터 정리 (최적화: 최신 5개만, 필드명 축약)
    const issueData = qualityIssues
      .sort((a, b) => {
        const dateA = new Date(a.updatedAt || a.createdAt || '').getTime();
        const dateB = new Date(b.updatedAt || b.createdAt || '').getTime();
        return dateB - dateA;
      })
      .slice(0, 5) // 최신 5개만
      .map((issue) => {
        const baseIssue: any = {
          d: (typeof issue.updatedAt === 'string'
            ? issue.updatedAt.split('T')[0]
            : issue.updatedAt instanceof Date
              ? issue.updatedAt.toISOString().split('T')[0]
              : typeof issue.createdAt === 'string'
                ? issue.createdAt.split('T')[0]
                : issue.createdAt instanceof Date
                  ? issue.createdAt.toISOString().split('T')[0]
                  : '') || '',
          o: issue.orderNumber || '-', // 발주번호 축약
          s: issue.status, // 상태
        };

        // 이슈 내용 (최대 60자)
        if (issue.issues && issue.issues.length > 0) {
          const issueContents = issue.issues.map((item: any) => {
            if (typeof item === 'string') {
              return item.substring(0, 60);
            } else if (item && typeof item === 'object' && item.content) {
              return item.content.substring(0, 60);
            }
            return '';
          }).filter(Boolean);
          if (issueContents.length > 0) {
            baseIssue.i = issueContents.join('|'); // 이슈내용 축약, | 구분자
          }
        }

        // 불량 키워드 (최대 5개)
        if (issue.keywordPairs && issue.keywordPairs.length > 0) {
          const defects = issue.keywordPairs
            .filter(pair => pair.process && pair.defect)
            .map(pair => `${pair.process}-${pair.defect}`)
            .slice(0, 5);
          if (defects.length > 0) {
            baseIssue.def = defects.join(',');
          }
        }

        // 해결 내용 (최대 60자)
        if (issue.resolution) {
          baseIssue.r = issue.resolution.substring(0, 60); // 해결내용 축약
        }

        return baseIssue;
      });

    // 프롬프트 구성 - 최소화 (속도 최적화)
    // 데이터 필드 설명: d=날짜, t=타입(I=수입,P=공정,O=출하), def=불량, rate=불량률, note=특이사항
    // 품질이슈: d=날짜, o=발주번호, s=상태, i=이슈내용, def=불량, r=해결내용
    const prompt = `품질검사 이력 분석. 사출물 코팅/증착 후공정 업체.

데이터: ${JSON.stringify(inspectionData)}
이슈: ${JSON.stringify(issueData)}

규칙:
1. 요약: 불량률 있으면 불량유형 필수 포함. 날짜별 줄바꿈(\\n). 형식: "YYYY-MM-DD: 불량률 X%, 불량유형1, 불량유형2"
2. 품질이슈: 최대3건, {orderNumber, issue, action, status, date}. 빈 배열이면 [] 반환(환각금지)
3. 구체적 값 필수: 지그번호, 캐비티번호, 수치 등 생략금지 (예: "318번 지그 미건조, 189번 사용")
4. 보고서: 전체 불량 흐름 -> 개선/미해결 현황 -> 향후 중점 관리 (150자)
5. 사출 공정 파라미터 조언 금지 (금형온도, 사출압 등)
6. 후공정 관점: 선별/요청/방어

analyzeInspectionHistory 호출.`;

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

    // 타임아웃 설정 (30초로 연장 - 대량 데이터 분석 대비)
    const createTimeout = () => new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('API 호출 타임아웃 (30초)')), 30000);
    });

    // REST API 직접 호출을 우선 시도 (SDK 오버헤드 제거)
    // 비용 효율적인 모델 우선 사용: gemini-2.0-flash-lite (가장 저렴하고 빠름)
    // 2.0 Flash-Lite: 입력 $0.10/1M, 출력 $0.40/1M
    const modelsToTry = ['gemini-2.0-flash-lite', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-flash-latest'];
    
    // 1. REST API 시도 (Function Calling 사용)
    for (const modelName of modelsToTry) {
      try {
        const restApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30초 타임아웃
        
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

        // 429 에러 (할당량 초과)인 경우 다음 모델로 넘어가기
        if (response.status === 429) {
          console.warn(`REST API 할당량 초과 (${modelName}) - 다음 모델로 시도...`);
          continue;
        }

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
        } else {
          // 다른 HTTP 에러인 경우도 다음 모델로 넘어가기
          console.warn(`REST API 실패 (${modelName}): HTTP ${response.status}`);
          continue;
        }
      } catch (e) {
        // 네트워크 에러나 타임아웃 등
        const error = e as any;
        if (error?.message?.includes('429') || error?.response?.status === 429 || error?.status === 429) {
          console.warn(`REST API 할당량 초과 (${modelName}) - 다음 모델로 시도...`);
        } else {
          console.warn(`REST API 실패 (${modelName}):`, e);
        }
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
        const error = e as any;
        // 429 에러인 경우 명시적으로 로그
        if (error?.message?.includes('429') || 
            error?.message?.includes('quota') || 
            error?.message?.includes('Quota exceeded') ||
            error?.response?.status === 429 ||
            error?.status === 429) {
          console.warn(`SDK 할당량 초과 (${modelName}) - 다음 모델로 시도...`);
        } else {
          console.warn(`SDK 실패 (${modelName}):`, e);
        }
        continue;
      }
    }

    return null;
  } catch (error) {
    console.error('Gemini API 호출 실패:', error);
    return null;
  }
}

