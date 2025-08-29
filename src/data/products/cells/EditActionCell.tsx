import { IconButton, Tooltip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { useTranslation } from 'react-i18next';
import { useEditing } from '../../../contexts/EditingContext.tsx';
import type { Product } from '../productTypes.ts';
import ProductEditor from '../ProductEditor.tsx';

interface EditActionCellProps {
  item: Product;
}

export default function EditActionCell({ item }: EditActionCellProps) {
  const { setEditingItem } = useEditing();
  const { t } = useTranslation();

  return (
    <Tooltip title={t('data.table.row.editProductTooltip', 'Edit Product')}>
      <IconButton
        onClick={() => setEditingItem({ id: item.id, EditorComponent: ProductEditor })}
        color="primary"
      >
        <EditIcon />
      </IconButton>
    </Tooltip>
  );
}
