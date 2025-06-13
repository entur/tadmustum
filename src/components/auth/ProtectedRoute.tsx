// src/components/auth/ProtectedRoute.tsx
import React from 'react';
import { useAuth } from '../../auth'; // Assuming this path is correct
import LoginRedirect from '../../auth/LoginRedirect';
// Optional: If you have a global loading component, you can import it
// import LoadingPage from '../common/LoadingPage';

interface ProtectedRouteProps {
  element: React.ReactElement;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ element }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    // Render a loading indicator while authentication status is being determined.
    // This could be a global spinner or a simple message.
    // return <LoadingPage />; // Example if you have a shared loading component
    return <div>Loading authentication status...</div>; // Simple placeholder
  }

  if (!isAuthenticated) {
    // User is not authenticated, render the LoginRedirect component
    // which will handle the redirection to the login provider.
    return <LoginRedirect />;
  }

  // User is authenticated, render the protected element.
  return element;
};
