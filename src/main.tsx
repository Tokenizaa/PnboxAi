import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { PlatformGate } from './components/PlatformGate';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PlatformGate>
      <App />
    </PlatformGate>
  </StrictMode>,
);
