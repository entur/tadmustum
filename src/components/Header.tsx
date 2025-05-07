import { useState } from "react";
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  TextField,
  InputAdornment,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import SettingsIcon from "@mui/icons-material/Settings";
import AccountCircle from "@mui/icons-material/AccountCircle";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";

import SideMenu from "./SideMenu";
import SettingsDialog from "./SettingsDialog";
import UserDialog from "./UserDialog";
import logo from "../assets/react.svg";
import { useAuth } from "../auth/Auth.tsx";

export default function Header() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [searchActive, setSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const auth = useAuth();

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <>
      <AppBar position="fixed">
        <Toolbar>
          {isMobile && searchActive ? (
            <Box sx={{ flexGrow: 1 }}>
              <TextField
                autoFocus
                size="small"
                placeholder="Search…"
                variant="outlined"
                fullWidth
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSearchActive(false);
                            setSearchQuery("");
                          }}
                        >
                          <CloseIcon />
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{ backgroundColor: "#fff" }}
              />
            </Box>
          ) : (
            <Box sx={{ display: "flex", alignItems: "center", width: "100%" }}>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <img src={logo} alt="logo" height={36} />
                <Typography variant="h6" component="span" sx={{ ml: 1 }}>
                  My App
                </Typography>
              </Box>

              {!isMobile && (
                <Box
                  sx={{
                    flexGrow: 1,
                    display: "flex",
                    justifyContent: "center",
                  }}
                >
                  <TextField
                    size="small"
                    placeholder="Search…"
                    variant="outlined"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    fullWidth
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon />
                          </InputAdornment>
                        ),
                      },
                    }}
                    sx={{
                      backgroundColor: "#fff",
                      width: "100%",
                      maxWidth: 400,
                    }}
                  />
                </Box>
              )}

              <Box sx={{ display: "flex", alignItems: "center" }}>
                {isMobile && (
                  <IconButton
                    color="inherit"
                    onClick={() => setSearchActive(true)}
                  >
                    <SearchIcon />
                  </IconButton>
                )}
                <IconButton
                  color="inherit"
                  onClick={() => setSettingsOpen(true)}
                >
                  <SettingsIcon />
                </IconButton>
                <IconButton
                  color="inherit"
                  onClick={() =>
                    auth.isAuthenticated ? setUserOpen(true) : auth.login()
                  }
                >
                  <AccountCircle />
                </IconButton>
                <IconButton
                  color="inherit"
                  onClick={() => setDrawerOpen((o) => !o)}
                >
                  <MenuIcon />
                </IconButton>
              </Box>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      <SideMenu open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
      <UserDialog
        open={userOpen}
        onClose={() =>
          auth.logout({ returnTo: `${window.location.origin}/` }).then(() => {
            setUserOpen(false);
          })
        }
      />
    </>
  );
}
