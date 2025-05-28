import { TableRow, TableCell, Collapse, Box, Typography } from '@mui/material';

interface Props {
  open: boolean;
  lng: number;
  lat: number;
  iconUrl: string;
  stopPlaceType: string;
}

export default function DataTableDetail({ open, lng, lat, iconUrl, stopPlaceType }: Props) {
  return (
    <TableRow>
      <TableCell colSpan={5} sx={{ p: 0 }}>
        <Collapse in={open} timeout="auto" unmountOnExit>
          <Box m={1}>
            <Typography variant="subtitle2">Coordinates</Typography>
            <Typography variant="body2">
              <strong>Longitude:</strong> {lng || '—'}
            </Typography>
            <Typography variant="body2">
              <strong>Latitude:</strong> {lat || '—'}
            </Typography>
          </Box>
          <Box m={1}>
            <Typography variant="subtitle2">Type</Typography>
            <Box component="img" src={iconUrl} alt={stopPlaceType} sx={{ height: 32 }} />
          </Box>
        </Collapse>
      </TableCell>
    </TableRow>
  );
}
