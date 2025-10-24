import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  query, 
  orderBy, 
  limit, 
  onSnapshot,
  where,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/shared/services/firebase/config';
import { uploadImageFilesParallel } from '@/shared/services/firebase/storage';
import { Announcement, CreateAnnouncementData, UpdateAnnouncementData } from '../types/announcement.types';

const COLLECTION_NAME = 'announcements';

/**
 * 공지사항 서비스 클래스
 * Firestore 'announcements' 컬렉션과 상호작용
 */
export class AnnouncementService {
  /**
   * 공지사항 생성
   */
  static async createAnnouncement(
    data: CreateAnnouncementData,
    author: string
  ): Promise<string> {
    try {
      if (!db) {
        throw new Error('Firebase가 초기화되지 않았습니다.');
      }

      const announcementData = {
        ...data,
        author,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, COLLECTION_NAME), announcementData);
      return docRef.id;
    } catch (error) {
      console.error('공지사항 생성 실패:', error);
      throw new Error('공지사항 생성에 실패했습니다.');
    }
  }

  /**
   * 공지사항 수정
   */
  static async updateAnnouncement(
    id: string,
    data: Partial<CreateAnnouncementData>
  ): Promise<void> {
    try {
      if (!db) {
        throw new Error('Firebase가 초기화되지 않았습니다.');
      }

      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('공지사항 수정 실패:', error);
      throw new Error('공지사항 수정에 실패했습니다.');
    }
  }

  /**
   * 공지사항 삭제
   */
  static async deleteAnnouncement(id: string): Promise<void> {
    try {
      if (!db) {
        throw new Error('Firebase가 초기화되지 않았습니다.');
      }

      const docRef = doc(db, COLLECTION_NAME, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('공지사항 삭제 실패:', error);
      throw new Error('공지사항 삭제에 실패했습니다.');
    }
  }

  /**
   * 공지사항 단일 조회
   */
  static async getAnnouncement(id: string): Promise<Announcement | null> {
    try {
      if (!db) {
        throw new Error('Firebase가 초기화되지 않았습니다.');
      }

      const docRef = doc(db, COLLECTION_NAME, id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Announcement;
      }
      return null;
    } catch (error) {
      console.error('공지사항 조회 실패:', error);
      throw new Error('공지사항 조회에 실패했습니다.');
    }
  }

  /**
   * 공지사항 목록 조회 (최신순)
   */
  static async getAnnouncements(limitCount: number = 100): Promise<Announcement[]> {
    try {
      if (!db) {
        throw new Error('Firebase가 초기화되지 않았습니다.');
      }

      const q = query(
        collection(db, COLLECTION_NAME),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Announcement[];
    } catch (error) {
      console.error('공지사항 목록 조회 실패:', error);
      throw new Error('공지사항 목록 조회에 실패했습니다.');
    }
  }

  /**
   * 공지사항 실시간 구독
   */
  static subscribeToAnnouncements(
    callback: (announcements: Announcement[]) => void,
    limitCount: number = 100
  ): () => void {
    try {
      if (!db) {
        console.error('Firebase가 초기화되지 않았습니다.');
        return () => {};
      }

      const q = query(
        collection(db, COLLECTION_NAME),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      return onSnapshot(q, (querySnapshot) => {
        const announcements = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Announcement[];

        // 공지기간이 있는 공지사항을 우선 정렬
        const sortedAnnouncements = announcements.sort((a, b) => {
          const aHasPlan = !!a.planStartDate;
          const bHasPlan = !!b.planStartDate;

          if (aHasPlan && !bHasPlan) return -1;
          if (!aHasPlan && bHasPlan) return 1;

          const aSortDate = a.planStartDate || a.createdAt;
          const bSortDate = b.planStartDate || b.createdAt;
          return new Date(bSortDate).getTime() - new Date(aSortDate).getTime();
        });

        callback(sortedAnnouncements);
      }, (error) => {
        console.error('공지사항 실시간 구독 오류:', error);
        callback([]);
      });
    } catch (error) {
      console.error('공지사항 구독 설정 실패:', error);
      return () => {};
    }
  }

  /**
   * 이미지 업로드 (진행률 콜백 및 취소 기능 지원)
   */
  static async uploadAnnouncementImages(
    files: File[], 
    onProgress?: (progress: number) => void,
    abortSignal?: AbortSignal
  ): Promise<string[]> {
    try {
      if (files.length === 0) return [];
      
      return await uploadImageFilesParallel(files, 'announcements', onProgress, abortSignal);
    } catch (error) {
      console.error('이미지 업로드 실패:', error);
      throw new Error('이미지 업로드에 실패했습니다.');
    }
  }

  /**
   * 공지사항 검색
   */
  static async searchAnnouncements(searchTerm: string): Promise<Announcement[]> {
    try {
      // Firestore의 제한으로 인해 클라이언트 사이드에서 필터링
      const announcements = await this.getAnnouncements();
      
      return announcements.filter(announcement =>
        announcement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        announcement.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        announcement.author.toLowerCase().includes(searchTerm.toLowerCase())
      );
    } catch (error) {
      console.error('공지사항 검색 실패:', error);
      throw new Error('공지사항 검색에 실패했습니다.');
    }
  }

  /**
   * 기간별 공지사항 조회
   */
  static async getAnnouncementsByDateRange(
    startDate: string,
    endDate: string
  ): Promise<Announcement[]> {
    try {
      const announcements = await this.getAnnouncements();
      
      return announcements.filter(announcement => {
        const announcementDate = announcement.planStartDate || announcement.createdAt;
        return announcementDate >= startDate && announcementDate <= endDate;
      });
    } catch (error) {
      console.error('기간별 공지사항 조회 실패:', error);
      throw new Error('기간별 공지사항 조회에 실패했습니다.');
    }
  }
}
