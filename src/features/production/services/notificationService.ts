import { db } from '@/shared/services/firebase/config';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';

/**
 * 물류이동 알림 테스트 (개발/테스트용)
 */
export const createTestLogisticsNotification = async (userName: string) => {
  if (!db) {
    throw new Error('Firebase가 초기화되지 않았습니다.');
  }

  try {
    const firestore = db!;
    
    // 생산관리부 권한을 가진 사용자 조회
    const usersRef = collection(firestore, 'users');
    const q = query(usersRef, where('role', 'in', ['Admin', 'Manager']));
    const usersSnapshot = await getDocs(q);

    const testContent = `통합 물류 이동 요청 (3건):\n
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

    // 각 사용자의 inbox에 알림 추가
    const notificationPromises = usersSnapshot.docs.map(async (userDoc) => {
      const userId = userDoc.id;
      const inboxRef = collection(firestore, `users/${userId}/inbox`);
      
      const metadata: any = {
        senderName: userName,
        centerInfo: '물류이동',
        productName: '테스트제품A 외 2건'
      };

      return addDoc(inboxRef, {
        title: '생산관리부 요청사항',
        body: testContent.split('\n').slice(0, 3).join('\n') + '...',
        type: 'info',
        read: false,
        createdAt: new Date(),
        link: '/production/management?requestId=P-TEST-001',
        metadata
      });
    });

    await Promise.all(notificationPromises);
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
  productName: string,
  content: string,
  requesterUid: string,
  requesterAvatar?: string
) => {
  if (!db) {
    console.error('Firebase가 초기화되지 않았습니다.');
    return;
  }

  try {
    const firestore = db!; // Null assertion - 이미 위에서 체크함
    
    // 생산관리부 권한을 가진 사용자 조회
    const usersRef = collection(firestore, 'users');
    const q = query(usersRef, where('role', 'in', ['Admin', 'Manager']));
    const usersSnapshot = await getDocs(q);

    // 각 사용자의 inbox에 알림 추가 (작성자 본인 제외)
    const notificationPromises = usersSnapshot.docs
      .filter(userDoc => userDoc.id !== requesterUid) // ✅ 작성자 본인 제외
      .map(async (userDoc) => {
        const userId = userDoc.id;
        const inboxRef = collection(firestore, `users/${userId}/inbox`);
        
        const metadata: any = {
          senderName: requester,
          centerInfo: requestType,
          productName
        };

        // senderAvatar가 있을 때만 추가 (undefined 방지)
        if (requesterAvatar) {
          metadata.senderAvatar = requesterAvatar;
        }
        
        return addDoc(inboxRef, {
          title: '생산관리부 요청사항',
          body: content.split('\n').slice(0, 3).join('\n') + '...',
          type: 'info',
          read: false,
          createdAt: new Date(),
          link: `/production/management?requestId=${requestId}`,
          metadata
        });
      });

    await Promise.all(notificationPromises);
    console.log(`✅ 물류이동 알림이 발송되었습니다. (작성자 제외, ${notificationPromises.length}명)`);
  } catch (error) {
    console.error('알림 생성 중 오류 발생:', error);
    // 알림 실패해도 메인 로직은 계속 진행
  }
};

