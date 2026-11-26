import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/source-serif-4/400.css';
import '@fontsource/source-serif-4/600.css';
import '@fontsource/ia-writer-mono/400.css';
import '@fontsource/ia-writer-mono/700.css';
import '@fontsource/ia-writer-quattro/400.css';
import '@fontsource/ia-writer-quattro/700.css';
import './styles/tokens.css';
import './styles/app.css';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swPath = `${import.meta.env.BASE_URL}sw.js`;
    navigator.serviceWorker.register(swPath).catch(() => {
      // Ignore SW registration failure in restricted contexts
    });
  });
}
