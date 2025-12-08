/**
 * 포스트잇 커스텀 훅
 * 전역 store를 사용하여 모든 컴포넌트에서 동일한 상태를 공유
 */

import { useEffect } from 'react';
import { usePostItStore } from '@/shared/store/postItStore';

export const usePostIt = () => {
  const postits = usePostItStore((state) => state.postits);
  const isLoading = usePostItStore((state) => state.isLoading);
  const refreshPostIts = usePostItStore((state) => state.refreshPostIts);
  const createPostIt = usePostItStore((state) => state.createPostIt);
  const updatePostIt = usePostItStore((state) => state.updatePostIt);
  const removePostIt = usePostItStore((state) => state.removePostIt);
  const reorderPostIts = usePostItStore((state) => state.reorderPostIts);
  const bringToView = usePostItStore((state) => state.bringToView);
  const createFolder = usePostItStore((state) => state.createFolder);

  // 컴포넌트 마운트 시 최신 상태로 새로고침
  useEffect(() => {
    console.log('[OK] [usePostIt] 컴포넌트 마운트됨, 포스트잇 새로고침 시작');
    refreshPostIts()
      .then(() => {
        console.log('[OK] [usePostIt] 포스트잇 새로고침 완료');
      })
      .catch((error) => {
        console.error('[ERROR] [usePostIt] 포스트잇 새로고침 실패:', error);
        if (error instanceof Error) {
          console.error('[ERROR] [usePostIt] 에러 메시지:', error.message);
          console.error('[ERROR] [usePostIt] 에러 스택:', error.stack);
        }
      });
  }, [refreshPostIts]);

  return {
    postits,
    isLoading,
    createPostIt,
    updatePostIt,
    removePostIt,
    reorderPostIts,
    bringToView,
    createFolder,
    refreshPostIts, // 외부에서 강제로 새로고침 할 수 있도록 노출
  };
};

