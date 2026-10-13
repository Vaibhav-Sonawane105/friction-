import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { BlockedPage } from './pages/BlockedPage';

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <BlockedPage />
    </StrictMode>
  );
}
