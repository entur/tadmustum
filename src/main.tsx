import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { fetchConfig } from './utils/fetchConfig.tsx';
import { ConfigContext } from './utils/ConfigContext.tsx';
import { AuthProvider } from './auth';
import { CustomizationProvider } from './utils/CustomizationContext.tsx';

fetchConfig().then(config => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ConfigContext.Provider value={config}>
        <AuthProvider>
          <CustomizationProvider>
            <App />
          </CustomizationProvider>
        </AuthProvider>
      </ConfigContext.Provider>
    </StrictMode>
  );
});
