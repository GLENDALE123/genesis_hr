/**
 * Google 스프레드시트 동기화 훅
 */

import { useState, useCallback } from 'react';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useIsAdmin } from '@/features/auth/hooks';
import { getUserDisplayName } from '@/shared/utils/userUtils';
import { syncSpreadsheetToFirestore, SyncResult } from '@/features/production/services/sheetsSyncService';
import { toast } from 'sonner';

export const useSheetsSync = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<SyncResult | null>(null);
  const { user, userProfile } = useAuthStore();
  const isAdmin = useIsAdmin();

  const sync = useCallback(async () => {
    if (!isAdmin) {
      toast.error('관리자만 동기화할 수 있습니다.');
      return;
    }

    if (!user || !userProfile) {
      toast.error('사용자 정보가 없습니다.');
      return;
    }

    // 스프레드시트 ID는 환경 변수 또는 기본값 사용
    const spreadsheetId = import.meta.env.VITE_GOOGLE_SPREADSHEET_ID;
    const sheetName = import.meta.env.VITE_GOOGLE_SHEET_NAME || undefined;

    if (!spreadsheetId) {
      toast.error('스프레드시트 ID가 설정되지 않았습니다. 환경 변수 VITE_GOOGLE_SPREADSHEET_ID를 확인해주세요.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const userInfo = {
        uid: user.uid,
        displayName: getUserDisplayName(user, userProfile, '관리자'),
      };

      const syncResult = await syncSpreadsheetToFirestore(
        spreadsheetId,
        sheetName,
        userInfo
      );

      setResult(syncResult);
      toast.success(
        `동기화 완료: 추가 ${syncResult.added}개, 수정 ${syncResult.updated}개, 삭제 ${syncResult.deleted}개`
      );
    } catch (err) {
      const error = err as Error;
      setError(error);
      toast.error(`동기화 실패: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, user, userProfile]);

  return {
    sync,
    loading,
    error,
    result,
  };
};

