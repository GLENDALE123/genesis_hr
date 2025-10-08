'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { PackagingReport } from '@/features/production/types';

interface ProcessConditionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: PackagingReport | null;
  onSave: (reportId: string, conditions: PackagingReport['processConditions']) => Promise<void>;
  canManage: boolean;
}

export const ProcessConditionsModal: React.FC<ProcessConditionsModalProps> = ({
  isOpen,
  onClose,
  report,
  onSave,
  canManage
}) => {
  const [conditionsData, setConditionsData] = useState<NonNullable<PackagingReport['processConditions']>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (report) {
      setConditionsData(report.processConditions || {});
    }
  }, [report]);

  const handleChange = (
    coat: 'undercoat' | 'midcoat' | 'topcoat',
    field: 'conditions' | 'remarks',
    value: string
  ) => {
    setConditionsData(prev => ({
      ...prev,
      [coat]: {
        ...(prev[coat] || { conditions: '', remarks: '' }),
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    if (!report) return;
    
    setIsSaving(true);
    try {
      await onSave(report.id, conditionsData);
      onClose();
    } catch (error) {
      console.error('공정조건 저장 실패:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!report) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{report.productName} 공정 조건</DialogTitle>
          <DialogDescription>
            제품: {report.productName} {report.partName && `/ ${report.partName}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 하도 */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">하도</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="undercoat-conditions" className="text-sm font-medium">
                  작업조건
                </Label>
                <Textarea
                  id="undercoat-conditions"
                  value={conditionsData.undercoat?.conditions || ''}
                  onChange={(e) => handleChange('undercoat', 'conditions', e.target.value)}
                  disabled={!canManage}
                  rows={4}
                  className="mt-1 w-full"
                  placeholder="하도 작업조건을 입력하세요"
                />
              </div>
              <div>
                <Label htmlFor="undercoat-remarks" className="text-sm font-medium">
                  특이사항
                </Label>
                <Textarea
                  id="undercoat-remarks"
                  value={conditionsData.undercoat?.remarks || ''}
                  onChange={(e) => handleChange('undercoat', 'remarks', e.target.value)}
                  disabled={!canManage}
                  rows={4}
                  className="mt-1 w-full"
                  placeholder="하도 특이사항을 입력하세요"
                />
              </div>
            </div>
          </div>

          {/* 중도 */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">중도</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="midcoat-conditions" className="text-sm font-medium">
                  작업조건
                </Label>
                <Textarea
                  id="midcoat-conditions"
                  value={conditionsData.midcoat?.conditions || ''}
                  onChange={(e) => handleChange('midcoat', 'conditions', e.target.value)}
                  disabled={!canManage}
                  rows={4}
                  className="mt-1 w-full"
                  placeholder="중도 작업조건을 입력하세요"
                />
              </div>
              <div>
                <Label htmlFor="midcoat-remarks" className="text-sm font-medium">
                  특이사항
                </Label>
                <Textarea
                  id="midcoat-remarks"
                  value={conditionsData.midcoat?.remarks || ''}
                  onChange={(e) => handleChange('midcoat', 'remarks', e.target.value)}
                  disabled={!canManage}
                  rows={4}
                  className="mt-1 w-full"
                  placeholder="중도 특이사항을 입력하세요"
                />
              </div>
            </div>
          </div>

          {/* 상도 */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">상도</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="topcoat-conditions" className="text-sm font-medium">
                  작업조건
                </Label>
                <Textarea
                  id="topcoat-conditions"
                  value={conditionsData.topcoat?.conditions || ''}
                  onChange={(e) => handleChange('topcoat', 'conditions', e.target.value)}
                  disabled={!canManage}
                  rows={4}
                  className="mt-1 w-full"
                  placeholder="상도 작업조건을 입력하세요"
                />
              </div>
              <div>
                <Label htmlFor="topcoat-remarks" className="text-sm font-medium">
                  특이사항
                </Label>
                <Textarea
                  id="topcoat-remarks"
                  value={conditionsData.topcoat?.remarks || ''}
                  onChange={(e) => handleChange('topcoat', 'remarks', e.target.value)}
                  disabled={!canManage}
                  rows={4}
                  className="mt-1 w-full"
                  placeholder="상도 특이사항을 입력하세요"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            취소
          </Button>
          {canManage && (
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? '저장 중...' : '저장하기'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

