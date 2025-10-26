/**
 * 개발자 도구: Autocomplete 데이터 마이그레이션
 * 브라우저 콘솔에서 실행할 수 있는 유틸리티 함수들
 */

import { runMigration, collectAutocompleteDataFromInspections } from '../services/autocompleteService';

// 전역 객체에 마이그레이션 함수 추가 (개발자 도구에서 사용)
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).qualityMigration = {
    /**
     * 마이그레이션 실행
     * 브라우저 콘솔에서 qualityMigration.run() 실행
     */
    run: async () => {
      try {
        const result = await runMigration();
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
        const result = await collectAutocompleteDataFromInspections();
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
    }
  };
}
