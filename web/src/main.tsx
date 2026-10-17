import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { Phone } from './Phone';
import '@fontsource/libre-caslon-condensed/latin-400.css';
import '@fontsource/libre-caslon-condensed/latin-700.css';
import '@fontsource/libre-caslon-condensed/latin-400-italic.css';
import '@fontsource-variable/source-sans-3/wght.css';
import '@fontsource/ibm-plex-mono/latin-500.css';
import '@fontsource/ibm-plex-mono/latin-700.css';
import './styles.css';

// The host screen pulls in the QR encoder; phones never download it (GDD: phone payload ≤ 300 KB).
const Host = lazy(() => import('./Host').then(m => ({ default: m.Host })));

const isHost = location.pathname.replace(/\/+$/, '') === '/host';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isHost ? (
      <Suspense fallback={<main className="center">Memuat…</main>}>
        <Host />
      </Suspense>
    ) : (
      <Phone />
    )}
  </StrictMode>,
);
