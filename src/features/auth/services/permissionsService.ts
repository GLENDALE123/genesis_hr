import { db } from '@/shared/services/firebase/config';
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore';
import type { UserPermissions, PagePermissions, PageIdentifier, CrudPermission } from '../types/permissions';

const PERMISSIONS_COLLECTION = 'user-permissions';

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
    
    if (!userPermissions) return null;
    
    return userPermissions.pagePermissions.find(p => p.pageId === pageId) || null;
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
    if (!db) throw new Error('Firestore is not initialized');
    
    try {
      const querySnapshot = await getDocs(collection(db, PERMISSIONS_COLLECTION));
      
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as UserPermissions;
      });
    } catch (error) {
      console.error('모든 사용자 권한 조회 실패:', error);
      return [];
    }
  }
}

