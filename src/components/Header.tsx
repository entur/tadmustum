import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  TextField,
  InputAdornment,
  Avatar,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import SideMenu from './SideMenu';
import SettingsDialog from './SettingsDialog';
import UserDialog from './UserDialog';
import { useAuth } from '../auth';
import { getIconUrl } from '../utils/iconLoader.ts';
import { useTranslation } from 'react-i18next';

export default function Header() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [searchActive, setSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const auth = useAuth();
  const { t } = useTranslation();

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const initials = useMemo(() => {
    const profile = auth.user;
    if (!profile) return '';
    if ('name' in profile && typeof profile.name === 'string') {
      const parts = profile.name.trim().split(' ');
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
      }
      return profile.name.slice(0, 2).toUpperCase();
    }
    return '';
  }, [auth.user]);

  const renderIcon = (key: string, size = 24, colorSuffix = '') => (
    <Box
      component="img"
      src={getIconUrl(key)}
      alt={key}
      sx={{ width: size, height: size, ...(colorSuffix && { filter: `invert(${colorSuffix})` }) }}
    />
  );

  return (
    <>
      <AppBar position="fixed">
        <Toolbar>
          {isMobile && searchActive ? (
            <Box sx={{ flexGrow: 1 }}>
              <TextField
                autoFocus
                size="small"
                placeholder={t('search.searchPlaceholder')}
                variant="outlined"
                fullWidth
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                slotProps={{
                  input: {
                    sx: {
                      backgroundColor: theme.palette.background.default,
                    },

                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSearchActive(false);
                            setSearchQuery('');
                          }}
                        >
                          <CloseIcon />
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Box>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Link
                  to="/"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  <img src={theme.logoUrl} alt="logo" height={theme.logoHeight} />
                  <Typography variant="h6" sx={{ ml: 1, mr: 1, fontWeight: 'bold' }}>
                    {theme.applicationName}
                  </Typography>
                </Link>
              </Box>

              {!isMobile && (
                <Box
                  sx={{
                    flexGrow: 1,
                    display: 'flex',
                    justifyContent: 'center',
                  }}
                >
                  <TextField
                    size="small"
                    placeholder={t('search.searchPlaceholder')}
                    variant="outlined"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    fullWidth
                    slotProps={{
                      input: {
                        sx: {
                          backgroundColor: theme.palette.background.default,
                        },
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon />
                          </InputAdornment>
                        ),
                      },
                    }}
                    sx={{
                      width: '100%',
                      maxWidth: 400,
                    }}
                  />
                </Box>
              )}

              <Box sx={{ display: 'flex', alignItems: 'center', ml: 'auto' }}>
                {isMobile && (
                  <IconButton color="inherit" onClick={() => setSearchActive(true)}>
                    <SearchIcon />
                  </IconButton>
                )}

                <IconButton
                  color="inherit"
                  onClick={() => (auth.isAuthenticated ? setUserOpen(true) : auth.login())}
                >
                  {auth.isAuthenticated && initials ? (
                    <Avatar
                      className="avatar"
                      sx={{
                        bgcolor: theme.palette.common.white,
                        color: theme.palette.secondary.main,
                        fontWeight: 'bold',
                      }}
                    >
                      <Typography className="initials">{initials}</Typography>
                    </Avatar>
                  ) : (
                    renderIcon('user', 28)
                  )}
                </IconButton>

                <IconButton color="inherit" onClick={() => setSettingsOpen(true)}>
                  {renderIcon('settings', 28)}
                </IconButton>
                <IconButton color="inherit" onClick={() => setDrawerOpen(o => !o)}>
                  {renderIcon('menu', 28)}
                </IconButton>
              </Box>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      <SideMenu open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <UserDialog
        open={userOpen}
        onLogout={() =>
          auth.logout({ returnTo: `${window.location.origin}/` }).then(() => {
            setUserOpen(false);
          })
        }
        onClose={() => setUserOpen(false)}
      />
    </>
  );
}
