import { useState } from 'react';
import { AppBar, Toolbar, useTheme, useMediaQuery } from '@mui/material';
import Menu from '../Menu.tsx';
import UserDialog from '../dialogs/UserDialog.tsx';
import { useAuth } from '../../auth';
import HeaderBranding from './HeaderBranding.tsx';
import HeaderActions from './HeaderActions.tsx';
import { useLocation } from 'react-router-dom';

export default function Header() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  const auth = useAuth();

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  return (
    <>
      <AppBar position="fixed">
        <Toolbar
          sx={{
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            minHeight: { xs: '64px' },
          }}
        >
          <>
            <HeaderBranding />
            <HeaderActions
              isMobile={isMobile}
              isHomePage={isHomePage}
              onUserIconClick={() => (auth.isAuthenticated ? setUserOpen(true) : auth.login())}
              onMenuIconClick={() => setDrawerOpen(o => !o)}
              isAuthenticated={auth.isAuthenticated}
            />
          </>
        </Toolbar>
      </AppBar>

      <Menu open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <UserDialog
        open={userOpen}
        onLogout={() =>
          auth
            .logout({ returnTo: `${window.location.origin}${import.meta.env.BASE_URL}` })
            .then(() => {
              setUserOpen(false);
            })
        }
        onClose={() => setUserOpen(false)}
      />
    </>
  );
}
