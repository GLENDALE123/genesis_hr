import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  arrayUnion
} from 'firebase/firestore';
import { db } from '@/shared/services/firebase/config';
import { QualityIssue, QualityIssueFormData, isIssueItem } from '../types';
import { getUserDisplayName } from '@/shared/utils/userUtils';
import { QualityIssueNotificationService } from '@/shared/services/notificationService';
import { updateAutocompleteData } from './autocompleteService';

const COLLECTION_NAME = 'quality-issues';

/**
 * Firestore에서 가져온 createdAt 값을 ISO 문자열로 변환
 * Firestore Timestamp 객체인 경우 Date로 변환 후 ISO 문자열로,
 * 이미 문자열인 경우 그대로 사용
 */
const convertCreatedAt = (createdAt: unknown): string => {
  // Firestore Timestamp 객체인 경우 (toDate 메서드가 있는지 확인)
  if (createdAt && typeof createdAt === 'object' && 'toDate' in createdAt && typeof (createdAt as any).toDate === 'function') {
    const date = (createdAt as any).toDate();
    if (date instanceof Date && !isNaN(date.getTime())) {
      return date.toISOString();
    }
  }
  
  // 이미 ISO 문자열인 경우
  if (typeof createdAt === 'string' && createdAt) {
    return createdAt;
  }
  
  // Date 객체인 경우
  if (createdAt instanceof Date && !isNaN(createdAt.getTime())) {
    return createdAt.toISOString();
  }
  
  // 변환할 수 없는 경우 기존 값을 문자열로 반환 (현재 시간으로 대체하지 않음)
  return createdAt ? String(createdAt) : new Date().toISOString();
};

/**
 * 품질이슈 컬렉션 참조 가져오기
 */
const getCollectionRef = () => {
  if (!db) throw new Error('Firestore is not initialized');
  return collection(db, COLLECTION_NAME);
};

/**
 * 품질이슈 문서 참조 가져오기
 */
const getDocRef = (docId: string) => {
  if (!db) throw new Error('Firestore is not initialized');
  return doc(db, COLLECTION_NAME, docId);
};

/**
 * 새 품질이슈 생성
 */
export const createQualityIssue = async (
  formData: QualityIssueFormData,
  imageFiles: File[],
  user: {
    uid: string;
    displayName: string;
    email: string;
  },
  userProfile?: {
    displayName?: string;
    email?: string;
  } | null
): Promise<string> => {
  try {
    // 이미지 파일들을 Firebase Storage에 업로드
    const imageUrls: string[] = [];
    
    if (imageFiles.length > 0) {
      const { uploadImageFilesParallel } = await import('@/shared/services/firebase/storage');
      try {
        // 병렬처리 함수 사용 (압축 + 업로드 동시 처리)
        imageUrls.push(...await uploadImageFilesParallel(imageFiles, `quality-issues/${Date.now()}`));
      } catch (error) {
        console.error('이미지 업로드 실패:', error);
        throw new Error(`이미지 업로드 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
      }
    }

    // Firestore에 저장할 데이터 준비
    // 모든 이슈에 작성시간 추가
    const currentTime = new Date().toISOString();
    const issuesWithTimestamp = formData.issues
      .filter(issue => issue.trim() !== '') // 빈 이슈 제거
      .map((issue) => ({
        content: issue.trim(),
        createdAt: currentTime,
        status: 'in-progress'
      }));

    const qualityIssueData = {
      ...formData,
      issues: issuesWithTimestamp,
      imageUrls,
      createdAt: new Date().toISOString(),
      author: {
        uid: user.uid,
        displayName: getUserDisplayName(user, userProfile),
        email: user.email,
      },
      status: 'in-progress' as const,
      // 출하대기 관련 필드 추가
      processedQuantity: 0, // 초기 처리 수량은 0
    };


    const docRef = await addDoc(getCollectionRef(), qualityIssueData);

    // 출하대기 타입이 있으면 autocomplete 데이터 업데이트
    if (formData.shippingWaitType) {
      try {
        await updateAutocompleteData({
          shippingWaitType: formData.shippingWaitType
        });
      } catch (error) {
        console.error('Autocomplete 데이터 업데이트 실패:', error);
      }
    }

    // 알림 발송
    try {
      // 이슈 본문: 첫 이슈 항목(객체면 content, 문자열이면 그대로)
      const firstIssue = qualityIssueData.issues[0];
      const description = typeof firstIssue === 'string' ? firstIssue : (firstIssue && firstIssue.content) || '';
      const status = typeof firstIssue === 'object' && firstIssue && (firstIssue as any).status
        ? String((firstIssue as any).status)
        : String(qualityIssueData.status || 'in-progress');

      await QualityIssueNotificationService.sendQualityIssueNotification(
        qualityIssueData.productName,
        qualityIssueData.partName,
        description,
        status,
        getUserDisplayName(user, userProfile),
        user.uid,
        docRef.id,
        (user as any).photoURL || undefined
      );
    } catch (error) {
      console.error('알림 발송 실패:', error);
    }

    return docRef.id;
  } catch (error) {
    throw error;
  }
};

/**
 * 품질이슈 업데이트
 */
export const updateQualityIssue = async (
  docId: string,
  updateData: Partial<QualityIssue>
): Promise<void> => {
  try {
    const docRef = getDocRef(docId);
    await updateDoc(docRef, {
      ...updateData,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    throw error;
  }
};


/**
 * 품질이슈 목록 실시간 구독
 */
export const subscribeToQualityIssues = (
  callback: (issues: QualityIssue[]) => void,
  onError?: (error: Error) => void
) => {
  try {
    const q = query(
      getCollectionRef(),
      orderBy('createdAt', 'desc'),
      limit(200)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const issues = snapshot.docs.map(doc => {
          const data = doc.data();
          
          return {
            id: doc.id,
            ...data,
            // Firestore Timestamp를 ISO 문자열로 변환
            createdAt: convertCreatedAt(data.createdAt),
          } as QualityIssue;
        });
        callback(issues);
      },
      (error) => {
        onError?.(error);
      }
    );
  } catch (error) {
    onError?.(error as Error);
    return () => {}; // 빈 unsubscribe 함수 반환
  }
};

/**
 * 품질이슈 단일 조회
 */
export const getQualityIssue = async (docId: string): Promise<QualityIssue | null> => {
  try {
    const docRef = getDocRef(docId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        createdAt: convertCreatedAt(data.createdAt),
      } as QualityIssue;
    }
    return null;
  } catch (error) {
    throw error;
  }
};

/**
 * 품질이슈 검색
 */
export const searchQualityIssues = async (
  searchTerm: string,
  filters?: {
    department?: string;
    status?: string;
    priority?: string;
    category?: string;
  }
): Promise<QualityIssue[]> => {
  try {
    // 실제 구현에서는 Firestore 쿼리를 사용하거나
    // 클라이언트 사이드에서 필터링할 수 있습니다.
    // 여기서는 간단하게 전체 데이터를 가져와서 필터링합니다.
    return new Promise((resolve, reject) => {
      const unsubscribe = subscribeToQualityIssues(
        (issues) => {
          unsubscribe();
          let filteredIssues = issues;

          // 텍스트 검색
          if (searchTerm.trim()) {
            const lowercasedTerm = searchTerm.toLowerCase();
            filteredIssues = filteredIssues.filter(issue =>
              issue.orderNumber.toLowerCase().includes(lowercasedTerm) ||
              issue.productName.toLowerCase().includes(lowercasedTerm) ||
              issue.partName.toLowerCase().includes(lowercasedTerm) ||
              issue.supplier.toLowerCase().includes(lowercasedTerm) ||
              (typeof issue.author === 'object' ? issue.author.displayName : issue.author).toLowerCase().includes(lowercasedTerm) ||
              issue.issues.some(i => {
                const content = typeof i === 'string' ? i : i.content;
                return content.toLowerCase().includes(lowercasedTerm);
              })
            );
          }

          // 필터 적용
          if (filters) {
            if (filters.department) {
              filteredIssues = filteredIssues.filter(issue => issue.department === filters.department);
            }
            if (filters.status) {
              filteredIssues = filteredIssues.filter(issue => issue.status === filters.status);
            }
            if (filters.priority) {
              filteredIssues = filteredIssues.filter(issue => issue.priority === filters.priority);
            }
            if (filters.category) {
              filteredIssues = filteredIssues.filter(issue => issue.category === filters.category);
            }
          }

          resolve(filteredIssues);
        },
        reject
      );
    });
  } catch (error) {
    throw error;
  }
};

/**
 * 품질이슈에 새로운 이슈사항을 추가합니다
 */
export const addIssueItem = async (
  issueId: string, 
  newIssueItem: string, 
  newStatus?: string,
  currentUser?: {
    uid: string;
    displayName: string;
    photoURL?: string;
  }
): Promise<void> => {
  try {
    if (!newIssueItem.trim()) {
      throw new Error('이슈 내용을 입력해주세요.');
    }

    if (!db) throw new Error('Firestore is not initialized');
    const issueRef = doc(db, COLLECTION_NAME, issueId);
    
    // 새로운 이슈 객체 생성 (작성시간 포함)
    const newIssueObject = {
      content: newIssueItem.trim(),
      createdAt: new Date().toISOString(),
      status: newStatus || '해결완료'
    };

    const updateData: Record<string, unknown> = {
      issues: arrayUnion(newIssueObject)
    };

    // 상태가 제공된 경우 전체 이슈의 상태도 업데이트
    if (newStatus) {
      updateData.status = newStatus;
      updateData.updatedAt = new Date().toISOString();
    }

    await updateDoc(issueRef, updateData);

    // 이슈 정보 조회 후 알림 발송
    if (currentUser) {
      try {
        const issueDoc = await getDoc(issueRef);
        const issueData = issueDoc.data();
        
        if (issueData) {
          const lastIssue = Array.isArray(issueData.issues) && issueData.issues.length > 0
            ? issueData.issues[issueData.issues.length - 1]
            : undefined;
          const description = lastIssue
            ? (typeof lastIssue === 'string' ? lastIssue : (lastIssue && lastIssue.content) || '')
            : '';

          await QualityIssueNotificationService.sendQualityIssueStatusChangeNotification(
            issueData.status,
            newStatus || '해결완료',
            description,
            (issueData as any).productName || '',
            (issueData as any).partName || '',
            getUserDisplayName(null, currentUser),
            currentUser.uid,
            issueId,
            (currentUser as any).photoURL || undefined
          );
        }
      } catch (error) {
        console.error('알림 발송 실패:', error);
      }
    }

  } catch (error) {
    throw error;
  }
};

/**
 * 품질이슈 상태 변경
 */
export const updateIssueStatus = async (issueId: string, newStatus: string): Promise<void> => {
  try {
    if (!newStatus.trim()) {
      throw new Error('상태를 선택해주세요.');
    }

    if (!db) throw new Error('Firestore is not initialized');
    const issueRef = doc(db, COLLECTION_NAME, issueId);
    await updateDoc(issueRef, {
      status: newStatus.trim(),
      updatedAt: new Date().toISOString()
    });

  } catch (error) {
    throw error;
  }
};

/**
 * 출하대기 처리 수량 업데이트
 */
export const updateProcessedQuantity = async (
  issueId: string, 
  additionalQuantity: number
): Promise<void> => {
  try {
    if (additionalQuantity <= 0) {
      throw new Error('처리 수량은 0보다 커야 합니다.');
    }

    if (!db) throw new Error('Firestore is not initialized');
    const issueRef = doc(db, COLLECTION_NAME, issueId);
    
    // 현재 문서 조회
    const issueDoc = await getDoc(issueRef);
    if (!issueDoc.exists()) {
      throw new Error('품질이슈를 찾을 수 없습니다.');
    }

    const currentData = issueDoc.data() as QualityIssue;
    const currentProcessed = currentData.processedQuantity || 0;
    const totalQuantity = currentData.shippingWaitQuantity || 0;
    
    // 처리 수량이 전체 수량을 초과하지 않도록 검증
    if (currentProcessed + additionalQuantity > totalQuantity) {
      throw new Error(`처리 수량이 전체 수량(${totalQuantity})을 초과할 수 없습니다. 현재 처리: ${currentProcessed}`);
    }

    const newProcessedQuantity = currentProcessed + additionalQuantity;
    
    // 처리완료수량이 전체수량과 동일하거나 넘어가면 해결완료 상태로 변경
    const shouldMarkAsCompleted = newProcessedQuantity >= totalQuantity;
    
    const updateData: Partial<QualityIssue> = {
      processedQuantity: newProcessedQuantity
    };
    
    if (shouldMarkAsCompleted) {
      updateData.status = '해결완료';
    }
    
    await updateDoc(issueRef, updateData);

  } catch (error) {
    throw error;
  }
};

/**
 * 품질이슈 삭제
 */
export const deleteQualityIssue = async (issueId: string): Promise<void> => {
  try {
    if (!db) throw new Error('Firestore is not initialized');
    const issueRef = doc(db, COLLECTION_NAME, issueId);
    await deleteDoc(issueRef);
    
  } catch (error) {
    throw error;
  }
};
