import { BrowserRouter, Route, Routes } from "react-router-dom";
import Header from "./shared/components/Header";
import Home from "./features/landing-page/Home.tsx";
import CarPoolingTrips from "./features/planned-trips/CarPoolingTrips.tsx";
import CarPoolingTrip from "./features/plan-trip/CarPoolingTrip.tsx";
import { SearchProvider } from "./shared/components/SearchContext";
import { useAuth } from "./shared/auth/Auth";
import LoginRedirect from "./shared/auth/LoginRedirect";
import { Box, CssBaseline, Toolbar } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { ApolloClient, ApolloProvider, InMemoryCache } from "@apollo/client";

export default function App() {
  const auth = useAuth();

  const client = new ApolloClient({
    uri: "http://localhost:8080/graphql",
    cache: new InMemoryCache(),
  });

  return (
    <BrowserRouter>
      <ApolloProvider client={client}>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <SearchProvider>
            <CssBaseline />
            <Header />
            <Toolbar />
            <Box className="app-root">
              <Box className="app-content">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route
                    path="/trips"
                    element={
                      auth.isAuthenticated ? (
                        <CarPoolingTrips />
                      ) : (
                        <LoginRedirect />
                      )
                    }
                  />
                  <Route
                    path="/plan-trip"
                    element={
                      auth.isAuthenticated ? (
                        <CarPoolingTrip />
                      ) : (
                        <LoginRedirect />
                      )
                    }
                  />
                </Routes>
              </Box>
            </Box>
          </SearchProvider>
        </LocalizationProvider>
      </ApolloProvider>
    </BrowserRouter>
  );
}
