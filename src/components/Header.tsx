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

  const toggleDrawer = () => setDrawerOpen((o) => !o);

  return (
    <>
      <AppBar position="fixed">
        <Toolbar>
          <Box sx={{ flexGrow: 1, display: "flex", alignItems: "center" }}>
            <img src={logo} alt="logo" height={32} />
            <Typography variant="h6" component="span" sx={{ ml: 1 }}>
              My App
            </Typography>
          </Box>
          <IconButton color="inherit" onClick={() => setSettingsOpen(true)}>
            <SettingsIcon />
          </IconButton>
          <IconButton color="inherit" onClick={() => setUserOpen(true)}>
            <AccountCircle />
          </IconButton>
          <IconButton color="inherit" onClick={toggleDrawer}>
            <MenuIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <SideMenu open={drawerOpen} onClose={toggleDrawer} />
      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
      <UserDialog open={userOpen} onClose={() => setUserOpen(false)} />
    </>
  );
}
