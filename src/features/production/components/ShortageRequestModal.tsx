
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { PackagingReport, ShortageRequest } from '@/features/production/types';
import { AlertCircle } from 'lucide-react';

interface ShortageRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: PackagingReport;
  existingRequest?: ShortageRequest | null;
  onSave: (data: { shortageReason: string; requestedShortageQuantity: number }) => void;
  isSaving: boolean;
}

export const ShortageRequestModal: React.FC<ShortageRequestModalProps> = ({
  isOpen,
  onClose,
  report,
  existingRequest,
  onSave,
  isSaving
}) => {
  const [reason, setReason] = useState('');
  const [quantity, setQuantity] = useState('');
  const [error, setError] = useState('');

  // 모달이 열릴 때 기존 데이터 로드
  useEffect(() => {
    if (isOpen) {
      if (existingRequest) {
        setReason(existingRequest.shortageReason || '');
        setQuantity((existingRequest.requestedShortageQuantity && existingRequest.requestedShortageQuantity.toString()) || '');
      } else {
        setReason('');
        setQuantity('');
      }
      setError('');
    }
  }, [isOpen, existingRequest]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 유효성 검사
    if (!reason.trim()) {
      setError('부족분 사유를 입력해주세요.');
      return;
    }

    const numQuantity = parseInt(quantity, 10);
    if (isNaN(numQuantity) || numQuantity <= 0) {
      setError('유효한 부족 수량을 입력해주세요.');
      return;
    }

    // 저장
    onSave({
      shortageReason: reason.trim(),
      requestedShortageQuantity: numQuantity
    });
  };

  const handleCancel = () => {
    setReason('');
    setQuantity('');
    setError('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {existingRequest ? '부족분 신청 수정' : '부족분 신청'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 생산일보 정보 */}
          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground mb-2">생산일보 정보</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <span className="font-medium text-muted-foreground">작업일자:</span>
                <span className="ml-2">{new Date(report.workDate).toLocaleDateString('ko-KR')}</span>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">생산라인:</span>
                <span className="ml-2">{report.productionLine}</span>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">발주처:</span>
                <span className="ml-2">{report.supplier}</span>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">발주번호:</span>
                <span className="ml-2">{(report.orderNumbers && report.orderNumbers.join(', ')) || '-'}</span>
              </div>
              <div className="col-span-2">
                <span className="font-medium text-muted-foreground">제품명/부속명:</span>
                <span className="ml-2 font-semibold">
                  {report.productName}{report.partName ? ' / ' + report.partName : ''}
                </span>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">사양:</span>
                <span className="ml-2">{report.specification || '-'}</span>
              </div>
            </div>
          </div>

          {/* 생산 수량 정보 */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <h3 className="font-semibold text-sm text-muted-foreground mb-2">생산 수량 정보</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <span className="font-medium text-muted-foreground">발주수량:</span>
                <span className="ml-2">{(report.orderQuantity && report.orderQuantity.toLocaleString()) || '-'}</span>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">투입수량:</span>
                <span className="ml-2">{(report.inputQuantity && report.inputQuantity.toLocaleString()) || '-'}</span>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">양품수량:</span>
                <span className="ml-2 text-green-600 font-semibold">{(report.goodQuantity && report.goodQuantity.toLocaleString()) || '-'}</span>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">불량수량:</span>
                <span className="ml-2 text-red-600 font-semibold">{(report.defectQuantity && report.defectQuantity.toLocaleString()) || '-'}</span>
              </div>
            </div>
          </div>

          {/* 부족분 신청 정보 */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="shortageReason" className="text-sm font-medium">
                부족분 사유 <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="shortageReason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="부족분이 발생한 사유를 상세히 입력해주세요..."
                rows={4}
                className="resize-none"
                disabled={isSaving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="shortageQuantity" className="text-sm font-medium">
                부족분 수량 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="shortageQuantity"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="부족분 수량을 입력하세요"
                min="1"
                step="1"
                className="w-full"
                disabled={isSaving}
              />
            </div>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* 액션 버튼 */}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSaving}
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
            >
              {isSaving ? '저장 중...' : (existingRequest ? '수정' : '신청')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};


