import { useEffect } from 'react';
import { BrowserRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { useAuth } from './shared/auth';
import { POST_LOGIN_REDIRECT_KEY } from './shared/auth/authUtils.ts';
import Header from './shared/components/header/Header.tsx';
import Home from './features/landing-page/Home.tsx';
import { SearchProvider } from './shared/components/search';
import { Box, CssBaseline, ThemeProvider, Toolbar } from '@mui/material';
import { useCustomization } from './contexts/CustomizationContext.tsx';
import { useAppTheme } from './hooks/useAppTheme';
import { ProtectedRoute } from './shared/components/auth/ProtectedRoute';
import { EditingProvider } from './contexts/EditingContext.tsx';
import SessionExpiredDialog from './shared/components/dialogs/SessionExpiredDialog.tsx';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { loadDevMessages, loadErrorMessages } from '@apollo/client/dev';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import CarPoolingTrip from './features/plan-trip/CarPoolingTrip.tsx';
import CarPoolingTrips from './features/planned-trips/CarPoolingTrips.tsx';
import NoAccessModal from './shared/components/auth/NoAccessModal.tsx';
import { NoAccessProvider } from './contexts/NoAccessContext.tsx';
import PassengerTripBooking from './features/passenger-booking/PassengerTripBooking.tsx';

if (import.meta.env.DEV) {
  loadDevMessages();
  loadErrorMessages();
}

/**
 * After the OIDC login round-trip the user lands on the registered callback URL
 * (the app root). This restores the page they originally tried to reach.
 */
function PostLoginRedirect() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) return;
    const target = sessionStorage.getItem(POST_LOGIN_REDIRECT_KEY);
    if (target) {
      sessionStorage.removeItem(POST_LOGIN_REDIRECT_KEY);
      navigate(target, { replace: true });
    }
  }, [isAuthenticated, navigate]);

  return null;
}

export default function App() {
  const { useCustomFeatures } = useCustomization();

  const { theme } = useAppTheme(useCustomFeatures);

  return (
    <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <SearchProvider>
          <ThemeProvider theme={theme}>
            <NoAccessProvider>
              <NoAccessModal />
              <EditingProvider>
                <CssBaseline />
                <Header />
                <Toolbar
                  sx={{
                    minHeight: { xs: '64px' },
                  }}
                />
                <Box className="app-root">
                  <Box className="app-content">
                    <PostLoginRedirect />
                    <Routes>
                      <Route path="/" element={<Home />} />
                      <Route
                        path="/plan-trip"
                        element={<ProtectedRoute element={<CarPoolingTrip />} />}
                      />
                      <Route
                        path="/plan-trip/:codespace/:id"
                        element={<ProtectedRoute element={<CarPoolingTrip />} />}
                      />
                      <Route
                        path="/trips"
                        element={<ProtectedRoute element={<CarPoolingTrips />} />}
                      />
                      <Route
                        path="/book-trip/:codespace/:tripId"
                        element={<ProtectedRoute element={<PassengerTripBooking />} />}
                      />
                    </Routes>
                  </Box>
                </Box>
                <SessionExpiredDialog />
              </EditingProvider>
            </NoAccessProvider>
          </ThemeProvider>
        </SearchProvider>
      </LocalizationProvider>
    </BrowserRouter>
  );
}
