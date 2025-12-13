/**
 * 제품 상세 모달 컴포넌트
 * 전략적 Grid 레이아웃으로 구성
 */

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/shared/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { Button } from '@/shared/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/components/ui/tabs';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/shared/components/ui/accordion';
import { Product, QualityIssueItem } from '../types';
import { useProductDetail } from '../hooks/useProductDetail';
import { LoadingSpinner } from '@/shared/components/common/LoadingSpinner';
import { AlertCircle, TrendingUp, Package, AlertTriangle, CheckCircle, XCircle, BarChart3, FileText, Settings } from 'lucide-react';
import { useDeviceType } from '@/shared/hooks/use-device';
import { QualityHistoryCell, MemoModal } from '@/features/production/management';
import { QualityInspection } from '@/features/quality/types';
import { cn } from '@/shared/lib/utils';
import { useQualityIssues } from '@/features/quality/hooks/useQualityIssues';
import { QualityIssue } from '@/features/quality/types';
import { ProductionHistoryItem } from '../types';

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
  // 이미 알고 있는 product 정보를 전달하여 중복 조회 방지
  const { productDetail, loading, error } = useProductDetail(product.id, product);
  const { isSmartphone } = useDeviceType();
  const [activeTab, setActiveTab] = useState<'summary'>('summary');
  const [showAllIncoming, setShowAllIncoming] = useState(false);
  const [showAllInProcess, setShowAllInProcess] = useState(false);
  
  // 메모 모달 상태
  const [memoModalState, setMemoModalState] = useState<{
    isOpen: boolean;
    memo: string | null;
    historyItem: ProductionHistoryItem | null;
  }>({ isOpen: false, memo: null, historyItem: null });
  
  // 실시간 품질이슈 구독 (품질이슈 페이지와 동일한 데이터 소스)
  const { issues: realtimeQualityIssues } = useQualityIssues();
  
  // 생산일보에서 발주번호 수집 (발주번호 매칭용)
  const orderNumbersFromReports = useMemo(() => {
    if (!productDetail?.productionHistory) return new Set<string>();
    const orderNumbers = new Set<string>();
    productDetail.productionHistory.forEach(item => {
      if (item.orderNumber && item.orderNumber.trim() !== '') {
        orderNumbers.add(item.orderNumber.trim());
      }
    });
    return orderNumbers;
  }, [productDetail?.productionHistory]);

  // 제품과 매칭되는 실시간 품질이슈 필터링 (발주처, 제품명, 부속명, 사양 + 발주번호로 필터링)
  const matchedRealtimeQualityIssues = useMemo(() => {
    if (!productDetail || !realtimeQualityIssues || realtimeQualityIssues.length === 0) {
      return [];
    }
    
    return realtimeQualityIssues.filter(issue => {
      // 기본 매칭: supplier, productName, partName
      const basicMatch = issue.supplier === productDetail.supplier &&
                        issue.productName === productDetail.productName &&
                        issue.partName === productDetail.partName;
      
      // specification 매칭: 제품에 spec이 있으면 issue에도 spec이 있고 같아야 함
      const issueSpec = (issue as any).specification;
      const specMatch = productDetail.specification
        ? (issueSpec ? issueSpec === productDetail.specification : false)
        : !issueSpec; // 제품에 spec이 없으면 issue에도 spec이 없어야 함
      
      // 발주번호 매칭: issue.orderNumber와 생산일보 orderNumbers가 하나라도 겹치면 매칭
      const matchesOrderNumber = (() => {
        if (!issue.orderNumber || orderNumbersFromReports.size === 0) return false;
        const issueOrderNumbers = issue.orderNumber
          .split(/[,\s]+/)
          .map(s => s.trim())
          .filter(Boolean);
        return issueOrderNumbers.some(num => orderNumbersFromReports.has(num));
      })();
      
      // 기본+사양 매칭 OR 발주번호 매칭 중 하나라도 true이면 포함
      return (basicMatch && specMatch) || matchesOrderNumber;
    });
  }, [productDetail, realtimeQualityIssues, orderNumbersFromReports]);
  
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

  // 생산추이 차트 데이터 (최근 30일, 인당생산량)
  const chartData = useMemo(() => {
    if (!productDetail || !productDetail.productionHistory || productDetail.productionHistory.length === 0) {
      console.log('[ProductDetailModal] productionHistory 없음:', { 
        hasProductDetail: !!productDetail, 
        hasHistory: !!productDetail?.productionHistory,
        historyLength: productDetail?.productionHistory?.length 
      });
      return [];
    }
    
    // 생산이력을 날짜별로 그룹화하여 인당생산량 계산
    const historyByDate = new Map<string, { totalGood: number; totalPersonnel: number; count: number }>();
    
    productDetail.productionHistory.forEach(item => {
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
    
    // 날짜별 인당생산량 계산 (양품수량 / 작업인원)
    const recent30Days = Array.from(historyByDate.entries())
      .map(([date, data]) => {
        const perPerson = data.totalPersonnel > 0 
          ? Math.round((data.totalGood / data.totalPersonnel) * 10) / 10 // 소수점 첫째자리까지
          : 0;
        return {
          date,
          perPerson,
          sortDate: new Date(date).getTime()
        };
      })
      .sort((a, b) => a.sortDate - b.sortDate)
      .slice(-30); // 최근 30일
    
    const mapped = recent30Days.map(item => ({
      date: item.date.split('-').slice(1).join('/'), // MM/DD 형식
      '인당생산량': item.perPerson
    }));
    
    console.log('[ProductDetailModal] chartData 생성:', { 
      historyLength: productDetail.productionHistory.length, 
      recent30DaysLength: recent30Days.length,
      mappedLength: mapped.length,
      sample: mapped.slice(0, 3)
    });
    return mapped;
  }, [productDetail]);

  // 생산이력에 메모가 있는지 확인
  const hasMemoInHistory = useMemo(() => {
    if (!productDetail?.productionHistory || productDetail.productionHistory.length === 0) return false;
    return productDetail.productionHistory.some(item => item.memo && item.memo.trim().length > 0);
  }, [productDetail?.productionHistory]);


  // 에러 상태는 별도 처리 (로딩 중이 아닐 때만)
  if (error && !loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-[95vw] max-w-[1600px] h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{product.productName} - {product.partName}</DialogTitle>
            <DialogDescription className="sr-only">제품 상세 정보 오류</DialogDescription>
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

  // productDetail이 없고 로딩도 완료된 경우만 별도 처리
  if (!productDetail && !loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-[95vw] max-w-[1600px] h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{product.productName} - {product.partName}</DialogTitle>
            <DialogDescription className="sr-only">제품 상세 정보 없음</DialogDescription>
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
                {loading ? (
                  <Skeleton className="h-8 w-64" />
                ) : (
                  productDetail?.productName || product.productName
                )}
              </DialogTitle>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground font-medium">부속명:</span>
                    {loading ? (
                      <Skeleton className="h-5 w-32" />
                    ) : (
                      <span className="font-semibold">{productDetail?.partName || product.partName}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground font-medium">발주처:</span>
                    {loading ? (
                      <Skeleton className="h-5 w-32" />
                    ) : (
                      <span className="font-semibold">{productDetail?.supplier || product.supplier}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground font-medium">사양:</span>
                    {loading ? (
                      <Skeleton className="h-5 w-32" />
                    ) : (
                      <span className="font-semibold">{productDetail?.specification || product.specification}</span>
                    )}
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
              </TabsList>
            </Tabs>
          </>
        }
      >
        {/* 접근성을 위한 숨겨진 제목 및 설명 */}
        <DialogTitle className="sr-only">
          {productDetail?.productName || product.productName} ({productDetail?.partName || product.partName}) 제품 상세 정보
        </DialogTitle>
        <DialogDescription className="sr-only">
          {productDetail?.productName || product.productName} 제품의 생산이력, 품질이력, 도료사용이력 등 상세 정보를 확인할 수 있습니다.
        </DialogDescription>
        
        {loading ? (
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)} className="w-full h-full flex flex-col">
            <TabsContent value="summary" className="mt-0">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <Skeleton className="h-5 w-24" />
                    </CardHeader>
                    <CardContent className="pt-0 space-y-2">
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <Skeleton key={idx} className="h-16 w-full" />
                      ))}
                    </CardContent>
                  </Card>
                </div>
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <Skeleton className="h-5 w-32" />
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {Array.from({ length: 3 }).map((_, idx) => (
                        <Skeleton key={idx} className="h-20 w-full" />
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        ) : !productDetail ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center p-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">제품 정보를 찾을 수 없습니다.</p>
            </div>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)} className="w-full h-full flex flex-col">
            <TabsContent value="summary" className="mt-0 flex-1 min-h-0 overflow-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-1">
                {/* 좌측 열: 생산 관련 정보 */}
                <div className="space-y-6">
                  {/* 생산이력 */}
                  <Card className="shadow-sm">
                    <CardHeader className="pb-3 border-b">
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        생산이력
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      {productDetail?.productionHistory && productDetail.productionHistory.length > 0 ? (
                        <>
                          <div className="max-h-[450px] overflow-auto rounded-md border">
                            <Table>
                              <TableHeader className="sticky top-0 bg-muted z-10">
                                <TableRow>
                                  <TableHead className="whitespace-nowrap text-xs font-semibold py-2 px-3">작업일자</TableHead>
                                  <TableHead className="whitespace-nowrap text-xs font-semibold py-2 px-3">발주번호</TableHead>
                                  <TableHead className="whitespace-nowrap text-xs font-semibold py-2 px-3">생산라인</TableHead>
                                  <TableHead className="whitespace-nowrap text-xs font-semibold text-right py-2 px-3">발주수량</TableHead>
                                  <TableHead className="whitespace-nowrap text-xs font-semibold text-right py-2 px-3">투입수량</TableHead>
                                  <TableHead className="whitespace-nowrap text-xs font-semibold text-right py-2 px-3">양품수량</TableHead>
                                  <TableHead className="whitespace-nowrap text-xs font-semibold text-right py-2 px-3">불량수량</TableHead>
                                  <TableHead className="whitespace-nowrap text-xs font-semibold text-right py-2 px-3">작업인원</TableHead>
                                  <TableHead className="whitespace-nowrap text-xs font-semibold py-2 px-3">스핀들비율</TableHead>
                                  {hasMemoInHistory && (
                                    <TableHead className="whitespace-nowrap text-xs font-semibold text-center py-2 px-3">메모</TableHead>
                                  )}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {productDetail.productionHistory.slice(0, 10).map((item) => (
                                  <TableRow key={item.id} className="hover:bg-muted/50">
                                    <TableCell className="text-xs whitespace-nowrap py-2 px-3">{item.workDate}</TableCell>
                                    <TableCell className="text-xs whitespace-nowrap py-2 px-3 font-medium">{item.orderNumber}</TableCell>
                                    <TableCell className="text-xs whitespace-nowrap py-2 px-3">{item.productionLine || '-'}</TableCell>
                                    <TableCell className="text-xs text-right whitespace-nowrap py-2 px-3">
                                      {item.orderQuantity?.toLocaleString() || '-'}
                                    </TableCell>
                                    <TableCell className="text-xs text-right whitespace-nowrap py-2 px-3">
                                      {item.inputQuantity?.toLocaleString() || '-'}
                                    </TableCell>
                                    <TableCell className="text-xs text-right whitespace-nowrap text-green-600 font-medium py-2 px-3">
                                      {item.goodQuantity?.toLocaleString() || '-'}
                                    </TableCell>
                                    <TableCell className="text-xs text-right whitespace-nowrap text-red-600 font-medium py-2 px-3">
                                      {item.defectQuantity?.toLocaleString() || '-'}
                                    </TableCell>
                                    <TableCell className="text-xs text-right whitespace-nowrap py-2 px-3">
                                      {item.personnelCount !== undefined ? item.personnelCount : '-'}
                                    </TableCell>
                                    <TableCell className="text-xs whitespace-nowrap py-2 px-3">{item.lineRatio || '-'}</TableCell>
                                    {hasMemoInHistory && (
                                      <TableCell className="text-xs text-center whitespace-nowrap py-2 px-3">
                                        {item.memo && item.memo.trim().length > 0 ? (
                                          <Button
                                            variant="link"
                                            size="sm"
                                            onClick={() => setMemoModalState({ 
                                              isOpen: true, 
                                              memo: item.memo || null,
                                              historyItem: item
                                            })}
                                            className="text-blue-600 dark:text-blue-400 font-semibold hover:underline p-0 h-auto text-xs"
                                          >
                                            메모
                                          </Button>
                                        ) : (
                                          <span className="text-muted-foreground">-</span>
                                        )}
                                      </TableCell>
                                    )}
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                          {productDetail.productionHistory.length > 10 && (
                            <div className="mt-3 text-xs text-center text-muted-foreground bg-muted/50 py-2 rounded-md">
                              총 {productDetail.productionHistory.length}건 중 최근 10건 표시
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-center py-12 text-muted-foreground">
                          <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p className="text-sm font-medium">생산이력이 없습니다</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* 최근 도료사용이력 (변경된 것만) */}
                  {recentCoatingHistory.length > 0 && (
                    <Card className="shadow-sm">
                      <CardHeader className="pb-3 border-b">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                          <Package className="h-5 w-5 text-primary" />
                          최근 도료사용이력
                          <Badge variant="secondary" className="text-xs ml-1">변경된 것만</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="space-y-3">
                          {recentCoatingHistory.map((item) => (
                            <div key={item.id} className="p-4 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
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

                  {/* 지그사용이력 */}
                  {productDetail?.jigHistory && productDetail.jigHistory.length > 0 && (
                    <Card className="shadow-sm">
                      <CardHeader className="pb-3 border-b">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                          <Settings className="h-5 w-5 text-primary" />
                          지그사용이력
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="space-y-3 max-h-[350px] overflow-y-auto">
                          {productDetail.jigHistory.map((item) => (
                            <div key={item.id} className="p-4 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-sm font-semibold">{item.orderNumber}</span>
                                <span className="text-xs text-muted-foreground">{item.inspectionDate}</span>
                              </div>
                              <div className="text-sm space-y-2">
                                {item.jigUsed && <div><span className="font-semibold text-muted-foreground">지그:</span> {item.jigUsed}</div>}
                                {item.jigUsed1 && <div><span className="font-semibold text-muted-foreground">지그1:</span> {item.jigUsed1}</div>}
                                {item.jigUsed2 && <div><span className="font-semibold text-muted-foreground">지그2:</span> {item.jigUsed2}</div>}
                                {item.internalJigLower && <div><span className="font-semibold text-muted-foreground">내부지그(하):</span> {item.internalJigLower}</div>}
                                {item.internalJigUpper && <div><span className="font-semibold text-muted-foreground">내부지그(상):</span> {item.internalJigUpper}</div>}
                                {item.workLine && <div className="text-muted-foreground pt-1 border-t"><span className="font-semibold">작업라인:</span> {item.workLine}</div>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* 우측 열: 품질 관련 정보 */}
                <div className="space-y-6">
                  {/* 품질이슈 내용 */}
                  {(() => {
                    // 실시간 품질이슈가 있으면 우선 사용, 없으면 기존 데이터 사용
                    const displayQualityIssues = convertedRealtimeQualityIssues.length > 0 
                      ? convertedRealtimeQualityIssues 
                      : productDetail?.qualityIssues || [];
                    
                    // 내용이 있을 때만 카드 표시
                    if (displayQualityIssues.length === 0) return null;
                    
                    return (
                      <Card className="shadow-sm">
                        <CardHeader className="pb-3 border-b">
                          <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-destructive" />
                            품질이슈 내용
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                          <div className="space-y-3 max-h-[450px] overflow-y-auto">
                            {displayQualityIssues.map((issue) => (
                            <div key={issue.id} className="p-3 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-semibold">{issue.orderNumber}</span>
                              </div>
                              {issue.issues.length > 0 && (
                                <div className="space-y-1.5 mb-2">
                                  {issue.issues.map((item, idx) => (
                                    <p key={idx} className="text-sm text-foreground leading-relaxed">
                                      {typeof item === 'string' ? item : item.content}
                                    </p>
                                  ))}
                                </div>
                              )}
                              {issue.keywordPairs && issue.keywordPairs.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t">
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
                      </CardContent>
                    </Card>
                    );
                  })()}

                  {/* 품질이력 (검사 타입별 아코디언) */}
                  <Card className="shadow-sm">
                    <CardHeader className="pb-3 border-b">
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-primary" />
                        품질이력
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <Accordion 
                        type="multiple" 
                        className="w-full"
                        defaultValue={[
                          ...(qualityStats.incoming.count > 0 ? ['incoming'] : []),
                          ...(qualityStats.inProcess.count > 0 ? ['inProcess'] : []),
                          ...(qualityStats.outgoing.count > 0 ? ['outgoing'] : []),
                        ]}
                      >
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
                                  <>
                                    {(showAllIncoming ? qualityHistorySummary.incoming : qualityHistorySummary.incoming.slice(0, 3)).map((item, idx) => (
                                      <div key={idx} className="p-3 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                                        <div className="flex items-center justify-between mb-2">
                                          <span className="text-sm font-semibold">{item.orderNumber}</span>
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
                                    ))}
                                    {qualityHistorySummary.incoming.length > 3 && (
                                      <div className="pt-2">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => setShowAllIncoming(!showAllIncoming)}
                                          className="w-full text-xs"
                                        >
                                          {showAllIncoming ? '접기' : `더보기 (${qualityHistorySummary.incoming.length - 3}개 더)`}
                                        </Button>
                                      </div>
                                    )}
                                  </>
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
                                  <>
                                    {(showAllInProcess ? qualityHistorySummary.inProcess : qualityHistorySummary.inProcess.slice(0, 3)).map((item, idx) => (
                                      <div key={idx} className="p-3 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                                        <div className="flex items-center justify-between mb-2">
                                          <span className="text-sm font-semibold">{item.orderNumber}</span>
                                          <span className="text-xs text-muted-foreground">{item.date}</span>
                                        </div>
                                        {item.inProcessHistory && (
                                          <p className="text-sm text-foreground mt-2">
                                            <span className="font-semibold text-muted-foreground">공정이력:</span> {item.inProcessHistory}
                                          </p>
                                        )}
                                        {item.preInspectionHistory && (
                                          <p className="text-sm text-foreground mt-2">
                                            <span className="font-semibold text-muted-foreground">사전이력:</span> {item.preInspectionHistory}
                                          </p>
                                        )}
                                      </div>
                                    ))}
                                    {qualityHistorySummary.inProcess.length > 3 && (
                                      <div className="pt-2">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => setShowAllInProcess(!showAllInProcess)}
                                          className="w-full text-xs"
                                        >
                                          {showAllInProcess ? '접기' : `더보기 (${qualityHistorySummary.inProcess.length - 3}개 더)`}
                                        </Button>
                                      </div>
                                    )}
                                  </>
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
                                    <div key={idx} className="p-3 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-semibold">{item.orderNumber}</span>
                                        <span className="text-xs text-muted-foreground">{item.date}</span>
                                      </div>
                                      {item.workers && (
                                        <p className="text-sm text-foreground mt-2">
                                          <span className="font-semibold text-muted-foreground">작업자:</span> {item.workers}
                                        </p>
                                      )}
                                      {item.reliabilityReview && (
                                        <p className="text-sm text-foreground mt-2">
                                          <span className="font-semibold text-muted-foreground">신뢰성:</span> {item.reliabilityReview}
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
                          <div className="text-center py-12 text-muted-foreground">
                            <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p className="text-sm font-medium">품질이력이 없습니다</p>
                          </div>
                        )}
                      </Accordion>
                    </CardContent>
                  </Card>

                  {/* 부족분 진행 이력 */}
                  {productDetail?.shortageHistory && productDetail.shortageHistory.length > 0 && (
                    <Card className="shadow-sm">
                      <CardHeader className="pb-3 border-b">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                          <AlertCircle className="h-5 w-5 text-orange-500" />
                          부족분 진행 이력
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="space-y-3 max-h-[350px] overflow-y-auto">
                          {productDetail.shortageHistory.map((item) => (
                            <div key={item.id} className="p-4 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-sm font-semibold">{item.orderNumber}</span>
                                <Badge variant={item.status === 'completed' ? 'default' : 'secondary'}>
                                  {item.status === 'completed' ? '완료' : '요청중'}
                                </Badge>
                              </div>
                              <div className="text-sm space-y-2">
                                <div className="font-medium">부족 수량: <span className="text-primary">{item.requestedShortageQuantity}</span></div>
                                <div className="text-muted-foreground">{item.shortageReason}</div>
                                <div className="text-xs text-muted-foreground pt-1 border-t">{item.createdAt.split('T')[0]}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </TabsContent>

          </Tabs>
        )}
      </DialogContent>

      {/* 메모 모달 */}
      <MemoModal
        isOpen={memoModalState.isOpen}
        onClose={() => setMemoModalState({ isOpen: false, memo: null, historyItem: null })}
        memo={memoModalState.memo}
        reportInfo={memoModalState.historyItem ? {
          productName: productDetail?.productName || product.productName,
          partName: productDetail?.partName || product.partName,
          workDate: memoModalState.historyItem.workDate
        } : undefined}
      />
    </Dialog>
  );
};
