# Firebase 규칙 및 인덱스 배포 스크립트 (PowerShell)
# 사용법: .\scripts\deploy-rules-and-indexes.ps1

$ErrorActionPreference = "Stop"

Write-Host "🚀 Firebase 규칙 및 인덱스 배포를 시작합니다..." -ForegroundColor Cyan
Write-Host ""

# 프로젝트 확인
$PROJECT_ID = "hs-jig-b2093"
Write-Host "📋 프로젝트: $PROJECT_ID" -ForegroundColor Yellow
Write-Host ""

# Firebase CLI 설치 확인
try {
    firebase --version | Out-Null
} catch {
    Write-Host "❌ Firebase CLI가 설치되어 있지 않습니다." -ForegroundColor Red
    Write-Host "설치 방법: npm install -g firebase-tools" -ForegroundColor Yellow
    exit 1
}

# Firebase 로그인 확인
Write-Host "🔐 Firebase 로그인 상태 확인..." -ForegroundColor Cyan
try {
    firebase projects:list | Out-Null
} catch {
    Write-Host "❌ Firebase에 로그인되지 않았습니다." -ForegroundColor Red
    Write-Host "로그인: firebase login" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Firebase 로그인 확인 완료" -ForegroundColor Green
Write-Host ""

# Storage 규칙 배포
Write-Host "📦 Storage 규칙 배포 중..." -ForegroundColor Cyan
firebase deploy --only storage:rules --project=$PROJECT_ID
Write-Host "✅ Storage 규칙 배포 완료" -ForegroundColor Green
Write-Host ""

# Firestore 규칙 배포
Write-Host "📦 Firestore 규칙 배포 중..." -ForegroundColor Cyan
Write-Host "⚠️  주의: Firebase CLI는 기본 데이터베이스에만 규칙을 배포합니다." -ForegroundColor Yellow
Write-Host "   tms-production 데이터베이스에는 Firebase Console에서 직접 배포해야 합니다." -ForegroundColor Yellow
Write-Host ""
$response = Read-Host "계속하시겠습니까? (y/N)"
if ($response -eq "y" -or $response -eq "Y") {
    firebase deploy --only firestore:rules --project=$PROJECT_ID
    Write-Host "✅ Firestore 규칙 배포 완료 (기본 데이터베이스)" -ForegroundColor Green
    Write-Host "⚠️  다음 단계: Firebase Console에서 tms-production 데이터베이스에 규칙 배포" -ForegroundColor Yellow
} else {
    Write-Host "⏭️  Firestore 규칙 배포 건너뛰기" -ForegroundColor Gray
}
Write-Host ""

# Firestore 인덱스 배포
Write-Host "📊 Firestore 인덱스 배포 중..." -ForegroundColor Cyan
Write-Host "⚠️  주의: Firebase CLI는 기본 데이터베이스에만 인덱스를 배포합니다." -ForegroundColor Yellow
Write-Host "   tms-production 데이터베이스에는 Firebase Console 또는 gcloud CLI로 배포해야 합니다." -ForegroundColor Yellow
Write-Host ""
$response = Read-Host "계속하시겠습니까? (y/N)"
if ($response -eq "y" -or $response -eq "Y") {
    firebase deploy --only firestore:indexes --project=$PROJECT_ID
    Write-Host "✅ Firestore 인덱스 배포 완료 (기본 데이터베이스)" -ForegroundColor Green
    Write-Host "⚠️  다음 단계: Firebase Console에서 tms-production 데이터베이스에 인덱스 배포" -ForegroundColor Yellow
} else {
    Write-Host "⏭️  Firestore 인덱스 배포 건너뛰기" -ForegroundColor Gray
}
Write-Host ""

Write-Host "✅ 배포 스크립트 완료!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 다음 작업:" -ForegroundColor Cyan
Write-Host "   1. Firebase Console에서 tms-production 데이터베이스 선택" -ForegroundColor White
Write-Host "   2. Rules 탭에서 Firestore 규칙 배포" -ForegroundColor White
Write-Host "   3. Indexes 탭에서 인덱스 생성 (firestore.indexes.json 참고)" -ForegroundColor White
Write-Host ""

