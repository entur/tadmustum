import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Box, Toolbar } from "@mui/material";

import Header from "./components/Header";
import Home from "./pages/Home";
import MapView from "./pages/MapView";
import { SearchProvider } from "./components/SearchContext";

export default function App() {
  return (
    <BrowserRouter>
      <SearchProvider>
        <Header />
        <Box component="main" sx={{ mt: 8, p: 2 }}>
          <Toolbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/map" element={<MapView />} />
          </Routes>
        </Box>
      </SearchProvider>
    </BrowserRouter>
  );
}
