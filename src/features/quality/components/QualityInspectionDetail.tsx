'use client';

import React, { useState, useMemo, useEffect, memo } from 'react';
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
import { useAuthStore } from '@/features/auth/store/authStore';
import { Button } from '@/shared/components/ui/button';
import { Edit, Trash2, Plus } from 'lucide-react';
import { filterValidImageURLs } from '@/shared/utils/imagePathMigration';
import { useQualityInspections } from '../hooks/useQualityInspections';
import { QualityInspectionForm } from './QualityInspectionForm';

interface QualityInspectionDetailProps {
  group: GroupedInspectionData | null;
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'incoming' | 'inProcess' | 'outgoing';
  // 수정/삭제 관련 props 추가
  onEditInspection?: (inspection: QualityInspection) => void;
  onDeleteInspection?: (inspection: QualityInspection) => void;
  // 추가입력 관련 props 추가
  onCreateInspection?: (inspection: Omit<QualityInspection, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  // 강제 리렌더링용
  refreshTrigger?: number;
}

/**
 * 품질검사 상세 모달 컴포넌트
 * - 발주번호별 그룹화된 모든 검사 정보 표시
 * - 수입/공정/출하 검사를 탭으로 구분
 * - 이미지 갤러리 (ImageGalleryGrid 활용)
 */
const QualityInspectionDetailComponent: React.FC<QualityInspectionDetailProps> = ({
  group,
  isOpen,
  onClose,
  initialTab,
  onEditInspection,
  onDeleteInspection,
  onCreateInspection,
  refreshTrigger
}) => {
  const { user, userProfile } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'incoming' | 'inProcess' | 'outgoing'>(initialTab || 'incoming');
  const [collapsedInspections, setCollapsedInspections] = useState<{
    [key: string]: boolean;
  }>({});
  
  // 추가입력 모달 상태
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // 실시간 구독으로 최신 데이터 가져오기
  const { filteredGroupedInspections } = useQualityInspections({
    searchTerm: '' // 전체 데이터 구독
  });

  // 현재 그룹의 최신 데이터 찾기
  const currentGroup = useMemo(() => {
    if (!group) return null;
    
    // 실시간 구독된 데이터에서 현재 그룹과 같은 발주번호 찾기
    const latestGroup = filteredGroupedInspections.find(g => g.orderNumber === group.orderNumber);
    
    if (latestGroup) {
      // 삭제된 항목이 있는 경우 빈 배열로 필터링하여 UI에서 즉시 제거
      return {
        ...latestGroup,
        incoming: latestGroup.incoming || [],
        inProcess: latestGroup.inProcess || [],
        outgoing: latestGroup.outgoing || []
      };
    }
    
    return group;
  }, [group, filteredGroupedInspections]);

  // group이 변경될 때 activeTab 초기화
  useEffect(() => {
    if (currentGroup && initialTab) {
      setActiveTab(initialTab);
    }
  }, [currentGroup, initialTab]);

  // refreshTrigger가 변경될 때 강제 리렌더링
  useEffect(() => {
    if (refreshTrigger !== undefined) {
      // 강제 리렌더링 트리거
    }
  }, [refreshTrigger]);

  // 현재 활성 탭에 데이터가 없으면 다른 탭으로 자동 전환
  useEffect(() => {
    if (!currentGroup) return;
    
    const currentTabData = currentGroup[activeTab] || [];
    if (currentTabData.length === 0) {
      // 현재 탭에 데이터가 없으면 다른 탭으로 전환
      if (currentGroup.incoming.length > 0) {
        setActiveTab('incoming');
      } else if (currentGroup.inProcess.length > 0) {
        setActiveTab('inProcess');
      } else if (currentGroup.outgoing.length > 0) {
        setActiveTab('outgoing');
      }
    }
  }, [currentGroup, activeTab]);

  // 권한 체크 함수들
  const canEdit = (inspection: QualityInspection) => {
    if (!user || !inspection) return false;
    // 작성자 본인이거나 Admin 권한이 있는 경우
    return inspection.createdBy === user.uid || userProfile?.role === 'Admin';
  };
  
  const canDelete = (inspection: QualityInspection) => {
    if (!user || !inspection) return false;
    // Admin 권한이 있는 경우만 삭제 가능
    return userProfile?.role === 'Admin';
  };
  
  const canCreate = () => {
    // user가 존재하면 생성 가능 (Admin 불필요)
    return !!user;
  };
  
  // 기본정보 추출 함수
  const getCommonFieldsForNewInspection = () => {
    if (!currentGroup?.common) return {};
    
    return {
      orderNumber: currentGroup.common.orderNumber,
      supplier: currentGroup.common.supplier,
      productName: currentGroup.common.productName,
      partName: currentGroup.common.partName,
      orderQuantity: currentGroup.common.orderQuantity,
      specification: currentGroup.common.specification,
      postProcess: currentGroup.common.postProcess,
      injectionMaterial: currentGroup.common.injectionMaterial,
      injectionColor: currentGroup.common.injectionColor,
      // injectionCompany: currentGroup.common.injectionCompany, // 속성이 없으므로 제거
      // 이미지는 포함하지 않음 (사용자가 새로 업로드)
    };
  };
  
  // 추가입력 버튼 클릭 핸들러
  const handleAddInspection = () => {
    setIsAddModalOpen(true);
  };
  
  // 추가입력 모달 닫기 핸들러
  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
  };
  
  // 추가입력 완료 핸들러
  const handleAddInspectionSubmit = async (inspection: Omit<QualityInspection, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    if (onCreateInspection) {
      const result = await onCreateInspection(inspection);
      setIsAddModalOpen(false);
      return result;
    }
    return '';
  };

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

  // 개별 검사 토글 함수
  const toggleInspection = (inspectionId: string) => {
    setCollapsedInspections(prev => ({
      ...prev,
      [inspectionId]: !prev[inspectionId]
    }));
  };


  // 검사 데이터를 오래된순으로 정렬하는 함수 (오래된 것이 먼저)
  const sortInspectionsByDate = (inspections: QualityInspection[]) => {
    return [...inspections].sort((a, b) => {
      const dateA = a.inspectionDate || a.createdAt;
      const dateB = b.inspectionDate || b.createdAt;
      return new Date(dateA).getTime() - new Date(dateB).getTime();
    });
  };

  // 탭별 검사 데이터 (날짜순 정렬)
  const tabData = useMemo(() => {
    if (!currentGroup) return { incoming: [], inProcess: [], outgoing: [] };
    return {
      incoming: sortInspectionsByDate(currentGroup.incoming),
      inProcess: sortInspectionsByDate(currentGroup.inProcess),
      outgoing: sortInspectionsByDate(currentGroup.outgoing)
    };
  }, [currentGroup]);

  // 모달이 열릴 때마다 최신 검사 상태 초기화
  useEffect(() => {
    if (isOpen && currentGroup && tabData) {
      // 초기 탭 설정
      if (initialTab) {
        setActiveTab(initialTab);
      }
      
      // 모든 검사 타입의 마지막 검사(오래된 검사)를 펼쳐진 상태로 설정
      const oldestInspections: string[] = [];
      
      if (tabData.incoming.length > 0) {
        oldestInspections.push(tabData.incoming[tabData.incoming.length - 1].id);
      }
      if (tabData.inProcess.length > 0) {
        oldestInspections.push(tabData.inProcess[tabData.inProcess.length - 1].id);
      }
      if (tabData.outgoing.length > 0) {
        oldestInspections.push(tabData.outgoing[tabData.outgoing.length - 1].id);
      }

      // 오래된 검사들을 펼쳐진 상태로 설정
      const newState: { [key: string]: boolean } = {};
      oldestInspections.forEach(id => {
        newState[id] = false; // false = 펼쳐진 상태
      });
      
      setCollapsedInspections(prev => ({
        ...prev,
        ...newState
      }));
    }
  }, [isOpen, currentGroup, tabData, initialTab]);

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
                      onEditInspection?.(inspection);
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
                        onDeleteInspection?.(inspection);
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
                  <div className="md:col-span-2 space-y-2">
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
              </>
            )}
            
            {/* 출하검사 전용 필드 */}
            {inspection.inspectionType === 'outgoing' && (
              <>
                {console.log('출하검사 workerCount:', inspection.workerCount)}
                {renderField('작업자 인원수', inspection.workerCount ? `${inspection.workerCount}명` : undefined)}
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
    const isCollapsed = collapsedInspections[inspection.id] ?? (index !== totalCount - 1);
    
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
                        onEditInspection?.(inspection);
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
                          onDeleteInspection?.(inspection);
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
                      <div className="md:col-span-2 space-y-2">
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
                  </>
                )}
                
                {/* 출하검사 전용 필드 */}
                {inspection.inspectionType === 'outgoing' && (
                  <>
                    {console.log('출하검사 workerCount (모바일):', inspection.workerCount)}
                    {renderField('작업자 인원수', inspection.workerCount ? `${inspection.workerCount}명` : undefined)}
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
  };

  if (!group) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent 
          className="w-[90vw] max-w-7xl h-[90vh] overflow-hidden flex flex-col"
          stickyHeader={
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <div>
                  <span className="font-bold">{currentGroup?.common.productName}</span>
                  <span className="text-sm text-muted-foreground ml-2">
                    ({currentGroup?.common.orderNumber})
                  </span>
                </div>
                {/* 추가입력 버튼 */}
                {canCreate() && (
                  <Button
                    onClick={handleAddInspection}
                    size="sm"
                    className="flex items-center gap-2 mr-4"
                  >
                    <Plus className="h-4 w-4" />
                    추가입력
                  </Button>
                )}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-2">
                발주처: {currentGroup?.common.supplier} | 부속명: {currentGroup?.common.partName}
              </DialogDescription>
              
              {/* 탭 네비게이션 */}
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'incoming' | 'inProcess' | 'outgoing')} className="mt-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="incoming" className="relative">
                    수입검사
                    {tabData.incoming.length > 0 && (
                      <Badge className="ml-2 h-5 min-w-5 flex items-center justify-center" variant="secondary">
                        {tabData.incoming.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="inProcess" className="relative">
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
            {currentGroup?.common.productName} ({currentGroup?.common.orderNumber}) 품질검사 상세
          </DialogTitle>
          <DialogDescription className="sr-only">
            발주처: {currentGroup?.common.supplier}, 부속명: {currentGroup?.common.partName}의 품질검사 상세 정보를 확인할 수 있습니다.
          </DialogDescription>

          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'incoming' | 'inProcess' | 'outgoing')} className="flex-1 flex flex-col min-h-0">
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

              <TabsContent value="inProcess" className="mt-0">
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
      
      {/* 추가입력 모달 */}
      <QualityInspectionForm
        isOpen={isAddModalOpen}
        onClose={handleCloseAddModal}
        onSubmit={handleAddInspectionSubmit}
        mode="create"
        initialTab={activeTab}
        initialData={getCommonFieldsForNewInspection()}
      />
    </>
  );
};

// 메모이제이션 적용
export const QualityInspectionDetail = memo(QualityInspectionDetailComponent);

