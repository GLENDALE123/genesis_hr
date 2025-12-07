import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, BrowserRouter } from 'react-router-dom';
import App from './App';
import './globals.css';
import { applyGlobalScrollbarStyles } from './shared/utils/ui/scrollbar';
import { PostItCanvas } from './shared/components/layout/PostItCanvas';

// Electron 환경 감지 (window.electron이 있거나 file: 프로토콜인 경우)
const isElectron = (window as any).electron || window.location.protocol === 'file:';

// 포스트잇 모드 확인 (가장 먼저 체크)
const isPostItMode = (() => {
  if (typeof window === 'undefined') return false;
  
  // 일반 쿼리 파라미터 확인
  const queryParams = new URLSearchParams(window.location.search);
  if (queryParams.get('mode') === 'postit') return true;
  
  // HashRouter 쿼리 파라미터 확인 (#/?mode=postit)
  const hash = window.location.hash;
  if (hash) {
    const hashQuery = hash.split('?')[1];
    if (hashQuery) {
      const hashParams = new URLSearchParams(hashQuery);
      if (hashParams.get('mode') === 'postit') return true;
    }
    // Hash 경로 확인 (#/postit)
    if (hash === '#/postit' || hash.startsWith('#/postit?')) return true;
  }
  
  return false;
})();

// 포스트잇 모드일 때는 Router와 Provider 없이 PostItCanvas만 렌더링
if (isPostItMode && isElectron) {
  console.log('[OK] [Main] 포스트잇 모드로 렌더링 시작');
  
  // 즉시 배경 투명 처리 (React 렌더링 전)
  if (typeof document !== 'undefined') {
    // 즉시 스타일 적용
    const applyTransparent = () => {
      document.documentElement.style.setProperty('background', 'transparent', 'important');
      document.documentElement.style.setProperty('background-color', 'transparent', 'important');
      document.documentElement.setAttribute('data-postit-mode', 'true');
      if (document.body) {
        document.body.style.setProperty('background', 'transparent', 'important');
        document.body.style.setProperty('background-color', 'transparent', 'important');
        document.body.setAttribute('data-postit-mode', 'true');
      }
      const rootElement = document.getElementById('root');
      if (rootElement) {
        rootElement.style.setProperty('background', 'transparent', 'important');
        rootElement.style.setProperty('background-color', 'transparent', 'important');
      }
    };
    
    applyTransparent();
    
    // DOMContentLoaded에서도 적용 (body가 준비된 후)
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', applyTransparent);
    }
  }
  
  // 포스트잇 전용 렌더링 (투명 배경)
  const rootElement = document.getElementById('root');
  if (rootElement) {
    console.log('[OK] [Main] PostItCanvas 렌더링 시작');
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <div 
          style={{ 
            width: '100vw', 
            height: '100vh', 
            overflow: 'hidden', 
            background: 'transparent',
            backgroundColor: 'transparent',
            position: 'fixed',
            top: 0,
            left: 0,
            zIndex: 1,
          }}
        >
          <PostItCanvas />
        </div>
      </React.StrictMode>
    );
    console.log('[OK] [Main] PostItCanvas 렌더링 완료');
  } else {
    console.error('[ERROR] [Main] root 요소를 찾을 수 없음');
  }
} else {
  console.log('[OK] [Main] 일반 모드로 렌더링');
  // 일반 모드 (Router와 Provider 포함)
  // Electron에서는 HashRouter, 웹에서는 BrowserRouter 사용
  const Router = isElectron ? HashRouter : BrowserRouter;

  // 전역 스크롤바 스타일 적용
  applyGlobalScrollbarStyles();

  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <Router>
        <App />
      </Router>
    </React.StrictMode>
  );
}
