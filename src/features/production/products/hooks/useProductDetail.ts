/**
 * 제품 상세 정보 조회 훅
 * 여러 컬렉션에서 데이터 병렬 조회
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { ProductDetail } from '../types';
import { getProductDetail } from '../services/productService';

export const useProductDetail = (productId: string | null) => {
  const [productDetail, setProductDetail] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchProductDetail = useCallback(async () => {
    if (!productId) {
      setProductDetail(null);
      setLoading(false);
      return;
    }

    // 이전 요청 취소
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // 새로운 AbortController 생성
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setLoading(true);
    setError(null);

    try {
      const detail = await getProductDetail(productId);
      
      // 요청이 취소되지 않았고 컴포넌트가 마운트된 상태인 경우에만 상태 업데이트
      if (!abortController.signal.aborted && isMountedRef.current) {
        setProductDetail(detail);
        setLoading(false);
      }
    } catch (err) {
      // AbortError는 무시 (의도적인 취소)
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      
      console.error('Error fetching product detail:', err);
      
      // 요청이 취소되지 않았고 컴포넌트가 마운트된 상태인 경우에만 에러 업데이트
      if (!abortController.signal.aborted && isMountedRef.current) {
        setError(err as Error);
        setProductDetail(null);
        setLoading(false);
      }
    }
  }, [productId]);

  useEffect(() => {
    fetchProductDetail();
    
    // 클린업: 컴포넌트 언마운트 시 요청 취소
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [fetchProductDetail]);

  return {
    productDetail,
    loading,
    error,
    refetch: fetchProductDetail
  };
};

