
import React from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { ProcessingHistory } from '@/shared/components/common/ProcessingHistory';
import { ShortageRequest } from '../types';
import { X } from 'lucide-react';
import { getOrderQuantityTotal } from '@/features/production/utils/orderQuantity';

interface ShortageRequestDetailProps {
  open: boolean;
  request: ShortageRequest | null;
  onClose: () => void;
  onStatusUpdate: (requestId: string, newStatus: 'requested' | 'completed') => void;
  onDelete: (request: ShortageRequest) => void;
  canManage?: boolean;
  canDelete?: boolean;
}

const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const ShortageRequestDetail: React.FC<ShortageRequestDetailProps> = ({
  open,
  request,
  onClose,
  onStatusUpdate,
  onDelete,
  canManage = false,
  canDelete = false
}) => {
  if (!request) return null;
  const isCompleted = request.status === 'completed';
  const totalOrderQuantity = getOrderQuantityTotal(request);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-4xl max-h-[90vh] p-0"
        stickyHeader={
          <div className="flex items-start justify-between">
            <DialogTitle className="text-lg font-bold">부족분 요청 상세</DialogTitle>
            <Badge className={`px-3 py-1 rounded-full ${isCompleted ? 'bg-green-600 text-white' : 'bg-yellow-500 text-white'}`}>
              {isCompleted ? '완료' : '요청'}
            </Badge>
          </div>
        }
        stickyFooter={
          <div className="flex items-center justify-end gap-2">
            {canManage && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onStatusUpdate(request.id, isCompleted ? 'requested' : 'completed')}
              >
                {isCompleted ? '요청으로' : '완료'}
              </Button>
            )}
            {canDelete && (
              <Button variant="destructive" size="sm" onClick={() => onDelete(request)}>
                삭제
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0" title="닫기">
              <X className="h-4 w-4" />
            </Button>
          </div>
        }
      >
        <div className="space-y-6 p-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-muted-foreground">요청일:</span>
              <p className="text-foreground">{formatDateTime(request.createdAt)}</p>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">요청자:</span>
              <p className="text-foreground">{request.author.displayName}</p>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">생산라인:</span>
              <p className="text-foreground">{request.productionLine}</p>
            </div>
          </div>

          <div>
            <span className="font-medium text-muted-foreground text-sm">제품 정보:</span>
            <div className="mt-2 p-3 bg-muted rounded-lg space-y-2 text-sm">
              <p><strong>발주번호:</strong> {request.orderNumbers.join(', ')}</p>
              <p><strong>발주처:</strong> {request.supplier}</p>
              <p><strong>제품명:</strong> {request.productName}</p>
              <p><strong>부속명:</strong> {request.partName}</p>
              <p><strong>사양:</strong> {request.specification}</p>
            </div>
          </div>

          <div>
            <span className="font-medium text-muted-foreground text-sm">생산 수량 정보:</span>
            <div className="mt-2 p-3 bg-muted rounded-lg space-y-2 text-sm">
              <p>
                <strong>발주수량:</strong>{' '}
                {totalOrderQuantity != null ? totalOrderQuantity.toLocaleString() : '-'}
              </p>
              <p><strong>투입수량:</strong> {(request.inputQuantity && request.inputQuantity.toLocaleString()) || '-'}</p>
              <p><strong>양품수량:</strong> {(request.goodQuantity && request.goodQuantity.toLocaleString()) || '-'}</p>
              <p><strong>불량수량:</strong> {(request.defectQuantity && request.defectQuantity.toLocaleString()) || '-'}</p>
              <p className="text-red-600 dark:text-red-400 font-semibold">
                <strong>부족분 요청수량:</strong> {request.requestedShortageQuantity.toLocaleString()}
              </p>
            </div>
          </div>

          <div>
            <span className="font-medium text-muted-foreground text-sm">부족분 사유:</span>
            <div className="mt-2 p-3 bg-muted rounded-lg text-sm">
              <p className="whitespace-pre-wrap">{request.shortageReason}</p>
            </div>
          </div>

          {request.history && request.history.length > 0 && (
            <ProcessingHistory 
              history={request.history}
              className="mt-2"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};



