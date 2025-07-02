import { TableRow, TableCell, Collapse, Box, Typography, Button } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { getIconUrl } from '../../utils/iconLoaderUtils.ts';

interface Props {
  open: boolean;
  lng: number | string;
  lat: number | string;
  iconUrl: string;
  stopPlaceType: string;
  stopPlaceId: string;
}

export default function DataTableDetail({ open, lng, lat, iconUrl, stopPlaceId }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleGoToMap = () => {
    navigate(`/map?stopPlaceId=${stopPlaceId}`);
  };

  return (
    <TableRow>
      <TableCell colSpan={3} sx={{ p: 0, borderBottom: 'none' }}>
        <Collapse in={open} timeout="auto" unmountOnExit>
          <Box m={1} display="flex" gap={4}>
            <Box flex={1} ml={7}>
              <Typography variant="subtitle2">
                <strong>{t('data.table.detail.coordinatesTitle', 'Coordinates')}</strong>
              </Typography>
              <Typography variant="body2">
                {t('data.table.detail.longitudeLabel', 'Longitude:')} {lng || '—'}
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                {t('data.table.detail.latitudeLabel', 'Latitude:')} {lat || '—'}
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={handleGoToMap}
                disabled={!lng || !lat}
                startIcon={
                  <Box
                    component="img"
                    src={getIconUrl('map')}
                    alt={t('data.table.detail.mapIconAlt', 'Map icon')}
                    sx={{ width: 20, height: 20 }}
                  />
                }
              >
                {t('data.table.row.goToMapTooltip', 'View on map')}
              </Button>
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
