/**
 * 보고/승인 관리 패널
 * 보고 요청 목록, 승인/거절 기능
 */

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { ApprovalService } from '../services/approvalService';
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
import { Check, X, Clock, FileText } from 'lucide-react';
import type { ReportRequest, ApprovalStatus } from '../types/approval.types';

export interface ApprovalManagementPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ApprovalManagementPanel: React.FC<ApprovalManagementPanelProps> = ({
  open,
  onOpenChange,
}) => {
  const { user, userProfile } = useAuthStore();
  const { currentWorkspace } = useWorkspaceStore();
  const [reports, setReports] = useState<ReportRequest[]>([]);
  const [filterStatus, setFilterStatus] = useState<ApprovalStatus | 'all'>('all');
  const [selectedReport, setSelectedReport] = useState<ReportRequest | null>(null);
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // 보고 요청 목록 로드
  useEffect(() => {
    if (!open || !currentWorkspace) return;

    const loadReports = async () => {
      try {
        let allReports: ReportRequest[];
        if (filterStatus === 'all') {
          allReports = await ApprovalService.getWorkspaceReports(currentWorkspace.id);
        } else {
          allReports = await ApprovalService.getWorkspaceReports(
            currentWorkspace.id,
            filterStatus
          );
        }
        setReports(allReports);
      } catch (error) {
        console.error('Failed to load reports:', error);
        toast.error('보고 요청 목록을 불러오는데 실패했습니다.');
      }
    };

    loadReports();
  }, [open, currentWorkspace, filterStatus]);

  // 실시간 구독
  useEffect(() => {
    if (!open || !currentWorkspace) return;

    const unsubscribe = ApprovalService.subscribeToWorkspaceReports(
      currentWorkspace.id,
      (updatedReports) => {
        if (filterStatus === 'all') {
          setReports(updatedReports);
        } else {
          setReports(updatedReports.filter((r) => r.status === filterStatus));
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [open, currentWorkspace, filterStatus]);

  const handleApprove = async () => {
    if (!selectedReport || !user?.uid) return;

    try {
      setIsProcessing(true);
      await ApprovalService.updateReportRequest(
        selectedReport.id,
        { status: 'approved' },
        user.uid,
        user.displayName || user.email || '사용자'
      );
      toast.success('보고 요청이 승인되었습니다.');
      setIsApprovalDialogOpen(false);
      setSelectedReport(null);
      setRejectionReason('');
    } catch (error: any) {
      console.error('Failed to approve report:', error);
      toast.error(error.message || '보고 요청 승인에 실패했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedReport || !user?.uid) return;

    if (!rejectionReason.trim()) {
      toast.error('거절 사유를 입력해주세요.');
      return;
    }

    try {
      setIsProcessing(true);
      await ApprovalService.updateReportRequest(
        selectedReport.id,
        { status: 'rejected', rejectedReason: rejectionReason.trim() },
        user.uid,
        user.displayName || user.email || '사용자'
      );
      toast.success('보고 요청이 거절되었습니다.');
      setIsApprovalDialogOpen(false);
      setSelectedReport(null);
      setRejectionReason('');
    } catch (error: any) {
      console.error('Failed to reject report:', error);
      toast.error(error.message || '보고 요청 거절에 실패했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: ApprovalStatus) => {
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
            <FileText className="h-3 w-3" />
            완료
          </Badge>
        );
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'report':
        return '보고';
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

  const formatAmount = (amount?: number, currency: string = 'KRW') => {
    if (amount === undefined || amount === null) return '-';
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
            <SheetTitle>보고/승인 관리</SheetTitle>
            <SheetDescription>
              워크스페이스의 보고 요청을 관리하고 승인/거절할 수 있습니다.
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

            {/* 보고 요청 목록 */}
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
                  {reports.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        보고 요청이 없습니다.
                      </TableCell>
                    </TableRow>
                  ) : (
                    reports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell className="font-medium">{report.title}</TableCell>
                        <TableCell>{report.requestedByName}</TableCell>
                        <TableCell>
                          {report.amount ? formatAmount(report.amount, report.currency) : '-'}
                        </TableCell>
                        <TableCell>{getTypeLabel(report.type)}</TableCell>
                        <TableCell>{getStatusBadge(report.status)}</TableCell>
                        <TableCell>
                          {report.status === 'pending' && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedReport(report);
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
                                  setSelectedReport(report);
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
              {approvalAction === 'approve' ? '보고 요청 승인' : '보고 요청 거절'}
            </DialogTitle>
            <DialogDescription>
              {selectedReport && (
                <>
                  <div className="mt-2 space-y-1">
                    <p className="font-medium">{selectedReport.title}</p>
                    <p className="text-sm text-muted-foreground">
                      요청자: {selectedReport.requestedByName}
                    </p>
                    {selectedReport.amount && (
                      <p className="text-sm text-muted-foreground">
                        금액: {formatAmount(selectedReport.amount, selectedReport.currency)}
                      </p>
                    )}
                    {selectedReport.description && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {selectedReport.description}
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
                setSelectedReport(null);
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

