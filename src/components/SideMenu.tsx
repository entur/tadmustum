import Drawer from "@mui/material/Drawer";
import Box from "@mui/material/Box";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";

interface SideMenuProps {
  open: boolean;
  onClose: () => void;
}

const menuItems = ["Home", "Profile", "Dashboard", "Logout"];

export default function SideMenu({ open, onClose }: SideMenuProps) {
  return (
    <Drawer anchor="left" open={open} onClose={onClose}>
      <Box
        role="presentation"
        onClick={onClose}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
      >
        <List disablePadding>
          {menuItems.map((text) => (
            <ListItem key={text} disablePadding>
              <ListItemButton onClick={onClose}>
                <ListItemText primary={text} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>
    </Drawer>
  );
}
