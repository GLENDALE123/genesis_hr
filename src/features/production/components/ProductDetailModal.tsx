/**
 * 제품 상세 모달 컴포넌트
 * 전략적 Grid 레이아웃으로 구성
 */

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { Button } from '@/shared/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/components/ui/tabs';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/shared/components/ui/accordion';
import { Product } from '@/features/production/types/product.types';
import { useProductDetail } from '@/features/production/hooks/useProductDetail';
import { LoadingSpinner } from '@/shared/components/common/LoadingSpinner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertCircle, TrendingUp, Package, AlertTriangle, CheckCircle, XCircle, Sparkles, BarChart3, FileText, Settings } from 'lucide-react';
import { useDeviceType } from '@/shared/hooks/use-device';
import { analyzeProductionTrend } from '@/features/production/services/productAIService';
import { QualityHistoryCell } from './QualityHistoryCell';
import { QualityInspection } from '@/features/quality/types';
import { cn } from '@/shared/lib/utils';
import { useQualityIssues } from '@/features/quality/hooks/useQualityIssues';
import { QualityIssue } from '@/features/quality/types';
import { QualityIssueItem } from '@/features/production/types/product.types';

interface ProductDetailModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  isOpen,
  onClose
}) => {
  const { productDetail, loading, error } = useProductDetail(product.id);
  const { isSmartphone } = useDeviceType();
  const [activeTab, setActiveTab] = useState<'summary' | 'production' | 'quality' | 'other'>('summary');
  
  // 실시간 품질이슈 구독 (품질이슈 페이지와 동일한 데이터 소스)
  const { issues: realtimeQualityIssues } = useQualityIssues();
  
  // 제품과 매칭되는 실시간 품질이슈 필터링
  const matchedRealtimeQualityIssues = useMemo(() => {
    if (!productDetail || !realtimeQualityIssues || realtimeQualityIssues.length === 0) {
      return [];
    }
    
    return realtimeQualityIssues.filter(issue => {
      // supplier, productName, partName이 일치하는지 확인
      const matches = issue.supplier === productDetail.supplier &&
                     issue.productName === productDetail.productName &&
                     issue.partName === productDetail.partName;
      
      // specification이 있는 경우에만 비교, 없으면 무시
      const issueSpec = (issue as any).specification;
      if (productDetail.specification && issueSpec) {
        return matches && issueSpec === productDetail.specification;
      }
      
      // specification이 없는 경우는 supplier, productName, partName만으로 매칭
      return matches;
    });
  }, [productDetail, realtimeQualityIssues]);
  
  // QualityIssue를 QualityIssueItem 형식으로 변환
  const convertedRealtimeQualityIssues: QualityIssueItem[] = useMemo(() => {
    return matchedRealtimeQualityIssues.map(issue => ({
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
    })).sort((a, b) => {
      const dateA = a.updatedAt || a.createdAt;
      const dateB = b.updatedAt || b.createdAt;
      return dateB.localeCompare(dateA);
    });
  }, [matchedRealtimeQualityIssues]);


  // 최근 도료사용이력 (변경된 것만, 최대 3개)
  const recentCoatingHistory = useMemo(() => {
    if (!productDetail) return [];
    
    const history = productDetail.coatingHistory;
    if (history.length === 0) return [];
    
    // 문자열 정규화 함수 (비교용)
    const normalizeString = (str: string): string => {
      return str
        .trim()
        .replace(/["'"]/g, '') // 따옴표 제거
        .replace(/\s+/g, ' ') // 연속 공백을 하나로
        .replace(/(\d+)\.0+%/g, '$1%') // 4.0% -> 4%
        .replace(/(\d+)\.(\d+)0+%/g, '$1.$2%') // 4.50% -> 4.5%
        .toLowerCase(); // 대소문자 통일
    };
    
    // 변경된 것만 필터링 (이전 항목과 비교)
    const changedHistory: typeof history = [];
    let previousContent = '';
    
    for (let i = 0; i < history.length && changedHistory.length < 3; i++) {
      const item = history[i];
      let currentContent = '';
      
      if (item.coatingType === 'both') {
        // 하도와 상도 모두 포함하여 비교
        const undercoatConditions = normalizeString(item.coatingData.undercoat?.conditions || '');
        const undercoatRemarks = normalizeString(item.coatingData.undercoat?.remarks || '');
        const topcoatConditions = normalizeString(item.coatingData.topcoat?.conditions || '');
        const topcoatRemarks = normalizeString(item.coatingData.topcoat?.remarks || '');
        
        currentContent = [
          `하도:${undercoatConditions}:${undercoatRemarks}`,
          `상도:${topcoatConditions}:${topcoatRemarks}`
        ].join('|');
      } else {
        const conditions = normalizeString(item.coatingData.conditions || '');
        const remarks = normalizeString(item.coatingData.remarks || '');
        const type = item.coatingType === 'undercoat' ? '하도' : '상도';
        currentContent = `${type}:${conditions}:${remarks}`;
      }
      
      // 내용이 변경된 경우에만 추가 (이전과 다를 때, 빈 내용 제외)
      if (currentContent !== previousContent && currentContent.trim() !== '' && currentContent !== '하도::|상도::' && currentContent !== '하도::' && currentContent !== '상도::') {
        changedHistory.push(item);
        previousContent = currentContent;
      }
    }
    
    return changedHistory;
  }, [productDetail]);

  // 품질이력 서술형 요약 (검사 타입별)
  const qualityHistorySummary = useMemo(() => {
    if (!productDetail || !productDetail.fullQualityInspections) {
      return {
        incoming: [] as Array<{ orderNumber: string; date: string; appearanceHistory?: string; functionHistory?: string }>,
        inProcess: [] as Array<{ orderNumber: string; date: string; inProcessHistory?: string; preInspectionHistory?: string }>,
        outgoing: [] as Array<{ orderNumber: string; date: string; workers?: string; reliabilityReview?: string }>
      };
    }
    
    const inspections = productDetail.fullQualityInspections;
    
    const incoming = inspections
      .filter(i => i.inspectionType === 'incoming')
      .map(i => ({
        orderNumber: i.orderNumber,
        date: i.inspectionDate || (i.createdAt ? i.createdAt.split('T')[0] : ''),
        appearanceHistory: i.appearanceHistory,
        functionHistory: i.functionHistory
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
    
    const inProcess = inspections
      .filter(i => i.inspectionType === 'inProcess')
      .map(i => ({
        orderNumber: i.orderNumber,
        date: i.inspectionDate || (i.createdAt ? i.createdAt.split('T')[0] : ''),
        inProcessHistory: i.inProcessInspectionHistory,
        preInspectionHistory: i.preInspectionHistory
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
    
    const outgoing = inspections
      .filter(i => i.inspectionType === 'outgoing')
      .map(i => ({
        orderNumber: i.orderNumber,
        date: i.inspectionDate || (i.createdAt ? i.createdAt.split('T')[0] : ''),
        workers: i.workers?.map((w: { name: string; directInputResult?: string; result: string }) => `${w.name}: ${w.directInputResult || w.result}`).join(', '),
        reliabilityReview: i.reliabilityReview ? 
          `${i.reliabilityReview.method || ''} ${i.reliabilityReview.result || ''} ${i.reliabilityReview.action || ''}`.trim() : 
          undefined
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
    
    return { incoming, inProcess, outgoing };
  }, [productDetail]);

  // 품질이력 통계 계산 (불량률, 주요불량용)
  const qualityStats = useMemo(() => {
    if (!productDetail) {
      return {
        incoming: { count: 0, defectRate: 0, topDefectPatterns: [] as Array<{ process: string; defect: string; count: number }> },
        inProcess: { count: 0, defectRate: 0, topDefectPatterns: [] as Array<{ process: string; defect: string; count: number }> },
        outgoing: { count: 0, defectRate: 0, topDefectPatterns: [] as Array<{ process: string; defect: string; count: number }> }
      };
    }

    const DEFECT_RESULTS = ['불합격', '한도대기', '반출'];
    
    // 수입검사 통계
    const incomingInspections = productDetail.qualityInspections.filter(i => i.inspectionType === 'incoming');
    const incomingWithResult = incomingInspections.filter(i => i.result && i.result.trim() !== '');
    const incomingDefectCount = incomingWithResult.filter(i => DEFECT_RESULTS.includes(i.result)).length;
    const incomingDefectRate = incomingWithResult.length > 0 ? (incomingDefectCount / incomingWithResult.length) * 100 : 0;
    
    const incomingPatternMap = new Map<string, number>();
    incomingInspections.forEach(inspection => {
      if (inspection.keywordPairs) {
        inspection.keywordPairs.forEach(pair => {
          const key = `${pair.process}-${pair.defect}`;
          incomingPatternMap.set(key, (incomingPatternMap.get(key) || 0) + 1);
        });
      }
    });
    const incomingTopDefectPatterns = Array.from(incomingPatternMap.entries())
      .map(([key, count]) => {
        const [process, defect] = key.split('-');
        return { process, defect, count };
      })
      .filter(p => p.process && p.process.trim() !== '' && p.process !== '-' && 
                    p.defect && p.defect.trim() !== '' && p.defect !== '-')
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    // 공정검사 통계
    const inProcessInspections = productDetail.qualityInspections.filter(i => i.inspectionType === 'inProcess');
    const inProcessWithResult = inProcessInspections.filter(i => i.result && i.result.trim() !== '');
    const inProcessDefectCount = inProcessWithResult.filter(i => DEFECT_RESULTS.includes(i.result)).length;
    
    // 공정검사는 공정이력에서 불량률 추출 시도 (총 검사개수와 총 불량개수로 계산)
    let inProcessDefectRate = inProcessWithResult.length > 0 ? (inProcessDefectCount / inProcessWithResult.length) * 100 : 0;
    if (productDetail.fullQualityInspections) {
      const inProcessFull = productDetail.fullQualityInspections.filter(i => i.inspectionType === 'inProcess' && i.inProcessInspectionHistory);
      if (inProcessFull.length > 0) {
        let totalInspected = 0;
        let totalDefects = 0;
        
        inProcessFull.forEach(inspection => {
          const history = inspection.inProcessInspectionHistory || '';
          
          // 패턴 1: "검사 400개 불량16개 불량4%" (공백 없음)
          const pattern1 = /검사\s*(\d+)개\s*불량\s*(\d+)개\s*불량\s*([\d.]+)%/;
          // 패턴 2: "검사200개 불량10개 불량율5%" (공백 없음, 불량율)
          const pattern2 = /검사\s*(\d+)개\s*불량\s*(\d+)개\s*불량율\s*([\d.]+)%/;
          // 패턴 3: "검사 300개중 불량 13개 총불량율 4.3%"
          const pattern3 = /검사\s*(\d+)개중\s*불량\s*(\d+)개.*?불량율\s*([\d.]+)%/;
          // 패턴 4: "300개 검사중 불량 13개 총불량율 4.3%"
          const pattern4 = /(\d+)개\s*검사중\s*불량\s*(\d+)개.*?불량율\s*([\d.]+)%/;
          // 패턴 5: "300검사중 불량13 불량율 0.04%" (공백 없음)
          const pattern5 = /(\d+)검사중\s*불량\s*(\d+).*?불량율\s*([\d.]+)%/;
          // 패턴 6: "240검사중 불량6 불량율0.02%" (공백 없음, 불량율 바로 붙음)
          const pattern6 = /(\d+)검사중\s*불량\s*(\d+)\s*불량율\s*([\d.]+)%/;
          // 패턴 7: "360검사중 불량7 0.01%" (불량율 키워드 없이 바로 숫자)
          const pattern7 = /(\d+)검사중\s*불량\s*(\d+)\s+([\d.]+)%/;
          // 패턴 8: "360검사중 불량 13 불량율 0.03%" (공백 있음)
          const pattern8 = /(\d+)검사중\s*불량\s*(\d+)\s+불량율\s*([\d.]+)%/;
          // 패턴 9: "검사수 400개 ..." (검사수로 시작, 불량 개수는 각 불량 유형별 퍼센트 합산 필요)
          const pattern9 = /검사수\s*(\d+)개/;
          
          const match = history.match(pattern1) || 
                       history.match(pattern2) || 
                       history.match(pattern3) ||
                       history.match(pattern4) ||
                       history.match(pattern5) ||
                       history.match(pattern6) ||
                       history.match(pattern7) ||
                       history.match(pattern8);
          
          if (match) {
            const total = parseInt(match[1], 10);
            const defect = parseInt(match[2], 10);
            if (total > 0 && defect >= 0) {
              totalInspected += total;
              totalDefects += defect;
            }
          } else {
            // 패턴 9: "검사수 N개" 형식 처리
            const pattern9Match = history.match(/검사수\s*(\d+)개/);
            if (pattern9Match) {
              const total = parseInt(pattern9Match[1], 10);
              if (total > 0) {
                // 각 불량 유형별 퍼센트 추출하여 총 불량 개수 계산
                // 예: "스크래치 0.25% 바닥면 찍힘 3% 가스 0.25%" -> 총 3.5%
                const percentPattern = /([가-힣a-zA-Z\s]+)\s*([\d.]+)%/g;
                let totalPercent = 0;
                let percentMatch: RegExpExecArray | null;
                
                while ((percentMatch = percentPattern.exec(history)) !== null) {
                  const percent = parseFloat(percentMatch[2]);
                  if (!isNaN(percent) && percent >= 0 && percent <= 100) {
                    totalPercent += percent;
                  }
                }
                
                // 총 불량 개수 계산
                if (totalPercent > 0) {
                  const defect = Math.round((total * totalPercent) / 100);
                  totalInspected += total;
                  totalDefects += defect;
                } else {
                  // 퍼센트가 없으면 총개수만 추가 (불량 개수는 0)
                  totalInspected += total;
                }
              }
            } else {
              // 기존 패턴 매칭 시도
              const totalMatch = history.match(/검사\s*(\d+)개|(\d+)개\s*검사중|(\d+)검사중|검사\s*(\d+)개중/);
              const defectMatch = history.match(/불량\s*(\d+)개|불량\s*(\d+)|불량(\d+)개|불량(\d+)/);
              
              if (totalMatch && defectMatch) {
                const total = parseInt(totalMatch[1] || totalMatch[2] || totalMatch[3] || totalMatch[4] || '0', 10);
                const defect = parseInt(defectMatch[1] || defectMatch[2] || defectMatch[3] || defectMatch[4] || '0', 10);
                if (total > 0 && defect >= 0) {
                  totalInspected += total;
                  totalDefects += defect;
                }
              }
            }
          }
        });
        
        // 총 검사개수와 총 불량개수로 불량률 계산
        if (totalInspected > 0) {
          inProcessDefectRate = (totalDefects / totalInspected) * 100;
        }
      }
    }
    
    const inProcessPatternMap = new Map<string, number>();
    inProcessInspections.forEach(inspection => {
      if (inspection.keywordPairs) {
        inspection.keywordPairs.forEach(pair => {
          const key = `${pair.process}-${pair.defect}`;
          inProcessPatternMap.set(key, (inProcessPatternMap.get(key) || 0) + 1);
        });
      }
    });
    const inProcessTopDefectPatterns = Array.from(inProcessPatternMap.entries())
      .map(([key, count]) => {
        const [process, defect] = key.split('-');
        return { process, defect, count };
      })
      .filter(p => p.process && p.process.trim() !== '' && p.process !== '-' && 
                    p.defect && p.defect.trim() !== '' && p.defect !== '-')
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    // 출하검사 통계 (작업자별 직접입력결과 기반)
    const outgoingInspections = productDetail.qualityInspections.filter(i => i.inspectionType === 'outgoing');
    
    // 직접입력결과에서 불량률과 불량유형 추출
    let totalWorkers = 0;
    let totalDefectWorkers = 0;
    const outgoingDefectMap = new Map<string, number>(); // 불량유형별 빈도
    
    if (productDetail.fullQualityInspections) {
      const outgoingFull = productDetail.fullQualityInspections.filter(i => i.inspectionType === 'outgoing');
      
      outgoingFull.forEach(inspection => {
        if (inspection.workers && inspection.workers.length > 0) {
          inspection.workers.forEach((worker: { directInputResult?: string }) => {
            totalWorkers++;
            const directInput = worker.directInputResult || '';
            
            // "합격"이면 불량 없음
            if (directInput.trim() === '합격' || directInput.trim() === '') {
              // 합격이면 불량 없음
            } else {
              // 불량이 있는 경우
              totalDefectWorkers++;
              
              // 직접입력결과 파싱: "거울벽면이물-2 이물-6", "부딪힘-3", "이물 스크래치" 등
              // 패턴 1: "불량유형-숫자" (예: "이물-6", "부딪힘-3")
              const patternWithCount = /([가-힣a-zA-Z\s]+)-(\d+)/g;
              let match: RegExpExecArray | null;
              while ((match = patternWithCount.exec(directInput)) !== null) {
                const defectType = match[1].trim();
                const count = parseInt(match[2], 10);
                if (defectType && defectType !== '합격') {
                  outgoingDefectMap.set(defectType, (outgoingDefectMap.get(defectType) || 0) + count);
                }
              }
              
              // 패턴 2: "불량유형" (숫자 없음, 1개로 간주) - 이미 매칭된 것 제외
              const allMatches = directInput.match(/([가-힣a-zA-Z\s]+)-(\d+)/g) || [];
              const matchedTexts = allMatches.join(' ');
              const remainingText = directInput.replace(/([가-힣a-zA-Z\s]+)-(\d+)/g, '').trim();
              
              // 남은 텍스트에서 불량유형 추출 (공백으로 구분)
              if (remainingText && remainingText !== '합격') {
                const defectTypes = remainingText.split(/\s+/).filter((t: string) => t.trim() !== '' && t.trim() !== '합격');
                defectTypes.forEach((defectType: string) => {
                  const trimmed = defectType.trim();
                  if (trimmed && trimmed !== '합격' && !trimmed.match(/^\d+$/)) {
                    outgoingDefectMap.set(trimmed, (outgoingDefectMap.get(trimmed) || 0) + 1);
                  }
                });
              }
            }
          });
        }
      });
    }
    
    // 불량률 계산 (작업자 기준)
    const outgoingDefectRate = totalWorkers > 0 ? (totalDefectWorkers / totalWorkers) * 100 : 0;
    
    // 불량유형별 패턴 생성 (process는 "출하"로 고정)
    const outgoingPatternMap = new Map<string, number>();
    outgoingDefectMap.forEach((count, defectType) => {
      if (defectType && defectType.trim() !== '' && defectType.trim() !== '합격') {
        const key = `출하-${defectType.trim()}`;
        outgoingPatternMap.set(key, (outgoingPatternMap.get(key) || 0) + count);
      }
    });
    
    // keywordPairs도 함께 고려
    outgoingInspections.forEach(inspection => {
      if (inspection.keywordPairs) {
        inspection.keywordPairs.forEach(pair => {
          const key = `${pair.process}-${pair.defect}`;
          outgoingPatternMap.set(key, (outgoingPatternMap.get(key) || 0) + 1);
        });
      }
    });
    
    const outgoingTopDefectPatterns = Array.from(outgoingPatternMap.entries())
      .map(([key, count]) => {
        const [process, defect] = key.split('-');
        return { process, defect, count };
      })
      .filter(p => p.process && p.process.trim() !== '' && p.process !== '-' && 
                    p.defect && p.defect.trim() !== '' && p.defect !== '-')
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    return {
      incoming: {
        count: incomingInspections.length,
        defectRate: incomingDefectRate,
        topDefectPatterns: incomingTopDefectPatterns
      },
      inProcess: {
        count: inProcessInspections.length,
        defectRate: inProcessDefectRate,
        topDefectPatterns: inProcessTopDefectPatterns
      },
      outgoing: {
        count: outgoingInspections.length,
        defectRate: outgoingDefectRate,
        topDefectPatterns: outgoingTopDefectPatterns
      }
    };
  }, [productDetail]);

  // 생산추이 차트 데이터 (최근 30일, 시간당생산량)
  const chartData = useMemo(() => {
    if (!productDetail) return [];
    const trend = productDetail.productionTrend;
    const recent30Days = trend.slice(-30);
    return recent30Days.map(item => ({
      date: item.date.split('-').slice(1).join('/'), // MM/DD 형식
      '시간당생산량(UPH)': item.uph
    }));
  }, [productDetail]);

  // 생산추이 AI 분석
  const [trendAnalysis, setTrendAnalysis] = useState<string | null>(null);
  const [analyzingTrend, setAnalyzingTrend] = useState(false);
  const analysisAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // 모달이 닫히거나 제품이 변경되면 이전 분석 취소 및 초기화
    if (!isOpen || !productDetail) {
      if (analysisAbortRef.current) {
        analysisAbortRef.current.abort();
        analysisAbortRef.current = null;
      }
      setTrendAnalysis(null);
      setAnalyzingTrend(false);
      return;
    }

    // 실시간 품질이슈가 준비되었을 때만 AI 분석 실행
    // 실시간 품질이슈가 있으면 그것을 우선 사용, 없으면 기존 productDetail.qualityIssues 사용
    const qualityIssuesForAnalysis = convertedRealtimeQualityIssues.length > 0 
      ? convertedRealtimeQualityIssues 
      : productDetail?.qualityIssues || [];
    
    // 이미 분석이 완료되었거나 진행 중이면 실행하지 않음
    if (trendAnalysis || analyzingTrend || chartData.length === 0) {
      return;
    }

    // 이전 분석 취소
    if (analysisAbortRef.current) {
      analysisAbortRef.current.abort();
    }

    // 새로운 AbortController 생성
    const abortController = new AbortController();
    analysisAbortRef.current = abortController;

    setAnalyzingTrend(true);
    
    analyzeProductionTrend(
      productDetail.supplier,
      productDetail.productName,
      productDetail.partName,
      productDetail.specification,
      productDetail.productionTrend,
      productDetail.productionHistory,
      productDetail.coatingHistory,
      productDetail.qualityInspections,
      qualityIssuesForAnalysis
    ).then(analysis => {
      // 취소되지 않았을 때만 상태 업데이트
      if (!abortController.signal.aborted) {
        setTrendAnalysis(analysis);
        setAnalyzingTrend(false);
      }
    }).catch((err) => {
      // AbortError는 무시 (의도적인 취소)
      if (err?.name !== 'AbortError' && !abortController.signal.aborted) {
        setAnalyzingTrend(false);
      }
    });

    // 클린업: 모달이 닫히거나 제품이 변경될 때 분석 취소
    return () => {
      if (analysisAbortRef.current === abortController) {
        abortController.abort();
        analysisAbortRef.current = null;
      }
    };
  }, [isOpen, productDetail?.id, chartData.length]);

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-[95vw] max-w-[1600px] h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{product.productName} - {product.partName}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 flex items-center justify-center">
            <LoadingSpinner label="제품 상세 정보 로딩 중..." />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-[95vw] max-w-[1600px] h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{product.productName} - {product.partName}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center p-8 text-destructive">
              {error.message || '데이터를 불러오는 중 오류가 발생했습니다.'}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!productDetail) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-[95vw] max-w-[1600px] h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{product.productName} - {product.partName}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center p-8 text-muted-foreground">
              제품 정보를 찾을 수 없습니다.
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className={isSmartphone ? "overflow-hidden flex flex-col" : "w-[95vw] max-w-[1600px] h-[90vh] overflow-hidden flex flex-col"}
        stickyHeader={
          <>
            <DialogHeader className="pb-4 border-b">
              <DialogTitle className="text-2xl font-bold mb-3">
                {productDetail.productName}
              </DialogTitle>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground font-medium">부속명:</span>
                    <span className="font-semibold">{productDetail.partName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground font-medium">발주처:</span>
                    <span className="font-semibold">{productDetail.supplier}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground font-medium">사양:</span>
                    <span className="font-semibold">{productDetail.specification}</span>
                  </div>
                </div>
              </div>
            </DialogHeader>
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)} className="w-full">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="summary" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  요약
                </TabsTrigger>
                <TabsTrigger value="production" className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  생산 상세
                </TabsTrigger>
                <TabsTrigger value="quality" className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  품질 상세
                </TabsTrigger>
                <TabsTrigger value="other" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  기타 이력
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </>
        }
      >
        {/* 접근성을 위한 숨겨진 제목 */}
        <DialogTitle className="sr-only">
          {productDetail.productName} ({productDetail.partName}) 제품 상세 정보
        </DialogTitle>
        
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)} className="w-full h-full flex flex-col">
            <TabsContent value="summary" className="mt-0">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* 좌측 열 */}
                <div className="space-y-4">
                  {/* 생산추이 차트 */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        생산추이 (시간당생산량)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {chartData.length > 0 ? (
                        <>
                          <ResponsiveContainer width="100%" height={200}>
                            <LineChart data={chartData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis 
                                dataKey="date" 
                                tick={{ fontSize: 12 }}
                                angle={-45}
                                textAnchor="end"
                                height={60}
                              />
                              <YAxis 
                                tick={{ fontSize: 12 }}
                                label={{ value: '시간당생산량(UPH)', angle: -90, position: 'insideLeft' }}
                              />
                              <Tooltip />
                              <Legend />
                              <Line 
                                type="monotone" 
                                dataKey="시간당생산량(UPH)" 
                                stroke="hsl(var(--primary))" 
                                strokeWidth={2}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                          
                          {/* AI 분석 */}
                          <div className="border-t pt-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Sparkles className="h-4 w-4 text-primary" />
                              <span className="text-sm font-semibold">AI 생산추이 분석</span>
                            </div>
                            {analyzingTrend ? (
                              <div className="space-y-2">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-4 w-5/6" />
                              </div>
                            ) : trendAnalysis ? (
                              <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-3">
                                {trendAnalysis}
                              </p>
                            ) : (
                              <p className="text-xs text-muted-foreground">
                                분석 데이터가 부족합니다.
                              </p>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground">
                          <BarChart3 className="h-12 w-12 mb-2 opacity-50" />
                          <p className="text-sm">생산 데이터가 없습니다.</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* 최근 도료사용이력 (변경된 것만) */}
                  {recentCoatingHistory.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          최근 도료사용이력 (변경된 것만)
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-2">
                          {recentCoatingHistory.map((item) => (
                            <div key={item.id} className="p-3 border rounded text-xs">
                              <div className="flex items-start gap-4">
                                {/* 날짜 */}
                                <div className="flex-shrink-0 min-w-[100px]">
                                  <div className="text-base font-bold text-foreground">
                                    {item.workDate}
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {item.orderNumber}
                                  </div>
                                </div>
                                
                                {/* 생산라인 */}
                                {item.productionLine && (
                                  <div className="flex-shrink-0 min-w-[100px]">
                                    <div className="text-sm font-semibold text-foreground">
                                      {item.productionLine}
                                    </div>
                                  </div>
                                )}
                                
                                {/* 하도데이터 */}
                                {(item.coatingType === 'both' || item.coatingType === 'undercoat') && (
                                  <div className="flex-1 space-y-1 min-w-0">
                                    <div className="flex items-center gap-1 mb-1">
                                      <Badge variant="secondary" className="text-xs px-1 py-0">하도</Badge>
                                    </div>
                                    {item.coatingType === 'both' && item.coatingData.undercoat ? (
                                      <>
                                        {item.coatingData.undercoat.conditions && (
                                          <p className="text-xs line-clamp-2">{item.coatingData.undercoat.conditions}</p>
                                        )}
                                        {item.coatingData.undercoat.remarks && (
                                          <p className="text-xs text-muted-foreground line-clamp-2">
                                            {item.coatingData.undercoat.remarks}
                                          </p>
                                        )}
                                      </>
                                    ) : (
                                      <>
                                        {item.coatingData.conditions && (
                                          <p className="text-xs line-clamp-2">{item.coatingData.conditions}</p>
                                        )}
                                        {item.coatingData.remarks && (
                                          <p className="text-xs text-muted-foreground line-clamp-2">
                                            {item.coatingData.remarks}
                                          </p>
                                        )}
                                      </>
                                    )}
                                  </div>
                                )}
                                
                                {/* 상도데이터 */}
                                {(item.coatingType === 'both' || item.coatingType === 'topcoat') && (
                                  <div className="flex-1 space-y-1 min-w-0">
                                    <div className="flex items-center gap-1 mb-1">
                                      <Badge variant="default" className="text-xs px-1 py-0">상도</Badge>
                                    </div>
                                    {item.coatingType === 'both' && item.coatingData.topcoat ? (
                                      <>
                                        {item.coatingData.topcoat.conditions && (
                                          <p className="text-xs line-clamp-2">{item.coatingData.topcoat.conditions}</p>
                                        )}
                                        {item.coatingData.topcoat.remarks && (
                                          <p className="text-xs text-muted-foreground line-clamp-2">
                                            {item.coatingData.topcoat.remarks}
                                          </p>
                                        )}
                                      </>
                                    ) : (
                                      <>
                                        {item.coatingData.conditions && (
                                          <p className="text-xs line-clamp-2">{item.coatingData.conditions}</p>
                                        )}
                                        {item.coatingData.remarks && (
                                          <p className="text-xs text-muted-foreground line-clamp-2">
                                            {item.coatingData.remarks}
                                          </p>
                                        )}
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* 우측 열 */}
                <div className="space-y-4">
                  {/* 품질이슈 내용 */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        품질이슈 내용
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {(() => {
                        // 실시간 품질이슈가 있으면 우선 사용, 없으면 기존 데이터 사용
                        const displayQualityIssues = convertedRealtimeQualityIssues.length > 0 
                          ? convertedRealtimeQualityIssues 
                          : productDetail.qualityIssues;
                        
                        return displayQualityIssues.length > 0 ? (
                          <div className="space-y-2 max-h-[400px] overflow-y-auto">
                            {displayQualityIssues.map((issue) => (
                            <div key={issue.id} className="p-2 border rounded-md">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-medium">{issue.orderNumber}</span>
                              </div>
                              {issue.issues.length > 0 && (
                                <div className="space-y-1">
                                  {issue.issues.map((item, idx) => (
                                    <p key={idx} className="text-xs line-clamp-2">
                                      {typeof item === 'string' ? item : item.content}
                                    </p>
                                  ))}
                                </div>
                              )}
                              {issue.keywordPairs && issue.keywordPairs.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {issue.keywordPairs.map((pair, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs px-1 py-0">
                                      {pair.process}-{pair.defect}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <AlertTriangle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">품질이슈가 없습니다.</p>
                        </div>
                      );
                    })()}
                    </CardContent>
                  </Card>

                  {/* 품질이력 (검사 타입별 아코디언) */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5" />
                        품질이력
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Accordion type="multiple" className="w-full">
                        {/* 수입검사 */}
                        {qualityStats.incoming.count > 0 && (
                          <AccordionItem value="incoming" className="border-b">
                            <AccordionTrigger className="hover:no-underline">
                              <div className="flex items-center justify-between w-full pr-4">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold">수입검사</span>
                                  <Badge variant="outline" className="text-xs">
                                    {qualityStats.incoming.count}건
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-3 text-xs">
                                  {qualityStats.incoming.topDefectPatterns.length > 0 && (
                                    <div className="flex items-center gap-1 flex-wrap">
                                      <span className="text-xs text-muted-foreground">주요불량:</span>
                                      {qualityStats.incoming.topDefectPatterns.map((p: { process: string; defect: string; count: number }, idx: number) => (
                                        <Badge key={idx} variant="outline" className="text-xs">
                                          {p.process}-{p.defect} ({p.count})
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-2 pt-2">
                                {qualityHistorySummary.incoming.length > 0 ? (
                                  qualityHistorySummary.incoming.map((item, idx) => (
                                    <div key={idx} className="p-2 border rounded text-xs">
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-medium">{item.orderNumber}</span>
                                        <span className="text-xs text-muted-foreground">{item.date}</span>
                                      </div>
                                      {item.appearanceHistory && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                          <span className="font-medium">외관:</span> {item.appearanceHistory}
                                        </p>
                                      )}
                                      {item.functionHistory && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                          <span className="font-medium">기능:</span> {item.functionHistory}
                                        </p>
                                      )}
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-xs text-muted-foreground text-center py-2">이력이 없습니다.</p>
                                )}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        )}

                        {/* 공정검사 */}
                        {qualityStats.inProcess.count > 0 && (
                          <AccordionItem value="inProcess" className="border-b">
                            <AccordionTrigger className="hover:no-underline">
                              <div className="flex items-center justify-between w-full pr-4">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold">공정검사</span>
                                  <Badge variant="outline" className="text-xs">
                                    {qualityStats.inProcess.count}건
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-3 text-xs">
                                  <span className={cn(
                                    "font-semibold",
                                    qualityStats.inProcess.defectRate >= 10 ? "text-orange-600" :
                                    qualityStats.inProcess.defectRate > 0 ? "text-orange-500" :
                                    "text-green-600"
                                  )}>
                                    평균불량률: {qualityStats.inProcess.defectRate.toFixed(1)}%
                                  </span>
                                  {qualityStats.inProcess.topDefectPatterns.length > 0 && (
                                    <div className="flex items-center gap-1 flex-wrap">
                                      <span className="text-xs text-muted-foreground">주요불량:</span>
                                      {qualityStats.inProcess.topDefectPatterns.map((p: { process: string; defect: string; count: number }, idx: number) => (
                                        <Badge key={idx} variant="outline" className="text-xs">
                                          {p.process}-{p.defect} ({p.count})
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-2 pt-2">
                                {qualityHistorySummary.inProcess.length > 0 ? (
                                  qualityHistorySummary.inProcess.map((item, idx) => (
                                    <div key={idx} className="p-2 border rounded text-xs">
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-medium">{item.orderNumber}</span>
                                        <span className="text-xs text-muted-foreground">{item.date}</span>
                                      </div>
                                      {item.inProcessHistory && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                          <span className="font-medium">공정이력:</span> {item.inProcessHistory}
                                        </p>
                                      )}
                                      {item.preInspectionHistory && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                          <span className="font-medium">사전이력:</span> {item.preInspectionHistory}
                                        </p>
                                      )}
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-xs text-muted-foreground text-center py-2">이력이 없습니다.</p>
                                )}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        )}

                        {/* 출하검사 */}
                        {qualityStats.outgoing.count > 0 && (
                          <AccordionItem value="outgoing" className="border-b">
                            <AccordionTrigger className="hover:no-underline">
                              <div className="flex items-center justify-between w-full pr-4">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold">출하검사</span>
                                  <Badge variant="outline" className="text-xs">
                                    {qualityStats.outgoing.count}건
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-3 text-xs">
                                  {qualityStats.outgoing.topDefectPatterns.length > 0 && (
                                    <div className="flex items-center gap-1 flex-wrap">
                                      <span className="text-xs text-muted-foreground">주요불량:</span>
                                      {qualityStats.outgoing.topDefectPatterns.map((p: { process: string; defect: string; count: number }, idx: number) => (
                                        <Badge key={idx} variant="outline" className="text-xs">
                                          {p.process}-{p.defect} ({p.count})
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-2 pt-2">
                                {qualityHistorySummary.outgoing.length > 0 ? (
                                  qualityHistorySummary.outgoing.map((item, idx) => (
                                    <div key={idx} className="p-2 border rounded text-xs">
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-medium">{item.orderNumber}</span>
                                        <span className="text-xs text-muted-foreground">{item.date}</span>
                                      </div>
                                      {item.workers && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                          <span className="font-medium">작업자:</span> {item.workers}
                                        </p>
                                      )}
                                      {item.reliabilityReview && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                          <span className="font-medium">신뢰성:</span> {item.reliabilityReview}
                                        </p>
                                      )}
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-xs text-muted-foreground text-center py-2">이력이 없습니다.</p>
                                )}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        )}

                        {qualityStats.incoming.count === 0 && 
                         qualityStats.inProcess.count === 0 && 
                         qualityStats.outgoing.count === 0 && (
                          <div className="text-center py-8 text-muted-foreground">
                            <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">품질이력이 없습니다.</p>
                          </div>
                        )}
                      </Accordion>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="production" className="mt-0 space-y-4">
              <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        도료사용이력
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                    {productDetail.coatingHistory.length > 0 ? (
                      <div className="space-y-2">
                        {productDetail.coatingHistory.map((item) => (
                          <div key={item.id} className="p-3 border rounded-md">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {item.coatingType === 'both' ? (
                                  <>
                                    <Badge variant="secondary">하도</Badge>
                                    <Badge variant="default">상도</Badge>
                                  </>
                                ) : (
                                  <Badge variant={item.coatingType === 'undercoat' ? 'secondary' : 'default'}>
                                    {item.coatingType === 'undercoat' ? '하도' : '상도'}
                                  </Badge>
                                )}
                              </div>
                              <span className="text-sm text-muted-foreground">
                                {item.workDate} | {item.orderNumber}
                              </span>
                            </div>
                            {item.coatingType === 'both' ? (
                              <div className="space-y-2">
                                {item.coatingData.undercoat && (
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">하도</p>
                                    {item.coatingData.undercoat.conditions && (
                                      <p className="text-sm">{item.coatingData.undercoat.conditions}</p>
                                    )}
                                    {item.coatingData.undercoat.remarks && (
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {item.coatingData.undercoat.remarks}
                                      </p>
                                    )}
                                  </div>
                                )}
                                {item.coatingData.topcoat && (
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">상도</p>
                                    {item.coatingData.topcoat.conditions && (
                                      <p className="text-sm">{item.coatingData.topcoat.conditions}</p>
                                    )}
                                    {item.coatingData.topcoat.remarks && (
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {item.coatingData.topcoat.remarks}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <>
                                {item.coatingData.conditions && (
                                  <p className="text-sm">{item.coatingData.conditions}</p>
                                )}
                                {item.coatingData.remarks && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {item.coatingData.remarks}
                                  </p>
                                )}
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">도료사용이력이 없습니다.</p>
                      </div>
                    )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        생산일보 메모
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                    {productDetail.memos.length > 0 ? (
                      <div className="space-y-2">
                        {productDetail.memos.map((memo) => (
                          <div key={memo.id} className="p-3 border rounded-md">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium">{memo.orderNumber}</span>
                              <span className="text-xs text-muted-foreground">
                                {memo.workDate} | {memo.author.displayName}
                              </span>
                            </div>
                            <p className="text-sm whitespace-pre-wrap">{memo.memo}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">생산일보 메모가 없습니다.</p>
                      </div>
                    )}
                    </CardContent>
                  </Card>
              </div>
            </TabsContent>

            <TabsContent value="quality" className="mt-0 space-y-4">
              <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5" />
                        품질이력 요약
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                    {productDetail.qualityInspections.length > 0 ? (
                      <QualityHistoryCell
                        qualityInspections={productDetail.qualityInspections}
                        fullQualityInspections={productDetail.fullQualityInspections}
                      />
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">품질이력이 없습니다.</p>
                      </div>
                    )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5" />
                        품질이력 (날짜별 상세)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                    {productDetail.qualityInspections.length > 0 ? (
                      (() => {
                        // 날짜별로 그룹화
                        const groupedByDate = productDetail.qualityInspections.reduce((acc, item) => {
                          const date = item.inspectionDate;
                          if (!acc[date]) {
                            acc[date] = [];
                          }
                          acc[date].push(item);
                          return acc;
                        }, {} as Record<string, typeof productDetail.qualityInspections>);

                        // 날짜별로 정렬 (최신순)
                        const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

                        return (
                          <div className="space-y-3">
                            {sortedDates.map((date) => {
                              const inspections = groupedByDate[date];
                              
                              return (
                                <div key={date} className="p-4 border rounded-lg">
                                  <div className="flex items-center justify-between mb-3">
                                    <h4 className="font-semibold text-base">{date}</h4>
                                  </div>
                                  
                                  <QualityHistoryCell
                                    qualityInspections={inspections}
                                    fullQualityInspections={productDetail.fullQualityInspections?.filter(
                                      (full): full is QualityInspection => 
                                        full !== undefined && inspections.some(item => item.id === full.id)
                                    )}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">품질이력이 없습니다.</p>
                      </div>
                    )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        품질이슈 전체
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                    {(() => {
                      // 실시간 품질이슈가 있으면 우선 사용, 없으면 기존 데이터 사용
                      const displayQualityIssues = convertedRealtimeQualityIssues.length > 0 
                        ? convertedRealtimeQualityIssues 
                        : productDetail.qualityIssues;
                      
                      return displayQualityIssues.length > 0 ? (
                        <div className="space-y-2">
                          {displayQualityIssues.map((issue) => (
                          <div key={issue.id} className="p-3 border rounded-md">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium">{issue.orderNumber}</span>
                              <Badge variant={
                                issue.status === 'resolved' || issue.status === '해결완료' ? 'success' :
                                issue.status === 'in-progress' || issue.status === '진행중' ? 'warning' :
                                'destructive'
                              }>
                                {issue.status}
                              </Badge>
                            </div>
                            {issue.issues.length > 0 && (
                              <div className="space-y-1">
                                {issue.issues.map((item, idx) => (
                                  <p key={idx} className="text-sm">
                                    {typeof item === 'string' ? item : item.content}
                                  </p>
                                ))}
                              </div>
                            )}
                            {issue.keywordPairs && issue.keywordPairs.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {issue.keywordPairs.map((pair, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {pair.process}-{pair.defect}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <AlertTriangle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">품질이슈가 없습니다.</p>
                        </div>
                      );
                    })()}
                    </CardContent>
                  </Card>
              </div>
            </TabsContent>

            <TabsContent value="other" className="mt-0 space-y-4">
              <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5" />
                        부족분 진행 이력
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                    {productDetail.shortageHistory.length > 0 ? (
                      <div className="space-y-2">
                        {productDetail.shortageHistory.map((item) => (
                          <div key={item.id} className="p-3 border rounded-md">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium">{item.orderNumber}</span>
                              <Badge variant={item.status === 'completed' ? 'success' : 'warning'}>
                                {item.status === 'completed' ? '완료' : '요청중'}
                              </Badge>
                            </div>
                            <div className="text-sm space-y-1">
                              <div>부족 수량: {item.requestedShortageQuantity}</div>
                              <div className="text-muted-foreground">{item.shortageReason}</div>
                              <div className="text-xs text-muted-foreground">{item.createdAt.split('T')[0]}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">부족분 진행 이력이 없습니다.</p>
                      </div>
                    )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        지그사용이력
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                    {productDetail.jigHistory.length > 0 ? (
                      <div className="space-y-2">
                        {productDetail.jigHistory.map((item) => (
                          <div key={item.id} className="p-3 border rounded-md">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium">{item.orderNumber}</span>
                              <span className="text-xs text-muted-foreground">{item.inspectionDate}</span>
                            </div>
                            <div className="text-sm space-y-1">
                              {item.jigUsed && <div>지그: {item.jigUsed}</div>}
                              {item.jigUsed1 && <div>지그1: {item.jigUsed1}</div>}
                              {item.jigUsed2 && <div>지그2: {item.jigUsed2}</div>}
                              {item.internalJigLower && <div>내부지그(하): {item.internalJigLower}</div>}
                              {item.internalJigUpper && <div>내부지그(상): {item.internalJigUpper}</div>}
                              {item.workLine && <div className="text-muted-foreground">작업라인: {item.workLine}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Settings className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">지그사용이력이 없습니다.</p>
                      </div>
                    )}
                    </CardContent>
                  </Card>
              </div>
            </TabsContent>
          </Tabs>
      </DialogContent>
    </Dialog>
  );
};
