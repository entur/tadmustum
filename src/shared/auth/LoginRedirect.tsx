import { useEffect } from 'react';
import { useAuth } from './index';
import { useLocation } from 'react-router-dom';

const LoginRedirect = () => {
  const { isAuthenticated, isLoading, login } = useAuth();
  const { pathname, search } = useLocation();
  const returnUrl = pathname + search;

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      login(returnUrl);
    }
  }, [isLoading, isAuthenticated, login, returnUrl]);

  if (isLoading) return <div>Checking authentication status...</div>;

  return <div>Redirecting to login provider...</div>;
};

export default LoginRedirect;
