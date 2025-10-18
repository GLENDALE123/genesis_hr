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
import { QualityIssue, QualityIssueFormData } from '../types';
import { QualityIssueNotificationService } from './qualityIssueNotificationService';

const COLLECTION_NAME = 'quality-issues';

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
  }
): Promise<string> => {
  try {
    // 이미지 파일들을 Firebase Storage에 업로드
    const imageUrls: string[] = [];
    
    if (imageFiles.length > 0) {
      const { uploadImageFiles } = await import('@/shared/services/firebase/storage');
      imageUrls.push(...await uploadImageFiles(imageFiles, `quality-issues/${Date.now()}`));
    }

    // Firestore에 저장할 데이터 준비
    // 첫 이슈에 작성시간 추가
    const issuesWithTimestamp = formData.issues.map((issue, index) => {
      if (index === 0 && issue.trim()) {
        return {
          content: issue.trim(),
          createdAt: new Date().toISOString(),
          status: 'in-progress'
        };
      }
      return issue; // 기존 문자열 형식 유지 (빈 문자열인 경우)
    }).filter(issue => issue !== ''); // 빈 이슈 제거

    const qualityIssueData = {
      ...formData,
      issues: issuesWithTimestamp,
      imageUrls,
      createdAt: new Date().toISOString(),
      author: {
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
      },
      status: 'in-progress' as const,
    };


    const docRef = await addDoc(getCollectionRef(), qualityIssueData);

    // 알림 발송
    try {
      await QualityIssueNotificationService.sendQualityIssueCreatedNotification(
        { ...qualityIssueData, id: docRef.id } as QualityIssue,
        {
          uid: user.uid,
          displayName: user.displayName,
          photoURL: undefined // 필요시 user 객체에서 photoURL 추가
        }
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
            // Firestore Timestamp를 Date로 변환
            createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
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
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
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
          await QualityIssueNotificationService.sendQualityIssueItemAddedNotification(
            issueId,
            `${issueData.productName} - ${issueData.partName}`,
            newStatus || '해결완료',
            currentUser
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
