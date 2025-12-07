import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, BrowserRouter } from 'react-router-dom';
import App from './App';
import './globals.css';
import { applyGlobalScrollbarStyles } from './shared/utils/ui/scrollbar';

// Electron 환경 감지 (window.electron이 있거나 file: 프로토콜인 경우)
const isElectron = (window as any).electron || window.location.protocol === 'file:';

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
