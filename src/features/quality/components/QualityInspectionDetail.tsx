
import React, { useState, useMemo, useEffect, memo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Badge } from '@/shared/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { GroupedInspectionData, QualityInspection } from '../types';
import { INSPECTION_TYPE_COLORS } from '../constants';
import { useAuthStore } from '@/features/auth/store/authStore';
import { Button } from '@/shared/components/ui/button';
import { Edit, Trash2, Plus } from 'lucide-react';
import { useQualityInspections } from '../hooks/useQualityInspections';
import { QualityInspectionForm } from './QualityInspectionForm';
import { InspectionCard } from './InspectionCard';
import { useDeviceType } from '@/shared/hooks/use-device';
import { useInspectionHistory } from '../hooks/useInspectionHistory';
import { InspectionHistorySummary } from './InspectionHistorySummary';

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
  const { isSmartphone } = useDeviceType();
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
      return latestGroup;
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

  // 권한 체크 함수들
  const canEdit = (inspection: QualityInspection) => {
    if (!user || !inspection) return false;
    // Manager 또는 Admin 권한이 있는 경우 수정 가능
    return userProfile?.role === 'Manager' || userProfile?.role === 'Admin';
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
      
      // 중요한 기본값들 추가 (Firebase undefined 오류 방지)
      reliabilityTestResult: { result: '양호', action: '', decisionMaker: '' },
      colorCheckResult: { result: '견본과 색상동일', action: '', decisionMaker: '' },
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

  // 날짜 포맷팅 (시간 제외)
  const formatDate = (dateString: string) => {
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


  // 검사 데이터를 최신순으로 정렬하는 함수 (최신 것이 먼저)
  const sortInspectionsByDate = (inspections: QualityInspection[]) => {
    return [...inspections].sort((a, b) => {
      const dateA = a.inspectionDate || a.createdAt;
      const dateB = b.inspectionDate || b.createdAt;
      return new Date(dateB).getTime() - new Date(dateA).getTime(); // 최신순 정렬
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

  // AI 이력 분석 훅 (발주처, 제품명, 부속명 기반)
  const {
    inspections: historyInspections,
    summary: historySummary,
    isLoading: isHistoryLoading,
    isAnalyzing: isHistoryAnalyzing
  } = useInspectionHistory({
    supplier: currentGroup?.common.supplier || '',
    productName: currentGroup?.common.productName || '',
    partName: currentGroup?.common.partName || '',
    enabled: isOpen && !!currentGroup // 모달이 열려있고 그룹이 있을 때만 활성화
  });

  // 모달이 열릴 때마다 최신 검사 상태 초기화
  useEffect(() => {
    if (isOpen && currentGroup && tabData) {
      // 초기 탭 설정
      if (initialTab) {
        setActiveTab(initialTab);
      }
      
      // 모든 검사 타입의 첫 번째 검사(최신 검사)를 펼쳐진 상태로 설정
      const latestInspections: string[] = [];
      
      if (tabData.incoming.length > 0) {
        latestInspections.push(tabData.incoming[0].id);
      }
      if (tabData.inProcess.length > 0) {
        latestInspections.push(tabData.inProcess[0].id);
      }
      if (tabData.outgoing.length > 0) {
        latestInspections.push(tabData.outgoing[0].id);
      }

      // 최신 검사들을 펼쳐진 상태로 설정
      const newState: { [key: string]: boolean } = {};
      latestInspections.forEach(id => {
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

  // renderInspectionCard 함수를 InspectionCard 컴포넌트로 교체

  if (!group) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent 
          className={isSmartphone ? "overflow-hidden flex flex-col" : "w-[90vw] max-w-7xl h-[90vh] overflow-hidden flex flex-col"}
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
            {/* 데스크톱: 1:2 분할 레이아웃 (좌측: AI 분석, 우측: 검사 목록) */}
            {!isSmartphone ? (
              <div className="flex-1 flex gap-4 mt-2 min-h-0">
                {/* 좌측: AI 이력 분석 (33%) */}
                <div className="w-1/3 border-r pr-4 overflow-hidden">
                  <InspectionHistorySummary
                    inspections={historyInspections}
                    summary={historySummary}
                    isLoading={isHistoryLoading}
                    isAnalyzing={isHistoryAnalyzing}
                    supplier={currentGroup?.common.supplier}
                    productName={currentGroup?.common.productName}
                    partName={currentGroup?.common.partName}
                    onInspectionClick={(inspection) => {
                      // 이력 클릭 시 해당 검사로 스크롤하거나 상세 보기
                      // 필요시 구현
                    }}
                  />
                </div>
                
                {/* 우측: 검사 목록 (67%) */}
                <div className="flex-1 overflow-auto">
                  <TabsContent value="incoming" className="mt-0">
                {tabData.incoming.length > 0 ? (
                  <div className="space-y-4">
                    {tabData.incoming.map((inspection, index) => (
                      <InspectionCard
                        key={inspection.id}
                        inspection={inspection}
                        index={index}
                        totalCount={tabData.incoming.length}
                        isCollapsed={collapsedInspections[inspection.id] ?? (index !== 0)}
                        onToggle={toggleInspection}
                        onEdit={onEditInspection}
                        onDelete={onDeleteInspection}
                        canEdit={canEdit}
                        canDelete={canDelete}
                        formatDate={formatDate}
                      />
                    ))}
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
                    {tabData.inProcess.map((inspection, index) => (
                      <InspectionCard
                        key={inspection.id}
                        inspection={inspection}
                        index={index}
                        totalCount={tabData.inProcess.length}
                        isCollapsed={collapsedInspections[inspection.id] ?? (index !== 0)}
                        onToggle={toggleInspection}
                        onEdit={onEditInspection}
                        onDelete={onDeleteInspection}
                        canEdit={canEdit}
                        canDelete={canDelete}
                        formatDate={formatDate}
                      />
                    ))}
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
                    {tabData.outgoing.map((inspection, index) => (
                      <InspectionCard
                        key={inspection.id}
                        inspection={inspection}
                        index={index}
                        totalCount={tabData.outgoing.length}
                        isCollapsed={collapsedInspections[inspection.id] ?? (index !== 0)}
                        onToggle={toggleInspection}
                        onEdit={onEditInspection}
                        onDelete={onDeleteInspection}
                        canEdit={canEdit}
                        canDelete={canDelete}
                        formatDate={formatDate}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    출하검사 데이터가 없습니다
                  </div>
                )}
                  </TabsContent>
                </div>
              </div>
            ) : (
              /* 모바일: 기존 레이아웃 유지 */
              <div className="flex-1 overflow-auto mt-2">
                <TabsContent value="incoming" className="mt-0">
                  {tabData.incoming.length > 0 ? (
                    <div className="space-y-4">
                      {tabData.incoming.map((inspection, index) => (
                        <InspectionCard
                          key={inspection.id}
                          inspection={inspection}
                          index={index}
                          totalCount={tabData.incoming.length}
                          isCollapsed={collapsedInspections[inspection.id] ?? (index !== 0)}
                          onToggle={toggleInspection}
                          onEdit={onEditInspection}
                          onDelete={onDeleteInspection}
                          canEdit={canEdit}
                          canDelete={canDelete}
                          formatDate={formatDate}
                        />
                      ))}
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
                      {tabData.inProcess.map((inspection, index) => (
                        <InspectionCard
                          key={inspection.id}
                          inspection={inspection}
                          index={index}
                          totalCount={tabData.inProcess.length}
                          isCollapsed={collapsedInspections[inspection.id] ?? (index !== 0)}
                          onToggle={toggleInspection}
                          onEdit={onEditInspection}
                          onDelete={onDeleteInspection}
                          canEdit={canEdit}
                          canDelete={canDelete}
                          formatDate={formatDate}
                        />
                      ))}
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
                      {tabData.outgoing.map((inspection, index) => (
                        <InspectionCard
                          key={inspection.id}
                          inspection={inspection}
                          index={index}
                          totalCount={tabData.outgoing.length}
                          isCollapsed={collapsedInspections[inspection.id] ?? (index !== 0)}
                          onToggle={toggleInspection}
                          onEdit={onEditInspection}
                          onDelete={onDeleteInspection}
                          canEdit={canEdit}
                          canDelete={canDelete}
                          formatDate={formatDate}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      출하검사 데이터가 없습니다
                    </div>
                  )}
                </TabsContent>
              </div>
            )}
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


