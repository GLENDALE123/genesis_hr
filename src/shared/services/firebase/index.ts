// Firebase 설정 및 서비스들 export
export { default as app, auth, db, storage, analytics } from './config';

// Auth 서비스
export {
  signIn,
  signUp,
  logout,
  onAuthStateChange,
  getCurrentUserProfile
} from './auth';

// UserProfile 서비스
export {
  createUserProfile,
  getUserProfile,
  getUserProfileByLoginId,
  getUserProfileByEmail,
  updateLastLogin,
  checkLoginIdExists,
  checkEmailExists
} from './userProfile';

// Firestore 서비스
export {
  getCollectionRef,
  getDocRef,
  getDocument,
  getDocuments,
  getDocumentsWithQuery,
  addDocument,
  updateDocument,
  deleteDocument,
  onCollectionSnapshot
} from './firestore';

// Storage 서비스
export {
  uploadFile,
  getFileDownloadURL,
  deleteFile,
  listFiles,
  getFileMetadata
} from './storage';

// Messaging 서비스
export {
  getMessagingService,
  getFCMToken,
  onForegroundMessage,
  checkNotificationPermission,
  requestNotificationPermission,
  registerServiceWorker,
  initializeFCM
} from './messaging';