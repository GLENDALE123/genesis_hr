/**
 * Windows 콘솔 인코딩 설정 유틸리티
 * 한글 깨짐 방지를 위해 UTF-8 인코딩 설정
 */

const { execSync, spawn } = require('child_process');

/**
 * 콘솔 출력 인코딩을 UTF-8로 설정
 */
function setupConsoleEncoding() {
  if (process.platform === 'win32') {
    try {
      // 1. 환경 변수 먼저 설정 (가장 중요)
      process.env.CHCP = '65001';
      process.env.NODE_OPTIONS = (process.env.NODE_OPTIONS || '') + ' --max-old-space-size=4096';
      
      // 2. Windows 코드 페이지를 UTF-8(65001)로 변경 (동기적으로 실행)
      try {
        // PowerShell이면 UTF-8 강제
        const isPowerShell = process.env.SHELL && process.env.SHELL.includes('powershell');
        const isCmd = process.env.ComSpec && process.env.ComSpec.includes('cmd.exe');
        
        if (isPowerShell || !isCmd) {
          // PowerShell에서 실행 중인 경우
          execSync('chcp 65001', { 
            stdio: 'inherit',
            shell: true,
            encoding: 'utf8'
          });
        } else {
          // CMD에서 실행 중인 경우
          execSync('chcp 65001 >nul 2>&1', { 
            stdio: 'ignore',
            shell: true,
            encoding: 'utf8'
          });
        }
        
        console.log('✅ [Console Encoding] Windows 코드 페이지를 UTF-8로 변경 완료');
      } catch (error) {
        console.warn('⚠️ [Console Encoding] chcp 실행 실패 (무시 가능):', error.message);
      }
      
      // 3. stdout, stderr 인코딩 설정
      try {
        if (process.stdout) {
          if (typeof process.stdout.setDefaultEncoding === 'function') {
            process.stdout.setDefaultEncoding('utf8');
          }
          // WriteStream의 _write 함수를 오버라이드하여 UTF-8 강제
          if (process.stdout._write) {
            const originalWrite = process.stdout._write;
            process.stdout._write = function(chunk, encoding, callback) {
              if (typeof encoding === 'string' && encoding !== 'utf8' && encoding !== 'utf-8') {
                encoding = 'utf8';
              }
              return originalWrite.call(this, chunk, encoding, callback);
            };
          }
        }
        
        if (process.stderr) {
          if (typeof process.stderr.setDefaultEncoding === 'function') {
            process.stderr.setDefaultEncoding('utf8');
          }
          if (process.stderr._write) {
            const originalWrite = process.stderr._write;
            process.stderr._write = function(chunk, encoding, callback) {
              if (typeof encoding === 'string' && encoding !== 'utf8' && encoding !== 'utf-8') {
                encoding = 'utf8';
              }
              return originalWrite.call(this, chunk, encoding, callback);
            };
          }
        }
        
        console.log('✅ [Console Encoding] stdout/stderr 인코딩 설정 완료');
      } catch (error) {
        console.warn('⚠️ [Console Encoding] stdout/stderr 인코딩 설정 실패:', error.message);
      }
      
      // 4. console.log, console.error 등을 오버라이드하여 UTF-8 강제
      const originalLog = console.log;
      const originalError = console.error;
      const originalWarn = console.warn;
      
      // UTF-8로 인코딩된 문자열 출력 보장
      const ensureUtf8 = (args) => {
        return args.map(arg => {
          if (typeof arg === 'string') {
            // 이미 UTF-8인 문자열은 그대로 사용
            try {
              Buffer.from(arg, 'utf8').toString('utf8');
              return arg;
            } catch {
              // 인코딩 문제가 있으면 재인코딩 시도
              try {
                return Buffer.from(arg, 'latin1').toString('utf8');
              } catch {
                return arg;
              }
            }
          }
          return arg;
        });
      };
      
      console.log = function(...args) {
        originalLog.apply(console, ensureUtf8(args));
      };
      
      console.error = function(...args) {
        originalError.apply(console, ensureUtf8(args));
      };
      
      console.warn = function(...args) {
        originalWarn.apply(console, ensureUtf8(args));
      };
      
      console.log('✅ [Console Encoding] 콘솔 출력 함수 오버라이드 완료');
      
      return true;
    } catch (error) {
      console.error('❌ [Console Encoding] 인코딩 설정 중 오류 발생:', error);
      // 인코딩 설정 실패해도 앱은 계속 실행
      return false;
    }
  }
  return true;
}

module.exports = {
  setupConsoleEncoding,
};





















