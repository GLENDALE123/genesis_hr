/**
 * 개발자 도구: Autocomplete 데이터 마이그레이션
 * 브라우저 콘솔에서 실행할 수 있는 유틸리티 함수들
 */

import { runMigration, collectAutocompleteDataFromInspections } from '../services/autocompleteService';

// 전역 객체에 마이그레이션 함수 추가 (개발자 도구에서 사용)
if (typeof window !== 'undefined') {
  (window as any).qualityMigration = {
    /**
     * 마이그레이션 실행
     * 브라우저 콘솔에서 qualityMigration.run() 실행
     */
    run: async () => {
      try {
        console.log('🚀 Autocomplete 데이터 마이그레이션 시작...');
        const result = await runMigration();
        console.log('✅ 마이그레이션 완료!', result);
        return result;
      } catch (error) {
        console.error('❌ 마이그레이션 실패:', error);
        throw error;
      }
    },

    /**
     * 기존 데이터 수집만 실행 (저장하지 않음)
     * 브라우저 콘솔에서 qualityMigration.collect() 실행
     */
    collect: async () => {
      try {
        console.log('📊 기존 검사 데이터 수집 중...');
        const result = await collectAutocompleteDataFromInspections();
        console.log('📋 수집된 데이터:', result);
        return result;
      } catch (error) {
        console.error('❌ 데이터 수집 실패:', error);
        throw error;
      }
    },

    /**
     * 도움말
     * 브라우저 콘솔에서 qualityMigration.help() 실행
     */
    help: () => {
      console.log(`
🔧 품질검사 Autocomplete 데이터 마이그레이션 도구

사용법:
1. qualityMigration.collect() - 기존 데이터 수집 (미리보기)
2. qualityMigration.run() - 마이그레이션 실행
3. qualityMigration.help() - 이 도움말 표시

주의사항:
- 기존 검사 데이터는 변경되지 않습니다
- 새로운 autocomplete-data 컬렉션만 생성됩니다
- 마이그레이션은 한 번만 실행하면 됩니다
      `);
    }
  };

  console.log('🔧 품질검사 마이그레이션 도구가 로드되었습니다.');
  console.log('qualityMigration.help() 를 실행하여 사용법을 확인하세요.');
}
