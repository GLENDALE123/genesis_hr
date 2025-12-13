/**
 * 제품 목록 조회 훅
 * product-summary 캐시 컬렉션 우선 사용
 * 캐시 실패 시 기존 방식으로 fallback
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { collection, query, onSnapshot, where, orderBy } from 'firebase/firestore';
import { db } from '@/shared/services/firebase/config';
import { Product } from '../types';
import { getProductsFromCache, getProducts } from '../services/productService';

interface UseProductsOptions {
  searchTerm?: string;
  filters?: {
    supplier?: string;
    productName?: string;
    partName?: string;
  };
}

export const useProducts = (options?: UseProductsOptions) => {
  const { searchTerm, filters } = options || {};
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [useFallback, setUseFallback] = useState(false);
  
  const isMountedRef = useRef(true);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!db) {
      setError(new Error('Firebase not initialized'));
      setLoading(false);
      return;
    }

    isMountedRef.current = true;
    setLoading(true);
    setError(null);

    let isCancelled = false;

    // 초기 로딩: getProductsFromCache 사용 (더 빠름)
    const loadInitialData = async () => {
      try {
        const productsArray = await getProductsFromCache(searchTerm, filters);
        
        if (!isCancelled && isMountedRef.current) {
          setProducts(productsArray);
          setLoading(false);
          setError(null);
        }
      } catch (err) {
        console.error('Error loading products from cache:', err);
        if (!isCancelled && isMountedRef.current && !useFallback) {
          setUseFallback(true);
        } else if (!isCancelled && isMountedRef.current) {
          setError(err as Error);
          setLoading(false);
        }
      }
    };

    loadInitialData();

    // 실시간 업데이트 구독 (초기 로딩 후)
    let productSummaryQuery = query(
      collection(db, 'product-summary')
    );

    // 서버 사이드 필터링 적용
    if (filters?.supplier) {
      productSummaryQuery = query(productSummaryQuery, where('supplier', '==', filters.supplier));
    }
    if (filters?.productName) {
      productSummaryQuery = query(productSummaryQuery, where('productName', '==', filters.productName));
    }
    if (filters?.partName) {
      productSummaryQuery = query(productSummaryQuery, where('partName', '==', filters.partName));
    }

    // 정렬
    productSummaryQuery = query(
      productSummaryQuery,
      orderBy('supplier', 'asc'),
      orderBy('productName', 'asc')
    );
    
    // 실시간 업데이트만 구독 (초기 로딩은 이미 완료)
    unsubscribeRef.current = onSnapshot(
      productSummaryQuery,
      (snapshot) => {
        if (!isMountedRef.current || isCancelled) return;

        try {
          let productsArray: Product[] = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: data.id || doc.id,
              supplier: data.supplier || '',
              productName: data.productName || '',
              partName: data.partName || '',
              specification: data.specification || '',
              latestJig: data.latestJig,
              latestUndercoatData: data.latestUndercoatData,
              latestTopcoatData: data.latestTopcoatData,
              averagePersonnelCount: data.averagePersonnelCount,
              latestLineRatio: data.latestLineRatio,
              averageRPM: data.averageRPM
            };
          });

          // 클라이언트 사이드 검색: 검색어가 있으면 필터링
          if (searchTerm && searchTerm.trim()) {
            const searchLower = searchTerm.toLowerCase().trim();
            productsArray = productsArray.filter(product => {
              return (
                product.supplier.toLowerCase().includes(searchLower) ||
                product.productName.toLowerCase().includes(searchLower) ||
                product.partName.toLowerCase().includes(searchLower) ||
                product.specification.toLowerCase().includes(searchLower)
              );
            });
          }

          if (isMountedRef.current && !isCancelled) {
            setProducts(productsArray);
            // 로딩 상태는 초기 로딩에서만 관리
          }
        } catch (err) {
          console.error('Error processing products from cache:', err);
        }
      },
      (err) => {
        if (!isMountedRef.current || isCancelled) return;
        console.error('Error in product-summary subscription:', err);
      }
    );

    return () => {
      isCancelled = true;
      isMountedRef.current = false;
      
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [useFallback, searchTerm, filters]);

  // Fallback: 기존 방식 사용
  useEffect(() => {
    if (!useFallback || !db) return;

    let isCancelled = false;

    const loadProducts = async () => {
      try {
        setLoading(true);
        const productsArray = await getProducts(2000);
        
        if (!isCancelled) {
          setProducts(productsArray);
          setLoading(false);
          setError(null);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('Error loading products (fallback):', err);
          setError(err as Error);
          setLoading(false);
        }
      }
    };

    loadProducts();

    return () => {
      isCancelled = true;
    };
  }, [useFallback]);

  // 메모이제이션: products 배열이 실제로 변경되었을 때만 참조 변경
  const memoizedProducts = useMemo(() => products, [products]);

  return { products: memoizedProducts, loading, error };
};
