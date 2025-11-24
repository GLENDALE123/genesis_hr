import React from 'react';
import ReactDOM from 'react-dom/client';
<<<<<<< HEAD
import App from './App';
import './app/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);


=======
import { HashRouter, BrowserRouter } from 'react-router-dom';
import App from './App';
import './globals.css';

// Electron 환경 감지 (window.electron이 있거나 file: 프로토콜인 경우)
const isElectron = (window as any).electron || window.location.protocol === 'file:';

// Electron에서는 HashRouter, 웹에서는 BrowserRouter 사용
const Router = isElectron ? HashRouter : BrowserRouter;

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Router>
      <App />
    </Router>
  </React.StrictMode>
);
>>>>>>> develop
