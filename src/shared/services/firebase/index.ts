// Firebase 설정 및 서비스들 export
export { default as app, auth, db, storage, analytics } from './config';

// Auth 서비스 (userProfile.ts에서 직접 export)
export {
  signIn,
  signUp,
  logout,
  onAuthStateChange,
  getCurrentUserProfile,
  updateAuthProfile
} from './userProfile';

// UserProfile 서비스
export {
  createUserProfile,
  getUserProfile,
  getUserProfileByEmail,
  getUserProfileByLoginId,
  checkLoginIdExists,
  checkEmailExists,
  updateLastLogin,
  updateUserProfile,
  getAllUsers,
  subscribeToUsers
} from './userProfile';

// UserManagement 서비스
export {
  getAllUsersWithAuthInfo,
  updateUserManagementInfo,
  deleteUserAccount
} from './userManagement';

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
  getFileMetadata,
  uploadProfilePhoto,
  deleteProfilePhoto,
  compressImage,
  uploadImageFilesParallel
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