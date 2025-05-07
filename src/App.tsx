import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Home from "./pages/Home";
import DataOverview from "./pages/DataOverview";
import MapView from "./pages/MapView";
import { SearchProvider } from "./components/SearchContext";
import { CssBaseline, Toolbar, Box } from "@mui/material";

export default function App() {
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
              <Route path="/data" element={<DataOverview />} />
              <Route path="/map" element={<MapView />} />
            </Routes>
          </Box>
        </Box>
      </SearchProvider>
    </BrowserRouter>
  );
}
