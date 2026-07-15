import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
// 1. Tambahkan import ini:
import { AuthProvider } from './lib/auth'; 

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* 2. Bungkus App dengan AuthProvider */}
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
);