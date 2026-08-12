import { createRoot } from 'react-dom/client';

import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';

import './index.css';

// ── PWA: Register Service Worker for offline support ─────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // BASE_URL includes the base path (e.g. /islandcity-driver-accounting/)
    const swUrl = `${import.meta.env.BASE_URL}sw.js`;
    navigator.serviceWorker
      .register(swUrl, { scope: import.meta.env.BASE_URL })
      .then(reg => {
        console.log('[SW] Registered — scope:', reg.scope);
        reg.addEventListener('updatefound', () => {
          console.log('[SW] Update found — installing new version');
        });
      })
      .catch(err => console.warn('[SW] Registration failed:', err));
  });
}

createRoot(document.getElementById('root')!, {
  // Keeps caught errors off reportError(), which would raise the dev overlay.
  onCaughtError: (error, errorInfo) => {
    console.error(error, errorInfo.componentStack);
  },
}).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
