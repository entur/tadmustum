import { Box } from '@mui/material';
import SearchAutocomplete from './SearchAutocomplete.tsx';

interface DesktopSearchBarProps {
  placeholder: string;
}

export default function DesktopSearchBar({ placeholder }: DesktopSearchBarProps) {
  return (
    <Box
      sx={{
        flexGrow: 1,
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 400 }}>
        <SearchAutocomplete placeholder={placeholder} />
      </Box>
    </Box>
  );
}
