import { Link } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Divider,
  Box,
  useTheme,
  useMediaQuery,
  IconButton,
  styled,
} from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { getIconUrl } from '../../utils/iconLoaderUtils.ts';
import { useTranslation } from 'react-i18next';

// The panel hugs its contents (the menu items) rather than spanning a fixed
// wide column; this keeps it from leaving a large empty gap on the right.
const MENU_MIN_WIDTH = 200;

const StyledDrawer = styled(Drawer)(({ theme }) => ({
  '& .MuiDrawer-paper': {
    boxSizing: 'border-box',
    backgroundColor: theme.palette.background.paper,
    transition: theme.transitions.create(['width'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  },
}));

const menuItems = [
  { textKey: 'Home', path: '/', iconKey: 'home' },
  { textKey: 'Plan trip', path: '/plan-trip', iconKey: 'map' },
  { textKey: 'Trips', path: '/trips', iconKey: 'data' },
];

interface SideMenuProps {
  open: boolean;
  onClose: () => void;
}

export default function Menu({ open, onClose }: SideMenuProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <StyledDrawer
      variant={isMobile ? 'temporary' : 'persistent'}
      anchor="right"
      open={open}
      onClose={onClose}
      ModalProps={{ keepMounted: true }}
      slotProps={{
        paper: {
          sx: {
            width: 'fit-content',
            minWidth: MENU_MIN_WIDTH,
            backgroundColor: theme.palette.common.white,
            // Solid blue frame so the panel clearly reads as a menu.
            border: `3px solid ${theme.palette.primary.main}`,
            // Keep the panel fixed: it should never scroll, regardless of content.
            overflow: 'hidden',
          },
        },
      }}
    >
      <Toolbar
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: 1,
          color: theme.palette.primary.main,
        }}
      >
        <IconButton
          onClick={onClose}
          color="inherit"
          aria-label="Close menu"
          size="small"
          sx={{
            border: '2px solid currentColor',
            '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' },
          }}
        >
          <ChevronRightIcon />
        </IconButton>
      </Toolbar>
      <Divider sx={{ borderColor: 'primary.main', borderBottomWidth: 2 }} />

      <List disablePadding>
        {menuItems.map(({ textKey, path, iconKey }) => (
          <ListItem key={path} disablePadding>
            <ListItemButton component={Link} to={path} onClick={onClose} sx={{ px: 1.5, gap: 1.5 }}>
              <ListItemIcon sx={{ minWidth: 'auto' }}>
                <Box
                  component="img"
                  src={getIconUrl(iconKey)}
                  alt={t(textKey)}
                  sx={{ width: 24, height: 24 }}
                />
              </ListItemIcon>
              <ListItemText primary={t(textKey)} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </StyledDrawer>
  );
}
