import { useState, useMemo } from "react";
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Avatar,
  useTheme,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import SettingsIcon from "@mui/icons-material/Settings";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";

import SideMenu from "./SideMenu";
import SettingsDialog from "./SettingsDialog";
import UserDialog from "./UserDialog";
import logo from "../assets/react.svg";
import { useAuth } from "../auth/Auth.tsx";

export default function Header() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const auth = useAuth();

  const theme = useTheme();

  const initials = useMemo(() => {
    const profile = auth.user;
    if (!profile) return "";
    if ("name" in profile && typeof profile.name === "string") {
      const parts = profile.name.trim().split(" ");
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
      }
      return profile.name.slice(0, 2).toUpperCase();
    }
    return "";
  }, [auth.user]);

  return (
    <>
      <AppBar position="fixed">
        <Toolbar>
          <Box sx={{ display: "flex", alignItems: "center", width: "100%" }}>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <img src={logo} alt="logo" height={36} />
              <Typography variant="h6" sx={{ ml: 1 }}>
                EnTur Car Pooling POC
              </Typography>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", ml: "auto" }}>
              <IconButton
                color="inherit"
                onClick={() =>
                  auth.isAuthenticated ? setUserOpen(true) : auth.login()
                }
              >
                {auth.isAuthenticated && initials ? (
                  <Avatar
                    className="avatar"
                    sx={{
                      bgcolor: theme.palette.common.white,
                      color: theme.palette.primary.main,
                    }}
                  >
                    <Typography className="initials">{initials}</Typography>
                  </Avatar>
                ) : (
                  <AccountCircleIcon />
                )}
              </IconButton>

              <IconButton color="inherit" onClick={() => setSettingsOpen(true)}>
                <SettingsIcon />
              </IconButton>
              <IconButton
                color="inherit"
                onClick={() => setDrawerOpen((o) => !o)}
              >
                <MenuIcon />
              </IconButton>
            </Box>
          </Box>
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
