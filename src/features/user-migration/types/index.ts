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
  missingInFirestore: Array<{ uid: string; email?: string; authDisplayName?: string }>;
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
      contact: number;
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

