/**
 * Product Summary 로컬 캐시 서비스
 * IndexedDB를 활용한 로컬 캐싱으로 반복 조회 시 네트워크 요청 제거
 */

import { Product } from '@/features/production/products/types';

const CACHE_KEY = 'product-summary-cache';
const CACHE_VERSION = 1;
const CACHE_TTL = 5 * 60 * 1000; // 5분

interface CacheEntry {
  products: Product[];
  timestamp: number;
  version: number;
}

/**
 * IndexedDB를 사용한 로컬 캐시 저장
 */
async function saveToIndexedDB(products: Product[]): Promise<void> {
  try {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      return; // IndexedDB를 지원하지 않는 환경
    }

    const dbName = 'product-summary-cache';
    const storeName = 'products';
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, CACHE_VERSION);
      
      request.onerror = () => {
        console.warn('IndexedDB 저장 실패:', request.error);
        resolve(); // 실패해도 계속 진행
      };
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        
        const entry: CacheEntry = {
          products,
          timestamp: Date.now(),
          version: CACHE_VERSION
        };
        
        const putRequest = store.put(entry, CACHE_KEY);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => {
          console.warn('IndexedDB 데이터 저장 실패:', putRequest.error);
          resolve(); // 실패해도 계속 진행
        };
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName);
        }
      };
    });
  } catch (error) {
    console.warn('IndexedDB 저장 중 오류:', error);
    // 오류가 발생해도 계속 진행
  }
}

/**
 * IndexedDB에서 로컬 캐시 읽기
 */
async function loadFromIndexedDB(): Promise<Product[] | null> {
  try {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      return null;
    }

    const dbName = 'product-summary-cache';
    const storeName = 'products';
    
    return new Promise((resolve) => {
      const request = indexedDB.open(dbName, CACHE_VERSION);
      
      request.onerror = () => {
        resolve(null);
      };
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const getRequest = store.get(CACHE_KEY);
        
        getRequest.onsuccess = () => {
          const entry = getRequest.result as CacheEntry | undefined;
          
          if (!entry) {
            resolve(null);
            return;
          }
          
          // 버전 확인
          if (entry.version !== CACHE_VERSION) {
            resolve(null);
            return;
          }
          
          // TTL 확인
          const age = Date.now() - entry.timestamp;
          if (age > CACHE_TTL) {
            resolve(null);
            return;
          }
          
          resolve(entry.products);
        };
        
        getRequest.onerror = () => {
          resolve(null);
        };
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName);
        }
      };
    });
  } catch (error) {
    console.warn('IndexedDB 읽기 중 오류:', error);
    return null;
  }
}

/**
 * 메모리 캐시 (간단한 fallback)
 */
let memoryCache: { products: Product[]; timestamp: number } | null = null;

/**
 * 제품 목록을 로컬 캐시에 저장
 */
export async function cacheProducts(products: Product[]): Promise<void> {
  // 메모리 캐시 저장
  memoryCache = {
    products,
    timestamp: Date.now()
  };
  
  // IndexedDB 캐시 저장 (비동기, 실패해도 계속 진행)
  saveToIndexedDB(products).catch(() => {
    // 오류는 이미 내부에서 처리됨
  });
}

/**
 * 로컬 캐시에서 제품 목록 읽기
 */
export async function getCachedProducts(): Promise<Product[] | null> {
  // 메모리 캐시 확인
  if (memoryCache) {
    const age = Date.now() - memoryCache.timestamp;
    if (age <= CACHE_TTL) {
      return memoryCache.products;
    }
    // 만료된 메모리 캐시 제거
    memoryCache = null;
  }
  
  // IndexedDB 캐시 확인
  const cached = await loadFromIndexedDB();
  if (cached) {
    // 메모리 캐시 업데이트
    memoryCache = {
      products: cached,
      timestamp: Date.now()
    };
    return cached;
  }
  
  return null;
}

/**
 * 로컬 캐시 무효화
 */
export async function invalidateCache(): Promise<void> {
  memoryCache = null;
  
  try {
    if (typeof window !== 'undefined' && 'indexedDB' in window) {
      const dbName = 'product-summary-cache';
      const storeName = 'products';
      
      const request = indexedDB.open(dbName, CACHE_VERSION);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        store.delete(CACHE_KEY);
      };
    }
  } catch (error) {
    console.warn('캐시 무효화 중 오류:', error);
  }
}





