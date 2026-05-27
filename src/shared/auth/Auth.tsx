import { AuthProvider as OidcAuthProvider } from 'react-oidc-context';
import { WebStorageStateStore } from 'oidc-client-ts';
import { useConfig } from '../../contexts/ConfigContext.tsx';

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { oidcConfig } = useConfig();

  return (
    <OidcAuthProvider
      {...oidcConfig!}
      onSigninCallback={() => {
        window.history.replaceState({}, document.title, window.location.pathname);
      }}
      redirect_uri={oidcConfig?.redirect_uri || window.location.origin + import.meta.env.BASE_URL}
      // Persist the session in localStorage (shared across tabs) instead of the
      // oidc-client-ts default sessionStorage (per-tab), so opening a new tab
      // doesn't force a re-login.
      userStore={new WebStorageStateStore({ store: window.localStorage })}
    >
      {children}
    </OidcAuthProvider>
  );
};
