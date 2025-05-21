import {BrowserRouter, Route, Routes} from "react-router-dom";
import Header from "./components/Header";
import Home from "./pages/Home";
import CarPoolingTrips from "./pages/CarPoolingTrips.tsx";
import CarPoolingTrip from "./pages/CarPoolingTrip.tsx";
import {SearchProvider} from "./components/SearchContext";
import {useAuth} from "./auth/Auth";
import LoginRedirect from "./auth/LoginRedirect";
import {Box, CssBaseline, Toolbar} from "@mui/material";
import {LocalizationProvider} from '@mui/x-date-pickers/LocalizationProvider';
import {AdapterDayjs} from '@mui/x-date-pickers/AdapterDayjs';
import {ApolloClient, ApolloProvider, InMemoryCache} from "@apollo/client";

export default function App() {
  const auth = useAuth();

    const client = new ApolloClient({
        uri: 'http://localhost:8080/graphql',
        cache: new InMemoryCache(),
    });

  return (
    <BrowserRouter>
        <ApolloProvider client={client}>
            <LocalizationProvider dateAdapter={AdapterDayjs} >
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
                                        auth.isAuthenticated ? <CarPoolingTrips /> : <LoginRedirect />
                                    }
                                />
                                <Route path="/plan-trip" element={<CarPoolingTrip />} />
                            </Routes>
                        </Box>
                    </Box>
                </SearchProvider>
            </LocalizationProvider>
        </ApolloProvider>
    </BrowserRouter>
  );
}
