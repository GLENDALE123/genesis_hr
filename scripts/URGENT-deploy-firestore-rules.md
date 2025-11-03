# ⚠️ 긴급: Firestore 규칙 배포 필요

현재 `tms-production` 데이터베이스에 Firestore 규칙이 배포되지 않아 권한 오류가 발생하고 있습니다.

## 즉시 해결 방법

### 1단계: Firebase Console 접속
1. 브라우저에서 접속: https://console.firebase.google.com/project/hs-jig-b2093/firestore

### 2단계: 데이터베이스 선택 (중요!)
1. **Firestore Database** 페이지 상단에 **데이터베이스 선택 드롭다운**이 있습니다
2. **반드시 `tms-production` 데이터베이스를 선택**하세요
3. `(default)`가 선택되어 있으면 `tms-production`으로 변경하세요

### 3단계: 규칙 배포
1. **Rules** 탭 클릭
2. 아래 전체 규칙 내용을 복사하여 붙여넣기
3. **게시** 버튼 클릭

## 배포할 규칙 내용

아래 전체 내용을 복사하세요:

```
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
      
      // 사용자별 카운터 서브컬렉션 (미읽음 알림 카운트 등)
      match /counters/{docId} {
        // 자신의 카운터만 읽기 가능
        allow read: if request.auth != null && request.auth.uid == userId;
        
        // 쓰기는 서버에서만 (Functions)
        allow write: if false;
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

## 확인 방법

규칙 배포 후:
1. 브라우저를 새로고침
2. 로그인 후 알림, 설정 등이 정상적으로 로드되는지 확인
3. 콘솔에 권한 오류가 더 이상 나타나지 않는지 확인

## 중요 사항

- ⚠️ **반드시 `tms-production` 데이터베이스를 선택**하고 규칙을 배포하세요
- `(default)` 데이터베이스에 배포하면 안 됩니다!
- 규칙은 즉시 적용됩니다 (몇 초 내)

