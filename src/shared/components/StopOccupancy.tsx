import { Box, Tooltip, Typography } from '@mui/material';
import { People } from '@mui/icons-material';

interface StopOccupancyProps {
  onboardCount?: number | null;
  totalCapacity?: number | null;
}

// Shows how full the vehicle is as it departs a stop, e.g. "3 / 4 seats".
// Turns amber when the car is exactly full and red when over capacity, so a
// dispatcher editing a trip — or a passenger about to book — can see at a
// glance where the seats run out instead of being surprised at submit time.
export default function StopOccupancy({ onboardCount, totalCapacity }: StopOccupancyProps) {
  if (onboardCount == null && totalCapacity == null) return null;

  const over = onboardCount != null && totalCapacity != null && onboardCount > totalCapacity;
  const full = onboardCount != null && totalCapacity != null && onboardCount === totalCapacity;
  const color = over ? 'error.main' : full ? 'warning.main' : 'text.secondary';

  const onboardLabel = onboardCount ?? '–';
  const capacityLabel = totalCapacity ?? '–';

  return (
    <Tooltip title="Passengers on board / total capacity as the vehicle departs this stop">
      <Box display="flex" alignItems="center" gap={0.5} sx={{ color }}>
        <People sx={{ fontSize: 16 }} />
        <Typography
          variant="caption"
          sx={{ color: 'inherit', fontWeight: over || full ? 600 : 400 }}
        >
          {onboardLabel} / {capacityLabel} seats{over ? ' (over capacity)' : full ? ' (full)' : ''}
        </Typography>
      </Box>
    </Tooltip>
  );
}
