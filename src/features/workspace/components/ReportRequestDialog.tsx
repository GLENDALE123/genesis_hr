/**
 * 보고 요청 다이얼로그
 */

import React, { useState } from 'react';
import { useAuthStore } from '@/features/auth/store/authStore';
import { ApprovalService } from '../services/approvalService';
import { useWorkspaceStore } from '../store/workspaceStore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Button } from '@/shared/components/ui/button';
import { toast } from 'sonner';
import type { ReportType } from '../types/approval.types';

export interface ReportRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelId?: string;
  onSuccess?: () => void;
}

export const ReportRequestDialog: React.FC<ReportRequestDialogProps> = ({
  open,
  onOpenChange,
  channelId,
  onSuccess,
}) => {
  const { user, userProfile } = useAuthStore();
  const { currentWorkspace } = useWorkspaceStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    type: 'report' as ReportType,
    title: '',
    amount: '',
    description: '',
    category: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid || !currentWorkspace) return;

    if (!formData.title.trim()) {
      toast.error('제목을 입력해주세요.');
      return;
    }

    let amount: number | undefined;
    if (formData.amount.trim()) {
      amount = parseFloat(formData.amount);
      if (isNaN(amount) || amount <= 0) {
        toast.error('올바른 금액을 입력해주세요.');
        return;
      }
    }

    try {
      setIsSubmitting(true);
      await ApprovalService.createReportRequest(
        {
          workspaceId: currentWorkspace.id,
          channelId,
          type: formData.type,
          title: formData.title.trim(),
          amount,
          description: formData.description.trim() || undefined,
          category: formData.category.trim() || undefined,
        },
        user.uid,
        user.displayName || user.email || '사용자'
      );

      toast.success('보고 요청이 생성되었습니다.');
      setFormData({
        type: 'report',
        title: '',
        amount: '',
        description: '',
        category: '',
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Failed to create report request:', error);
      toast.error(error.message || '보고 요청 생성에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>보고 요청</DialogTitle>
          <DialogDescription>
            새로운 보고 요청을 생성합니다.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <Label htmlFor="report-type">보고 유형</Label>
            <Select
              value={formData.type}
              onValueChange={(value) =>
                setFormData({ ...formData, type: value as ReportType })
              }
            >
              <SelectTrigger id="report-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="report">보고</SelectItem>
                <SelectItem value="expense">지출</SelectItem>
                <SelectItem value="reimbursement">환불</SelectItem>
                <SelectItem value="advance">선금</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="report-title">제목 *</Label>
            <Input
              id="report-title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="보고 요청 제목"
              required
            />
          </div>

          <div>
            <Label htmlFor="report-amount">금액 (원)</Label>
            <Input
              id="report-amount"
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="금액이 있는 경우 입력 (선택사항)"
              min="0"
              step="1"
            />
          </div>

          <div>
            <Label htmlFor="report-category">카테고리</Label>
            <Input
              id="report-category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              placeholder="예: 업무 보고, 프로젝트 진행 상황 등"
            />
          </div>

          <div>
            <Label htmlFor="report-description">설명</Label>
            <Textarea
              id="report-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="보고 요청에 대한 상세 설명"
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? '생성 중...' : '생성'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

