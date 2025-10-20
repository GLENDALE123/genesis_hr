/**
 * 지그 요청 ID 생성 유틸리티
 */

import { getDocumentsWithQuery } from '@/shared/services/firebase/firestore';
import { JIG_COLLECTIONS } from '../constants';

export const generateJigRequestId = async (): Promise<string> => {
  const today = new Date();
  const year = today.getFullYear().toString().slice(-2);
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const day = today.getDate().toString().padStart(2, '0');
  const prefix = `${year}${month}${day}`;

  // 오늘 날짜로 시작하는 모든 요청을 가져와서 가장 큰 시퀀스 번호를 찾습니다.
  const requests = await getDocumentsWithQuery(
    JIG_COLLECTIONS.REQUESTS,
    [{ field: 'id', operator: '>=', value: `${prefix}-000` }, { field: 'id', operator: '<=', value: `${prefix}-999` }],
    'id',
    'desc',
    1
  );

  let nextSequence = 1;
  if (requests.length > 0) {
    const lastId = requests[0].id as string;
    const lastSequence = parseInt(lastId.split('-')[1], 10);
    nextSequence = lastSequence + 1;
  }

  return `${prefix}-${nextSequence.toString().padStart(3, '0')}`;
};