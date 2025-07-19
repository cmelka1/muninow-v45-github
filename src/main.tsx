
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary';

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error('Failed to find the root element');
}

try {
  const root = createRoot(rootElement);
  
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
} catch (error) {
  console.error('Failed to render application:', error);
  
  // Fallback rendering if React fails
  rootElement.innerHTML = `
    <div style="
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: system-ui, -apple-system, sans-serif;
      padding: 20px;
      text-align: center;
    ">
      <div>
        <h1 style="color: #dc2626; margin-bottom: 16px;">Application Failed to Load</h1>
        <p style="color: #6b7280; margin-bottom: 24px;">Please refresh the page or try again later.</p>
        <button 
          onclick="window.location.reload()" 
          style="
            background: #3b82f6;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
          "
        >
          Refresh Page
        </button>
      </div>
    </div>
  `;
}
