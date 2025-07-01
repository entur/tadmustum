import { Box } from '@mui/material';
import SearchAutocomplete from './SearchAutocomplete.tsx';

interface MobileSearchBarProps {
  placeholder: string;
  onCloseRequest: () => void;
}

export default function MobileSearchBar({ placeholder, onCloseRequest }: MobileSearchBarProps) {
  return (
    <Box sx={{ flexGrow: 1, width: '100%' }}>
      <SearchAutocomplete
        placeholder={placeholder}
        isMobile={true}
        onCloseRequest={onCloseRequest}
      />
    </Box>
  );
}
