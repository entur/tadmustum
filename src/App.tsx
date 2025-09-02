import { BrowserRouter, Route, Routes } from 'react-router-dom';
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
import { ApolloClient, ApolloProvider, InMemoryCache } from '@apollo/client';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import CarPoolingTrip from './features/plan-trip/CarPoolingTrip.tsx';
import CarPoolingTrips from './features/planned-trips/CarPoolingTrips.tsx';
import NoAccessModal from './shared/components/auth/NoAccessModal.tsx';
import { NoAccessProvider } from './contexts/NoAccessContext.tsx';

export default function App() {
  const { useCustomFeatures } = useCustomization();

  const { theme } = useAppTheme(useCustomFeatures);

  const client = new ApolloClient({
    uri: 'http://localhost:8080/graphql',
    cache: new InMemoryCache(),
  });

  return (
    <BrowserRouter future={{ v7_relativeSplatPath: true }}>
      <ApolloProvider client={client}>
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
                      <Routes>
                        <Route path="/" element={<Home />} />
                        <Route
                          path="/plan-trip"
                          element={<ProtectedRoute element={<CarPoolingTrip />} />}
                        />
                        <Route
                          path="/plan-trip/:id"
                          element={<ProtectedRoute element={<CarPoolingTrip />} />}
                        />
                        <Route
                          path="/trips"
                          element={<ProtectedRoute element={<CarPoolingTrips />} />}
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
      </ApolloProvider>
    </BrowserRouter>
  );
}
