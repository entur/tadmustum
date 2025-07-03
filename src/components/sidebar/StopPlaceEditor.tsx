import { Box, Typography, Button, Divider } from '@mui/material';
import { useEditing } from '../../contexts/EditingContext.tsx';
import { useTranslation } from 'react-i18next';

interface StopPlaceEditorProps {
  stopPlaceId: string;
}

export default function StopPlaceEditor({ stopPlaceId }: StopPlaceEditorProps) {
  const { t } = useTranslation();
  const { setEditingStopPlaceId } = useEditing();

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        {t('sidebar.editor.title', 'Edit Stop Place')}
      </Typography>
      <Divider sx={{ mb: 2 }} />
      <Typography variant="body1">
        <strong>ID:</strong> {stopPlaceId}
      </Typography>
      {/* A real form would go here */}
      <Button sx={{ mt: 2 }} variant="outlined" onClick={() => setEditingStopPlaceId(null)}>
        {t('close', 'Close')}
      </Button>
    </Box>
  );
}
