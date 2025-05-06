import MdReport from "@mui/icons-material/Report";
import MdAccount from "@mui/icons-material/AccountCircle";
import SettingsIcon from "@mui/icons-material/Settings";
import {
  IconButton,
  MenuItem,
  MenuList,
  Popover,
  Divider,
} from "@mui/material";
import React, { useState } from "react";

const Settings: React.FC = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  const handleOpen = (e: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(e.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleAuthToggle = () => {
    setIsAuthenticated((prev) => !prev);
    handleClose();
  };

  const handleGoToMapView = () => {
    // your navigation stub
    handleClose();
  };

  return (
    <>
      <IconButton
        aria-label="settings menu"
        onClick={handleOpen}
        color="inherit"
      >
        <SettingsIcon />
      </IconButton>

      <Popover
        id="settings-menu"
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        className="settings-menu-container"
      >
        <MenuList dense>
          <MenuItem onClick={handleGoToMapView} className="settings-menu-item">
            <MdReport className="settings-icon" />
            MapView
          </MenuItem>
          <Divider />

          <MenuItem onClick={handleAuthToggle} className="settings-menu-item">
            <MdAccount
              className="settings-icon"
              style={{ color: isAuthenticated ? "#e57373" : "#81c784" }}
            />
            {isAuthenticated ? "Logout user" : "Login user"}
          </MenuItem>
        </MenuList>
      </Popover>
    </>
  );
};

export default Settings;
