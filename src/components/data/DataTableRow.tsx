import { TableRow, TableCell, IconButton, Box } from '@mui/material';
import { KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material';
import type { StopPlace } from '../../data/StopPlaceContext.tsx';
import DataTableDetail from './DataTableDetail.tsx';
import { useState } from 'react';
import { getIconUrl } from '../../utils/iconLoader.ts';
import { useTranslation } from 'react-i18next';

interface Props {
  sp: StopPlace;
  // isMobile: boolean; // OLD
  useCompactView: boolean; // NEW
}

export default function DataTableRow({ sp, useCompactView }: Props) {
  // CHANGED prop name
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [lng, lat] = sp.geometry.legacyCoordinates?.[0] ?? ['', ''];

  let iconKey: string;
  if (sp.__typename === 'ParentStopPlace') {
    iconKey = 'parentStopPlace';
  } else if (sp.stopPlaceType) {
    iconKey = sp.stopPlaceType;
  } else {
    iconKey = 'default';
  }

  const iconUrl = getIconUrl(iconKey);

  return (
    <>
      <TableRow
        hover
        onClick={useCompactView ? () => setOpen(o => !o) : undefined} // CHANGED condition
        sx={{ cursor: useCompactView ? 'pointer' : 'inherit' }} // CHANGED condition
      >
        {useCompactView && ( // CHANGED condition
          <TableCell padding="none">
            <IconButton size="small" onClick={() => setOpen(o => !o)}>
              {' '}
              {/* Added explicit onClick for clarity/direct interaction */}
              {open ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
            </IconButton>
          </TableCell>
        )}
        <TableCell>{sp.name.value}</TableCell>
        <TableCell>{sp.id}</TableCell>
        {!useCompactView && <TableCell>{lng || '—'}</TableCell>} {/* CHANGED condition */}
        {!useCompactView && <TableCell>{lat || '—'}</TableCell>} {/* CHANGED condition */}
        {!useCompactView && ( // CHANGED condition
          <TableCell>
            <Box
              component="img"
              src={iconUrl}
              alt={t('data.table.row.typeIconAlt', 'Stop place type icon')}
              sx={{ width: 32 }}
            />
          </TableCell>
        )}
      </TableRow>
      {useCompactView && ( // CHANGED condition
        <DataTableDetail
          open={open}
          lng={lng} // Removed 'as number'
          lat={lat} // Removed 'as number'
          iconUrl={iconUrl}
          stopPlaceType={sp.stopPlaceType}
        />
      )}
    </>
  );
}
