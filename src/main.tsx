import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { fetchConfig } from './config/fetchConfig.tsx';
import { ConfigContext } from './config/ConfigContext.tsx';
import { AuthProvider } from './auth/Auth.tsx';

fetchConfig().then(config => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ConfigContext.Provider value={config}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ConfigContext.Provider>
    </StrictMode>
  );
});
