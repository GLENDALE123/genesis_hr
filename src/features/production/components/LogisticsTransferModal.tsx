'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { PackagingReport } from '@/features/production/types';

interface LogisticsTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedReports: PackagingReport[];
  onConfirm: (data: LogisticsTransferData[]) => void;
}

export interface LogisticsTransferData {
  reportId: string;
  destination: string;
  details: string;
}

export const LogisticsTransferModal: React.FC<LogisticsTransferModalProps> = ({
  isOpen,
  onClose,
  selectedReports,
  onConfirm
}) => {
  const [transferData, setTransferData] = useState<Record<string, { destination: string; details: string }>>({});

  const handleChange = (reportId: string, field: 'destination' | 'details', value: string) => {
    setTransferData(prev => ({
      ...prev,
      [reportId]: {
        ...prev[reportId],
        destination: prev[reportId]?.destination || '',
        details: prev[reportId]?.details || '',
        [field]: value
      }
    }));
  };

  const handleConfirm = () => {
    const data: LogisticsTransferData[] = selectedReports.map(report => ({
      reportId: report.id,
      destination: transferData[report.id]?.destination || '',
      details: transferData[report.id]?.details || ''
    }));
    onConfirm(data);
  };

  const handleClose = () => {
    setTransferData({});
    onClose();
  };

  const totalQuantity = selectedReports.reduce((sum, report) => sum + (report.goodQuantity || 0), 0);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>물류 이동 리포트 생성</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6">
          <h3 className="text-lg font-bold mb-4">
            선택된 생산일보 목록 ({selectedReports.length}건)
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] text-sm border-collapse">
              <thead className="sticky top-0 bg-background z-10">
                <tr className="border-b">
                  <th className="p-2 text-left font-semibold text-muted-foreground">발주번호</th>
                  <th className="p-2 text-left font-semibold text-muted-foreground">발주처</th>
                  <th className="p-2 text-left font-semibold text-muted-foreground">제품명/부속명</th>
                  <th className="p-2 text-left font-semibold text-muted-foreground">사양</th>
                  <th className="p-2 text-right font-semibold text-muted-foreground">양품수량</th>
                  <th className="p-2 text-right font-semibold text-muted-foreground">포장단위</th>
                  <th className="p-2 text-right font-semibold text-muted-foreground">박스수량</th>
                  <th className="p-2 text-right font-semibold text-muted-foreground">잔량</th>
                  <th className="p-2 text-left font-semibold text-muted-foreground">도착처</th>
                  <th className="p-2 text-left font-semibold text-muted-foreground w-1/4">추가 요청 내용</th>
                </tr>
              </thead>
              <tbody>
                {selectedReports.map(report => (
                  <tr key={report.id} className="border-t hover:bg-muted/50">
                    <td className="p-2 font-mono text-xs">
                      {report.orderNumbers?.join(', ') || '-'}
                    </td>
                    <td className="p-2">{report.supplier}</td>
                    <td className="p-2 font-semibold">
                      {report.productName} / {report.partName}
                    </td>
                    <td className="p-2">{report.specification || '-'}</td>
                    <td className="p-2 text-right font-medium text-green-600">
                      {report.goodQuantity?.toLocaleString() || 0}
                    </td>
                    <td className="p-2 text-right">
                      {report.packagingUnit?.toLocaleString() || '-'}
                    </td>
                    <td className="p-2 text-right">
                      {report.boxCount?.toLocaleString() || '-'}
                    </td>
                    <td className="p-2 text-right">
                      {report.remainder?.toLocaleString() || '-'}
                    </td>
                    <td className="p-2">
                      <Input
                        type="text"
                        value={transferData[report.id]?.destination || ''}
                        onChange={(e) => handleChange(report.id, 'destination', e.target.value)}
                        placeholder="도착처 입력"
                        className="w-full"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="text"
                        value={transferData[report.id]?.details || ''}
                        onChange={(e) => handleChange(report.id, 'details', e.target.value)}
                        placeholder="추가 요청사항 입력"
                        className="w-full"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <DialogFooter className="border-t pt-4 bg-background">
          <div className="flex justify-between items-center w-full">
            <div className="text-lg font-bold">
              총 수량: <span className="text-primary">{totalQuantity.toLocaleString()}</span> EA
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose}>
                취소
              </Button>
              <Button onClick={handleConfirm}>
                리포트 생성
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

