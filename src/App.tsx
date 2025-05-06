import './App.css'
import {Box} from "@mui/material";
import Header from "./components/Header.tsx";
import {SearchProvider} from "./components/SearchContext.tsx";

function App() {


  return (
      <Box sx={{ flexGrow: 1 }}>
          <SearchProvider>
          <Header/>
          </SearchProvider>
      </Box>
  )
}

export default App
