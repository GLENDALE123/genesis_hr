'use client';

import React, { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog';
import { Settings, Shield } from 'lucide-react';
import { useIsAdmin } from '@/features/auth/hooks';
import { Badge } from '@/shared/components/ui/badge';
import type { PageIdentifier } from '@/features/auth/types/permissions';

interface PermissionSettingsButtonProps {
  pageId: PageIdentifier;
  pageName: string;
}

/**
 * 관리자 전용: 페이지별 권한 설정 버튼
 * 우측 상단에 표시되어 사용자별 권한을 관리
 */
export const PermissionSettingsButton: React.FC<PermissionSettingsButtonProps> = ({
  pageId,
  pageName
}) => {
  const isAdmin = useIsAdmin();
  const [open, setOpen] = useState(false);

  // Admin이 아니면 버튼 숨김
  if (!isAdmin) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Shield className="h-4 w-4" />
          권한 설정
          <Badge variant="default" className="ml-1">Admin</Badge>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {pageName} - 권한 설정
          </DialogTitle>
          <DialogDescription>
            사용자별로 읽기, 쓰기, 수정, 삭제 권한 및 커스텀 권한을 설정할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* TODO: 사용자 목록 표시 */}
          <div className="p-8 border-2 border-dashed border-muted rounded-lg text-center">
            <Settings className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">권한 설정 UI</h3>
            <p className="text-sm text-muted-foreground mb-4">
              사용자 목록과 권한 체크박스를 여기에 구현하세요.
            </p>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>• 사용자 목록 표시</p>
              <p>• 읽기/쓰기/수정/삭제 체크박스</p>
              <p>• 페이지별 커스텀 권한 (예: 공정조건 보기)</p>
              <p>• Firestore에 권한 데이터 저장</p>
            </div>
          </div>

          {/* 예시 구조 */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <h4 className="font-semibold mb-3">커스텀 권한 예시 ({pageName})</h4>
            <div className="space-y-2 text-sm">
              {pageId === 'production-daily-report' && (
                <>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="viewProcessConditions" />
                    <label htmlFor="viewProcessConditions">공정조건 보기</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="viewMemo" />
                    <label htmlFor="viewMemo">메모 보기</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="exportExcel" />
                    <label htmlFor="exportExcel">엑셀 내보내기</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="viewSummary" />
                    <label htmlFor="viewSummary">통계 요약 보기</label>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

