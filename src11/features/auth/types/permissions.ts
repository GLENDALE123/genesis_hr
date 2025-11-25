/**
 * 페이지별 권한 관리 시스템
 * Admin이 사용자별로 페이지/기능별 권한을 세밀하게 제어
 */

// 기본 CRUD 권한
export type CrudPermission = 'read' | 'create' | 'update' | 'delete';

// 페이지 식별자
export type PageIdentifier = 
  | 'dashboard'
  | 'production-daily-report'  // 생산일보
  | 'production-shortage-management'  // 생산 부족 관리
  | 'employees'
  | 'payroll'
  | 'settings';

// 페이지별 커스텀 권한 정의
export interface CustomPermissions {
  // 생산일보 커스텀 권한
  'production-daily-report'?: {
    viewProcessConditions?: boolean;  // 공정조건 보기
    viewMemo?: boolean;                // 메모 보기
    exportExcel?: boolean;             // 엑셀 내보내기
    viewSummary?: boolean;             // 통계 요약 보기
  };
  
  // 직원 관리 커스텀 권한
  'employees'?: {
    viewSalary?: boolean;              // 급여 정보 보기
    viewPersonalInfo?: boolean;        // 개인정보 보기
  };
  
  // 급여 관리 커스텀 권한
  'payroll'?: {
    viewAllPayroll?: boolean;          // 전체 급여 보기
    approvePayroll?: boolean;          // 급여 승인
  };
}

// 페이지별 권한 설정
export interface PagePermissions {
  pageId: PageIdentifier;
  crudPermissions: CrudPermission[];  // CRUD 권한 배열
  customPermissions?: CustomPermissions[keyof CustomPermissions]; // 커스텀 권한
}

// 사용자별 권한 설정
export interface UserPermissions {
  userId: string;                     // 사용자 UID
  email?: string;                     // 사용자 이메일
  displayName?: string;               // 사용자 이름
  globalRole?: 'Admin' | 'Manager' | 'Member';  // 전역 역할
  pagePermissions: Record<PageIdentifier, PagePermissions>; // 페이지별 세부 권한 (객체 형태)
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;                 // 권한을 설정한 관리자 UID
}

// 권한 체크 헬퍼 타입
export interface PermissionCheck {
  canRead: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  customPermissions: Record<string, boolean>;
}

