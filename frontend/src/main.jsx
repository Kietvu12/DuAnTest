import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { RouterErrorBoundary } from './components/ErrorBoundary';
import { installGlobalErrorHandlers } from './lib/errorReporting';
import { AppProviders } from './lib/store';
import './index.css';

installGlobalErrorHandlers();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <RouterErrorBoundary>
        <AppProviders>
          <App />
        </AppProviders>
      </RouterErrorBoundary>
    </BrowserRouter>
  </StrictMode>,
);
