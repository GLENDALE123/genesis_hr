
import React, { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/components/ui/collapsible';
import { ChevronDown, ChevronRight, Edit, Trash2 } from 'lucide-react';
import { QualityInspection, TestResultDetail, DefectResultPair } from '../types';
import { INSPECTION_RESULT_COLORS, INSPECTION_TYPE_COLORS } from '../constants';
import { cn } from '@/shared/lib/utils';
import { ImageGalleryGrid } from '@/shared/components/common/ImageGalleryGrid';
import { filterValidImageURLs } from '@/shared/utils/imagePathMigration';

interface InspectionCardProps {
  inspection: QualityInspection;
  index: number;
  totalCount: number;
  isCollapsed: boolean;
  onToggle: (inspectionId: string) => void;
  onEdit?: (inspection: QualityInspection) => void;
  onDelete?: (inspection: QualityInspection) => void;
  canEdit: (inspection: QualityInspection) => boolean;
  canDelete: (inspection: QualityInspection) => boolean;
  formatDate: (dateString: string) => string;
}

/**
 * 개별 품질검사 카드 컴포넌트
 * - 기존 renderInspectionCard 함수와 동일한 로직
 * - 검사가 1개일 때와 2개 이상일 때 다른 렌더링
 * - 접기/펼치기 기능
 * - 이미지 갤러리
 */
export const InspectionCard: React.FC<InspectionCardProps> = memo(({
  inspection,
  index,
  totalCount,
  isCollapsed,
  onToggle,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
  formatDate
}) => {
  // 필드 렌더링 헬퍼
  const renderField = (label: string, value: unknown) => {
    if (!value || (Array.isArray(value) && value.length === 0)) return null;
    
    const displayValue = Array.isArray(value) ? value.join(', ') : value;
    
    return (
      <div className="space-y-1">
        <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
        <dd className="text-sm text-foreground whitespace-pre-wrap break-words">
          {String(displayValue || '')}
        </dd>
      </div>
    );
  };

  // TestResultDetail 타입 가드
  const isTestResultDetail = (value: string | TestResultDetail | undefined): value is TestResultDetail => {
    return typeof value === 'object' && value !== null && 'result' in value;
  };

  // DefectResultPair 타입 가드
  const isDefectResultPair = (pair: DefectResultPair | { defect: string; result: string }): pair is DefectResultPair => {
    return 'defectKeyword' in pair;
  };

  // 검사가 1개만 있을 때는 접기/펼치기 없이 바로 표시
  if (totalCount === 1) {
    return (
      <Card key={inspection.id} className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <CardTitle className="text-base">
              검사 #{totalCount - index}
            </CardTitle>
            <div className="flex gap-2">
              {/* 수입검사만 결과 뱃지 표시 */}
              {inspection.inspectionType === 'incoming' && (
                <Badge className={cn(INSPECTION_RESULT_COLORS[inspection.result])}>
                  {inspection.result}
                </Badge>
              )}
              <Badge className={cn(INSPECTION_TYPE_COLORS[inspection.inspectionType])}>
                {inspection.inspectionType === 'incoming' ? '수입' :
                 inspection.inspectionType === 'inProcess' ? '공정' : '출하'}
              </Badge>
              
              {/* 수정 버튼 */}
              {canEdit(inspection) && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit?.(inspection);
                  }}
                  className="h-6 px-2 text-xs bg-blue-500 text-white hover:bg-blue-600"
                >
                  <Edit className="h-3 w-3 mr-1" />
                  수정
                </Button>
              )}
              
              {/* 삭제 버튼 */}
              {canDelete(inspection) && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    const confirmed = window.confirm('정말로 이 품질검사를 삭제하시겠습니까?');
                    if (confirmed) {
                      onDelete?.(inspection);
                    }
                  }}
                  className="h-6 px-2 text-xs bg-red-500 text-white hover:bg-red-600"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  삭제
                </Button>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            검사일시: {formatDate(inspection.inspectionDate || inspection.createdAt)}
          </p>
          <p className="text-xs text-muted-foreground">
            검사자: {typeof inspection.inspector === 'string' 
              ? inspection.inspector 
              : (inspection.inspector as { displayName?: string })?.displayName || '알 수 없음'}
          </p>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4">
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
              <div className="col-span-2 space-y-2">
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
                {renderField('사출포장', inspection.packagingInfo)}
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
            {inspection.inspectionType === 'inProcess' && (
              <>
                {renderField('작업라인', inspection.workLine)}
                {renderField('사용지그-1', inspection.jigUsed1)}
                {renderField('사용지그-2', inspection.jigUsed2)}
                {renderField('내부코팅 사용지그 (하측지그)', inspection.internalJigLower)}
                {renderField('내부코팅 사용지그 (상측지그)', inspection.internalJigUpper)}
                {renderField('드라이기사용', inspection.dryerUsed)}
                {renderField('화염처리진행', inspection.flameTreatment)}
                {renderField('사전검사이력', inspection.preInspectionHistory)}
                {renderField('공정검사이력', inspection.inProcessInspectionHistory)}
                
                {/* 공정 라인 정보 */}
                {inspection.processLines && inspection.processLines.length > 0 && (
                  <div className="col-span-2 space-y-2">
                    <dt className="text-sm font-medium text-muted-foreground">공정 라인 정보</dt>
                    <dd className="space-y-2">
                      {inspection.processLines.map((line, idx) => (
                        <div key={idx} className="p-3 bg-muted rounded-md text-xs space-y-1">
                          {line.workLine && <p><strong>작업라인:</strong> {line.workLine}</p>}
                          {line.lineSpeed && <p><strong>라인속도:</strong> {line.lineSpeed} rpm</p>}
                          {line.lineConditions && line.lineConditions.length > 0 && (
                            <div>
                              <p><strong>라인조건(I.R):</strong></p>
                              {line.lineConditions.map((condition, condIdx) => (
                                <p key={condIdx} className="ml-2">
                                  {condition.type}: {condition.value}℃
                                </p>
                              ))}
                            </div>
                          )}
                          {line.lampUsage && line.lampUsage.length > 0 && (
                            <p><strong>램프사용:</strong> {line.lampUsage.join(', ')}번</p>
                          )}
                        </div>
                      ))}
                    </dd>
                  </div>
                )}

                {/* 신뢰성 테스트 결과 */}
                {inspection.reliabilityTestResult && (
                  <div className="col-span-2 space-y-1">
                    <dt className="text-sm font-medium text-muted-foreground">신뢰성 테스트 결과</dt>
                    <dd className="text-sm text-foreground">
                      {isTestResultDetail(inspection.reliabilityTestResult) ? (
                        <>
                          {inspection.reliabilityTestResult.result}
                          {inspection.reliabilityTestResult.action && ` (처리: ${inspection.reliabilityTestResult.action})`}
                          {inspection.reliabilityTestResult.decisionMaker && ` (결정자: ${inspection.reliabilityTestResult.decisionMaker})`}
                        </>
                      ) : (
                        String(inspection.reliabilityTestResult)
                      )}
                    </dd>
                  </div>
                )}

                {/* 색상 체크 결과 */}
                {inspection.colorCheckResult && (
                  <div className="col-span-2 space-y-1">
                    <dt className="text-sm font-medium text-muted-foreground">색상 체크 결과</dt>
                    <dd className="text-sm text-foreground">
                      {isTestResultDetail(inspection.colorCheckResult) ? (
                        <>
                          {inspection.colorCheckResult.result}
                          {inspection.colorCheckResult.action && ` (처리: ${inspection.colorCheckResult.action})`}
                          {inspection.colorCheckResult.decisionMaker && ` (결정자: ${inspection.colorCheckResult.decisionMaker})`}
                        </>
                      ) : (
                        String(inspection.colorCheckResult)
                      )}
                    </dd>
                  </div>
                )}

                {renderField('사출포장', inspection.injectionPackaging)}
                {renderField('후가공포장', inspection.postProcessPackaging)}
              </>
            )}
            
            {/* 출하검사 전용 필드 */}
            {inspection.inspectionType === 'outgoing' && (
              <>
                {renderField('작업라인', inspection.workLine)}
                {renderField('재검사요청 키워드', inspection.reinspectionKeyword)}
                {renderField('재검사요청 내용', inspection.reinspectionContent)}
                
                {/* 불량키워드 & 검사결과 세트 */}
                {inspection.defectResultPairs && inspection.defectResultPairs.length > 0 && (
                  <div className="col-span-2 space-y-2">
                    <dt className="text-sm font-medium text-muted-foreground">불량키워드 & 검사결과</dt>
                    <dd className="space-y-2">
                      {inspection.defectResultPairs.map((pair, idx) => {
                        if (!isDefectResultPair(pair)) return null;
                        return (
                          <div key={idx} className="p-3 bg-muted rounded-md text-xs space-y-1">
                            <p><strong>불량키워드:</strong> {pair.defectKeyword}</p>
                            <p><strong>검사결과:</strong> {pair.inspectionResult}</p>
                            {pair.inspectionResult === '한도승인' && (
                              <>
                                {pair.limitApprovalContent && <p><strong>한도승인 내용:</strong> {pair.limitApprovalContent}</p>}
                                {pair.limitApprovalDecisionMaker && <p><strong>한도결정자:</strong> {pair.limitApprovalDecisionMaker}</p>}
                              </>
                            )}
                          </div>
                        );
                      })}
                    </dd>
                  </div>
                )}
                
                {renderField('작업자 인원수', inspection.workerCount ? `${inspection.workerCount}명` : undefined)}
                {renderField('사출포장', inspection.injectionPackaging)}
                {renderField('후가공포장', inspection.postProcessPackaging)}
                
                {/* 작업자별 검사 결과 */}
                {inspection.workers && inspection.workers.length > 0 && (
                  <div className="col-span-2 space-y-2">
                    <dt className="text-sm font-medium text-muted-foreground">작업자별 검사 결과</dt>
                    <dd className="space-y-2">
                      {inspection.workers.map((worker, idx) => (
                        <div key={idx} className="p-3 bg-muted rounded-md text-xs space-y-1">
                          <p><strong>작업자:</strong> {worker.name}</p>
                          <div className="grid grid-cols-2 gap-2">
                            <p><strong>총 검사 수량:</strong> {worker.totalInspected ? worker.totalInspected.toLocaleString() : '0'} ea</p>
                            <p><strong>불량 수량:</strong> {worker.defectQuantity ? worker.defectQuantity.toLocaleString() : '0'} ea</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <strong>결과:</strong>
                            <Badge 
                              variant="outline" 
                              className={worker.result === '합격' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'}
                            >
                              {worker.result}
                            </Badge>
                          </div>
                          {worker.defectReasons && worker.defectReasons.length > 0 && (
                            <p><strong>불량 사유:</strong> {worker.defectReasons.join(', ')}</p>
                          )}
                          {worker.result === '불합격' && worker.action && (
                            <p><strong>처리:</strong> {worker.action}</p>
                          )}
                          {worker.result === '불합격' && worker.decisionMaker && (
                            <p><strong>결정자:</strong> {worker.decisionMaker}</p>
                          )}
                          {worker.directInputResult && (
                            <div className="mt-2 pt-2 border-t">
                              <p><strong>직접 입력 결과:</strong></p>
                              <p className="mt-1 whitespace-pre-wrap">{worker.directInputResult}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </dd>
                  </div>
                )}
                
                {/* 신뢰성 테스트 */}
                {inspection.reliabilityReview && (
                  <div className="col-span-2 space-y-1">
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
                images={filterValidImageURLs(inspection.imageUrls || [])}
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
  // 오래된 검사(마지막 index)는 펼쳐진 상태, 나머지는 접힌 상태
  const isCollapsedState = isCollapsed;
  
  return (
    <Card key={inspection.id} className="mb-4">
      <Collapsible 
        open={!isCollapsedState} 
        onOpenChange={() => onToggle(inspection.id)}
      >
        <CollapsibleTrigger asChild>
          <CardHeader className={`pb-3 cursor-pointer xl:hover:bg-muted/50 transition-colors ${
            isCollapsedState ? 'rounded-lg' : 'rounded-t-lg'
          }`}>
            <div className="flex justify-between items-start">
              <CardTitle className="text-base flex items-center gap-2">
                <span>검사 #{totalCount - index}</span>
                {isCollapsedState ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </CardTitle>
              <div className="flex gap-2">
                {/* 수입검사만 결과 뱃지 표시 */}
                {inspection.inspectionType === 'incoming' && (
                  <Badge className={cn(INSPECTION_RESULT_COLORS[inspection.result])}>
                    {inspection.result}
                  </Badge>
                )}
                <Badge className={cn(INSPECTION_TYPE_COLORS[inspection.inspectionType])}>
                  {inspection.inspectionType === 'incoming' ? '수입' :
                   inspection.inspectionType === 'inProcess' ? '공정' : '출하'}
                </Badge>
                
                {/* 수정/삭제 버튼 */}
                {canEdit(inspection) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit?.(inspection);
                    }}
                    className="h-6 px-2 text-xs bg-blue-500 text-white hover:bg-blue-600"
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    수정
                  </Button>
                )}
                
                {canDelete(inspection) && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      const confirmed = window.confirm('정말로 이 품질검사를 삭제하시겠습니까?');
                      if (confirmed) {
                        onDelete?.(inspection);
                      }
                    }}
                    className="h-6 px-2 text-xs bg-red-500 text-white hover:bg-red-600"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    삭제
                  </Button>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              검사일시: {formatDate(inspection.inspectionDate || inspection.createdAt)}
            </p>
            <p className="text-xs text-muted-foreground">
              검사자: {typeof inspection.inspector === 'string' 
                ? inspection.inspector 
                : (inspection.inspector as { displayName?: string })?.displayName || '알 수 없음'}
            </p>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4">
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
                <div className="col-span-2 space-y-2">
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
                  {renderField('사출포장', inspection.packagingInfo)}
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
              {inspection.inspectionType === 'inProcess' && (
                <>
                  {renderField('작업라인', inspection.workLine)}
                  {renderField('사용지그-1', inspection.jigUsed1)}
                  {renderField('사용지그-2', inspection.jigUsed2)}
                  {renderField('내부코팅 사용지그 (하측지그)', inspection.internalJigLower)}
                  {renderField('내부코팅 사용지그 (상측지그)', inspection.internalJigUpper)}
                  {renderField('드라이기사용', inspection.dryerUsed)}
                  {renderField('화염처리진행', inspection.flameTreatment)}
                  {renderField('사전검사이력', inspection.preInspectionHistory)}
                  {renderField('공정검사이력', inspection.inProcessInspectionHistory)}
                  
                  {/* 공정 라인 정보 */}
                  {inspection.processLines && inspection.processLines.length > 0 && (
                    <div className="col-span-2 space-y-2">
                      <dt className="text-sm font-medium text-muted-foreground">공정 라인 정보</dt>
                      <dd className="space-y-2">
                        {inspection.processLines.map((line, idx) => (
                          <div key={idx} className="p-3 bg-muted rounded-md text-xs space-y-1">
                            {line.workLine && <p><strong>작업라인:</strong> {line.workLine}</p>}
                            {line.lineSpeed && <p><strong>라인속도:</strong> {line.lineSpeed} rpm</p>}
                            {line.lineConditions && line.lineConditions.length > 0 && (
                              <div>
                                <p><strong>라인조건(I.R):</strong></p>
                                {line.lineConditions.map((condition, condIdx) => (
                                  <p key={condIdx} className="ml-2">
                                    {condition.type}: {condition.value}℃
                                  </p>
                                ))}
                              </div>
                            )}
                            {line.lampUsage && line.lampUsage.length > 0 && (
                              <p><strong>램프사용:</strong> {line.lampUsage.join(', ')}번</p>
                            )}
                          </div>
                        ))}
                      </dd>
                    </div>
                  )}

                  {/* 신뢰성 테스트 결과 */}
                  {inspection.reliabilityTestResult && (
                    <div className="col-span-2 space-y-1">
                      <dt className="text-sm font-medium text-muted-foreground">신뢰성 테스트 결과</dt>
                      <dd className="text-sm text-foreground">
                        {isTestResultDetail(inspection.reliabilityTestResult) ? (
                          <>
                            {inspection.reliabilityTestResult.result}
                            {inspection.reliabilityTestResult.action && ` (처리: ${inspection.reliabilityTestResult.action})`}
                            {inspection.reliabilityTestResult.decisionMaker && ` (결정자: ${inspection.reliabilityTestResult.decisionMaker})`}
                          </>
                        ) : (
                          String(inspection.reliabilityTestResult)
                        )}
                      </dd>
                    </div>
                  )}

                  {/* 색상 체크 결과 */}
                  {inspection.colorCheckResult && (
                    <div className="col-span-2 space-y-1">
                      <dt className="text-sm font-medium text-muted-foreground">색상 체크 결과</dt>
                      <dd className="text-sm text-foreground">
                        {isTestResultDetail(inspection.colorCheckResult) ? (
                          <>
                            {inspection.colorCheckResult.result}
                            {inspection.colorCheckResult.action && ` (처리: ${inspection.colorCheckResult.action})`}
                            {inspection.colorCheckResult.decisionMaker && ` (결정자: ${inspection.colorCheckResult.decisionMaker})`}
                          </>
                        ) : (
                          String(inspection.colorCheckResult)
                        )}
                      </dd>
                    </div>
                  )}

                  {renderField('사출포장', inspection.injectionPackaging)}
                  {renderField('후가공포장', inspection.postProcessPackaging)}
                </>
              )}
              
              {/* 출하검사 전용 필드 */}
              {inspection.inspectionType === 'outgoing' && (
                <>
                  {renderField('작업라인', inspection.workLine)}
                  {renderField('재검사요청 키워드', inspection.reinspectionKeyword)}
                  {renderField('재검사요청 내용', inspection.reinspectionContent)}
                  
                  {/* 불량키워드 & 검사결과 세트 */}
                  {inspection.defectResultPairs && inspection.defectResultPairs.length > 0 && (
                    <div className="col-span-2 space-y-2">
                      <dt className="text-sm font-medium text-muted-foreground">불량키워드 & 검사결과</dt>
                      <dd className="space-y-2">
                        {inspection.defectResultPairs.map((pair, idx) => {
                          if (!isDefectResultPair(pair)) return null;
                          return (
                            <div key={idx} className="p-3 bg-muted rounded-md text-xs space-y-1">
                              <p><strong>불량키워드:</strong> {pair.defectKeyword}</p>
                              <p><strong>검사결과:</strong> {pair.inspectionResult}</p>
                              {pair.inspectionResult === '한도승인' && (
                                <>
                                  {pair.limitApprovalContent && <p><strong>한도승인 내용:</strong> {pair.limitApprovalContent}</p>}
                                  {pair.limitApprovalDecisionMaker && <p><strong>한도결정자:</strong> {pair.limitApprovalDecisionMaker}</p>}
                                </>
                              )}
                            </div>
                          );
                        })}
                      </dd>
                    </div>
                  )}
                  
                  {renderField('작업자 인원수', inspection.workerCount ? `${inspection.workerCount}명` : undefined)}
                  {renderField('사출포장', inspection.injectionPackaging)}
                  {renderField('후가공포장', inspection.postProcessPackaging)}
                  
                  {/* 작업자별 검사 결과 */}
                  {inspection.workers && inspection.workers.length > 0 && (
                    <div className="col-span-2 space-y-2">
                      <dt className="text-sm font-medium text-muted-foreground">작업자별 검사 결과</dt>
                      <dd className="space-y-2">
                        {inspection.workers.map((worker, idx) => (
                          <div key={idx} className="p-3 bg-muted rounded-md text-xs space-y-1">
                            <p><strong>작업자:</strong> {worker.name}</p>
                            <div className="grid grid-cols-2 gap-2">
                              <p><strong>총 검사 수량:</strong> {worker.totalInspected ? worker.totalInspected.toLocaleString() : '0'} ea</p>
                              <p><strong>불량 수량:</strong> {worker.defectQuantity ? worker.defectQuantity.toLocaleString() : '0'} ea</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <strong>결과:</strong>
                              <Badge 
                                variant="outline" 
                                className={worker.result === '합격' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'}
                              >
                                {worker.result}
                              </Badge>
                            </div>
                            {worker.defectReasons && worker.defectReasons.length > 0 && (
                              <p><strong>불량 사유:</strong> {worker.defectReasons.join(', ')}</p>
                            )}
                            {worker.result === '불합격' && worker.action && (
                              <p><strong>처리:</strong> {worker.action}</p>
                            )}
                            {worker.result === '불합격' && worker.decisionMaker && (
                              <p><strong>결정자:</strong> {worker.decisionMaker}</p>
                            )}
                            {worker.directInputResult && (
                              <div className="mt-2 pt-2 border-t">
                                <p><strong>직접 입력 결과:</strong></p>
                                <p className="mt-1 whitespace-pre-wrap">{worker.directInputResult}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </dd>
                    </div>
                  )}
                  
                  {/* 신뢰성 테스트 */}
                  {inspection.reliabilityReview && (
                    <div className="col-span-2 space-y-1">
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
                  images={filterValidImageURLs(inspection.imageUrls || [])}
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
});

InspectionCard.displayName = 'InspectionCard';

