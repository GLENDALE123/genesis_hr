/**
 * 제품관리 메인 뷰 컴포넌트
 * 테이블과 모달 통합 관리
 */

import React, { useState, useEffect } from 'react';
import { ProductManagementTable } from './ProductManagementTable';
import { ProductDetailModal } from './ProductDetailModal';
import { Product } from '@/features/production/types/product.types';
import { useProducts } from '@/features/production/hooks/useProducts';

const ProductManagementViewComponent: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { products, loading, error } = useProducts();
  
  // products가 변경될 때 강제 리렌더링을 위한 디버그 로그 (개발 환경에서만)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[ProductManagementView] Products updated:', products.length);
    }
  }, [products]);

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0">
        <ProductManagementTable
          products={products}
          loading={loading}
          error={error}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onProductClick={handleProductClick}
        />
      </div>
      
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};

// React.memo에 커스텀 비교 함수 제공 - products 배열의 길이와 내용이 변경되었는지 확인
export const ProductManagementView = React.memo(ProductManagementViewComponent, (prevProps, nextProps) => {
  // 이 컴포넌트는 props가 없으므로 항상 false 반환 (항상 리렌더링)
  return false;
});

