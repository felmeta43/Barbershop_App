import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Apply saved theme before first render to prevent flash
(function applyInitialTheme() {
  const saved = localStorage.getItem('theme') || 'dark';
  const resolved =
    saved === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      : saved;
  document.documentElement.setAttribute('data-theme', resolved);
})();

// Initialize Capacitor StatusBar on native platforms
import('@capacitor/core').then(({ Capacitor }) => {
  if (!Capacitor.isNativePlatform()) return;
  import('@capacitor/status-bar').then(({ StatusBar, Style }) => {
    StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
    StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
    StatusBar.setBackgroundColor({ color: '#111111' }).catch(() => {});
  }).catch(() => {});
}).catch(() => {});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
