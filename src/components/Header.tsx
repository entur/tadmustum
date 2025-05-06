import { useState } from "react";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import MenuIcon from "@mui/icons-material/Menu";
import SettingsIcon from "@mui/icons-material/Settings";
import AccountCircle from "@mui/icons-material/AccountCircle";
import SideMenu from "./SideMenu";
import SettingsDialog from "./SettingsDialog";
import UserDialog from "./UserDialog";
import logo from "../assets/react.svg";

export default function Header() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  const openMenu = () => setDrawerOpen(true);
  const closeMenu = () => setDrawerOpen(false);
  const openSettings = () => setSettingsOpen(true);
  const closeSettings = () => setSettingsOpen(false);
  const openUser = () => setUserOpen(true);
  const closeUser = () => setUserOpen(false);

  return (
    <>
      <AppBar position="fixed" sx={{ top: 0, left: 0, width: "100%" }}>
        <Toolbar>
          <Box
            component="img"
            src={logo}
            alt="Logo"
            sx={{ height: 40, mr: 2 }}
          />

          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            My App
          </Typography>

          {/* Icons on the right: Menu, Settings, Account */}
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <IconButton
              color="inherit"
              aria-label="account"
              edge="end"
              onClick={openUser}
              sx={{ ml: 1 }}
            >
              <AccountCircle />
            </IconButton>
            <IconButton
              color="inherit"
              aria-label="settings"
              edge="end"
              onClick={openSettings}
              sx={{ ml: 1 }}
            >
              <SettingsIcon />
            </IconButton>
            <IconButton
              color="inherit"
              aria-label="open menu"
              onClick={openMenu}
              edge="end"
              sx={{ ml: 1 }}
            >
              <MenuIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <SideMenu open={drawerOpen} onClose={closeMenu} />
      <SettingsDialog open={settingsOpen} onClose={closeSettings} />
      <UserDialog open={userOpen} onClose={closeUser} />
    </>
  );
}
