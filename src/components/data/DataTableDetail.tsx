import { TableRow, TableCell, Collapse, Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

interface Props {
  open: boolean;
  lng: number | string;
  lat: number | string;
  iconUrl: string;
  stopPlaceType: string;
}

export default function DataTableDetail({ open, lng, lat, iconUrl }: Props) {
  const { t } = useTranslation();

  return (
    <TableRow>
      <TableCell colSpan={3} sx={{ p: 0 }}>
        <Collapse in={open} timeout="auto" unmountOnExit>
          <Box m={1} display="flex" gap={4}>
            <Box flex={1} ml={7}>
              <Typography variant="subtitle2">
                <strong>{t('data.table.detail.coordinatesTitle', 'Coordinates')}</strong>
              </Typography>
              <Typography variant="body2">
                {t('data.table.detail.longitudeLabel', 'Longitude:')} {lng || '—'}
              </Typography>
              <Typography variant="body2">
                {t('data.table.detail.latitudeLabel', 'Latitude:')} {lat || '—'}
              </Typography>
            </Box>
            <Box flex={1} display="flex" flexDirection="column" alignItems="flex-start">
              <Typography variant="subtitle2">
                <strong>{t('data.table.detail.typeTitle', 'Type')}</strong>
              </Typography>
              <Box
                component="img"
                src={iconUrl}
                alt={t('data.table.row.typeIconAlt', 'Stop place type icon')}
                sx={{ height: 32, mt: 1 }}
              />
            </Box>
          </Box>
        </Collapse>
      </TableCell>
    </TableRow>
  );
}
