/**
 * 보고/결제 관리 패널
 * 보고/결제 요청 목록, 승인/거절 기능
 */

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { PaymentService } from '../services/paymentService';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/shared/components/ui/sheet';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Textarea } from '@/shared/components/ui/textarea';
import { Label } from '@/shared/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Check, X, Clock, CreditCard } from 'lucide-react';
import type { PaymentRequest, PaymentStatus } from '../types/payment.types';

export interface PaymentManagementPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PaymentManagementPanel: React.FC<PaymentManagementPanelProps> = ({
  open,
  onOpenChange,
}) => {
  const { user, userProfile } = useAuthStore();
  const { currentWorkspace } = useWorkspaceStore();
  const [payments, setPayments] = useState<PaymentRequest[]>([]);
  const [filterStatus, setFilterStatus] = useState<PaymentStatus | 'all'>('all');
  const [selectedPayment, setSelectedPayment] = useState<PaymentRequest | null>(null);
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // 결제 요청 목록 로드
  useEffect(() => {
    if (!open || !currentWorkspace) return;

    const loadPayments = async () => {
      try {
        let allPayments: PaymentRequest[];
        if (filterStatus === 'all') {
          allPayments = await PaymentService.getWorkspacePayments(currentWorkspace.id);
        } else {
          allPayments = await PaymentService.getWorkspacePayments(
            currentWorkspace.id,
            filterStatus
          );
        }
        setPayments(allPayments);
      } catch (error) {
        console.error('Failed to load payments:', error);
        toast.error('보고/결제 요청 목록을 불러오는데 실패했습니다.');
      }
    };

    loadPayments();
  }, [open, currentWorkspace, filterStatus]);

  // 실시간 구독
  useEffect(() => {
    if (!open || !currentWorkspace) return;

    const unsubscribe = PaymentService.subscribeToWorkspacePayments(
      currentWorkspace.id,
      (updatedPayments) => {
        if (filterStatus === 'all') {
          setPayments(updatedPayments);
        } else {
          setPayments(updatedPayments.filter((p) => p.status === filterStatus));
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [open, currentWorkspace, filterStatus]);

  const handleApprove = async () => {
    if (!selectedPayment || !user?.uid) return;

    try {
      setIsProcessing(true);
      await PaymentService.updatePaymentRequest(
        selectedPayment.id,
        { status: 'approved' },
        user.uid,
        user.displayName || user.email || '사용자'
      );
      toast.success('보고/결제 요청이 승인되었습니다.');
      setIsApprovalDialogOpen(false);
      setSelectedPayment(null);
      setRejectionReason('');
    } catch (error: any) {
      console.error('Failed to approve payment:', error);
      toast.error(error.message || '보고/결제 요청 승인에 실패했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedPayment || !user?.uid) return;

    if (!rejectionReason.trim()) {
      toast.error('거절 사유를 입력해주세요.');
      return;
    }

    try {
      setIsProcessing(true);
      await PaymentService.updatePaymentRequest(
        selectedPayment.id,
        { status: 'rejected', rejectedReason: rejectionReason.trim() },
        user.uid,
        user.displayName || user.email || '사용자'
      );
      toast.success('보고/결제 요청이 거절되었습니다.');
      setIsApprovalDialogOpen(false);
      setSelectedPayment(null);
      setRejectionReason('');
    } catch (error: any) {
      console.error('Failed to reject payment:', error);
      toast.error(error.message || '보고/결제 요청 거절에 실패했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            대기
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="default" className="flex items-center gap-1">
            <Check className="h-3 w-3" />
            승인
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <X className="h-3 w-3" />
            거절
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <CreditCard className="h-3 w-3" />
            완료
          </Badge>
        );
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'expense':
        return '지출';
      case 'reimbursement':
        return '환불';
      case 'advance':
        return '선금';
      default:
        return type;
    }
  };

  const formatAmount = (amount: number, currency: string = 'KRW') => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>보고/결제 관리</SheetTitle>
            <SheetDescription>
              워크스페이스의 보고/결제 요청을 관리하고 승인/거절할 수 있습니다.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            {/* 필터 */}
            <div className="flex items-center gap-2">
              <Label>상태 필터</Label>
              <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as any)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="pending">대기</SelectItem>
                  <SelectItem value="approved">승인</SelectItem>
                  <SelectItem value="rejected">거절</SelectItem>
                  <SelectItem value="completed">완료</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 결제 요청 목록 */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>제목</TableHead>
                    <TableHead>요청자</TableHead>
                    <TableHead>금액</TableHead>
                    <TableHead>유형</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        보고/결제 요청이 없습니다.
                      </TableCell>
                    </TableRow>
                  ) : (
                    payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">{payment.title}</TableCell>
                        <TableCell>{payment.requestedByName}</TableCell>
                        <TableCell>{formatAmount(payment.amount, payment.currency)}</TableCell>
                        <TableCell>{getTypeLabel(payment.type)}</TableCell>
                        <TableCell>{getStatusBadge(payment.status)}</TableCell>
                        <TableCell>
                          {payment.status === 'pending' && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedPayment(payment);
                                  setApprovalAction('approve');
                                  setIsApprovalDialogOpen(true);
                                }}
                              >
                                승인
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-destructive"
                                onClick={() => {
                                  setSelectedPayment(payment);
                                  setApprovalAction('reject');
                                  setIsApprovalDialogOpen(true);
                                }}
                              >
                                거절
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* 승인/거절 다이얼로그 */}
      <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {approvalAction === 'approve' ? '보고/결제 요청 승인' : '보고/결제 요청 거절'}
            </DialogTitle>
            <DialogDescription>
              {selectedPayment && (
                <>
                  <div className="mt-2 space-y-1">
                    <p className="font-medium">{selectedPayment.title}</p>
                    <p className="text-sm text-muted-foreground">
                      요청자: {selectedPayment.requestedByName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      금액: {formatAmount(selectedPayment.amount, selectedPayment.currency)}
                    </p>
                    {selectedPayment.description && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {selectedPayment.description}
                      </p>
                    )}
                  </div>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {approvalAction === 'reject' && (
            <div className="mt-4">
              <Label htmlFor="rejection-reason">거절 사유 *</Label>
              <Textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="거절 사유를 입력하세요"
                rows={3}
                className="mt-2"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsApprovalDialogOpen(false);
                setSelectedPayment(null);
                setRejectionReason('');
              }}
              disabled={isProcessing}
            >
              취소
            </Button>
            <Button
              onClick={approvalAction === 'approve' ? handleApprove : handleReject}
              disabled={isProcessing}
              variant={approvalAction === 'reject' ? 'destructive' : 'default'}
            >
              {isProcessing
                ? '처리 중...'
                : approvalAction === 'approve'
                ? '승인'
                : '거절'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

