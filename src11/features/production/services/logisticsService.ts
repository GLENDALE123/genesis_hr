import { db } from '@/shared/services/firebase/config';
import { collection, doc, runTransaction, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { LogisticsRequest, ProductionRequestStatus, ProductionRequestType } from '@/features/production/types/logistics';
import type { PackagingReport } from '@/features/production/types';
import { LogisticsTransferData } from '@/features/production/components/LogisticsTransferModal';
import { createProductionRequestNotification } from '@/shared/services/notificationService';

/**
 * 물류이동 요청 생성
 */
export const createLogisticsRequest = async (
  reports: PackagingReport[],
  transferData: LogisticsTransferData[],
  userProfile: { uid: string; displayName: string; avatar?: string; photoURL?: string }
): Promise<string> => {
  if (!db) {
    throw new Error('Firebase가 초기화되지 않았습니다.');
  }

  if (!userProfile) {
    throw new Error('사용자 정보가 없습니다.');
  }

  if (reports.length === 0) {
    throw new Error('선택된 리포트가 없습니다.');
  }

  // 총 수량 계산
  const totalQuantity = reports.reduce((sum, r) => sum + (r.goodQuantity || 0), 0);
  
  // 중복 제거된 제품명, 부속명, 발주처, 발주번호 추출
  const productNames = [...new Set(reports.map(r => r.productName))];
  const partNames = [...new Set(reports.map(r => r.partName))];
  const suppliers = [...new Set(reports.map(r => r.supplier))];
  const orderNumbers = [...new Set(reports.flatMap(r => r.orderNumbers || []))];

  // Content 생성 (상세 정보 텍스트)
  const content = `통합 물류 이동 요청 (${reports.length}건):\n` +
    reports.map(r => {
      const transfer = transferData.find(t => t.reportId === r.id);
      const details = (transfer && transfer.details) || '없음';
      const destination = (transfer && transfer.destination) || '미지정';
      
      return `\n---------------------\n` +
             `- 제품: ${r.productName} / ${r.partName}\n` +
             `- 발주번호: ${(r.orderNumbers && r.orderNumbers.join(', ')) || '-'}\n` +
             `- 발주처: ${r.supplier}\n` +
             `- 사양: ${r.specification || '-'}\n` +
             `- 양품수량: ${(r.goodQuantity && r.goodQuantity.toLocaleString()) || '0'} EA\n` +
             `- 포장단위: ${(r.packagingUnit && r.packagingUnit.toLocaleString()) || '0'}\n` +
             `- 박스수량: ${(r.boxCount && r.boxCount.toLocaleString()) || '0'}\n` +
             `- 잔량: ${(r.remainder && r.remainder.toLocaleString()) || '0'}\n` +
             `- 도착처: ${destination}\n` +
             `- 추가 요청: ${details}`;
    }).join('');

  // Transaction으로 카운터 증가 및 ID 생성
  const firestore = db!; // Null assertion - 이미 위에서 체크함
  const counterRef = doc(firestore, 'counters', 'production-requests-counter');
  const today = new Date();
  const dateString = `${today.getFullYear().toString().slice(-2)}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`;

  const newId = await runTransaction(firestore, async (transaction) => {
    const counterDoc = await transaction.get(counterRef);
    const counterData = counterDoc.data();
    const newCount = ((counterData && counterData.count) || 0) + 1;
    const generatedId = `P-${dateString}-${newCount.toString().padStart(3, '0')}`;
    
    const newRequestRef = doc(firestore, 'production-requests', generatedId);
    
    const newRequestPayload: Omit<LogisticsRequest, 'id'> = {
      createdAt: new Date().toISOString(),
      author: { 
        uid: userProfile.uid, 
        displayName: userProfile.displayName 
      },
      status: ProductionRequestStatus.Requested,
      history: [{
        status: ProductionRequestStatus.Requested,
        date: new Date().toISOString(),
        user: userProfile.displayName,
        reason: '물류 이동 요청으로 생성됨'
      }],
      requestType: ProductionRequestType.LogisticsTransfer,
      requester: userProfile.displayName,
      orderNumber: orderNumbers.join(', '),
      productName: productNames.length > 1 
        ? `${productNames[0]} 외 ${productNames.length - 1}건` 
        : (productNames[0] || ''),
      partName: partNames.join(', '),
      supplier: suppliers.join(', '),
      quantity: totalQuantity,
      content: content,
      sourceReportIds: reports.map(r => r.id)
    };
    
    transaction.set(newRequestRef, newRequestPayload);
    transaction.set(counterRef, { count: newCount });
    return generatedId;
  });

  // 알림 발송 (비동기, 실패해도 메인 로직에 영향 없음)
  createProductionRequestNotification(
    newId,
    ProductionRequestType.LogisticsTransfer,  // "물류이동"
    userProfile.displayName,
    productNames.length > 1 
      ? `${productNames[0]} 외 ${productNames.length - 1}건` 
      : (productNames[0] || ''),
    '물류이동',  // partName 대신 요청타입
    content,  // ← 실제 메시지 내용
    userProfile.uid, // ✅ 작성자 UID
    userProfile.avatar || userProfile.photoURL || undefined  // ✅ 작성자 아바타
  ).catch(err => {
    console.error('알림 발송 실패 (무시됨):', err);
  });

  return newId;
};

/**
 * 물류이동 요청 목록 조회
 */
export const getLogisticsRequests = async (): Promise<LogisticsRequest[]> => {
  if (!db) {
    throw new Error('Firebase가 초기화되지 않았습니다.');
  }

  const firestore = db!; // Null assertion - 이미 위에서 체크함
  const q = query(
    collection(firestore, 'production-requests'),
    orderBy('createdAt', 'desc'),
    limit(100)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as LogisticsRequest));
};

