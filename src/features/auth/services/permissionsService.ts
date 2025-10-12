import { 
  getDocument, 
  getDocuments,
  updateDocument 
} from '@/shared/services/firebase/firestore';
import { db } from '@/shared/services/firebase/config';
import { 
  doc, 
  setDoc, 
  getDoc 
} from 'firebase/firestore';
import { toDate } from '@/shared/utils/dateUtils';
import type { UserPermissions, PagePermissions, PageIdentifier, CrudPermission } from '../types/permissions';
import type { UserProfile } from '../types';

const PERMISSIONS_COLLECTION = 'user-permissions';
const USERS_COLLECTION = 'users';

/**
 * 권한 관리 서비스
 * Firestore에 사용자별 페이지 권한 저장/조회
 */
export class PermissionsService {
  /**
   * 사용자 권한 저장
   */
  static async saveUserPermissions(
    userId: string,
    permissions: UserPermissions,
    adminUid: string
  ): Promise<void> {
    if (!db) throw new Error('Firestore is not initialized');
    
    const permissionsData = {
      ...permissions,
      updatedAt: new Date(),
      createdBy: adminUid
    };
    
    await setDoc(doc(db, PERMISSIONS_COLLECTION, userId), permissionsData);
  }

  /**
   * 사용자 권한 조회
   */
  static async getUserPermissions(userId: string): Promise<UserPermissions | null> {
    if (!db) throw new Error('Firestore is not initialized');
    
    try {
      const permissionsDoc = await getDoc(doc(db, PERMISSIONS_COLLECTION, userId));
      
      if (permissionsDoc.exists()) {
        const data = permissionsDoc.data();
        return {
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as UserPermissions;
      }
      
      return null;
    } catch (error) {
      console.error('사용자 권한 조회 실패:', error);
      return null;
    }
  }

  /**
   * 특정 페이지의 권한 조회
   */
  static async getPagePermissions(
    userId: string, 
    pageId: PageIdentifier
  ): Promise<PagePermissions | null> {
    const userPermissions = await this.getUserPermissions(userId);
    
    if (!userPermissions || !userPermissions.pagePermissions) return null;
    
    // pagePermissions는 Record 타입이므로 직접 접근
    return userPermissions.pagePermissions[pageId] || null;
  }

  /**
   * 특정 권한이 있는지 체크
   */
  static async checkPermission(
    userId: string,
    pageId: PageIdentifier,
    permission: CrudPermission
  ): Promise<boolean> {
    const pagePermissions = await this.getPagePermissions(userId, pageId);
    
    if (!pagePermissions) return false;
    
    return pagePermissions.crudPermissions.includes(permission);
  }

  /**
   * 커스텀 권한 체크
   */
  static async checkCustomPermission(
    userId: string,
    pageId: PageIdentifier,
    customPermissionKey: string
  ): Promise<boolean> {
    const pagePermissions = await this.getPagePermissions(userId, pageId);
    
    if (!pagePermissions || !pagePermissions.customPermissions) return false;
    
    return (pagePermissions.customPermissions as any)[customPermissionKey] || false;
  }

  /**
   * 모든 사용자 권한 목록 조회 (Admin용)
   */
  static async getAllUserPermissions(): Promise<UserPermissions[]> {
    try {
      // ✅ 공통 서비스 사용
      const docs = await getDocuments(PERMISSIONS_COLLECTION);
      
      return docs.map(doc => {
        const data = doc as any;
        return {
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt),
        } as UserPermissions;
      });
    } catch (error) {
      console.error('모든 사용자 권한 조회 실패:', error);
      return [];
    }
  }

  /**
   * 특정 사용자의 특정 페이지에 대한 권한을 가져옵니다.
   */
  static async getUserPagePermissions(
    userId: string,
    pageId: PageIdentifier
  ): Promise<PagePermissions | null> {
    try {
      if (!db) throw new Error('Firebase is not initialized');
      if (!userId) {
        console.warn('getUserPagePermissions called with undefined userId');
        return null;
      }

      const docRef = doc(db, PERMISSIONS_COLLECTION, userId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // pagePermissions가 존재하고 객체 형태인지 확인
        if (!data || !data.pagePermissions || typeof data.pagePermissions !== 'object') {
          return null;
        }
        
        const userPermissions = data as UserPermissions;
        const pagePermission = userPermissions.pagePermissions[pageId];
        
        // pagePermission이 유효한 구조인지 확인
        if (!pagePermission) {
          return null;
        }
        
        return pagePermission;
      }
      return null;
    } catch (error) {
      console.error(`권한 조회 실패 (userId: ${userId}, pageId: ${pageId}):`, error);
      return null;
    }
  }

  /**
   * 특정 사용자의 특정 페이지에 대한 권한을 설정합니다.
   */
  static async setUserPagePermissions(
    userId: string,
    pageId: PageIdentifier,
    permissions: PagePermissions
  ): Promise<void> {
    try {
      if (!db) throw new Error('Firebase is not initialized');

      const docRef = doc(db, PERMISSIONS_COLLECTION, userId);
      const docSnap = await getDoc(docRef);

      let userPermissions: UserPermissions;
      if (docSnap.exists()) {
        userPermissions = docSnap.data() as UserPermissions;
      } else {
        userPermissions = { 
          userId, 
          pagePermissions: {} as Record<PageIdentifier, PagePermissions> 
        };
      }

      userPermissions.pagePermissions[pageId] = permissions;

      await setDoc(docRef, userPermissions, { merge: true });
      console.log(`Permissions set for user ${userId} on page ${pageId}`);
    } catch (error) {
      console.error(`Error setting permissions for user ${userId} on page ${pageId}:`, error);
      throw error;
    }
  }

  /**
   * 모든 사용자 프로필을 가져옵니다.
   */
  static async getAllUserProfiles(): Promise<UserProfile[]> {
    try {
      // ✅ 공통 서비스 사용
      const docs = await getDocuments(USERS_COLLECTION);
      
      const usersList = docs.map(doc => {
        const data = doc as any;
        
        return {
          ...data,
          uid: data.uid || data.id, // uid가 없으면 문서 ID 사용
          createdAt: toDate(data.createdAt),
          updatedAt: toDate(data.updatedAt),
          lastLoginAt: data.lastLoginAt ? toDate(data.lastLoginAt) : undefined,
        } as UserProfile;
      });

      // 역할별 정렬 (Admin → Manager → Member)
      usersList.sort((a, b) => {
        const roleOrder = { Admin: 0, Manager: 1, Member: 2 };
        return roleOrder[a.role] - roleOrder[b.role];
      });

      return usersList;
    } catch (error) {
      console.error('Error fetching all user profiles:', error);
      throw error;
    }
  }
}

