import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Home from "./pages/Home";
import DataOverview from "./pages/DataOverview";
import MapView from "./pages/MapView";
import { SearchProvider } from "./components/SearchContext";
import { useAuth } from "./auth/Auth";
import LoginRedirect from "./auth/LoginRedirect";
import { CssBaseline, Toolbar, Box, ThemeProvider } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { createThemeFromConfig } from "./theme/createThemeFromConfig";
import { createTheme } from "@mui/material/styles";
import type { ThemeConfig } from "./types/theme-config";

export default function App() {
  const auth = useAuth();

  const [cfg, setCfg] = useState<ThemeConfig | null>(null);

  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch("/custom-theme-config.json");
        if (!res.ok) throw new Error("No custom config");
        const custom: ThemeConfig = await res.json();
        setCfg(custom);
      } catch {
        const res = await fetch("/default-theme-config.json");
        if (!res.ok) {
          console.error("Could not load any theme config");
          return;
        }
        const def: ThemeConfig = await res.json();
        setCfg(def);
      }
    }
    loadConfig();
  }, []);

  const theme = useMemo(
    () => (cfg ? createThemeFromConfig(cfg) : createTheme()),
    [cfg],
  );
  return (
    <BrowserRouter>
      <SearchProvider>
        <ThemeProvider theme={theme}>
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
        </ThemeProvider>
      </SearchProvider>
    </BrowserRouter>
  );
}
