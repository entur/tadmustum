import { Menu, MenuItem, Typography, ListItemIcon, Divider } from '@mui/material';
import PublicIcon from '@mui/icons-material/Public';
import { useTranslation } from 'react-i18next';
import type { ContextMenuState } from '../../hooks/useMapInteraction';

interface MapContextMenuProps {
  contextMenu: ContextMenuState;
  onClose: () => void;
}

export default function MapContextMenu({ contextMenu, onClose }: MapContextMenuProps) {
  const { t } = useTranslation();
  const { x, y, lng, lat } = contextMenu;

  return (
    <Menu
      open={true}
      onClose={onClose}
      anchorReference="anchorPosition"
      anchorPosition={{ top: y, left: x }}
      slotProps={{
        paper: {
          sx: {
            minWidth: 180,
          },
        },
      }}
    >
      <MenuItem disabled sx={{ opacity: '1 !important' }}>
        <ListItemIcon>
          <PublicIcon fontSize="small" />
        </ListItemIcon>
        <Typography variant="body2">{t('map.contextMenu.coordinates', 'Coordinates')}</Typography>
      </MenuItem>
      <Divider />
      <MenuItem onClick={onClose}>
        <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
          {t('map.contextMenu.latitude', 'Lat')}: {lat.toFixed(5)}
        </Typography>
      </MenuItem>
      <MenuItem onClick={onClose}>
        <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
          {t('map.contextMenu.longitude', 'Lng')}: {lng.toFixed(5)}
        </Typography>
      </MenuItem>
    </Menu>
  );
}
