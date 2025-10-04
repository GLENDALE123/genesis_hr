import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  listAll,
  getMetadata
} from 'firebase/storage';
import { storage } from './config';

// 파일 업로드
export const uploadFile = async (
  file: File,
  path: string,
  metadata?: { [key: string]: unknown }
) => {
  if (!storage) throw new Error('Firebase Storage is not initialized');
  try {
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file, metadata);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    throw error;
  }
};

// 파일 다운로드 URL 가져오기
export const getFileDownloadURL = async (path: string) => {
  if (!storage) throw new Error('Firebase Storage is not initialized');
  try {
    const storageRef = ref(storage, path);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error) {
    throw error;
  }
};

// 파일 삭제
export const deleteFile = async (path: string) => {
  if (!storage) throw new Error('Firebase Storage is not initialized');
  try {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
  } catch (error) {
    throw error;
  }
};

// 폴더 내 모든 파일 목록 가져오기
export const listFiles = async (path: string) => {
  if (!storage) throw new Error('Firebase Storage is not initialized');
  try {
    const storageRef = ref(storage, path);
    const result = await listAll(storageRef);
    
    const files = await Promise.all(
      result.items.map(async (item) => {
        const metadata = await getMetadata(item);
        const downloadURL = await getDownloadURL(item);
        return {
          name: item.name,
          fullPath: item.fullPath,
          downloadURL,
          metadata
        };
      })
    );
    
    return files;
  } catch (error) {
    throw error;
  }
};

// 파일 메타데이터 가져오기
export const getFileMetadata = async (path: string) => {
  if (!storage) throw new Error('Firebase Storage is not initialized');
  try {
    const storageRef = ref(storage, path);
    const metadata = await getMetadata(storageRef);
    return metadata;
  } catch (error) {
    throw error;
  }
};
