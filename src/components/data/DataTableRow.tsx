import { TableRow, TableCell, IconButton, Box } from '@mui/material';
import { KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material';
import type { StopPlace } from '../../data/StopPlaceContext.tsx';
import DataTableDetail from './DataTableDetail.tsx';
import { useState } from 'react';
import { getIconUrl } from '../../utils/iconLoader.ts';
import { useTranslation } from 'react-i18next';

interface Props {
  sp: StopPlace;
  isMobile: boolean;
}

export default function DataTableRow({ sp, isMobile }: Props) {
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
            <Box
              component="img"
              src={iconUrl}
              alt={t('data.table.row.typeIconAlt', 'Stop place type icon')}
              sx={{ width: 32 }}
            />
          </TableCell>
        )}
      </TableRow>
      {isMobile && (
        <DataTableDetail
          open={open}
          lng={lng as number}
          lat={lat as number}
          iconUrl={iconUrl}
          stopPlaceType={sp.stopPlaceType}
        />
      )}
    </>
  );
}
