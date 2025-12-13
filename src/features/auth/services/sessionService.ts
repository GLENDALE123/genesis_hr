/**
 * 세션 관리 서비스
 * Firestore를 통한 플랫폼별 단일 세션 관리
 * 같은 플랫폼(웹/일렉트론/모바일)에서는 하나의 기기만 활성화되도록 관리
 * 서버 타임스탬프를 사용하여 한국 시간(UTC+9)으로 저장
 */

import { doc, setDoc, getDoc, onSnapshot, deleteDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/shared/services/firebase/config';
import { isElectron, isMobileApp } from '@/shared/utils/platform/platform';
import { getKoreaTime } from '@/shared/utils/date/dateUtils';

export type PlatformType = 'web' | 'electron' | 'mobile';

export interface ActiveSession {
  deviceId: string;
  platform: PlatformType;
  lastActiveAt: Date;
  createdAt: Date;
}

/**
 * 현재 플랫폼 타입 가져오기
 */
const getCurrentPlatform = (): PlatformType => {
  if (isElectron()) return 'electron';
  if (isMobileApp()) return 'mobile';
  return 'web';
};

/**
 * 세션 문서 참조 가져오기
 */
const getSessionRef = (uid: string, platform: PlatformType) => {
  if (!db) throw new Error('Firestore is not initialized');
  return doc(db, `users/${uid}/sessions/${platform}`);
};

/**
 * Firestore Timestamp를 한국 시간(UTC+9)으로 변환
 * 서버 타임스탬프(UTC)를 한국 시간으로 변환하여 반환
 * 
 * Firestore Timestamp는 내부적으로 UTC seconds를 저장하므로,
 * seconds를 직접 사용하여 UTC 시간을 계산한 후 한국 시간 오프셋(+9시간)을 추가합니다.
 */
const convertToKoreaTime = (timestamp: Timestamp | Date | null | undefined): Date => {
  if (!timestamp) {
    return getKoreaTime();
  }
  
  // Firestore Timestamp인 경우 (서버 타임스탬프는 UTC)
  if (timestamp instanceof Timestamp || (typeof timestamp === 'object' && 'toDate' in timestamp && 'seconds' in timestamp)) {
    // Timestamp의 seconds를 직접 사용하여 UTC 시간 계산
    const timestampObj = timestamp instanceof Timestamp 
      ? timestamp 
      : (timestamp as { seconds: number; nanoseconds?: number });
    
    // seconds를 밀리초로 변환 (UTC 기준)
    const utcTimeMs = timestampObj.seconds * 1000 + (timestampObj.nanoseconds || 0) / 1000000;
    // UTC 시간에 한국 시간대 오프셋(+9시간) 추가
    const koreaTime = new Date(utcTimeMs + 9 * 60 * 60 * 1000);
    return koreaTime;
  }
  
  // Date 객체인 경우
  // Date 객체는 이미 로컬 시간대로 해석되므로, UTC로 변환 후 한국 시간으로
  if (timestamp instanceof Date) {
    // Date 객체의 UTC 시간을 얻기 위해 getTime() 사용 (이미 UTC 기준 밀리초)
    const utcTimeMs = timestamp.getTime();
    // UTC 시간에 한국 시간대 오프셋(+9시간) 추가
    const koreaTime = new Date(utcTimeMs + 9 * 60 * 60 * 1000);
    return koreaTime;
  }
  
  return getKoreaTime();
};

/**
 * 현재 기기 세션 등록
 * 기존 세션을 덮어쓰고, 다른 기기에서 세션 변경을 감지할 수 있도록 함
 * 서버 타임스탬프를 사용하여 한국 시간(UTC+9)으로 저장
 */
export const registerSession = async (
  uid: string,
  deviceId: string
): Promise<void> => {
  if (!db) throw new Error('Firestore is not initialized');
  
  try {
    const platform = getCurrentPlatform();
    const sessionRef = getSessionRef(uid, platform);
    
    // 기존 세션 확인 (createdAt 보존을 위해)
    const existingSession = await getDoc(sessionRef);
    const hasExistingSession = existingSession.exists();
    
    // serverTimestamp()를 사용하여 서버 시간 저장 (UTC)
    // 읽을 때 한국 시간으로 변환하여 사용
    
    if (hasExistingSession) {
      // 기존 세션이 있으면 updateDoc 사용 (createdAt 보존)
      await updateDoc(sessionRef, {
        deviceId,
        platform,
        lastActiveAt: serverTimestamp(),
        // createdAt은 업데이트하지 않음 (기존 값 보존)
      });
    } else {
      // 새 세션이면 setDoc 사용 (createdAt 포함)
      await setDoc(sessionRef, {
        deviceId,
        platform,
        lastActiveAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      });
    }
    
    console.log(`✅ [SessionService] 세션 등록 완료: ${platform} (deviceId: ${deviceId})`);
  } catch (error) {
    console.error('❌ [SessionService] 세션 등록 실패:', error);
    throw error;
  }
};

/**
 * 현재 플랫폼의 활성 세션 조회
 * 서버 타임스탬프를 한국 시간으로 변환하여 반환
 */
export const getActiveSession = async (
  uid: string
): Promise<ActiveSession | null> => {
  if (!db) throw new Error('Firestore is not initialized');
  
  try {
    const platform = getCurrentPlatform();
    const sessionRef = getSessionRef(uid, platform);
    const sessionDoc = await getDoc(sessionRef);
    
    if (sessionDoc.exists()) {
      const data = sessionDoc.data();
      
      // 서버 타임스탬프를 한국 시간으로 변환
      const lastActiveAt = convertToKoreaTime(data.lastActiveAt);
      const createdAt = convertToKoreaTime(data.createdAt);
      
      return {
        deviceId: data.deviceId,
        platform: data.platform,
        lastActiveAt,
        createdAt,
      };
    }
    
    return null;
  } catch (error) {
    console.error('❌ [SessionService] 세션 조회 실패:', error);
    return null;
  }
};

/**
 * 세션 변경 감지 리스너
 * 다른 기기에서 로그인하여 세션이 변경되면 콜백 호출
 */
export const onSessionChange = (
  uid: string,
  currentDeviceId: string,
  callback: (session: ActiveSession | null) => void
): (() => void) => {
  if (!db) {
    console.error('❌ [SessionService] Firestore is not initialized');
    return () => {}; // 빈 cleanup 함수 반환
  }
  
  try {
    const platform = getCurrentPlatform();
    const sessionRef = getSessionRef(uid, platform);
    
    let isFirstSnapshot = true; // 첫 번째 스냅샷(초기 로드) 플래그
    let lastSessionDeviceId: string | null = null; // 마지막으로 본 세션의 deviceId
    
    // 세션 변경 감지 리스너
    const unsubscribe = onSnapshot(
      sessionRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          
          // 서버 타임스탬프를 한국 시간으로 변환
          const lastActiveAt = convertToKoreaTime(data.lastActiveAt);
          const createdAt = convertToKoreaTime(data.createdAt);
          
          const session: ActiveSession = {
            deviceId: data.deviceId,
            platform: data.platform,
            lastActiveAt,
            createdAt,
          };
          
          // 첫 번째 스냅샷(초기 로드)은 무시하고, 현재 세션의 deviceId만 저장
          // metadata.fromCache를 체크하여 캐시에서 온 초기 로드인지 확인
          const isInitialLoad = isFirstSnapshot && !snapshot.metadata.hasPendingWrites;
          
          if (isInitialLoad || isFirstSnapshot) {
            lastSessionDeviceId = session.deviceId;
            isFirstSnapshot = false;
            console.log(`📋 [SessionService] 초기 세션 로드: deviceId=${session.deviceId}, 현재 기기=${currentDeviceId}, fromCache=${snapshot.metadata.fromCache}, hasPendingWrites=${snapshot.metadata.hasPendingWrites}`);
            
            // 현재 기기의 세션이면 초기 로드만 기록하고 종료
            if (session.deviceId === currentDeviceId) {
              return;
            }
          } else {
            // 두 번째 스냅샷부터는 실제 변경 감지
            // deviceId가 변경되었고, 현재 기기의 deviceId와 다를 때만 콜백 호출
            if (session.deviceId !== lastSessionDeviceId && session.deviceId !== currentDeviceId) {
              // 다른 기기에서 로그인한 경우
              console.log(`🔄 [SessionService] 세션 변경 감지: 다른 기기에서 로그인 감지`);
              console.log(`   - 기존 deviceId: ${lastSessionDeviceId}`);
              console.log(`   - 새로운 deviceId: ${session.deviceId}`);
              console.log(`   - 현재 기기 deviceId: ${currentDeviceId}`);
              console.log(`   - 세션 등록 시간: ${new Date(session.lastActiveAt).toISOString()}`);
              console.log(`   - 로컬 localStorage device-id: ${typeof window !== 'undefined' ? localStorage.getItem('device-id') : 'N/A'}`);
              lastSessionDeviceId = session.deviceId;
              callback(session);
            } else {
              // deviceId가 변경되지 않았거나, 현재 기기의 세션인 경우
              // (같은 기기에서 lastActiveAt만 업데이트된 경우 포함)
              if (session.deviceId === currentDeviceId) {
                console.log(`ℹ️ [SessionService] 현재 기기 세션 업데이트 - 무시 (deviceId: ${session.deviceId})`);
              } else {
                console.log(`ℹ️ [SessionService] 세션 변경 없음 - 무시 (deviceId: ${session.deviceId})`);
              }
              // lastSessionDeviceId 업데이트 (같은 deviceId이거나 현재 기기인 경우)
              lastSessionDeviceId = session.deviceId;
            }
          }
        } else {
          // 세션이 삭제된 경우
          if (!isFirstSnapshot) {
            lastSessionDeviceId = null;
            callback(null);
          }
        }
      },
      (error) => {
        console.error('❌ [SessionService] 세션 변경 감지 에러:', error);
      }
    );
    
    return unsubscribe;
  } catch (error) {
    console.error('❌ [SessionService] 세션 변경 감지 리스너 등록 실패:', error);
    return () => {}; // 빈 cleanup 함수 반환
  }
};

/**
 * 세션 삭제
 */
export const clearSession = async (uid: string): Promise<void> => {
  if (!db) throw new Error('Firestore is not initialized');
  
  try {
    const platform = getCurrentPlatform();
    const sessionRef = getSessionRef(uid, platform);
    await deleteDoc(sessionRef);
    
    console.log(`✅ [SessionService] 세션 삭제 완료: ${platform}`);
  } catch (error) {
    console.error('❌ [SessionService] 세션 삭제 실패:', error);
    throw error;
  }
};

/**
 * 현재 플랫폼 타입 가져오기 (외부에서 사용 가능)
 */
export const getCurrentPlatformType = (): PlatformType => {
  return getCurrentPlatform();
};
