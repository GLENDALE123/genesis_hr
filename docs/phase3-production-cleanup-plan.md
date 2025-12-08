# Phase 3: Production 서브모듈 원본 파일 정리 계획

## 📋 삭제 대상 파일 목록

### 1. packaging 서브모듈 원본 파일
**Components:**
- `components/PackagingReportForm.tsx`
- `components/PackagingReportListView.tsx`
- `components/PackagingReportStats.tsx`
- `components/LogisticsTransferModal.tsx`

**Containers:**
- `containers/PackagingDailyReportContainer.tsx`

**Services:**
- `services/packagingReportsService.ts`
- `services/logisticsService.ts`

**Hooks:**
- `hooks/usePackagingReports.ts`
- `hooks/usePackagingForm.ts`
- `hooks/usePackagingCalculations.ts`
- `hooks/usePackagingReportFilters.ts`

**Store:**
- `store/packagingReportsStore.ts`

### 2. schedule 서브모듈 원본 파일
**Components:**
- `components/ProductionScheduleListView.tsx`
- `components/ProductionScheduleUploadModal.tsx`

**Services:**
- `services/productionScheduleService.ts`
- `services/productionScheduleV0Service.ts`

**Hooks:**
- `hooks/useProductionSchedules.ts`
- `hooks/useProductionSchedulesV0.ts`

**Store:**
- `store/productionSchedulesStore.ts`

### 3. shortage 서브모듈 원본 파일
**Components:**
- `components/ShortageManagementListView.tsx`
- `components/ShortageRequestDetail.tsx`
- `components/ShortageRequestModal.tsx`
- `components/ShortageRequestTable.tsx`

**Containers:**
- `containers/ShortageManagementContainer.tsx`

**Services:**
- `services/shortageService.ts`

**Hooks:**
- `hooks/useShortageRequests.ts`

**Store:**
- `store/shortageRequestsStore.ts`

### 4. products 서브모듈 원본 파일
**Components:**
- `components/ProductManagementView.tsx`
- `components/ProductManagementTable.tsx`
- `components/ProductDetailModal.tsx`

**Services:**
- `services/productService.ts`
- `services/productAIService.ts`

**Hooks:**
- `hooks/useProducts.ts`
- `hooks/useProductDetail.ts`
- `hooks/useProductAIReport.ts`

### 5. requests 서브모듈 원본 파일
**Components:**
- `components/ProductionRequestForm.tsx`
- `components/ProductionRequestFormModal.tsx`
- `components/ProductionRequestDetailModal.tsx`

**Services:**
- `services/productionRequestService.ts`

**Hooks:**
- `hooks/useProductionRequests.ts`

### 6. management 서브모듈 원본 파일
**Components:**
- `components/ProductionManagementCenter.tsx`
- `components/MemoModal.tsx`
- `components/ProcessConditionsModal.tsx`
- `components/QualityHistoryCell.tsx`

## ⚠️ 주의사항

- 삭제 전에 빌드 테스트를 진행하여 모든 import가 서브모듈로 올바르게 이동되었는지 확인
- 원본 파일들이 서로 참조하고 있을 수 있으므로, 삭제 후 빌드 테스트 필수
- types/index.ts는 타입이 서브모듈로 이동되었는지 확인 후 정리

## 🔄 삭제 후 확인사항

- [ ] 빌드 테스트 통과
- [ ] 모든 페이지가 정상 작동하는지 확인
- [ ] 원본 파일 참조가 없는지 확인















