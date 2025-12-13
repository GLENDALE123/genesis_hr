# 렌더링 최적화 가이드

## 📋 개요

이 문서는 Genesis_HR 프로젝트의 렌더링 최적화 전략과 모범 사례를 설명합니다.

## 🎯 렌더링 최적화 원칙

### 1. **필요한 경우에만 리렌더링**
- 컴포넌트는 props나 state가 변경될 때만 리렌더링되어야 함
- 불필요한 리렌더링은 성능 저하의 주요 원인

### 2. **메모이제이션 전략**
- `React.memo`: 컴포넌트 레벨 최적화
- `useMemo`: 값 계산 메모이제이션
- `useCallback`: 함수 참조 메모이제이션

### 3. **조건부 렌더링 최적화**
- 조건부 렌더링은 가능한 한 상위 컴포넌트에서 처리
- 하위 컴포넌트는 순수하게 유지

## 🔍 현재 최적화 상태

### ✅ 최적화된 컴포넌트

#### 1. **AppLayout**
```typescript
// src/shared/components/layout/AppLayout.tsx
export const AppLayout = React.memo(AppLayoutComponent);
```
- **최적화 방법**: React.memo로 감싸서 props 변경 시에만 리렌더링
- **효과**: 레이아웃 구조가 변경되지 않으면 리렌더링 방지

#### 2. **AppSidebar**
```typescript
// src/shared/components/layout/AppSidebar.tsx
export const AppSidebar = React.memo(AppSidebarComponent, (prevProps, nextProps) => {
  return prevProps.collapsed === nextProps.collapsed &&
         prevProps.className === nextProps.className &&
         prevProps.onMobileClose === nextProps.onMobileClose;
});
```
- **최적화 방법**: 커스텀 비교 함수로 collapsed, className, onMobileClose만 비교
- **효과**: pathname 변경 시에도 리렌더링 방지 (내부에서 useLocation 사용)

#### 3. **ProductManagementTable**
```typescript
// src/features/production/products/components/ProductManagementTable.tsx
export const ProductManagementTable = React.memo(ProductManagementTableComponent, (prevProps, nextProps) => {
  // products 배열의 길이와 내용을 깊이 비교
  // 주요 속성 변경 시에만 리렌더링
});
```
- **최적화 방법**: 커스텀 비교 함수로 products 배열 깊이 비교
- **효과**: 불필요한 테이블 리렌더링 방지

#### 4. **JigMasterTableRow**
```typescript
// src/features/jig/components/JigMasterListView.tsx
const JigMasterTableRow = memo<{...}>(({ item, onSelectJig }) => {
  const handleRowClick = useCallback(() => {
    onSelectJig(item);
  }, [item.id, onSelectJig]);
  
  const formattedDate = useMemo(() => {
    return new Date(item.createdAt).toLocaleDateString('ko-KR');
  }, [item.createdAt]);
  // ... 더 많은 useMemo 사용
});
```
- **최적화 방법**: 
  - `React.memo`로 컴포넌트 메모이제이션
  - `useCallback`으로 핸들러 메모이제이션
  - `useMemo`로 계산된 값 메모이제이션
- **효과**: 테이블 행의 불필요한 리렌더링 방지

### ⚠️ 최적화가 필요한 컴포넌트

#### 1. **ConditionalLayout**
```typescript
// src/shared/components/layout/ConditionalLayout.tsx
export const ConditionalLayout = React.memo(ConditionalLayoutComponent, (prevProps, nextProps) => {
  return false; // 항상 리렌더링 허용
});
```
- **현재 상태**: React.memo가 있지만 항상 false 반환 (의미 없음)
- **이유**: pathname, user, isLoading 변경에 따라 리렌더링 필요
- **권장사항**: 
  - React.memo 제거 (의미 없음)
  - 또는 내부에서 useMemo로 조건부 렌더링 결과 메모이제이션

#### 2. **AppHeader**
```typescript
// src/shared/components/layout/AppHeader.tsx
export const AppHeader = AppHeaderComponent;
```
- **현재 상태**: React.memo 없음
- **이유**: pathname, searchParams 변경에 따라 리렌더링 필요 (의도적)
- **권장사항**: 현재 상태 유지 (pathname 변경 시 리렌더링 필요)

#### 3. **ProductManagementView**
```typescript
// src/features/production/products/components/ProductManagementView.tsx
export const ProductManagementView = ProductManagementViewComponent;
```
- **현재 상태**: React.memo 제거됨 (의미 없는 메모이제이션 제거)
- **이유**: props가 없고 내부 상태(useProducts) 변경에 따라 리렌더링 필요
- **권장사항**: 현재 상태 유지

## 📊 메모이제이션 패턴

### 1. **React.memo 사용 가이드**

#### ✅ 사용해야 하는 경우
- Props가 자주 변경되지 않는 순수 컴포넌트
- 부모 컴포넌트가 자주 리렌더링되지만 props는 변경되지 않는 경우
- 큰 리스트의 항목 컴포넌트

#### ❌ 사용하지 말아야 하는 경우
- Props가 항상 변경되는 컴포넌트
- 내부 상태에 의존하는 컴포넌트
- 커스텀 비교 함수가 항상 false를 반환하는 경우

#### 예시: 올바른 사용
```typescript
// ✅ 좋은 예: props 비교가 의미 있는 경우
const ProductCard = React.memo(({ product, onSelect }) => {
  return <div onClick={() => onSelect(product.id)}>{product.name}</div>;
}, (prevProps, nextProps) => {
  return prevProps.product.id === nextProps.product.id &&
         prevProps.onSelect === nextProps.onSelect;
});
```

#### 예시: 잘못된 사용
```typescript
// ❌ 나쁜 예: 항상 false를 반환하는 경우
const ProductView = React.memo(({ products }) => {
  const { data } = useProducts(); // 내부 상태 사용
  return <div>{/* ... */}</div>;
}, () => false); // 의미 없음
```

### 2. **useMemo 사용 가이드**

#### ✅ 사용해야 하는 경우
- 비용이 큰 계산 (필터링, 정렬, 변환 등)
- 참조 동일성이 중요한 경우 (다른 컴포넌트의 props로 전달)
- 의존성 배열의 값이 자주 변경되지 않는 경우

#### ❌ 사용하지 말아야 하는 경우
- 간단한 계산 (비용이 크지 않은 경우)
- 의존성이 자주 변경되는 경우
- 메모이제이션 오버헤드가 계산 비용보다 큰 경우

#### 예시: 올바른 사용
```typescript
// ✅ 좋은 예: 비용이 큰 계산
const filteredProducts = useMemo(() => {
  return products.filter(p => p.name.includes(searchTerm));
}, [products, searchTerm]);

// ✅ 좋은 예: 참조 동일성이 중요한 경우
const productIds = useMemo(() => {
  return products.map(p => p.id);
}, [products]);
```

#### 예시: 잘못된 사용
```typescript
// ❌ 나쁜 예: 간단한 계산
const productCount = useMemo(() => {
  return products.length; // 너무 간단함
}, [products]);

// ❌ 나쁜 예: 의존성이 자주 변경됨
const currentTime = useMemo(() => {
  return new Date().toISOString();
}, [new Date()]); // 항상 새로운 값
```

### 3. **useCallback 사용 가이드**

#### ✅ 사용해야 하는 경우
- 자식 컴포넌트에 전달하는 핸들러 (React.memo와 함께 사용)
- 의존성 배열의 값이 자주 변경되지 않는 경우
- 다른 훅의 의존성으로 사용되는 경우

#### ❌ 사용하지 말아야 하는 경우
- 단순한 인라인 함수
- 의존성이 자주 변경되는 경우
- 메모이제이션 오버헤드가 이점보다 큰 경우

#### 예시: 올바른 사용
```typescript
// ✅ 좋은 예: React.memo와 함께 사용
const handleProductClick = useCallback((productId: string) => {
  setSelectedProduct(productId);
}, []); // 의존성이 없음

<ProductCard 
  product={product} 
  onClick={handleProductClick} // 메모이제이션된 함수
/>
```

#### 예시: 잘못된 사용
```typescript
// ❌ 나쁜 예: 단순한 인라인 함수
const handleClick = useCallback(() => {
  console.log('clicked');
}, []); // 너무 간단함, useCallback 불필요

// ❌ 나쁜 예: 의존성이 자주 변경됨
const handleChange = useCallback((value: string) => {
  setValue(value);
}, [value]); // value가 자주 변경되면 의미 없음
```

## 🔧 최적화 체크리스트

### 컴포넌트 최적화 체크리스트
- [ ] 큰 리스트의 항목 컴포넌트에 React.memo 적용
- [ ] Props가 자주 변경되지 않는 컴포넌트에 React.memo 적용
- [ ] 의미 없는 React.memo 제거 (항상 false 반환하는 경우)
- [ ] 커스텀 비교 함수가 올바르게 구현되었는지 확인

### 훅 최적화 체크리스트
- [ ] 비용이 큰 계산에 useMemo 적용
- [ ] 참조 동일성이 중요한 값에 useMemo 적용
- [ ] 자식 컴포넌트에 전달하는 핸들러에 useCallback 적용
- [ ] 불필요한 useMemo/useCallback 제거

### 성능 모니터링 체크리스트
- [ ] React DevTools Profiler로 리렌더링 확인
- [ ] 불필요한 리렌더링 패턴 식별
- [ ] 메모이제이션 효과 측정
- [ ] 성능 병목 지점 파악

## 🚀 성능 측정 도구

### 1. **React DevTools Profiler**
- 컴포넌트별 렌더링 시간 측정
- 리렌더링 원인 분석
- 메모이제이션 효과 확인

### 2. **Chrome DevTools Performance**
- 전체 애플리케이션 성능 분석
- 메모리 사용량 확인
- 렌더링 병목 지점 파악

### 3. **React StrictMode**
- 개발 모드에서 이중 렌더링으로 문제 발견
- 불안정한 부수 효과 감지

## 📝 모범 사례 요약

1. **필요한 경우에만 메모이제이션 사용**
   - 메모이제이션은 비용이 있으므로 필요한 경우에만 사용
   - 성능 측정 후 최적화 결정

2. **커스텀 비교 함수 신중하게 사용**
   - 깊은 비교는 비용이 크므로 필요한 경우에만 사용
   - 얕은 비교로 충분한 경우 얕은 비교 사용

3. **의존성 배열 정확하게 관리**
   - 모든 의존성을 포함하여 버그 방지
   - 불필요한 의존성 제거하여 최적화 효과 극대화

4. **성능 측정 후 최적화**
   - 추측하지 말고 측정
   - 실제 성능 문제가 있는 경우에만 최적화

5. **코드 가독성 유지**
   - 과도한 최적화는 코드 가독성을 해침
   - 명확성과 성능의 균형 유지

## 🔗 관련 문서

- [React 공식 문서 - 메모이제이션](https://react.dev/reference/react/memo)
- [React 공식 문서 - useMemo](https://react.dev/reference/react/useMemo)
- [React 공식 문서 - useCallback](https://react.dev/reference/react/useCallback)
- [메모리 캐시 최적화 가이드](./memory-cache-optimization.md)



