# Phase 3: Production 서브모듈 분리 계획

## 현재 상태
- production 피처에 20개 컴포넌트, 9개 서비스, 12개 훅, 2개 컨테이너가 단일 레벨에 존재

## 목표 구조

```
features/production/
├── packaging/              # 포장 리포트 (물류 이동 기능 포함)
├── schedule/               # 생산 일정
├── requests/               # 생산 요청 (긴급건, 물류이동 등)
├── shortage/               # 부족량 관리
├── products/               # 제품 관리
├── management/             # 생산 관리
└── [공통 파일들]           # sheetsSyncService, useSheetsSync, productionUtils, orderQuantity
```

## 파일 분류

### packaging/ 서브모듈
**Components:**
- PackagingReportForm.tsx
- PackagingReportListView.tsx
- PackagingReportStats.tsx
- LogisticsTransferModal.tsx

**Containers:**
- PackagingDailyReportContainer.tsx

**Services:**
- packagingReportsService.ts
- logisticsService.ts

**Hooks:**
- usePackagingReports.ts
- usePackagingForm.ts
- usePackagingCalculations.ts
- usePackagingReportFilters.ts

**Store:**
- packagingReportsStore.ts

**Types:**
- logistics.ts (일부 타입, ProductionRequestType 관련은 requests로)

### schedule/ 서브모듈
**Components:**
- ProductionScheduleListView.tsx
- ProductionScheduleUploadModal.tsx

**Services:**
- productionScheduleService.ts
- productionScheduleV0Service.ts

**Hooks:**
- useProductionSchedules.ts
- useProductionSchedulesV0.ts

**Store:**
- productionSchedulesStore.ts

**Types:**
- (필요시 생성)

### requests/ 서브모듈
**Components:**
- ProductionRequestForm.tsx
- ProductionRequestFormModal.tsx
- ProductionRequestDetailModal.tsx

**Services:**
- productionRequestService.ts

**Hooks:**
- useProductionRequests.ts

**Types:**
- logistics.ts (ProductionRequestType, ProductionRequestStatus 등)

### shortage/ 서브모듈
**Components:**
- ShortageManagementListView.tsx
- ShortageRequestDetail.tsx
- ShortageRequestModal.tsx
- ShortageRequestTable.tsx

**Containers:**
- ShortageManagementContainer.tsx

**Services:**
- shortageService.ts

**Hooks:**
- useShortageRequests.ts

**Store:**
- shortageRequestsStore.ts

**Types:**
- (필요시 생성)

### products/ 서브모듈
**Components:**
- ProductManagementView.tsx
- ProductManagementTable.tsx
- ProductDetailModal.tsx

**Services:**
- productService.ts
- productAIService.ts

**Hooks:**
- useProducts.ts
- useProductDetail.ts
- useProductAIReport.ts

**Types:**
- product.types.ts

### management/ 서브모듈
**Components:**
- ProductionManagementCenter.tsx
- MemoModal.tsx
- ProcessConditionsModal.tsx
- QualityHistoryCell.tsx

**Services:**
- (없음)

**Types:**
- (없음)

## 공통 파일 (production 루트 유지)
- sheetsSyncService.ts
- useSheetsSync.ts
- productionUtils.ts
- orderQuantity.ts
- constants/

## 마이그레이션 단계

1. **서브모듈 디렉토리 생성**
2. **packaging 서브모듈부터 이동** (가장 독립적)
3. **schedule 서브모듈 이동**
4. **shortage 서브모듈 이동**
5. **products 서브모듈 이동**
6. **requests 서브모듈 이동**
7. **management 서브모듈 이동**
8. **Import 경로 업데이트**

## 진행 순서

작업량이 많으므로 단계적으로 진행:
1. 서브모듈 디렉토리 구조 생성
2. 가장 독립적인 서브모듈부터 이동 (packaging, schedule, shortage, products)
3. 의존성이 있는 서브모듈 이동 (requests, management)
4. Import 경로 일괄 업데이트

