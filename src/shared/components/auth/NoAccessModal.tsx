import { useNoAccess } from '../../../contexts/NoAccessContext.tsx';
import { useAuth } from 'react-oidc-context';
import { Box, Modal } from '@mui/material';
import Button from '@mui/material/Button';

const NoAccessModal = () => {
  const auth = useAuth();
  const { showNoAccess, resetNoAccess } = useNoAccess();

  if (!showNoAccess) return null;

  const handleLogout = () => {
    auth.signoutRedirect();
    resetNoAccess();
  };

  return (
    <Modal open={showNoAccess} onClose={handleLogout}>
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          bgcolor: 'background.paper',
          border: '2px solid #000',
          boxShadow: 24,
          p: 4,
          minWidth: 300,
        }}
      >
        <h2>You don't have access to any code spaces.</h2>
        <p>You're being logged out now.</p>
        <Button onClick={handleLogout}>OK</Button>
      </Box>
    </Modal>
  );
};

export default NoAccessModal;
