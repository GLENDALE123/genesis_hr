import { db } from '@/shared/services/firebase/config';
import { collection, getDocs, query, where } from 'firebase/firestore';

// Firebase Functions URL 설정
const getFunctionsUrl = () => {
  // 프로덕션 환경: Firebase Functions (asia-northeast3 리전)
  return 'https://asia-northeast3-hs-jig-b2093.cloudfunctions.net';
};

/**
 * Firebase Functions를 통한 알림 발송 공통 함수
 */
async function sendNotificationViaFunctions(payload: any): Promise<void> {
  const functionsUrl = getFunctionsUrl();
  const response = await fetch(`${functionsUrl}/createNotification`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `알림 전송 실패: ${response.status}`);
  }
}

/**
 * Admin/Manager 사용자 목록 조회 (발신자 제외)
 */
async function getAdminManagerUsers(excludeUid?: string): Promise<string[]> {
  if (!db) {
    throw new Error('Firebase가 초기화되지 않았습니다.');
  }

  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('role', 'in', ['Admin', 'Manager']));
  const usersSnapshot = await getDocs(q);

  const targetUsers = usersSnapshot.docs
    .filter(doc => !excludeUid || doc.id !== excludeUid)
    .map(doc => doc.id);

  return targetUsers;
}

/**
 * 물류이동 알림 테스트 (개발/테스트용)
 */
export const createTestLogisticsNotification = async (
  userName: string,
  userUid: string,
  userAvatar?: string
) => {
  try {
    // 테스트 알림은 본인에게도 발송 (excludeUid 없음)
    const targetUsers = await getAdminManagerUsers();

    if (targetUsers.length === 0) {
      console.log('알림 대상이 없습니다.');
      return;
    }

    const testContent = `통합 물류 이동 요청 (3건):
---------------------
- 제품: 테스트제품A / 부속A
- 발주번호: PO-TEST-001
- 발주처: 테스트공급사
- 사양: 테스트사양
- 양품수량: 10,000 EA
- 포장단위: 100
- 박스수량: 100
- 잔량: 0
- 도착처: 군포공장
- 추가 요청: 긴급 배송 요청

---------------------
- 제품: 테스트제품B / 부속B
- 발주번호: PO-TEST-002
- 발주처: 테스트공급사2
- 사양: 테스트사양2
- 양품수량: 5,000 EA
- 포장단위: 50
- 박스수량: 100
- 잔량: 0
- 도착처: 화성공장
- 추가 요청: 오후 3시까지 도착 요망`;

    const payload = {
      targetUsers,
      type: 'production-request',
      title: '생산관리부 요청사항',
      body: testContent,
      requestId: 'P-TEST-001',
      subtitle: '테스트제품A 외 2건',
      centerInfo: '물류이동 요청',
      senderName: userName,
      senderUid: userUid,
      senderAvatar: userAvatar
    };

    await sendNotificationViaFunctions(payload);
    console.log('✅ 물류이동 테스트 알림 발송 완료:', targetUsers.length, '명');
  } catch (error) {
    console.error('테스트 알림 생성 중 오류 발생:', error);
    throw error;
  }
};

/**
 * 물류이동 요청 알림 생성
 */
export const createLogisticsNotification = async (
  requestId: string,
  requestType: string,
  requester: string,
  content: string,
  requesterUid: string,
  requesterAvatar?: string
) => {
  try {
    const targetUsers = await getAdminManagerUsers(requesterUid);

    if (targetUsers.length === 0) {
      console.log('알림 대상이 없습니다.');
      return;
    }

    const payload = {
      targetUsers,
      type: 'production-request',
      title: '생산관리부 요청사항',
      body: content,
      requestId,
      subtitle: content,       // 제품명
      senderName: requester,
      senderUid: requesterUid,
      senderAvatar: requesterAvatar
    };

    console.log('🔍 물류이동 알림 페이로드:', JSON.stringify(payload, null, 2));
    await sendNotificationViaFunctions(payload);
    console.log(`✅ 물류이동 알림이 발송되었습니다. (작성자 제외, ${targetUsers.length}명)`);
  } catch (error) {
    console.error('알림 생성 중 오류 발생:', error);
    // 알림 실패해도 메인 로직은 계속 진행
  }
};

/**
 * 부족분 신청 알림 테스트 (개발/테스트용)
 */
export const createTestShortageNotification = async (
  userName: string,
  userUid: string,
  userAvatar?: string
) => {
  try {
    // 테스트 알림은 본인에게도 발송 (excludeUid 없음)
    const targetUsers = await getAdminManagerUsers();

    if (targetUsers.length === 0) {
      console.log('알림 대상이 없습니다.');
      return;
    }

    const testContent = `1,000EA, 사유: 테스트용 부족분 신청입니다.`;

    const payload = {
      targetUsers,
      type: 'shortage-request',
      title: '부족분 신청',
      body: testContent,
      requestId: 'TEST-SHORTAGE-001',
      subtitle: '테스트크림 / 외용기',
      centerInfo: '부족분 신청',
      senderName: userName,
      senderUid: userUid,
      senderAvatar: userAvatar
    };

    await sendNotificationViaFunctions(payload);
    console.log('✅ 부족분 신청 테스트 알림 발송 완료:', targetUsers.length, '명');
  } catch (error) {
    console.error('테스트 부족분 신청 알림 생성 중 오류 발생:', error);
    throw error;
  }
};

/**
 * 부족분 신청 알림 생성
 */
export const createShortageNotification = async (
  requestId: string,
  content: string,
  productName: string,
  requesterUid: string,
  requester: string,
  requesterAvatar?: string
) => {
  try {
    const targetUsers = await getAdminManagerUsers(requesterUid);

    if (targetUsers.length === 0) {
      console.log('알림 대상이 없습니다.');
      return;
    }

    const payload = {
      targetUsers,
      type: 'shortage-request',
      title: '부족분 신청',
      body: content,
      requestId,
      subtitle: productName,
      centerInfo: '부족분 신청',
      senderName: requester,
      senderUid: requesterUid,
      senderAvatar: requesterAvatar
    };

    await sendNotificationViaFunctions(payload);
    console.log(`✅ 부족분 신청 알림이 발송되었습니다. (작성자 제외, ${targetUsers.length}명)`);
  } catch (error) {
    console.error('알림 생성 중 오류 발생:', error);
    // 알림 실패해도 메인 로직은 계속 진행
  }
};

/**
 * 일반 생산관리부 요청 알림 생성
 */
export const createProductionRequestNotification = async (
  requestId: string,
  requestType: string,
  requester: string,
  productName: string,
  partName: string,
  content: string,
  requesterUid: string,
  requesterAvatar?: string
) => {
  try {
    const targetUsers = await getAdminManagerUsers(requesterUid);

    if (targetUsers.length === 0) {
      console.log('알림 대상이 없습니다.');
      return;
    }

    const payload = {
      targetUsers,
      type: 'production-request',
      centerInfo: requestType,  // ✅ 실제 표시되는 필드명 (예: "영업부 긴급요청")
      title: '생산관리부 요청사항',
      body: content,
      requestId,
      subtitle: `${productName} / ${partName}`,
      senderName: requester,
      senderUid: requesterUid,
      senderAvatar: requesterAvatar
    };

    await sendNotificationViaFunctions(payload);
    console.log(`✅ 생산관리부 요청 알림이 발송되었습니다. (작성자 제외, ${targetUsers.length}명)`);
  } catch (error) {
    console.error('알림 생성 중 오류 발생:', error);
    // 알림 실패해도 메인 로직은 계속 진행
  }
};

/**
 * 일반 생산관리부 요청 알림 테스트 (개발/테스트용)
 */
export const createTestProductionRequestNotification = async (
  userName: string,
  userUid: string,
  userAvatar: string | undefined,
  requestType: string
) => {
  try {
    // 테스트 알림은 본인에게도 발송 (excludeUid 없음)
    const targetUsers = await getAdminManagerUsers();

    if (targetUsers.length === 0) {
      console.log('알림 대상이 없습니다.');
      return;
    }

    // 요청유형별 테스트 데이터
    const testData: Record<string, { productName: string; partName: string; content: string }> = {
      '긴급건': {
        productName: '테스트크림',
        partName: '외용기',
        content: `긴급 생산 요청사항입니다.\n\n제품: 테스트크림 / 외용기\n발주번호: PO-URGENT-001\n발주처: 긴급테스트공급사\n수량: 5,000 EA\n\n긴급 처리 요청드립니다.`
      },
      '영업부 긴급요청': {
        productName: '프리미엄로션',
        partName: '펌프',
        content: `영업부 긴급 요청사항입니다.\n\n제품: 프리미엄로션 / 펌프\n발주번호: PO-SALES-001\n발주처: 영업테스트공급사\n수량: 3,000 EA\n\n고객 납기 요청으로 긴급 처리 필요합니다.`
      }
    };

    const data = testData[requestType] || testData['긴급건'];

    const payload = {
      targetUsers,
      type: 'production-request',
      title: '생산관리부 요청사항',
      body: data.content,
      requestId: 'P-TEST-001',
      subtitle: `${data.productName} / ${data.partName}`,
      centerInfo: requestType,
      senderName: userName,
      senderUid: userUid,
      senderAvatar: userAvatar
    };

    await sendNotificationViaFunctions(payload);
    console.log('✅ 생산관리부 요청 테스트 알림 발송 완료:', targetUsers.length, '명');
  } catch (error) {
    console.error('테스트 생산관리부 요청 알림 생성 중 오류 발생:', error);
    throw error;
  }
};
