# Electron 스플래시 화면 구현

프로그램 시작 시 데이터 로딩 및 렌더링 준비 중임을 사용자에게 알리는 스플래시 화면입니다.

## 구현 내용

### 1. **스플래시 화면 HTML**

`electron/splash.html` - 독립적인 스플래시 화면

**특징**:
- 로고 이미지 표시
- 로딩 애니메이션 (3개 점 애니메이션)
- 진행 상태 텍스트
- 다크 모드 자동 감지
- 부드러운 페이드 인 효과

### 2. **스플래시 윈도우 생성**

```javascript
// electron/main.js
function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 400,
    height: 500,
    frame: false,           // 프레임리스
    transparent: true,      // 투명 배경
    alwaysOnTop: true,      // 최상단 표시
    skipTaskbar: true,      // 작업표시줄에 표시 안 함
    resizable: false,       // 크기 조절 불가
    center: true,           // 중앙 배치
  });
}
```

### 3. **앱 시작 흐름**

```
앱 시작 (0ms)
  ↓
1. 스플래시 화면 표시 ✅ (즉시)
  ↓
2. 네이티브 캐시 로드 (0ms)
  ↓
3. 메인 윈도우 생성 (50ms, show: false)
  ↓
4. HTML 로드 (150ms)
  ↓
5. 프리로딩 시작 (200ms)
  ↓
6. 메인 윈도우 준비 완료 (400ms)
  ↓
7. 스플래시 닫기 + 메인 윈도우 표시 (450ms)
```

### 4. **상태 업데이트**

스플래시 화면에 진행 상태 표시:

```javascript
updateSplashStatus('파일을 로드하는 중...');
updateSplashStatus('데이터를 준비하는 중...');
updateSplashStatus('거의 완료되었습니다...');
```

### 5. **부드러운 전환**

- 스플래시 화면 페이드 아웃 (150ms)
- 메인 윈도우 표시
- 자연스러운 전환 효과

## 사용자 경험

### 느낌
- **전문적인 시작**: 로고와 브랜딩 표시
- **진행 상태 표시**: 무엇이 로드되고 있는지 명확히 표시
- **부드러운 전환**: 페이드 효과로 자연스러운 전환

### 실제 동작
1. 앱 시작: 스플래시 화면 즉시 표시 (0ms)
2. 데이터 로딩: 진행 상태 업데이트
3. 준비 완료: 스플래시 닫고 메인 윈도우 표시

## 주요 파일

- `electron/splash.html` - 스플래시 화면 HTML
- `electron/main.js` - 스플래시 윈도우 생성/관리

## 설정

### package.json
```json
{
  "build": {
    "asarUnpack": [
      "electron/splash.html"  // 스플래시 HTML 압축 해제
    ]
  }
}
```

## 개선 사항

### 현재 구현
- ✅ 스플래시 화면 표시
- ✅ 진행 상태 업데이트
- ✅ 부드러운 페이드 전환
- ✅ 다크 모드 지원

### 향후 개선 가능
- 진행 바 추가 (선택적)
- 애니메이션 개선
- 커스텀 로딩 메시지

## 참고

일반적인 데스크톱 앱과 동일한 방식으로 스플래시 화면을 구현하여 사용자에게 전문적인 첫 인상을 제공합니다.















