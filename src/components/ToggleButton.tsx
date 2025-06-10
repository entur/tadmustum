import { Box, IconButton } from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import type { Theme } from '@mui/material/styles';

interface ToggleButtonProps {
  collapsed: boolean;
  sidebarWidth: number;
  theme: Theme;
  onClick: () => void;
}

export function ToggleButton({ collapsed, sidebarWidth, theme, onClick }: ToggleButtonProps) {
  return (
    <Box
      onClick={onClick}
      className="toggle-button"
      sx={{
        position: 'absolute',
        top: 2,
        left: collapsed ? 0 : sidebarWidth + 4,
        zIndex: 3,
        backgroundColor: theme.palette.background.paper,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 2,
      }}
    >
      <IconButton size="small">{collapsed ? <ChevronRight /> : <ChevronLeft />}</IconButton>
    </Box>
  );
}
