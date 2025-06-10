import { Box, Drawer, useMediaQuery, IconButton, Toolbar } from '@mui/material';
import WorkAreaContent from './WorkAreaContent'; // Ensure this path is correct
import type { Theme } from '@mui/material/styles';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'; // Import the left chevron icon

interface SidebarProps {
  width: number; // Used for desktop's current width
  collapsed: boolean;
  onMouseDownResize: () => void; // Used for desktop resizing
  theme: Theme;
  toggleCollapse: () => void; // Used for mobile Drawer's onClose and optional internal close button
}

export function Sidebar({
  width,
  collapsed,
  onMouseDownResize,
  theme,
  toggleCollapse,
}: SidebarProps) {
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (isMobile) {
    return (
      <Drawer
        anchor="left"
        open={!collapsed} // Drawer is open when sidebar is not collapsed
        onClose={toggleCollapse} // Handles backdrop click or Esc key
        variant="temporary"
        ModalProps={{
          keepMounted: true, // Improves open performance on mobile
        }}
        // Use slotProps instead of PaperProps
        slotProps={{
          paper: {
            sx: {
              width: '100%', // Takes full width on mobile
              boxSizing: 'border-box',
              backgroundColor: theme.palette.background.paper,
              // No borderRight needed as it's an overlay
            },
          },
        }}
      >
        {/* Add a header with a close button for the mobile drawer */}
        <Toolbar
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end', // Align close button to the right
            px: 1,
            // Optional: Add a background color similar to your SideMenu toolbar
            // backgroundColor: theme.palette.primary.main,
            // color: theme.palette.common.white,
          }}
        >
          {/* Optional: Add a title if needed */}
          {/* <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
             Sidebar Title
           </Typography> */}
          <IconButton onClick={toggleCollapse} color="inherit" aria-label="close sidebar">
            <ChevronLeftIcon /> {/* Left chevron icon */}
          </IconButton>
        </Toolbar>
        {/* Optional: Add a Divider below the toolbar */}
        {/* <Divider /> */}
        <WorkAreaContent />
      </Drawer>
    );
  }

  // Desktop resizable sidebar
  return (
    <>
      <Box
        className="sidebar-desktop"
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          width: collapsed ? 0 : width,
          minWidth: collapsed ? 0 : 100, // Desktop min width when not collapsed
          backgroundColor: theme.palette.background.paper,
          borderRight: collapsed ? 'none' : `1px solid ${theme.palette.divider}`, // No border if collapsed
          zIndex: 2,
          overflow: 'hidden', // Content inside WorkAreaContent should manage its own scroll
          transition: 'width 0.2s ease',
        }}
      >
        {/* Render content only if not collapsed for desktop performance and to prevent layout shifts */}
        {!collapsed && <WorkAreaContent />}
      </Box>
      {/* Resizer only for desktop and when not collapsed */}
      {!collapsed && (
        <Box
          onMouseDown={onMouseDownResize}
          className="resizer-desktop"
          sx={{
            position: 'absolute',
            top: 0,
            left: width, // Positioned at the current width of the sidebar
            bottom: 0,
            width: '4px',
            cursor: 'ew-resize',
            backgroundColor: theme.palette.divider,
            zIndex: 2, // Same zIndex as sidebar
            transition: 'left 0.2s ease', // Smooth transition if width changes programmatically
          }}
        />
      )}
    </>
  );
}
