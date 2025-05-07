import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Home from "./pages/Home";
import DataOverview from "./pages/DataOverview";
import MapView from "./pages/MapView";
import { SearchProvider } from "./components/SearchContext";
import { useAuth } from "./auth/Auth";
import LoginRedirect from "./auth/LoginRedirect";
import { CssBaseline, Toolbar, Box } from "@mui/material";

export default function App() {
  const auth = useAuth();

  return (
    <BrowserRouter>
      <SearchProvider>
        <CssBaseline />
        <Header />
        <Toolbar />
        <Box className="app-root">
          <Box className="app-content">
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
        </Box>
      </SearchProvider>
    </BrowserRouter>
  );
}
