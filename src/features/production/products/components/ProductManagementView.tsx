/**
 * 제품관리 메인 뷰 컴포넌트
 * 테이블과 모달 통합 관리
 */

import React, { useState, useEffect } from 'react';
import { ProductManagementTable } from './ProductManagementTable';
import { ProductDetailModal } from './ProductDetailModal';
import { Product } from '../types';
import { useProducts } from '../hooks/useProducts';

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
    <div className="h-full flex flex-col overflow-hidden">
      <ProductManagementTable
        products={products}
        loading={loading}
        error={error}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onProductClick={handleProductClick}
      />
      
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

// props가 없는 컴포넌트이므로 React.memo는 의미 없음
// 내부 상태(useProducts) 변경에 따라 리렌더링되어야 하므로 메모이제이션 제거
export const ProductManagementView = ProductManagementViewComponent;

