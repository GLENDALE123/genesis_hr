# Firebase 리전 변경 및 데이터 이전 가이드

## 작업 순서

**중요**: 아래 순서대로 진행하고, 각 단계 완료 후 다음 단계로 진행하세요.

---

## 1단계: 사전 준비

### 1.1 gcloud 인증 및 프로젝트 설정
```bash
# gcloud 로그인
gcloud auth login

# 프로젝트 설정
gcloud config set project hs-jig-b2093

# 현재 설정 확인
gcloud config list
```

### 1.2 백업용 버킷 준비
백업을 저장할 임시 버킷이 필요합니다. 없으면 생성:
```bash
# 백업용 버킷 생성 (예시)
gsutil mb -l asia-northeast3 gs://hs-jig-b2093-backup

# 또는 기존 버킷 사용 가능
```

---

## 2단계: Firestore 백업

### 2.1 default 데이터베이스 백업
```bash
# 백업 실행 (타임스탬프 자동 생성)
gcloud firestore export gs://hs-jig-b2093-backup/firestore-backup-$(date +%Y%m%d-%H%M%S) \
  --database-id=\(default\) \
  --project=hs-jig-b2093
```

백업이 완료되면 출력된 경로를 기록하세요. 예: `gs://hs-jig-b2093-backup/firestore-backup-20241201-143000`

### 2.2 백업 상태 확인
```bash
# 백업 작업 상태 확인
gcloud firestore operations list --project=hs-jig-b2093

# 백업 파일 확인
gsutil ls -r gs://hs-jig-b2093-backup/firestore-backup-*
```

---

## 3단계: Storage 백업

### 3.1 Storage 버킷 전체 백업
```bash
# 방법 1: 버킷 간 직접 백업 (권장)
gsutil -m cp -r gs://hs-jig-b2093.firebasestorage.app/* gs://hs-jig-b2093-backup/storage-backup/

# 방법 2: gcloud storage 사용
gcloud storage cp -r gs://hs-jig-b2093.firebasestorage.app/* gs://hs-jig-b2093-backup/storage-backup/
```

`-m` 옵션은 병렬 복사로 대용량 데이터 전송 시 속도를 향상시킵니다.

### 3.2 백업 확인
```bash
# 백업된 파일 개수 확인
gsutil du -sh gs://hs-jig-b2093-backup/storage-backup/

# 원본과 비교
gsutil du -sh gs://hs-jig-b2093.firebasestorage.app/
gsutil du -sh gs://hs-jig-b2093-backup/storage-backup/
```

---

## 4단계: Firestore 복원

### 4.1 tms-production 데이터베이스로 복원
```bash
# 위에서 백업한 경로를 사용 (경로는 백업 시 출력된 값으로 변경)
gcloud firestore import gs://hs-jig-b2093-backup/firestore-backup-[타임스탬프] \
  --database-id=tms-production \
  --project=hs-jig-b2093
```

**중요**: `[타임스탬프]` 부분을 실제 백업 경로의 타임스탬프로 변경하세요.

### 4.2 복원 상태 확인
```bash
# 복원 작업 상태 확인
gcloud firestore operations list --project=hs-jig-b2093

# 복원된 데이터 확인 (콘솔에서도 가능)
gcloud firestore databases describe tms-production --project=hs-jig-b2093
```

---

## 5단계: Storage 복원

### 5.1 새 버킷(asia-northeast3)으로 복원
```bash
# 방법 1: 버킷 간 직접 복원
gsutil -m cp -r gs://hs-jig-b2093-backup/storage-backup/* gs://hs-jig-b2093/

# 방법 2: gcloud storage 사용
gcloud storage cp -r gs://hs-jig-b2093-backup/storage-backup/* gs://hs-jig-b2093/
```

### 5.2 복원 확인
```bash
# 파일 개수 확인
gsutil ls -r gs://hs-jig-b2093/ | wc -l
gsutil ls -r gs://hs-jig-b2093-backup/storage-backup/ | wc -l

# 용량 확인
gsutil du -sh gs://hs-jig-b2093/
```

---

## 6단계: 데이터 검증

### 6.1 Firestore 데이터 검증
Firebase Console에서:
- `tms-production` 데이터베이스 열기
- 주요 컬렉션 확인 (users, notifications, packaging-reports 등)
- 문서 개수 확인

### 6.2 Storage 데이터 검증
```bash
# 주요 폴더 확인
gsutil ls gs://hs-jig-b2093/

# 특정 폴더 파일 개수
gsutil ls -r gs://hs-jig-b2093/users/ | wc -l
gsutil ls -r gs://hs-jig-b2093/quality-inspections/ | wc -l
```

---

## 7단계: 규칙 및 인덱스 배포

### 7.1 Firestore 규칙 배포
```bash
# tms-production 데이터베이스에 규칙 배포
firebase deploy --only firestore:rules --project=hs-jig-b2093

# 또는 gcloud 사용
gcloud firestore databases update tms-production \
  --database-type=firestore-native \
  --location=asia-northeast3 \
  --project=hs-jig-b2093
```

**주의**: Firebase CLI로 규칙을 배포할 때 데이터베이스 ID를 명시하는 방법이 제한적일 수 있습니다. 
Firebase Console에서 직접 배포하는 것을 권장합니다:
1. Firebase Console → Firestore Database
2. `tms-production` 데이터베이스 선택
3. Rules 탭에서 규칙 배포

### 7.2 Storage 규칙 배포
```bash
firebase deploy --only storage:rules --project=hs-jig-b2093
```

### 7.3 Firestore 인덱스 배포
```bash
# 인덱스 배포 (프로젝트의 firestore.indexes.json 사용)
firebase deploy --only firestore:indexes --project=hs-jig-b2093
```

**중요**: Firebase CLI로 특정 데이터베이스에 인덱스를 배포하는 것은 제한적입니다.
다음 방법 중 선택:

**방법 1: Firebase Console 사용 (권장)**
1. Firebase Console → Firestore Database
2. `tms-production` 데이터베이스 선택
3. Indexes 탭
4. `firestore.indexes.json` 파일의 내용을 기반으로 수동으로 인덱스 생성
   - employees: department(ASC), createdAt(DESC)
   - payroll: employeeId(ASC), payDate(DESC)
   - packaging-reports: workDate(DESC)
   - packaging-reports: productionLine(ASC), workDate(DESC)
   - excel-production-reports: workDate(DESC)
   - quality-inspections: inspectionDate(DESC)
   - quality-inspections: orderNumber(ASC), createdAt(DESC)
   - quality-inspections: inspectionDate(ASC), orderNumber(ASC)

**방법 2: gcloud CLI 사용**
```bash
# 각 인덱스를 개별적으로 생성 (예시)
gcloud firestore indexes composite create \
  --collection-group=employees \
  --query-scope=COLLECTION \
  --field-config field-path=department,order=ASCENDING \
  --field-config field-path=createdAt,order=DESCENDING \
  --database=tms-production \
  --project=hs-jig-b2093
```

---

## 8단계: 코드 변경 적용

백업 및 이전이 완료되고 검증이 끝난 후:

1. **환경변수 확인**: `.env.local` 파일이 있다면 `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=hs-jig-b2093` 설정 확인
2. **애플리케이션 테스트**: 코드 변경 후 전체 기능 테스트

---

## 9단계: 최종 테스트

### 9.1 Firestore 테스트
- 데이터 읽기/쓰기 확인
- 주요 컬렉션 접근 확인

### 9.2 Storage 테스트
- 파일 업로드 테스트
- 파일 다운로드 테스트
- 기존 파일 접근 확인

### 9.3 전체 기능 테스트
- 로그인/로그아웃
- 주요 기능들 동작 확인

---

## 문제 해결

### 백업/복원 실패 시
- 백업 파일은 보관 (롤백용)
- 오류 메시지 확인 후 재시도

### 규칙/인덱스 배포 실패 시
- Firebase Console에서 직접 확인
- 규칙 파일 문법 오류 확인

### 데이터 불일치 시
- 백업 데이터와 비교
- 필요한 부분만 선택적 복원

---

## 롤백 계획

문제 발생 시:
1. 코드를 이전 설정으로 롤백
2. 필요시 이전 데이터베이스/버킷으로 복원
3. 백업 데이터는 최소 1주일 보관 권장

