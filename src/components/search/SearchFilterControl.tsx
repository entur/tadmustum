import { useState } from 'react';
import {
  IconButton,
  Popover,
  Box,
  Typography,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Button,
  Badge,
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import { useSearch } from './searchUtils';
import { useTranslation } from 'react-i18next';

const stopPlaceTypes = [
  { id: 'parentStopPlace', labelKey: 'workArea.types.parent', defaultLabel: 'Parent Stop Place' },
  { id: 'railStation', labelKey: 'workArea.types.train', defaultLabel: 'Train' },
  { id: 'metroStation', labelKey: 'workArea.types.metro', defaultLabel: 'Metro' },
  { id: 'onstreetBus', labelKey: 'workArea.types.bus', defaultLabel: 'Bus' },
  { id: 'onstreetTram', labelKey: 'workArea.types.tram', defaultLabel: 'Tram' },
  { id: 'ferryStop', labelKey: 'workArea.types.ferry', defaultLabel: 'Ferry' },
  { id: 'harbourPort', labelKey: 'workArea.types.harbour', defaultLabel: 'Harbour' },
  { id: 'liftStation', labelKey: 'workArea.types.lift', defaultLabel: 'Lift' },
];

export default function SearchFilterControl() {
  const { t } = useTranslation();
  const { activeFilters, updateFilters } = useSearch();
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleFilterChange = (typeId: string, checked: boolean) => {
    const newFilters = checked
      ? [...activeFilters, typeId]
      : activeFilters.filter(f => f !== typeId);
    updateFilters(newFilters);
  };

  const handleClearFilters = () => {
    updateFilters([]);
  };

  const open = Boolean(anchorEl);
  const id = open ? 'search-filter-popover' : undefined;

  return (
    <>
      <IconButton onClick={handleClick} aria-describedby={id} color="inherit">
        <Badge color="secondary" variant="dot" invisible={activeFilters.length === 0}>
          <FilterListIcon />
        </Badge>
      </IconButton>
      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Box sx={{ p: 2, minWidth: 240 }}>
          <Typography variant="subtitle1" gutterBottom>
            {t('search.filter.title', 'Filter by Type')}
          </Typography>
          <FormGroup>
            {stopPlaceTypes.map(type => (
              <FormControlLabel
                key={type.id}
                control={
                  <Checkbox
                    checked={activeFilters.includes(type.id)}
                    onChange={e => handleFilterChange(type.id, e.target.checked)}
                    size="small"
                  />
                }
                label={t(type.labelKey, type.defaultLabel)}
              />
            ))}
          </FormGroup>
          <Box sx={{ mt: 2, textAlign: 'right' }}>
            <Button size="small" onClick={handleClearFilters} disabled={activeFilters.length === 0}>
              {t('search.filter.clear', 'Clear All')}
            </Button>
          </Box>
        </Box>
      </Popover>
    </>
  );
}
