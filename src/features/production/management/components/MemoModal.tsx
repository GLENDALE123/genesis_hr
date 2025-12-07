
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { ScrollArea } from '@/shared/components/ui/scroll-area';

interface MemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  memo: string | null;
  reportInfo?: {
    productName: string;
    partName?: string;
    workDate: string;
  };
}

export const MemoModal: React.FC<MemoModalProps> = ({
  isOpen,
  onClose,
  memo,
  reportInfo
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>메모</DialogTitle>
          {reportInfo && (
            <DialogDescription>
              {reportInfo.productName} {reportInfo.partName && `/ ${reportInfo.partName}`}
              {' - '}
              {reportInfo.workDate}
            </DialogDescription>
          )}
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="py-4">
            {memo ? (
              <p className="text-sm whitespace-pre-wrap break-words text-foreground">
                {memo}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                메모가 없습니다.
              </p>
            )}
          </div>
        </ScrollArea>

        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            닫기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};


