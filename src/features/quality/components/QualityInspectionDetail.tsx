'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Badge } from '@/shared/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/components/ui/collapsible';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { GroupedInspectionData, QualityInspection } from '../types';
import { ImageGalleryGrid } from '@/shared/components/common/ImageGalleryGrid';
import { INSPECTION_TYPE_COLORS, INSPECTION_RESULT_COLORS } from '../constants';
import { cn } from '@/shared/lib/utils';

interface QualityInspectionDetailProps {
  group: GroupedInspectionData | null;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * 품질검사 상세 모달 컴포넌트
 * - 발주번호별 그룹화된 모든 검사 정보 표시
 * - 수입/공정/출하 검사를 탭으로 구분
 * - 이미지 갤러리 (ImageGalleryGrid 활용)
 */
export const QualityInspectionDetail: React.FC<QualityInspectionDetailProps> = ({
  group,
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'incoming' | 'in-process' | 'outgoing'>('incoming');
  const [collapsedInspections, setCollapsedInspections] = useState<{
    [key: string]: boolean;
  }>({});

  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 날짜 포맷팅 (간단한 버전)
  const formatDateSimple = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  // 개별 검사 토글 함수
  const toggleInspection = (inspectionId: string) => {
    setCollapsedInspections(prev => ({
      ...prev,
      [inspectionId]: !prev[inspectionId]
    }));
  };

  // 모달이 열릴 때마다 최신 검사 상태 초기화
  useEffect(() => {
    if (isOpen && group) {
      // 모든 검사 타입의 첫 번째 검사를 펼쳐진 상태로 설정
      const firstInspections: string[] = [];
      
      if (tabData.incoming.length > 0) {
        firstInspections.push(tabData.incoming[0].id);
      }
      if (tabData.inProcess.length > 0) {
        firstInspections.push(tabData.inProcess[0].id);
      }
      if (tabData.outgoing.length > 0) {
        firstInspections.push(tabData.outgoing[0].id);
      }

      // 첫 번째 검사들을 펼쳐진 상태로 설정
      const newState: { [key: string]: boolean } = {};
      firstInspections.forEach(id => {
        newState[id] = false; // false = 펼쳐진 상태
      });
      
      setCollapsedInspections(prev => ({
        ...prev,
        ...newState
      }));
    }
  }, [isOpen, group]);

  // 검사 데이터를 최신순으로 정렬하는 함수 (최신이 먼저)
  const sortInspectionsByDate = (inspections: QualityInspection[]) => {
    return [...inspections].sort((a, b) => 
      new Date(b.inspectionDate).getTime() - new Date(a.inspectionDate).getTime()
    );
  };

  // 탭별 검사 데이터 (날짜순 정렬)
  const tabData = useMemo(() => {
    if (!group) return { incoming: [], inProcess: [], outgoing: [] };
    return {
      incoming: sortInspectionsByDate(group.incoming),
      inProcess: sortInspectionsByDate(group.inProcess),
      outgoing: sortInspectionsByDate(group.outgoing)
    };
  }, [group]);

  // 필드 렌더링 헬퍼
  const renderField = (label: string, value: any) => {
    if (!value || (Array.isArray(value) && value.length === 0)) return null;
    
    const displayValue = Array.isArray(value) ? value.join(', ') : value;
    
    return (
      <div className="space-y-1">
        <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
        <dd className="text-sm text-foreground whitespace-pre-wrap break-words">
          {displayValue}
        </dd>
      </div>
    );
  };

  // 검사 정보 카드 렌더링
  const renderInspectionCard = (inspection: QualityInspection, index: number, totalCount: number) => {
    // 검사가 1개만 있을 때는 접기/펼치기 없이 바로 표시
    if (totalCount === 1) {
      return (
        <Card key={inspection.id} className="mb-4">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <CardTitle className="text-base">
                검사 #{index + 1}
              </CardTitle>
              <div className="flex gap-2">
                <Badge className={cn(INSPECTION_RESULT_COLORS[inspection.result])}>
                  {inspection.result}
                </Badge>
                <Badge className={cn(INSPECTION_TYPE_COLORS[inspection.inspectionType])}>
                  {inspection.inspectionType === 'incoming' ? '수입' :
                   inspection.inspectionType === 'in-process' ? '공정' : '출하'}
                </Badge>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              검사일시: {formatDate(inspection.inspectionDate)}
            </p>
            <p className="text-xs text-muted-foreground">
              검사자: {typeof inspection.inspector === 'string' 
                ? inspection.inspector 
                : (inspection.inspector as any)?.displayName || '알 수 없음'}
            </p>
          </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 공통 필드 */}
            {renderField('발주번호', inspection.orderNumber)}
            {renderField('발주처', inspection.supplier)}
            {renderField('제품명', inspection.productName)}
            {renderField('부속명', inspection.partName)}
            {renderField('발주수량', inspection.orderQuantity ? `${inspection.orderQuantity.toLocaleString()} ea` : undefined)}
            {renderField('사양', inspection.specification)}
            {renderField('후공정', inspection.postProcess)}
            {renderField('사출원료', inspection.injectionMaterial)}
            {renderField('사출색상', inspection.injectionColor)}
            {renderField('사출처', inspection.injectionCompany)}
            
            {/* 검사 결과 */}
            {inspection.resultReason && renderField('결과 사유', inspection.resultReason)}
            
            {/* 키워드 페어 */}
            {inspection.keywordPairs && inspection.keywordPairs.length > 0 && (
              <div className="md:col-span-2 space-y-2">
                <dt className="text-sm font-medium text-muted-foreground">불량 키워드</dt>
                <dd className="flex flex-wrap gap-2">
                  {inspection.keywordPairs.map((pair, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {pair.process} - {pair.defect}
                    </Badge>
                  ))}
                </dd>
              </div>
            )}
            
            {/* 수입검사 전용 필드 */}
            {inspection.inspectionType === 'incoming' && (
              <>
                {renderField('외관검사이력', inspection.appearanceHistory)}
                {renderField('기능검사이력', inspection.functionHistory)}
                {renderField('최종협의(소속)', inspection.finalConsultationDept)}
                {renderField('최종협의(이름)', inspection.finalConsultationName)}
                {renderField('최종협의(직급)', inspection.finalConsultationRank)}
                {renderField('사용지그-1', inspection.jigUsed)}
                {renderField('사용지그-2', inspection.jigUsed2)}
                {renderField('재검사 키워드', inspection.reinspectionKeyword)}
                {renderField('재검사 내용', inspection.reinspectionContent)}
              </>
            )}
            
            {/* 공정검사 전용 필드 */}
            {inspection.inspectionType === 'in-process' && (
              <>
                {renderField('작업라인', inspection.workLine)}
                {renderField('작업자 인원수', inspection.workerCount ? `${inspection.workerCount}명` : undefined)}
                {renderField('사전검사이력', inspection.preInspectionHistory)}
                {renderField('공정검사이력', inspection.inProcessInspectionHistory)}
                
                {/* 공정 라인 정보 */}
                {inspection.processLines && inspection.processLines.length > 0 && (
                  <div className="md:col-span-2 space-y-2">
                    <dt className="text-sm font-medium text-muted-foreground">공정 라인 정보</dt>
                    <dd className="space-y-2">
                      {inspection.processLines.map((line, idx) => (
                        <div key={idx} className="p-3 bg-muted rounded-md text-xs space-y-1">
                          <p><strong>라인:</strong> {line.line}</p>
                          {line.jigUsed && <p><strong>사용지그-1:</strong> {line.jigUsed}</p>}
                          {line.jigUsed2 && <p><strong>사용지그-2:</strong> {line.jigUsed2}</p>}
                          {line.dryerUsed && <p><strong>드라이기:</strong> {line.dryerUsed}</p>}
                          {line.flameTreatment && <p><strong>화염처리:</strong> {line.flameTreatment}</p>}
                          {line.lineSpeed && <p><strong>라인속도:</strong> {line.lineSpeed}</p>}
                          {line.lampUsage && <p><strong>램프사용:</strong> {line.lampUsage}</p>}
                        </div>
                      ))}
                    </dd>
                  </div>
                )}
              </>
            )}
            
            {/* 출하검사 전용 필드 */}
            {inspection.inspectionType === 'outgoing' && (
              <>
                {renderField('사출포장', inspection.injectionPackaging)}
                {renderField('후가공포장', inspection.postProcessPackaging)}
                
                {/* 작업자별 검사 결과 */}
                {inspection.workers && inspection.workers.length > 0 && (
                  <div className="md:col-span-2 space-y-2">
                    <dt className="text-sm font-medium text-muted-foreground">작업자별 검사 결과</dt>
                    <dd className="space-y-2">
                      {inspection.workers.map((worker, idx) => (
                        <div key={idx} className="p-3 bg-muted rounded-md text-xs space-y-1">
                          <p><strong>작업자:</strong> {worker.name}</p>
                          <p>
                            <strong>결과:</strong>{' '}
                            <Badge 
                              variant="outline" 
                              className={worker.result === '합격' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'}
                            >
                              {worker.result}
                            </Badge>
                          </p>
                          {worker.defectReasons && worker.defectReasons.length > 0 && (
                            <p><strong>불량 사유:</strong> {worker.defectReasons.join(', ')}</p>
                          )}
                        </div>
                      ))}
                    </dd>
                  </div>
                )}
                
                {/* 신뢰성 테스트 */}
                {inspection.reliabilityReview && (
                  <div className="md:col-span-2 space-y-1">
                    <dt className="text-sm font-medium text-muted-foreground">신뢰성 테스트</dt>
                    <dd className="text-sm text-foreground">
                      {inspection.reliabilityReview.method}: {inspection.reliabilityReview.result}
                      {inspection.reliabilityReview.action && ` (처리: ${inspection.reliabilityReview.action})`}
                      {inspection.reliabilityReview.decisionMaker && ` (결정자: ${inspection.reliabilityReview.decisionMaker})`}
                    </dd>
                  </div>
                )}
              </>
            )}
          </dl>
          
          {/* 이미지 갤러리 */}
          {inspection.imageUrls && inspection.imageUrls.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-medium text-muted-foreground mb-3">
                첨부 이미지 ({inspection.imageUrls.length}개)
              </h4>
              <ImageGalleryGrid 
                images={inspection.imageUrls}
                gridClassName="grid-cols-[repeat(auto-fill,minmax(120px,1fr))]"
                imageClassName="h-24"
                useThumbnails={true}
                enableLazyLoading={true}
              />
            </div>
          )}
        </CardContent>
      </Card>
    );
    }
    
    // 검사가 2개 이상일 때는 collapsible로 표시
    // 최신 검사(첫 번째, index === 0)는 펼쳐진 상태, 나머지는 접힌 상태
    const isCollapsed = collapsedInspections[inspection.id] ?? (index !== 0);
    
    return (
      <Card key={inspection.id} className="mb-4">
        <Collapsible 
          open={!isCollapsed} 
          onOpenChange={() => toggleInspection(inspection.id)}
        >
          <CollapsibleTrigger asChild>
            <CardHeader className={`pb-3 cursor-pointer hover:bg-muted/50 transition-colors ${
              isCollapsed ? 'rounded-lg' : 'rounded-t-lg'
            }`}>
              <div className="flex justify-between items-start">
                <CardTitle className="text-base flex items-center gap-2">
                  <span>검사 #{index + 1}</span>
                  {isCollapsed ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </CardTitle>
                <div className="flex gap-2">
                  <Badge className={cn(INSPECTION_RESULT_COLORS[inspection.result])}>
                    {inspection.result}
                  </Badge>
                  <Badge className={cn(INSPECTION_TYPE_COLORS[inspection.inspectionType])}>
                    {inspection.inspectionType === 'incoming' ? '수입' :
                     inspection.inspectionType === 'in-process' ? '공정' : '출하'}
                  </Badge>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                검사일시: {formatDate(inspection.inspectionDate)}
              </p>
              <p className="text-xs text-muted-foreground">
                검사자: {typeof inspection.inspector === 'string' 
                  ? inspection.inspector 
                  : (inspection.inspector as any)?.displayName || '알 수 없음'}
              </p>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 공통 필드 */}
                {renderField('발주번호', inspection.orderNumber)}
                {renderField('발주처', inspection.supplier)}
                {renderField('제품명', inspection.productName)}
                {renderField('부속명', inspection.partName)}
                {renderField('발주수량', inspection.orderQuantity ? `${inspection.orderQuantity.toLocaleString()} ea` : undefined)}
                {renderField('사양', inspection.specification)}
                {renderField('후공정', inspection.postProcess)}
                {renderField('사출원료', inspection.injectionMaterial)}
                {renderField('사출색상', inspection.injectionColor)}
                {renderField('사출처', inspection.injectionCompany)}
                
                {/* 검사 결과 */}
                {inspection.resultReason && renderField('결과 사유', inspection.resultReason)}
                
                {/* 키워드 페어 */}
                {inspection.keywordPairs && inspection.keywordPairs.length > 0 && (
                  <div className="md:col-span-2 space-y-2">
                    <dt className="text-sm font-medium text-muted-foreground">불량 키워드</dt>
                    <dd className="flex flex-wrap gap-2">
                      {inspection.keywordPairs.map((pair, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {pair.process} - {pair.defect}
                        </Badge>
                      ))}
                    </dd>
                  </div>
                )}
                
                {/* 수입검사 전용 필드 */}
                {inspection.inspectionType === 'incoming' && (
                  <>
                    {renderField('외관검사이력', inspection.appearanceHistory)}
                    {renderField('기능검사이력', inspection.functionHistory)}
                    {renderField('최종협의(소속)', inspection.finalConsultationDept)}
                    {renderField('최종협의(이름)', inspection.finalConsultationName)}
                    {renderField('최종협의(직급)', inspection.finalConsultationRank)}
                    {renderField('사용지그-1', inspection.jigUsed)}
                    {renderField('사용지그-2', inspection.jigUsed2)}
                    {renderField('재검사 키워드', inspection.reinspectionKeyword)}
                    {renderField('재검사 내용', inspection.reinspectionContent)}
                  </>
                )}
                
                {/* 공정검사 전용 필드 */}
                {inspection.inspectionType === 'in-process' && (
                  <>
                    {renderField('작업라인', inspection.workLine)}
                    {renderField('작업자 인원수', inspection.workerCount ? `${inspection.workerCount}명` : undefined)}
                    {renderField('사전검사이력', inspection.preInspectionHistory)}
                    {renderField('공정검사이력', inspection.inProcessInspectionHistory)}
                    
                    {/* 공정 라인 정보 */}
                    {inspection.processLines && inspection.processLines.length > 0 && (
                      <div className="md:col-span-2 space-y-2">
                        <dt className="text-sm font-medium text-muted-foreground">공정 라인 정보</dt>
                        <dd className="space-y-2">
                          {inspection.processLines.map((line, idx) => (
                            <div key={idx} className="p-3 bg-muted rounded-md text-xs space-y-1">
                              <p><strong>라인:</strong> {line.line}</p>
                              {line.jigUsed && <p><strong>사용지그-1:</strong> {line.jigUsed}</p>}
                              {line.jigUsed2 && <p><strong>사용지그-2:</strong> {line.jigUsed2}</p>}
                              {line.dryerUsed && <p><strong>드라이기:</strong> {line.dryerUsed}</p>}
                              {line.flameTreatment && <p><strong>화염처리:</strong> {line.flameTreatment}</p>}
                              {line.lineSpeed && <p><strong>라인속도:</strong> {line.lineSpeed}</p>}
                              {line.lampUsage && <p><strong>램프사용:</strong> {line.lampUsage}</p>}
                            </div>
                          ))}
                        </dd>
                      </div>
                    )}
                  </>
                )}
                
                {/* 출하검사 전용 필드 */}
                {inspection.inspectionType === 'outgoing' && (
                  <>
                    {renderField('사출포장', inspection.injectionPackaging)}
                    {renderField('후가공포장', inspection.postProcessPackaging)}
                    
                    {/* 작업자별 검사 결과 */}
                    {inspection.workers && inspection.workers.length > 0 && (
                      <div className="md:col-span-2 space-y-2">
                        <dt className="text-sm font-medium text-muted-foreground">작업자별 검사 결과</dt>
                        <dd className="space-y-2">
                          {inspection.workers.map((worker, idx) => (
                            <div key={idx} className="p-3 bg-muted rounded-md text-xs space-y-1">
                              <p><strong>작업자:</strong> {worker.name}</p>
                              <p>
                                <strong>결과:</strong>{' '}
                                <Badge 
                                  variant="outline" 
                                  className={worker.result === '합격' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-red-100 text-red-800'}
                                >
                                  {worker.result}
                                </Badge>
                              </p>
                              {worker.defectReasons && worker.defectReasons.length > 0 && (
                                <p><strong>불량 사유:</strong> {worker.defectReasons.join(', ')}</p>
                              )}
                            </div>
                          ))}
                        </dd>
                      </div>
                    )}
                    
                    {/* 신뢰성 테스트 */}
                    {inspection.reliabilityReview && (
                      <div className="md:col-span-2 space-y-1">
                        <dt className="text-sm font-medium text-muted-foreground">신뢰성 테스트</dt>
                        <dd className="text-sm text-foreground">
                          {inspection.reliabilityReview.method}: {inspection.reliabilityReview.result}
                          {inspection.reliabilityReview.action && ` (처리: ${inspection.reliabilityReview.action})`}
                          {inspection.reliabilityReview.decisionMaker && ` (결정자: ${inspection.reliabilityReview.decisionMaker})`}
                        </dd>
                      </div>
                    )}
                  </>
                )}
              </dl>
              
              {/* 이미지 갤러리 */}
              {inspection.imageUrls && inspection.imageUrls.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">
                    첨부 이미지 ({inspection.imageUrls.length}개)
                  </h4>
                  <ImageGalleryGrid 
                    images={inspection.imageUrls}
                    gridClassName="grid-cols-[repeat(auto-fill,minmax(120px,1fr))]"
                    imageClassName="h-24"
                    useThumbnails={true}
                    enableLazyLoading={true}
                  />
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    );
  };

  if (!group) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="w-[90vw] max-w-7xl h-[90vh] overflow-hidden flex flex-col"
        stickyHeader={
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div>
                <span className="font-bold">{group.common.productName}</span>
                <span className="text-sm text-muted-foreground ml-2">
                  ({group.common.orderNumber})
                </span>
              </div>
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-2">
              발주처: {group.common.supplier} | 부속명: {group.common.partName}
            </DialogDescription>
            
            {/* 탭 네비게이션 */}
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="mt-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="incoming" className="relative">
                  수입검사
                  {tabData.incoming.length > 0 && (
                    <Badge className="ml-2 h-5 min-w-5 flex items-center justify-center" variant="secondary">
                      {tabData.incoming.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="in-process" className="relative">
                  공정검사
                  {tabData.inProcess.length > 0 && (
                    <Badge className="ml-2 h-5 min-w-5 flex items-center justify-center" variant="secondary">
                      {tabData.inProcess.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="outgoing" className="relative">
                  출하검사
                  {tabData.outgoing.length > 0 && (
                    <Badge className="ml-2 h-5 min-w-5 flex items-center justify-center" variant="secondary">
                      {tabData.outgoing.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </DialogHeader>
        }
      >
        {/* 접근성을 위한 숨겨진 제목과 설명 */}
        <DialogTitle className="sr-only">
          {group.common.productName} ({group.common.orderNumber}) 품질검사 상세
        </DialogTitle>
        <DialogDescription className="sr-only">
          발주처: {group.common.supplier}, 부속명: {group.common.partName}의 품질검사 상세 정보를 확인할 수 있습니다.
        </DialogDescription>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-auto mt-2">
            <TabsContent value="incoming" className="mt-0">
              {tabData.incoming.length > 0 ? (
                <div className="space-y-4">
                  {tabData.incoming.map((inspection, index) => renderInspectionCard(inspection, index, tabData.incoming.length))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  수입검사 데이터가 없습니다
                </div>
              )}
            </TabsContent>

            <TabsContent value="in-process" className="mt-0">
              {tabData.inProcess.length > 0 ? (
                <div className="space-y-4">
                  {tabData.inProcess.map((inspection, index) => renderInspectionCard(inspection, index, tabData.inProcess.length))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  공정검사 데이터가 없습니다
                </div>
              )}
            </TabsContent>

            <TabsContent value="outgoing" className="mt-0">
              {tabData.outgoing.length > 0 ? (
                <div className="space-y-4">
                  {tabData.outgoing.map((inspection, index) => renderInspectionCard(inspection, index, tabData.outgoing.length))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  출하검사 데이터가 없습니다
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

