
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

// انتظار برای لود شدن کامل DOM
const rootElement = document.getElementById('root');

if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  console.error("المان root در صفحه یافت نشد.");
}
