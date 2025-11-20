/**
 * 세션 관리 서비스
 * Firestore를 통한 플랫폼별 단일 세션 관리
 * 같은 플랫폼(웹/일렉트론/모바일)에서는 하나의 기기만 활성화되도록 관리
 */

import { doc, setDoc, getDoc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { db } from '@/shared/services/firebase/config';
import { isElectron, isMobileApp } from '@/shared/utils/platform';

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
 * 현재 기기 세션 등록
 * 기존 세션을 덮어쓰고, 다른 기기에서 세션 변경을 감지할 수 있도록 함
 */
export const registerSession = async (
  uid: string,
  deviceId: string
): Promise<void> => {
  if (!db) throw new Error('Firestore is not initialized');
  
  try {
    const platform = getCurrentPlatform();
    const sessionRef = getSessionRef(uid, platform);
    
    const session: ActiveSession = {
      deviceId,
      platform,
      lastActiveAt: new Date(),
      createdAt: new Date(),
    };
    
    // 기존 세션 덮어쓰기 (같은 플랫폼에서 하나의 세션만 허용)
    await setDoc(sessionRef, {
      ...session,
      lastActiveAt: session.lastActiveAt,
      createdAt: session.createdAt,
    });
    
    console.log(`✅ [SessionService] 세션 등록 완료: ${platform} (deviceId: ${deviceId})`);
  } catch (error) {
    console.error('❌ [SessionService] 세션 등록 실패:', error);
    throw error;
  }
};

/**
 * 현재 플랫폼의 활성 세션 조회
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
      return {
        deviceId: data.deviceId,
        platform: data.platform,
        lastActiveAt: data.lastActiveAt?.toDate() || new Date(),
        createdAt: data.createdAt?.toDate() || new Date(),
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
          const session: ActiveSession = {
            deviceId: data.deviceId,
            platform: data.platform,
            lastActiveAt: data.lastActiveAt?.toDate() || new Date(),
            createdAt: data.createdAt?.toDate() || new Date(),
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
