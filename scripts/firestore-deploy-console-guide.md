# Firestore 규칙 및 인덱스 배포 가이드 (Firebase Console)

Firebase CLI는 기본 데이터베이스에만 규칙/인덱스를 배포할 수 있어서, `tms-production` 데이터베이스에는 Firebase Console을 통해 직접 배포해야 합니다.

## 1. Firestore 규칙 배포

1. **Firebase Console 접속**
   - https://console.firebase.google.com/project/hs-jig-b2093/firestore

2. **⚠️ 중요: 데이터베이스 선택 필수!**
   - Firestore 페이지 상단에 **데이터베이스 선택 드롭다운**이 있습니다
   - 기본적으로 `(default)` 데이터베이스가 선택되어 있을 수 있습니다
   - **반드시 드롭다운에서 `tms-production` 데이터베이스를 선택**해야 합니다
   - 선택하지 않으면 `(default)` 데이터베이스에 규칙이 배포됩니다!

3. **Rules 탭 클릭**

4. **규칙 내용 복사**
   - 프로젝트의 `firestore.rules` 파일 내용을 복사
   - 또는 아래 내용 사용:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // 사용자 프로필 컬렉션
    match /users/{userId} {
      // 로그인한 사용자는 자신의 프로필 읽기/쓰기 가능
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // 사용자별 설정 서브컬렉션
      match /settings/{docId} {
        // 자신의 설정만 읽기/쓰기 가능
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      
      // 사용자별 알림 inbox 서브컬렉션
      match /inbox/{notificationId} {
        // 자신의 inbox만 읽기 가능
        allow read: if request.auth != null && request.auth.uid == userId;
        
        // 알림 생성은 누구나 가능 (서버/클라이언트)
        allow create: if request.auth != null;
        
        // 자신의 inbox만 수정 가능 (읽음 처리 등)
        allow update: if request.auth != null && request.auth.uid == userId;
        
        // 자신의 inbox만 삭제 가능
        allow delete: if request.auth != null && request.auth.uid == userId;
      }
      
      // 사용자별 FCM 토큰 서브컬렉션
      match /fcmTokens/{tokenId} {
        // 자신의 FCM 토큰만 읽기/쓰기 가능
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
    
    // 알림 컬렉션
    match /notifications/{notificationId} {
      // 로그인한 사용자는 자신의 알림만 조회 가능
      allow read: if request.auth != null && 
        resource.data.userId == request.auth.uid;
      
      // 알림 생성은 시스템에서만 가능 (서버 사이드)
      allow create: if request.auth != null;
      
      // 자신의 알림만 수정 가능 (읽음 표시 등)
      allow update: if request.auth != null && 
        resource.data.userId == request.auth.uid;
      
      // 자신의 알림만 삭제 가능
      allow delete: if request.auth != null && 
        resource.data.userId == request.auth.uid;
    }
    
    // 생산 일보 컬렉션
    match /packaging-reports/{reportId} {
      // 로그인한 사용자는 모든 작업 가능
      allow read, write: if request.auth != null;
    }
    
    // 사용자별 권한 설정 컬렉션
    match /user-permissions/{userId} {
      // 로그인한 사용자는 자신의 권한 조회 가능
      allow read: if request.auth != null && 
        (request.auth.uid == userId || 
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'Admin');
      
      // Admin만 권한 생성/수정/삭제 가능
      allow create, update, delete: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'Admin';
    }
    
    // ⚠️ 기타 컬렉션 기본 규칙 (개발 중에만 사용, 프로덕션에서는 제거 필요)
    // TODO: 각 컬렉션별 세부 권한 규칙 추가
    match /{document=**} {
      // 읽기는 로그인한 사용자 허용
      allow read: if request.auth != null;
      
      // 쓰기는 Admin, Manager만 허용 (임시 규칙)
      allow write: if request.auth != null && (
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'Admin' ||
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'Manager'
      );
    }
  }
}
```

5. **게시 버튼 클릭**

## 2. Firestore 인덱스 배포

1. **⚠️ 중요: 데이터베이스 선택 확인!**
   - 상단에서 **`tms-production` 데이터베이스가 선택되어 있는지 다시 확인**
   - 만약 다른 데이터베이스가 선택되어 있다면 `tms-production`으로 변경

2. **Indexes 탭 클릭**

2. **복합 인덱스 생성**
   - 아래 인덱스들을 하나씩 생성:

### employees 컬렉션
- **필드**: `department` (오름차순), `createdAt` (내림차순)
- **쿼리 범위**: 컬렉션

### payroll 컬렉션
- **필드**: `employeeId` (오름차순), `payDate` (내림차순)
- **쿼리 범위**: 컬렉션

### packaging-reports 컬렉션
#### 인덱스 1
- **필드**: `workDate` (내림차순)
- **쿼리 범위**: 컬렉션

#### 인덱스 2
- **필드**: `productionLine` (오름차순), `workDate` (내림차순)
- **쿼리 범위**: 컬렉션

### excel-production-reports 컬렉션
- **필드**: `workDate` (내림차순)
- **쿼리 범위**: 컬렉션

### quality-inspections 컬렉션
#### 인덱스 1
- **필드**: `inspectionDate` (내림차순)
- **쿼리 범위**: 컬렉션

#### 인덱스 2
- **필드**: `orderNumber` (오름차순), `createdAt` (내림차순)
- **쿼리 범위**: 컬렉션

#### 인덱스 3
- **필드**: `inspectionDate` (오름차순), `orderNumber` (오름차순)
- **쿼리 범위**: 컬렉션

3. **인덱스 생성 완료 대기**
   - 각 인덱스는 생성에 시간이 걸릴 수 있습니다 (수분~수십 분)
   - 완료되면 "Enabled" 상태로 표시됩니다

## 3. 배포 확인

배포가 완료되면:
1. 애플리케이션을 실행하여 데이터 접근 테스트
2. Firebase Console에서 규칙/인덱스 상태 확인

## 참고

- 인덱스 생성은 백그라운드에서 진행되며, 완료까지 시간이 걸릴 수 있습니다
- 규칙은 즉시 적용됩니다
- 인덱스가 생성 완료되기 전에도 데이터 읽기는 가능하지만, 일부 쿼리는 느릴 수 있습니다

