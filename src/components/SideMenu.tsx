import { Link } from "react-router-dom";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";

type SideMenuProps = {
  open: boolean;
  onClose: () => void;
};

const menuItems = [
  { text: "Home", path: "/" },
  { text: "Plan trip", path: "/plan-trip" },
  { text: "Trips", path: "/trips" },
];

export default function SideMenu({ open, onClose }: SideMenuProps) {
  return (
    <Drawer
      variant="temporary"
      open={open}
      onClose={onClose}
      ModalProps={{ keepMounted: true }}
    >
      <List>
        {menuItems.map(({ text, path }) => (
          <ListItem key={path} disablePadding>
            <ListItemButton component={Link} to={path} onClick={onClose}>
              <ListItemText primary={text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Drawer>
  );
}
