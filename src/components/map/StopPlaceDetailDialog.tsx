import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';
import type { GeoJsonProperties } from 'geojson';
import { getIconUrl } from '../../utils/iconLoaderUtils.ts';
import { useEditing } from '../../contexts/EditingContext.tsx';

interface StopPlaceDetailDialogProps {
  open: boolean;
  onClose: () => void;
  featureProperties: GeoJsonProperties | null;
}

export default function StopPlaceDetailDialog({
  open,
  onClose,
  featureProperties,
}: StopPlaceDetailDialogProps) {
  const { t } = useTranslation();
  const { setEditingStopPlaceId } = useEditing();

  if (!featureProperties) {
    return null;
  }

  const { name, id, icon } = featureProperties;
  const iconUrl = getIconUrl(icon as string);

  const handleEdit = () => {
    if (id) {
      setEditingStopPlaceId(String(id));
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ m: 0, p: 2 }}>
        {String(name)}
        <IconButton
          aria-label={t('close', 'Close')}
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: theme => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Box display="flex" flexDirection="column" gap={2}>
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              {t('dialog.stopPlace.id', 'ID')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {String(id)}
            </Typography>
          </Box>
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              {t('dialog.stopPlace.type', 'Type')}
            </Typography>
            <Box
              component="img"
              src={iconUrl}
              alt={t('data.table.row.typeIconAlt', 'Stop place type icon')}
              sx={{ height: 32 }}
            />
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleEdit} startIcon={<EditIcon />}>
          {t('edit', 'Edit')}
        </Button>
        <Button onClick={onClose}>{t('close', 'Close')}</Button>
      </DialogActions>
    </Dialog>
  );
}
