# GitHub Actions 캐시 사용법

## 캐시란?

GitHub Actions가 매번 실행될 때마다 `npm ci`로 모든 의존성을 다시 다운로드합니다.

**캐시를 사용하면**: 의존성 파일을 저장해 두고, 다음 빌드 시 재사용합니다.

---

## 효과

### 캐시 없을 때
```
1. npm ci 실행
   ↓
2. package-lock.json 읽기
   ↓
3. 모든 패키지 다운로드 (5분 소요)
   ↓
4. 빌드 시작
```

### 캐시 있을 때
```
1. npm ci 실행
   ↓
2. 캐시 확인
   ↓
3. 캐시 히트 → 의존성 즉시 로드 (30초 소요!)
   ↓
4. 빌드 시작
```

**시간 절약**: 5분 → 30초 (약 90% 단축!)

---

## 현재 코드

### `firebase-hosting-merge.yml`과 `release.yml`

현재 **캐시가 이미 설정되어 있습니다!**

```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'npm'  # ← 이게 캐시!
```

**`cache: 'npm'`**가 캐시를 자동으로 활성화합니다.

---

## 작동 방식

### 자동 캐시

GitHub Actions가 자동으로:
1. `package-lock.json` 파일 해시 계산
2. 캐시에 저장
3. 다음 빌드 시 비교
4. 같으면 캐시 재사용
5. 다르면 새로 다운로드

---

## 캐시 효과 예시

### 시나리오: 100번 빌드

#### 캐시 없을 때
```
1번: 5분 (다운로드)
2번: 5분 (다운로드)
3번: 5분 (다운로드)
...
총: 500분 (8시간 20분)
```

#### 캐시 있을 때
```
1번: 5분 (다운로드 + 캐시 저장)
2번: 30초 (캐시 재사용)
3번: 30초 (캐시 재사용)
...
총: 5분 + 49분 = 54분
```

**절약**: 7시간 26분!

---

## 수동 캐시 설정 (고급)

현재 `cache: 'npm'`이면 충분하지만, 더 세밀하게 제어하려면:

```yaml
- name: Get npm cache
  id: npm-cache
  run: echo "dir=$(npm config get cache)" >> $GITHUB_OUTPUT

- uses: actions/cache@v3
  with:
    path: ${{ steps.npm-cache.outputs.dir }}
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-
```

하지만 **현재 설정으로 충분합니다!**

---

## 캐시 상태 확인

GitHub Actions 로그에서 확인:

```
Post job cleanup.
  Cache restored from key: Linux-npm-abc123...
  Cache saved with key: Linux-npm-abc123...
```

**"restored"**: 캐시에서 로드 (빠름)  
**"saved"**: 캐시에 저장

---

## 요약

**질문**: 캐시 사용은 뭔가요?

**답**: 
- ❌ **아니요**: 매번 의존성 다운로드 (느림)
- ✅ **예**: 의존성 저장해 두고 재사용 (빠름)

**현재**: 이미 설정되어 있습니다! (`cache: 'npm'`)

결과: `npm ci`가 5분 → 30초로 단축됩니다.

