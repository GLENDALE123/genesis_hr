/**
 * AI 분석 결과 파싱 유틸리티
 * 텍스트 형식의 AI 분석 결과를 구조화된 데이터로 변환
 */

export interface ParsedAIAnalysis {
  summary: {
    average: number | null;
    max: number | null;
    maxDate: string | null;
    min: number | null;
    minDate: string | null;
    volatility: number | null;
    trend: string | null;
  };
  majorChanges: Array<{
    date: string;
    value: number;
    change: '증가' | '감소';
    reason: string;
  }>;
  factors: {
    personnel: {
      average: number | null;
      high: { count: number; value: number } | null;
      low: { count: number; value: number } | null;
      pattern: string | null;
    };
    defectRate: {
      average: number | null;
      high: { date: string; value: number; rate: number } | null;
      low: { date: string; value: number; rate: number } | null;
      pattern: string | null;
    };
    spindleRatio: {
      ratios: string[];
      values: Array<{ ratio: string; value: number }>;
      pattern: string | null;
    };
    workingHours: {
      average: number | null;
      pattern: string | null;
    };
    coating: {
      changes: string[];
      pattern: string | null;
    };
    qualityIssues: {
      dates: string[];
      values: number[];
      pattern: string | null;
    };
    productionLine: {
      lines: Array<{ name: string; value: number }>;
      pattern: string | null;
    };
  };
  patterns: {
    high: {
      dates: string[];
      features: string[];
    };
    low: {
      dates: string[];
      features: string[];
    };
    repeating: string[];
  };
  risks: Array<{
    date: string;
    value: number;
    events: string[];
  }>;
  instability: {
    volatility: number | null;
    outlierDates: string[];
    factors: string[];
  };
}

/**
 * AI 분석 텍스트를 파싱하여 구조화된 데이터로 변환
 */
export const parseAIAnalysis = (text: string | null): ParsedAIAnalysis | null => {
  if (!text) return null;

  const result: ParsedAIAnalysis = {
    summary: {
      average: null,
      max: null,
      maxDate: null,
      min: null,
      minDate: null,
      volatility: null,
      trend: null,
    },
    majorChanges: [],
    factors: {
      personnel: { average: null, high: null, low: null, pattern: null },
      defectRate: { average: null, high: null, low: null, pattern: null },
      spindleRatio: { ratios: [], values: [], pattern: null },
      workingHours: { average: null, pattern: null },
      coating: { changes: [], pattern: null },
      qualityIssues: { dates: [], values: [], pattern: null },
      productionLine: { lines: [], pattern: null },
    },
    patterns: {
      high: { dates: [], features: [] },
      low: { dates: [], features: [] },
      repeating: [],
    },
    risks: [],
    instability: {
      volatility: null,
      outlierDates: [],
      factors: [],
    },
  };

  // 핵심 요약 파싱
  const summaryMatch = text.match(/평균:\s*([\d.]+)\s*\|\s*최대:\s*([\d.]+)\s*\(([^)]+)\)\s*\|\s*최소:\s*([\d.]+)\s*\(([^)]+)\)\s*\|\s*변동폭:\s*([\d.]+)/);
  if (summaryMatch) {
    result.summary.average = parseFloat(summaryMatch[1]);
    result.summary.max = parseFloat(summaryMatch[2]);
    result.summary.maxDate = summaryMatch[3].trim();
    result.summary.min = parseFloat(summaryMatch[4]);
    result.summary.minDate = summaryMatch[5].trim();
    result.summary.volatility = parseFloat(summaryMatch[6]);
  }

  // 전반적 추세 파싱
  const trendMatch = text.match(/전반적 추세:\s*([^\n]+)/);
  if (trendMatch) {
    result.summary.trend = trendMatch[1].trim();
  }

  // 주요 변화 시점 파싱 (표 형식)
  const tableMatch = text.match(/\| 날짜 \| 인당생산량 \| 변화 \| 주요 원인 \|[\s\S]*?\|([\s\S]*?)(?=\n##|$)/);
  if (tableMatch) {
    const rows = tableMatch[1].split('\n').filter(row => row.trim().startsWith('|'));
    rows.forEach(row => {
      const cells = row.split('|').map(c => c.trim()).filter(c => c);
      if (cells.length >= 4) {
        const date = cells[0];
        const value = parseFloat(cells[1]);
        const change = cells[2] === '증가' ? '증가' : '감소';
        const reason = cells[3];
        if (date && !isNaN(value)) {
          result.majorChanges.push({ date, value, change, reason });
        }
      }
    });
  }

  // 생산 인원 파싱
  const personnelMatch = text.match(/평균:\s*([\d.]+)명\s*\|\s*고인원\(([\d.]+)명↑\):\s*([\d.]+)\s*\|\s*저인원\(([\d.]+)명↓\):\s*([\d.]+)/);
  if (personnelMatch) {
    result.factors.personnel.average = parseFloat(personnelMatch[1]);
    result.factors.personnel.high = {
      count: parseFloat(personnelMatch[2]),
      value: parseFloat(personnelMatch[3]),
    };
    result.factors.personnel.low = {
      count: parseFloat(personnelMatch[4]),
      value: parseFloat(personnelMatch[5]),
    };
  }

  // 불량률 파싱
  const defectMatch = text.match(/평균:\s*([\d.]+)%\s*\|\s*최고\(([^)]+)\):\s*([\d.]+)%\s*\(([\d.]+)\)\s*\|\s*최저\(([^)]+)\):\s*([\d.]+)%\s*\(([\d.]+)\)/);
  if (defectMatch) {
    result.factors.defectRate.average = parseFloat(defectMatch[1]);
    result.factors.defectRate.high = {
      date: defectMatch[2].trim(),
      rate: parseFloat(defectMatch[3]),
      value: parseFloat(defectMatch[4]),
    };
    result.factors.defectRate.low = {
      date: defectMatch[5].trim(),
      rate: parseFloat(defectMatch[6]),
      value: parseFloat(defectMatch[7]),
    };
  }

  // 고생산량 날 특징 파싱
  const highPatternMatch = text.match(/\*\*고생산량 날 특징\*\*[\s\S]*?날짜:\s*([^\n]+)[\s\S]*?특징:\s*([^\n]+)/);
  if (highPatternMatch) {
    result.patterns.high.dates = highPatternMatch[1].split(',').map(d => d.trim());
    result.patterns.high.features = highPatternMatch[2].split(',').map(f => f.trim());
  }

  // 저생산량 날 특징 파싱
  const lowPatternMatch = text.match(/\*\*저생산량 날 특징\*\*[\s\S]*?날짜:\s*([^\n]+)[\s\S]*?특징:\s*([^\n]+)/);
  if (lowPatternMatch) {
    result.patterns.low.dates = lowPatternMatch[1].split(',').map(d => d.trim());
    result.patterns.low.features = lowPatternMatch[2].split(',').map(f => f.trim());
  }

  // 위험 요소 파싱 (표 형식)
  const riskTableMatch = text.match(/\| 날짜 \| 인당생산량 \| 동시 발생 현상 \|[\s\S]*?\|([\s\S]*?)(?=\n\*\*|$)/);
  if (riskTableMatch) {
    const rows = riskTableMatch[1].split('\n').filter(row => row.trim().startsWith('|'));
    rows.forEach(row => {
      const cells = row.split('|').map(c => c.trim()).filter(c => c);
      if (cells.length >= 3) {
        const date = cells[0];
        const value = parseFloat(cells[1]);
        const events = cells[2].split(',').map(e => e.trim());
        if (date && !isNaN(value)) {
          result.risks.push({ date, value, events });
        }
      }
    });
  }

  return result;
};





