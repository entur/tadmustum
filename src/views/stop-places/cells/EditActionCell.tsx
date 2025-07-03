import { IconButton, Tooltip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { useTranslation } from 'react-i18next';
import { useEditing } from '../../../contexts/EditingContext.tsx';
import type { StopPlace } from '../../../data/StopPlaceContext.tsx';

interface EditActionCellProps {
  item: StopPlace;
}

export default function EditActionCell({ item }: EditActionCellProps) {
  const { setEditingStopPlaceId } = useEditing();
  const { t } = useTranslation();

  return (
    <Tooltip title={t('data.table.row.editTooltip', 'Edit Stop Place')}>
      <IconButton onClick={() => setEditingStopPlaceId(item.id)}>
        <EditIcon />
      </IconButton>
    </Tooltip>
  );
}
