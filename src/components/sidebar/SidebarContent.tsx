import { useEditing } from '../../contexts/EditingContext.tsx';
import StopPlaceEditor from './StopPlaceEditor.tsx';
import WorkAreaContent from './WorkAreaContent.tsx';

export default function SidebarContent() {
  const { editingStopPlaceId } = useEditing();

  if (editingStopPlaceId) {
    return <StopPlaceEditor stopPlaceId={editingStopPlaceId} />;
  }

  return <WorkAreaContent />;
}
