import { createRoot } from 'react-dom/client';

import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';
import { ClerkProvider, Show, SignIn } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';

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

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

createRoot(document.getElementById('root')!, {
  // Keeps caught errors off reportError(), which would raise the dev overlay.
  onCaughtError: (error, errorInfo) => {
    console.error(error, errorInfo.componentStack);
  },
}).render(
  <ErrorBoundary>
    <ClerkProvider publishableKey={clerkPubKey} proxyUrl={clerkProxyUrl}>
      <Show when="signed-in">
        <App />
      </Show>
      <Show when="signed-out">
        <main className="min-h-screen bg-black text-white flex items-center justify-center p-4">
          <SignIn routing="hash" />
        </main>
      </Show>
    </ClerkProvider>
  </ErrorBoundary>,
);
