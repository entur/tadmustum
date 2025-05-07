import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Box, Toolbar } from "@mui/material";

import Header from "./components/Header";
import Home from "./pages/Home";
import MapView from "./pages/MapView";
import { SearchProvider } from "./components/SearchContext";
import DataOverview from "./pages/DataOverview";
import { useAuth } from "./auth/Auth";
import LoginRedirect from "./auth/LoginRedirect";

export default function App() {
  const auth = useAuth();

  return (
    <BrowserRouter>
      <SearchProvider>
        <Header />
        <Box component="main" sx={{ mt: 8, p: 2 }}>
          <Toolbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route
              path="/data"
              element={
                auth.isAuthenticated ? <DataOverview /> : <LoginRedirect />
              }
            />
            <Route path="/map" element={<MapView />} />
          </Routes>
        </Box>
      </SearchProvider>
    </BrowserRouter>
  );
}
