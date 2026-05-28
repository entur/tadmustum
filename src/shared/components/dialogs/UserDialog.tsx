import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';
import { useAuthorities } from '../../hooks/useAuthorities.tsx';

interface UserDialogProps {
  open: boolean;
  onClose: () => void;
  onLogout: () => void;
}

export default function UserDialog({ open, onClose, onLogout }: UserDialogProps) {
  const { t } = useTranslation();
  const { allowedCodespaces } = useAuthorities();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('user.userAccount')}</DialogTitle>
      <DialogContent dividers>
        <Typography variant="subtitle1" gutterBottom>
          {t('user.permissions.title', 'Permissions')}
        </Typography>
        {allowedCodespaces.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {t('user.permissions.empty', 'No codespace access.')}
          </Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('user.permissions.codespace', 'Codespace')}</TableCell>
                  <TableCell align="center">{t('user.permissions.read', 'Read')}</TableCell>
                  <TableCell align="center">{t('user.permissions.admin', 'Admin')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {allowedCodespaces.map(codespace => {
                  const hasRead = codespace.permissions.includes('VIEW_CARPOOLING_DATA');
                  const hasAdmin = codespace.permissions.includes('ADMIN_CARPOOLING_DATA');
                  return (
                    <TableRow key={codespace.id}>
                      <TableCell>{codespace.id}</TableCell>
                      <TableCell align="center">
                        {hasRead ? (
                          <CheckIcon fontSize="small" color="success" aria-label="yes" />
                        ) : (
                          <CloseIcon fontSize="small" color="disabled" aria-label="no" />
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {hasAdmin ? (
                          <CheckIcon fontSize="small" color="success" aria-label="yes" />
                        ) : (
                          <CloseIcon fontSize="small" color="disabled" aria-label="no" />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onLogout} variant="contained">
          {t('user.logout')}
        </Button>
        <Button onClick={onClose} variant="outlined">
          {t('close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
