import { useEffect } from 'react';
import { useAuth } from './index';
import { useLocation } from 'react-router-dom';

const LoginRedirect = () => {
  const { isAuthenticated, isLoading, login } = useAuth();
  const { pathname, search } = useLocation();
  const returnUrl = pathname + search;

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Replace history so pressing back from the OIDC login page skips this
      // protected route — otherwise it would re-trigger the redirect and trap
      // the user on the login page.
      login(returnUrl, { replace: true });
    }
  }, [isLoading, isAuthenticated, login, returnUrl]);

  if (isLoading) return <div>Checking authentication status...</div>;

  return <div>Redirecting to login provider...</div>;
};

export default LoginRedirect;
