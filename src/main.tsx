import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Load custom app icon if exists
const savedIcon = localStorage.getItem('honey_money_app_icon');
if (savedIcon) {
  const link = document.querySelector("link[rel*='apple-touch-icon']") as HTMLLinkElement;
  if (link) {
    link.href = savedIcon;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
