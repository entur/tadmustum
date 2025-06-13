import { useRef } from 'react';
import { Box, Typography, CircularProgress, Alert, useTheme } from '@mui/material';
import { useStopPlaces } from '../data/useStopPlaces';
import { useTranslation } from 'react-i18next';

import { Sidebar } from '../components/Sidebar.tsx';
import { ToggleButton } from '../components/ToggleButton.tsx';
import { useResizableSidebar } from '../hooks/useResizableSidebar.ts';
import DataPageContent from '../components/data/DataPageContent.tsx';

export default function DataOverview() {
  const { t } = useTranslation();
  const theme = useTheme();

  const { loading, error } = useStopPlaces();

  const {
    width: sidebarWidth,
    collapsed: sidebarCollapsed,
    setIsResizing: setIsSidebarResizing,
    toggle: toggleSidebar,
  } = useResizableSidebar(250);

  const tableContentContainerRef = useRef<HTMLDivElement | null>(null);

  if (loading)
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        flexDirection="column"
        mt={4}
        sx={{ p: 2 }}
      >
        <CircularProgress />
        <Typography sx={{ mt: 1 }}>{t('data.loading', 'Loading data...')}</Typography>
      </Box>
    );
  if (error)
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error">
          {t('data.errorPrefix', 'Error')}: {error}
        </Alert>
      </Box>
    );

  return (
    <Box
      sx={{
        display: 'flex',
        height: 'calc(100vh - 64px)',
        position: 'relative',
      }}
    >
      <Sidebar
        width={sidebarWidth}
        collapsed={sidebarCollapsed}
        onMouseDownResize={() => setIsSidebarResizing(true)}
        theme={theme}
        toggleCollapse={toggleSidebar}
      />
      <ToggleButton
        collapsed={sidebarCollapsed}
        sidebarWidth={sidebarWidth}
        theme={theme}
        onClick={toggleSidebar}
      />
      <Box
        ref={tableContentContainerRef}
        className="data-overview-content"
        sx={{
          flexGrow: 1,
          height: '100%',
          marginLeft: sidebarCollapsed ? '0px' : `${sidebarWidth + 4}px`,
          transition: 'margin-left 0.2s ease',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <DataPageContent></DataPageContent>
      </Box>
    </Box>
  );
}
