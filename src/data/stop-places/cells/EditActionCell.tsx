import { IconButton, Tooltip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { useTranslation } from 'react-i18next';
import { useEditing } from '../../../contexts/EditingContext.tsx';
import type { StopPlace } from '../stopPlaceTypes.ts';
import StopPlaceEditor from '../StopPlaceEditor.tsx';

interface EditActionCellProps {
  item: StopPlace;
}

export default function EditActionCell({ item }: EditActionCellProps) {
  const { setEditingItem } = useEditing();
  const { t } = useTranslation();

  return (
    <Tooltip title={t('data.table.row.editTooltip', 'Edit Stop Place')}>
      <IconButton
        onClick={() => setEditingItem({ id: item.id, EditorComponent: StopPlaceEditor })}
        color="primary"
      >
        <EditIcon />
      </IconButton>
    </Tooltip>
  );
}
