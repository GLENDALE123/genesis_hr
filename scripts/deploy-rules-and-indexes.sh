#!/bin/bash

# Firebase 규칙 및 인덱스 배포 스크립트
# 사용법: ./scripts/deploy-rules-and-indexes.sh

set -e  # 오류 발생 시 스크립트 중단

echo "🚀 Firebase 규칙 및 인덱스 배포를 시작합니다..."
echo ""

# 프로젝트 확인
PROJECT_ID="hs-jig-b2093"
echo "📋 프로젝트: $PROJECT_ID"
echo ""

# Firebase CLI 설치 확인
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI가 설치되어 있지 않습니다."
    echo "설치 방법: npm install -g firebase-tools"
    exit 1
fi

# Firebase 로그인 확인
echo "🔐 Firebase 로그인 상태 확인..."
firebase projects:list > /dev/null 2>&1 || {
    echo "❌ Firebase에 로그인되지 않았습니다."
    echo "로그인: firebase login"
    exit 1
}

echo "✅ Firebase 로그인 확인 완료"
echo ""

# Storage 규칙 배포
echo "📦 Storage 규칙 배포 중..."
firebase deploy --only storage:rules --project=$PROJECT_ID
echo "✅ Storage 규칙 배포 완료"
echo ""

# Firestore 규칙 배포
echo "📦 Firestore 규칙 배포 중..."
echo "⚠️  주의: Firebase CLI는 기본 데이터베이스에만 규칙을 배포합니다."
echo "   tms-production 데이터베이스에는 Firebase Console에서 직접 배포해야 합니다."
echo ""
read -p "계속하시겠습니까? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    firebase deploy --only firestore:rules --project=$PROJECT_ID
    echo "✅ Firestore 규칙 배포 완료 (기본 데이터베이스)"
    echo "⚠️  다음 단계: Firebase Console에서 tms-production 데이터베이스에 규칙 배포"
else
    echo "⏭️  Firestore 규칙 배포 건너뛰기"
fi
echo ""

# Firestore 인덱스 배포
echo "📊 Firestore 인덱스 배포 중..."
echo "⚠️  주의: Firebase CLI는 기본 데이터베이스에만 인덱스를 배포합니다."
echo "   tms-production 데이터베이스에는 Firebase Console 또는 gcloud CLI로 배포해야 합니다."
echo ""
read -p "계속하시겠습니까? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    firebase deploy --only firestore:indexes --project=$PROJECT_ID
    echo "✅ Firestore 인덱스 배포 완료 (기본 데이터베이스)"
    echo "⚠️  다음 단계: Firebase Console에서 tms-production 데이터베이스에 인덱스 배포"
else
    echo "⏭️  Firestore 인덱스 배포 건너뛰기"
fi
echo ""

echo "✅ 배포 스크립트 완료!"
echo ""
echo "📝 다음 작업:"
echo "   1. Firebase Console에서 tms-production 데이터베이스 선택"
echo "   2. Rules 탭에서 Firestore 규칙 배포"
echo "   3. Indexes 탭에서 인덱스 생성 (firestore.indexes.json 참고)"
echo ""

