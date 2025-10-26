/**
 * Sample Requests Firebase 서비스
 * PackagingReportsService 패턴 참고
 */

import { db } from '@/shared/services/firebase/config';
import {
  collection,
  query,
  orderBy,
  where,
  getDocs,
  getDoc,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  arrayUnion
} from 'firebase/firestore';
import { uploadImageFilesParallel } from '@/shared/services/firebase/storage';
import { getUserDisplayName } from '@/shared/utils/userUtils';
import {
  SampleRequest,
  SampleFormData,
  SampleStatus,
  SampleHistoryItem
} from '../types';
import { SAMPLE_REQUESTS_COLLECTION } from '../constants';
import { SampleStatusNotificationService } from '@/shared/services/notificationService';

interface RequestUser {
  uid: string;
  displayName?: string | null;
  email?: string | null;
}

/**
 * Sample Requests Firebase 서비스
 */
export class SampleService {
  /**
   * 새로운 샘플 요청 생성
   */
  static async createSampleRequest(
    formData: SampleFormData,
    user: RequestUser,
    imageFiles: File[] = []
  ): Promise<string> {
    try {
      if (!db) {
        throw new Error('Firebase not initialized');
      }

      // 이미지 업로드
      let imageUrls: string[] = [];
      if (imageFiles.length > 0) {
        imageUrls = await uploadImageFilesParallel(imageFiles, 'sample-requests');
      }

      const requestData: Omit<SampleRequest, 'id'> = {
        ...formData,
        status: SampleStatus.Received,
        imageUrls,
        workData: {
          undercoat: { conditions: '', remarks: '' },
          midcoat: { conditions: '', remarks: '' },
          topcoat: { conditions: '', remarks: '' },
        },
        requesterInfo: {
          uid: user.uid,
          displayName: getUserDisplayName(null, user, '알 수 없음')
        },
        history: [
          {
            status: SampleStatus.Received,
            date: new Date().toISOString(),
            by: getUserDisplayName(null, user, '알 수 없음')
          }
        ],
        comments: [],
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(
        collection(db, SAMPLE_REQUESTS_COLLECTION),
        requestData
      );

      console.log('✅ 샘플 요청 생성 완료:', docRef.id);
      
      // 상태변경 알림 전송 (Admin/Manager에게) - 등록 시 "대기중" 상태로 알림
      try {
        const createdRequest: SampleRequest = {
          id: docRef.id,
          ...requestData
        };
        await SampleStatusNotificationService.sendSampleStatusChangeNotification(
          undefined, // 이전 상태 없음
          'pending', // 기본 상태는 대기중
          createdRequest.clientName,
          createdRequest.productName,
          getUserDisplayName(null, user, '알 수 없음'),
          user.uid,
          createdRequest.id,
          (createdRequest.items && createdRequest.items.length > 0) ? createdRequest.items[0].partName : undefined
        );
      } catch (error) {
        console.error('❌ 샘플 요청 알림 전송 실패:', error);
        // 알림 실패는 요청 생성에 영향 없음
      }
      
      return docRef.id;
    } catch (error) {
      console.error('❌ 샘플 요청 생성 실패:', error);
      throw error;
    }
  }

  /**
   * 샘플 요청 수정
   */
  static async updateSampleRequest(
    id: string,
    formData: SampleFormData,
    user: RequestUser
  ): Promise<void> {
    try {
      if (!db) {
        throw new Error('Firebase not initialized');
      }

      const docRef = doc(db, SAMPLE_REQUESTS_COLLECTION, id);
      
      await updateDoc(docRef, {
        ...formData,
        updatedAt: new Date().toISOString(),
        updatedBy: {
          uid: user.uid,
          displayName: getUserDisplayName(null, user, '알 수 없음')
        }
      });

      console.log('✅ 샘플 요청 수정 완료:', id);
    } catch (error) {
      console.error('❌ 샘플 요청 수정 실패:', error);
      throw error;
    }
  }

  /**
   * 샘플 요청 상태 변경
   */
  static async updateSampleStatus(
    id: string,
    status: SampleStatus,
    user: RequestUser,
    reason?: string,
    workData?: SampleRequest['workData']
  ): Promise<void> {
    try {
      if (!db) {
        throw new Error('Firebase not initialized');
      }

      const docRef = doc(db, SAMPLE_REQUESTS_COLLECTION, id);
      
      // 현재 상태 조회
      const currentDoc = await getDoc(docRef);
      if (!currentDoc.exists()) {
        throw new Error('샘플 요청을 찾을 수 없습니다.');
      }
      
      const currentData = currentDoc.data() as SampleRequest;
      const oldStatus = currentData.status;
      
      const historyItem: SampleHistoryItem = {
        status,
        date: new Date().toISOString(),
        by: getUserDisplayName(user, null, '알 수 없음'),
        ...(reason && { reason })
      };

      const updateData: Record<string, unknown> = {
        status,
        history: arrayUnion(historyItem),
        updatedAt: new Date().toISOString()
      };

      if (workData) {
        updateData.workData = workData;
      }

      await updateDoc(docRef, updateData);

      console.log('✅ 샘플 요청 상태 변경 완료:', id, status);
      
      // 상태변경 알림 전송
      try {
        const updatedRequest: SampleRequest = {
          ...currentData,
          id,
          status,
          workData: workData || currentData.workData
        };
        
        await SampleStatusNotificationService.sendSampleStatusChangeNotification(
          oldStatus,
          status,
          updatedRequest.clientName,
          updatedRequest.productName,
          getUserDisplayName(null, user, '알 수 없음'),
          user.uid,
          updatedRequest.id,
          (updatedRequest.items && updatedRequest.items.length > 0) ? updatedRequest.items[0].partName : undefined
        );
      } catch (error) {
        console.error('❌ 샘플 상태변경 알림 전송 실패:', error);
        // 알림 실패는 상태 변경에 영향 없음
      }
    } catch (error) {
      console.error('❌ 샘플 요청 상태 변경 실패:', error);
      throw error;
    }
  }

  /**
   * 작업 데이터 수정
   */
  static async updateWorkData(
    id: string,
    workData: SampleRequest['workData']
  ): Promise<void> {
    try {
      if (!db) {
        throw new Error('Firebase not initialized');
      }

      const docRef = doc(db, SAMPLE_REQUESTS_COLLECTION, id);
      
      await updateDoc(docRef, {
        workData,
        updatedAt: new Date().toISOString()
      });

      console.log('✅ 작업 데이터 수정 완료:', id);
    } catch (error) {
      console.error('❌ 작업 데이터 수정 실패:', error);
      throw error;
    }
  }

  /**
   * 샘플 요청 삭제
   */
  static async deleteSampleRequest(
    id: string,
    user?: RequestUser,
    sampleRequest?: SampleRequest
  ): Promise<void> {
    try {
      if (!db) {
        throw new Error('Firebase not initialized');
      }

      // 삭제 전 데이터 조회 (알림용)
      let requestData = sampleRequest;
      if (!requestData) {
        const docRef = doc(db, SAMPLE_REQUESTS_COLLECTION, id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          requestData = { id, ...docSnap.data() } as SampleRequest;
        }
      }

      const docRef = doc(db, SAMPLE_REQUESTS_COLLECTION, id);
      await deleteDoc(docRef);

      console.log('✅ 샘플 요청 삭제 완료:', id);
      
      // 삭제 알림 전송
      if (requestData && user) {
        try {
          // 삭제 알림은 별도 함수가 없으므로 상태 변경 알림으로 대체
          await SampleStatusNotificationService.sendSampleStatusChangeNotification(
            requestData.status,
            'deleted',
            requestData.clientName,
            requestData.productName,
            getUserDisplayName(null, user, '알 수 없음'),
            user.uid,
            requestData.id,
            (requestData.items && requestData.items.length > 0) ? requestData.items[0].partName : undefined
          );
        } catch (error) {
          console.error('❌ 샘플 삭제 알림 전송 실패:', error);
          // 알림 실패는 삭제에 영향 없음
        }
      }
    } catch (error) {
      console.error('❌ 샘플 요청 삭제 실패:', error);
      throw error;
    }
  }

  /**
   * 샘플 신규 요청 알림 전송
   */
  public static async sendNewSampleRequestNotification(
    requestId: string,
    formData: SampleFormData,
    user: RequestUser
  ): Promise<void> {
    try {
      // Admin/Manager 사용자 조회
      const usersRef = collection(db!, 'users');
      const q = query(usersRef, where('role', 'in', ['Admin', 'Manager']));
      const usersSnapshot = await getDocs(q);
      
      const targetUsers = usersSnapshot.docs
        .filter(doc => doc.id !== user.uid)
        .map(doc => doc.id);
      
      if (targetUsers.length === 0) {
        console.log('알림 대상이 없습니다.');
        return;
      }
      
      // Functions URL
      const functionsUrl = 'https://asia-northeast3-hs-jig-b2093.cloudfunctions.net';
      
      const payload = {
        targetUsers,
        type: 'sample-request',
        title: '샘플 요청',
        body: `${getUserDisplayName(null, user)}님이 샘플 요청을 등록했습니다.`,
        requestId,
        subtitle: `${formData.productName}/${formData.items.length > 0 ? formData.items[0].partName : ''}`,
        senderName: getUserDisplayName(null, user),
        senderUid: user.uid,
        priority: 'normal'
      };
      
      const response = await fetch(`${functionsUrl}/createNotification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        console.error('샘플 요청 알림 전송 실패:', response.status);
      } else {
        console.log('✅ 샘플 요청 알림 전송 완료:', targetUsers.length, '명');
      }
    } catch (error) {
      console.error('샘플 요청 알림 전송 중 오류:', error);
      throw error;
    }
  }

  /**
   * 샘플 요청 단일 조회
   */
  static async getSampleRequestById(id: string): Promise<SampleRequest | null> {
    try {
      if (!db) {
        throw new Error('Firebase not initialized');
      }

      const docRef = doc(db, SAMPLE_REQUESTS_COLLECTION, id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        } as SampleRequest;
      }

      return null;
    } catch (error) {
      console.error('❌ 샘플 요청 조회 실패:', error);
      throw error;
    }
  }

  /**
   * 샘플 요청 목록 조회
   */
  static async getSampleRequests(): Promise<SampleRequest[]> {
    try {
      if (!db) {
        throw new Error('Firebase not initialized');
      }

      const q = query(
        collection(db, SAMPLE_REQUESTS_COLLECTION),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const requests: SampleRequest[] = [];

      querySnapshot.forEach((doc) => {
        requests.push({
          id: doc.id,
          ...doc.data()
        } as SampleRequest);
      });

      console.log(`✅ 샘플 요청 ${requests.length}건 조회 완료`);
      return requests;
    } catch (error) {
      console.error('❌ 샘플 요청 목록 조회 실패:', error);
      throw error;
    }
  }

  /**
   * 샘플 요청 실시간 구독
   */
  static subscribeToSampleRequests(
    callback: (requests: SampleRequest[]) => void
  ): () => void {
    if (!db) {
      throw new Error('Firebase not initialized');
    }

    const q = query(
      collection(db, SAMPLE_REQUESTS_COLLECTION),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const requests: SampleRequest[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          requests.push({
            id: doc.id,
            ...data
          } as SampleRequest);
          
          // 댓글이 있는 요청 디버깅
          if (data.comments && data.comments.length > 0) {
            console.log(`🔍 [실시간 구독] ${doc.id} 댓글 데이터:`, data.comments.map((c: Record<string, unknown>) => ({
              id: c.id,
              readBy: c.readBy || []
            })));
          }
        });
        callback(requests);
      },
      (error) => {
        console.error('❌ 샘플 요청 실시간 구독 에러:', error);
      }
    );

    return unsubscribe;
  }

  /**
   * 이미지 추가 업로드 (참고 이미지)
   */
  static async uploadSampleImage(id: string, file: File): Promise<string> {
    try {
      if (!db) {
        throw new Error('Firebase not initialized');
      }

      // 이미지 업로드
      const imageUrls = await uploadImageFilesParallel([file], 'sample-requests');
      const imageUrl = imageUrls[0];

      // Firestore 업데이트
      const docRef = doc(db, SAMPLE_REQUESTS_COLLECTION, id);
      await updateDoc(docRef, {
        imageUrls: arrayUnion(imageUrl)
      });

      console.log('✅ 참고 이미지 업로드 완료:', imageUrl);
      return imageUrl;
    } catch (error) {
      console.error('❌ 참고 이미지 업로드 실패:', error);
      throw error;
    }
  }

  /**
   * 작업 이미지 업로드
   */
  static async uploadWorkImage(id: string, file: File): Promise<string> {
    try {
      if (!db) {
        throw new Error('Firebase not initialized');
      }

      // 이미지 업로드
      const imageUrls = await uploadImageFilesParallel([file], 'sample-work-images');
      const imageUrl = imageUrls[0];

      // Firestore 업데이트
      const docRef = doc(db, SAMPLE_REQUESTS_COLLECTION, id);
      await updateDoc(docRef, {
        workImageUrls: arrayUnion(imageUrl),
        updatedAt: new Date().toISOString()
      });

      console.log('✅ 작업 이미지 업로드 완료:', imageUrl);
      return imageUrl;
    } catch (error) {
      console.error('❌ 작업 이미지 업로드 실패:', error);
      throw error;
    }
  }
}


