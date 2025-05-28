import { TableRow, TableCell, IconButton, Box } from '@mui/material';
import { KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material';
import type { StopPlace } from '../../data/StopPlaceContext.tsx';
import DataTableDetail from './DataTableDetail.tsx';
import { useState } from 'react';
import { getIconUrl } from '../../utils/iconLoader.ts';

interface Props {
  sp: StopPlace;
  isMobile: boolean;
}

export default function DataTableRow({ sp, isMobile }: Props) {
  const [open, setOpen] = useState(false);
  const [lng, lat] = sp.geometry.legacyCoordinates?.[0] ?? ['', ''];
  const iconUrl = getIconUrl(sp.stopPlaceType);

  return (
    <>
      <TableRow
        hover
        onClick={isMobile ? () => setOpen(o => !o) : undefined}
        sx={{ cursor: isMobile ? 'pointer' : 'inherit' }}
      >
        {isMobile && (
          <TableCell padding="none">
            <IconButton size="small">
              {open ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
            </IconButton>
          </TableCell>
        )}
        <TableCell>{sp.name.value}</TableCell>
        <TableCell>{sp.id}</TableCell>
        {!isMobile && <TableCell>{lng || '—'}</TableCell>}
        {!isMobile && <TableCell>{lat || '—'}</TableCell>}
        {!isMobile && (
          <TableCell>
            <Box component="img" src={iconUrl} alt={sp.stopPlaceType} sx={{ width: 32 }} />
          </TableCell>
        )}
      </TableRow>
      {isMobile && (
        <DataTableDetail
          open={open}
          lng={lng}
          lat={lat}
          iconUrl={iconUrl}
          stopPlaceType={sp.stopPlaceType}
        />
      )}
    </>
  );
}
