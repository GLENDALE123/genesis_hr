/**
 * Windows 콘솔 인코딩 설정 유틸리티
 * 한글 깨짐 방지를 위해 UTF-8 인코딩 설정
 */

/**
 * 콘솔 출력 인코딩을 UTF-8로 설정
 */
function setupConsoleEncoding() {
  if (process.platform === 'win32') {
    try {
      // stdout, stderr 인코딩 설정
      if (process.stdout && typeof process.stdout.setDefaultEncoding === 'function') {
        process.stdout.setDefaultEncoding('utf8');
      }
      if (process.stderr && typeof process.stderr.setDefaultEncoding === 'function') {
        process.stderr.setDefaultEncoding('utf8');
      }
      
      // Windows 코드 페이지를 UTF-8(65001)로 변경
      const { execSync } = require('child_process');
      try {
        execSync('chcp 65001 > nul 2>&1', { stdio: 'ignore' });
      } catch (error) {
        // chcp 실행 실패는 무시 (일부 환경에서는 제한될 수 있음)
      }
      
      // 환경 변수 설정
      process.env.CHCP = '65001';
      
      return true;
    } catch (error) {
      // 인코딩 설정 실패해도 앱은 계속 실행
      return false;
    }
  }
  return true;
}

module.exports = {
  setupConsoleEncoding,
};
