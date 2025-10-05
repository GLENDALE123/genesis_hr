'use client';

import React, { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { 
  Plus, 
  Download, 
  Upload
} from 'lucide-react';
import { ProductionReportList } from '@/features/production/components/ProductionReportList';
import { ProductionReportForm } from '@/features/production/components/ProductionReportForm';
import { useProductionReports } from '@/features/production/hooks/useProductionReports';
import { PackagingReport } from '@/features/production/types';

export default function ProductionDailyReportPage() {
  const [selectedReport, setSelectedReport] = useState<PackagingReport | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const {
    reports,
    loading,
    error,
    createReport,
    updateReport,
    deleteReport,
    refreshReports
  } = useProductionReports();

  const handleCreateReport = () => {
    setSelectedReport(null);
    setIsEditMode(false);
    setIsFormOpen(true);
  };

  const handleEditReport = (report: PackagingReport) => {
    setSelectedReport(report);
    setIsEditMode(true);
    setIsFormOpen(true);
  };

  const handleDeleteReport = async (reportId: string) => {
    if (confirm('정말로 이 생산일보를 삭제하시겠습니까?')) {
      try {
        await deleteReport(reportId);
      } catch (error) {
        console.error('삭제 실패:', error);
      }
    }
  };

  const handleFormSubmit = async (formData: any) => {
    try {
      if (isEditMode && selectedReport) {
        await updateReport(selectedReport.id, formData);
      } else {
        await createReport(formData);
      }
      setIsFormOpen(false);
      setSelectedReport(null);
      setIsEditMode(false);
    } catch (error) {
      console.error('저장 실패:', error);
    }
  };

  const handleFormCancel = () => {
    setIsFormOpen(false);
    setSelectedReport(null);
    setIsEditMode(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-destructive mb-4">데이터를 불러오는 중 오류가 발생했습니다.</p>
          <Button onClick={refreshReports}>다시 시도</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* 액션 버튼 */}
      <div className="flex items-center justify-end gap-2 flex-shrink-0">
        <Button variant="outline" size="sm">
          <Upload className="h-4 w-4 mr-2" />
          엑셀 업로드
        </Button>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          엑셀 다운로드
        </Button>
        <Button onClick={handleCreateReport}>
          <Plus className="h-4 w-4 mr-2" />
          생산일보 등록
        </Button>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="flex-1 min-h-0">
        {!isFormOpen ? (
          <ProductionReportList
            reports={reports}
            onEdit={handleEditReport}
            onDelete={handleDeleteReport}
            loading={loading}
          />
        ) : (
          <ProductionReportForm
            report={selectedReport}
            isEditMode={isEditMode}
            onSubmit={handleFormSubmit}
            onCancel={handleFormCancel}
          />
        )}
      </div>
    </div>
  );
}
