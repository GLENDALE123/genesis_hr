# Firebase 설정 파일

이 폴더에는 Firebase 프로젝트의 설정 파일들이 포함되어 있습니다.

## 파일 구조

```
.firebase/
├── firestore.rules          # Firestore 보안 규칙
├── firestore.indexes.json   # Firestore 인덱스 설정
├── storage.rules            # Storage 보안 규칙
└── README.md               # 이 파일
```

## 파일 설명

### firestore.rules
- Firestore 데이터베이스의 보안 규칙을 정의합니다
- 인증된 사용자만 데이터에 접근할 수 있도록 설정
- 역할 기반 접근 제어 (관리자, 직원 등)

### firestore.indexes.json
- Firestore 쿼리 성능 최적화를 위한 인덱스 설정
- 복합 쿼리를 위한 인덱스 정의

### storage.rules
- Firebase Storage의 보안 규칙을 정의합니다
- 파일 업로드/다운로드 권한 관리
- 사용자별 폴더 접근 제어

## 사용 방법

1. **에뮬레이터 시작**:
   ```bash
   npm run firebase:emulators
   ```

2. **개발 서버 시작 (에뮬레이터 모드)**:
   ```bash
   npm run dev:emulator
   ```

3. **에뮬레이터 UI 접근**:
   - http://localhost:4000

## 포트 정보

- **Auth Emulator**: 9099
- **Firestore Emulator**: 8080
- **Storage Emulator**: 9199
- **Functions Emulator**: 5001
- **Emulator UI**: 4000

## 환경변수

`.env.local` 파일에 다음 환경변수를 설정하세요:

```env
NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true
NEXT_PUBLIC_FIREBASE_PROJECT_ID=control-6a11d
# ... 기타 Firebase 설정
```
