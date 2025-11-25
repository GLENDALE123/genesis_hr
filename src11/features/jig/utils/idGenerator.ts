/**
 * 지그 요청 ID 생성 유틸리티 (HS-Jig-main 호환)
 */

import { getDocument, updateDocument, addDocument } from '@/shared/services/firebase/firestore';

export const generateJigRequestId = async (): Promise<string> => {
  // HS-Jig-main과 동일한 방식: T{숫자} 형식 사용
  
  try {
    // 카운터 문서 가져오기
    const counterDoc = await getDocument('counters', 'jig-requests-counter') as { id: string; count?: number } | null;
    
    if (!counterDoc) {
      // 카운터 문서가 없으면 생성
      await addDocument('counters', {
        id: 'jig-requests-counter',
        count: 0
      });
    }
    
    const currentCount = counterDoc?.count || 0;
    const newCount = currentCount + 1;
    
    // 카운터 업데이트
    await updateDocument('counters', 'jig-requests-counter', { count: newCount });
    
    return `T${newCount}`;
  } catch (error) {
    console.error('ID 생성 실패:', error);
    // 폴백: 타임스탬프 기반 ID
    return `T${Date.now()}`;
  }
};