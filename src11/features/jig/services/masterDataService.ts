/**
 * 지그 마스터 데이터 서비스
 */

import { getDocument, updateDocument } from '@/shared/services/firebase/firestore';
import { MasterData } from '../types';
import { JIG_COLLECTIONS } from '../constants';

export const getMasterData = async (): Promise<MasterData | null> => {
  const doc = await getDocument(JIG_COLLECTIONS.MASTER_DATA, 'masterData');
  return doc ? (doc as unknown as MasterData) : null;
};

export const updateMasterData = async (data: Partial<MasterData>): Promise<void> => {
  await updateDocument(JIG_COLLECTIONS.MASTER_DATA, 'masterData', data);
};