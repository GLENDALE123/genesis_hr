#!/bin/bash

# Firebase Storage 버킷 마이그레이션 스크립트
# 원본: gs://hs-jig-b2093
# 대상: gs://hs-jig-b2093.firebasestorage.app

set -e  # 에러 발생 시 스크립트 중단

SOURCE_BUCKET="gs://hs-jig-b2093"
TARGET_BUCKET="gs://hs-jig-b2093.firebasestorage.app"

echo "=========================================="
echo "Firebase Storage 버킷 마이그레이션 시작"
echo "=========================================="
echo "원본 버킷: $SOURCE_BUCKET"
echo "대상 버킷: $TARGET_BUCKET"
echo ""

# gsutil이 설치되어 있는지 확인
if ! command -v gsutil &> /dev/null; then
    echo "❌ 오류: gsutil이 설치되어 있지 않습니다."
    echo "Google Cloud SDK를 설치하고 gsutil을 사용할 수 있도록 설정하세요."
    exit 1
fi

echo "✅ gsutil 확인 완료"
echo ""

# 사용자 확인
read -p "계속하시겠습니까? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "마이그레이션이 취소되었습니다."
    exit 0
fi

echo ""
echo "📦 버킷 동기화 시작..."
echo "이 작업은 시간이 걸릴 수 있습니다."
echo ""

# gsutil rsync 실행
# -m: 멀티스레딩으로 빠른 전송
# -r: 재귀적 동기화 (하위 디렉토리 포함)
# -d: 대상에 없는 파일 삭제 (선택사항 - 주석 처리됨)
# -x: 제외 패턴 (필요시 추가)

# 기본 동기화 (덮어쓰기)
gsutil -m rsync -r "$SOURCE_BUCKET" "$TARGET_BUCKET"

SYNC_EXIT_CODE=$?

echo ""
if [ $SYNC_EXIT_CODE -eq 0 ]; then
    echo "=========================================="
    echo "✅ 마이그레이션 완료!"
    echo "=========================================="
    echo ""
    echo "다음 단계:"
    echo "1. 대상 버킷의 파일들을 확인하세요:"
    echo "   gsutil ls -r $TARGET_BUCKET"
    echo ""
    echo "2. 프로젝트 설정 파일을 업데이트하세요:"
    echo "   - firebase.json"
    echo "   - src/shared/services/firebase/config.ts"
    echo "   - env.example"
    echo ""
    echo "3. 애플리케이션을 테스트하여 새 버킷이 정상 작동하는지 확인하세요."
else
    echo "=========================================="
    echo "❌ 마이그레이션 중 오류 발생"
    echo "=========================================="
    echo "종료 코드: $SYNC_EXIT_CODE"
    echo ""
    echo "다음을 확인하세요:"
    echo "1. gcloud 인증이 올바르게 설정되었는지 확인:"
    echo "   gcloud auth list"
    echo ""
    echo "2. 버킷 접근 권한이 있는지 확인:"
    echo "   gsutil ls $SOURCE_BUCKET"
    echo "   gsutil ls $TARGET_BUCKET"
    exit $SYNC_EXIT_CODE
fi

