/**
 * 사용자 동기화 마이그레이션 타입 정의
 */

export interface UserSyncMismatch {
  uid: string;
  email?: string;
  firestore: string | null;
  auth: string | null;
  firestoreEmail?: string;
  authEmail?: string;
  suggestedName?: string;
  suggestedPosition?: string | null;
}

export interface UserSyncMismatches {
  displayName: { count: number; details: UserSyncMismatch[] };
  email: { count: number; details: UserSyncMismatch[] };
  photoURL: { count: number; details: UserSyncMismatch[] };
  phoneNumber: { count: number; details: UserSyncMismatch[] };
}

export interface UserSyncMatch {
  uid: string;
  email?: string;
  value?: string | null;
  firestoreEmail?: string;
  authEmail?: string;
  suggestedName?: string;
  suggestedPosition?: string | null;
}

export interface UserSyncMatches {
  displayName: { count: number; details: UserSyncMatch[] };
  email: { count: number; details: UserSyncMatch[] };
  photoURL: { count: number; details: UserSyncMatch[] };
  phoneNumber: { count: number; details: UserSyncMatch[] };
}

export interface UserSyncAnalysis {
  totalAuthUsers: number;
  totalFirestoreUsers: number;
  matchedUsers: number;
  mismatches: UserSyncMismatches;
  matches: UserSyncMatches;
  missingInFirestore: Array<{ uid: string; email?: string; authDisplayName?: string; shouldDelete?: boolean }>;
  missingInAuth: Array<{ uid: string; email?: string; displayName?: string }>;
}

export interface AnalyzeUserSyncResponse {
  ok: boolean;
  analysis?: UserSyncAnalysis;
  error?: string;
  timestamp?: string;
}

export interface MigrateUserSyncResults {
  totalUsers: number;
  processed: number;
  updated: {
    auth: {
      displayName: number;
      photoURL: number;
      phoneNumber: number;
    };
    firestore: {
      displayName: number;
      photoURL: number;
      position: number;
    };
  };
  skipped: number;
  errors: Array<{ uid: string; email?: string; error: string }>;
}

export interface MigrateUserSyncResponse {
  ok: boolean;
  dryRun?: boolean;
  results?: MigrateUserSyncResults;
  error?: string;
  timestamp?: string;
}

export interface DeleteAuthUsersResults {
  totalRequested: number;
  deleted: number;
  errors: Array<{ uid: string; error: string }>;
}

export interface DeleteAuthUsersResponse {
  ok: boolean;
  dryRun?: boolean;
  results?: DeleteAuthUsersResults;
  error?: string;
  timestamp?: string;
}

export interface AuthUserInfo {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  phoneNumber?: string | null;
  emailVerified: boolean;
  disabled: boolean;
  metadata: {
    creationTime: string;
    lastSignInTime?: string | null;
  };
}

export interface GetUserAuthInfoResponse {
  ok: boolean;
  user?: AuthUserInfo;
  error?: string;
  timestamp?: string;
}

export interface RemovePhoneNumberResults {
  totalUsers: number;
  processed: number;
  removed: number;
  skipped: number;
  errors: Array<{ error: string }>;
}

export interface RemovePhoneNumberResponse {
  ok: boolean;
  dryRun?: boolean;
  results?: RemovePhoneNumberResults;
  error?: string;
  timestamp?: string;
}

