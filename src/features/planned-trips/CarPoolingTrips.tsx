import { useEffect, useMemo, useState } from 'react';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import type { Extrajourney } from '../../shared/model/Extrajourney.tsx';
import { useQueryExtraJourney } from './hooks/useQueryExtraJourney.tsx';
import { useAuthorities } from '../../shared/hooks/useAuthorities.tsx';
import Button from '@mui/material/Button';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Checkbox,
  Chip,
  FormControlLabel,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import dayjs from 'dayjs';

const formatMinuteResolution = (value: string | null | undefined) =>
  value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '';

export default function CarPoolingTrips() {
  const navigate = useNavigate();
  const location = useLocation();
  const [plannedTrips, setPlannedTrips] = useState<Extrajourney[] | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPastArrivals, setShowPastArrivals] = useState(false);
  const [showExpired, setShowExpired] = useState(false);
  const [showHiddenFields, setShowHiddenFields] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [failedCodespaces, setFailedCodespaces] = useState<string[]>([]);

  const queryExtraJourneys = useQueryExtraJourney();
  const { authorities } = useAuthorities();

  useEffect(() => {
    const message = (location.state as { savedMessage?: string } | null)?.savedMessage;
    if (message) {
      setSavedMessage(message);
      // Drop the state so the snackbar doesn't re-trigger on back/forward or refresh.
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state, location.pathname, navigate]);

  useEffect(() => {
    if (!authorities.length) return;
    // Fan out across every authority the user has access to and merge the
    // results. Each trip carries its own codespace in its lineRef, so callers
    // (edit/book navigation) can identify which tenant a row belongs to.
    // Track per-codespace failures so we can surface a non-fatal warning rather
    // than silently returning fewer trips than the user expects.
    Promise.all(
      authorities.map(authority =>
        queryExtraJourneys(authority.id.split(':')[0], authority.id, true)
      )
    )
      .then(responses => {
        const merged: Extrajourney[] = [];
        const failed: string[] = [];
        responses.forEach((response, index) => {
          if (response.data) {
            merged.push(...response.data);
          } else if (response.error) {
            failed.push(authorities[index].id.split(':')[0]);
          }
        });
        setPlannedTrips(merged);
        setFailedCodespaces(failed);
        setLoading(false);
      })
      .catch(err => {
        setError(err);
        setLoading(false);
      });
  }, [authorities, queryExtraJourneys]);

  const rows = useMemo(() => {
    if (!plannedTrips) return plannedTrips;
    const now = Date.now();
    return plannedTrips.filter(trip => {
      if (!showPastArrivals) {
        const calls = trip.estimatedVehicleJourney.estimatedCalls?.estimatedCall;
        const latestExpected =
          calls && calls.length > 0 ? calls[calls.length - 1].latestExpectedArrivalTime : null;
        if (latestExpected && dayjs(latestExpected).valueOf() < now) return false;
      }
      if (!showExpired) {
        if (trip.estimatedVehicleJourney.expiresAtEpochMs < now) return false;
      }
      return true;
    });
  }, [plannedTrips, showPastArrivals, showExpired]);

  if (loading) {
    return <div className="alert alert-info">Loading...</div>;
  }

  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }

  const columns: GridColDef[] = [
    {
      field: 'actions',
      headerName: 'Actions',
      minWidth: 180,
      sortable: false,
      filterable: false,
      renderCell: params => {
        // Codespace is encoded in the trip's lineRef as `<CODESPACE>:CarPooling:<uuid>`.
        // It identifies which Firestore partition the trip lives in, so it must
        // be in the URL for the edit/book pages to know which tenant to query.
        const codespace = params.row.estimatedVehicleJourney.lineRef?.split(':')[0] ?? '';
        return (
          <Box>
            <Button
              variant="contained"
              size="small"
              onClick={() => navigate(`/plan-trip/${codespace}/${params.row.id}`)}
            >
              Edit
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={() => navigate(`/book-trip/${codespace}/${params.row.id}`)}
              style={{ marginLeft: 8 }}
            >
              Book Ride
            </Button>
          </Box>
        );
      },
    },
    {
      field: 'id',
      headerName: 'ID',
      minWidth: 220,
      flex: 1,
    },
    {
      field: 'cancellation',
      headerName: 'Status',
      width: 150,
      valueGetter: (_value: string, row: Extrajourney) => {
        if (row.estimatedVehicleJourney.cancellation) return 'cancelled';
        const calls = row.estimatedVehicleJourney.estimatedCalls?.estimatedCall ?? [];
        const cancelledCalls = calls.filter(c => c.cancellation).length;
        if (cancelledCalls > 0 && cancelledCalls === calls.length) return 'cancelled';
        if (cancelledCalls > 0) return 'partially_cancelled';
        return 'active';
      },
      renderCell: params => {
        if (params.value === 'cancelled') {
          return <Chip label="Cancelled" size="small" color="error" />;
        }
        if (params.value === 'partially_cancelled') {
          return <Chip label="Partially cancelled" size="small" color="warning" />;
        }
        return <Chip label="Active" size="small" color="success" />;
      },
    },
    {
      field: 'stopCount',
      headerName: 'Stops',
      width: 80,
      valueGetter: (_value: string, row: Extrajourney) => {
        const callsLength = row.estimatedVehicleJourney.estimatedCalls?.estimatedCall.length || 0;
        return callsLength;
      },
      renderCell: params => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography variant="body2" fontWeight="bold">
            {params.value}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            stops
          </Typography>
        </Box>
      ),
    },
    {
      field: 'departureStopName',
      headerName: 'Departure stop name',
      flex: 1,
      valueGetter: (_value: string, row: Extrajourney) =>
        row.estimatedVehicleJourney.estimatedCalls?.estimatedCall[0].stopPointName,
    },
    {
      field: 'departureTimeName',
      headerName: 'Departure time',
      flex: 1,
      valueGetter: (_value: string, row: Extrajourney) =>
        row.estimatedVehicleJourney.estimatedCalls?.estimatedCall[0].aimedDepartureTime,
      valueFormatter: (value: string) => formatMinuteResolution(value),
    },
    {
      field: 'arrivalStopName',
      headerName: 'Final destination',
      flex: 1,
      valueGetter: (_value: string, row: Extrajourney) => {
        const calls = row.estimatedVehicleJourney?.estimatedCalls?.estimatedCall;
        return calls && calls.length > 0 ? calls[calls.length - 1].stopPointName : '';
      },
    },
    {
      field: 'arrivalTimeName',
      headerName: 'Arrival time',
      flex: 1,
      valueGetter: (_value: string, row: Extrajourney) => {
        const calls = row.estimatedVehicleJourney.estimatedCalls?.estimatedCall;
        return calls && calls.length > 0 ? calls[calls.length - 1].aimedArrivalTime : '';
      },
      valueFormatter: (value: string) => formatMinuteResolution(value),
    },
    {
      field: 'latestExpectedArrivalTime',
      headerName: 'Latest expected arrival time',
      flex: 1,
      valueGetter: (_value: string, row: Extrajourney) => {
        const calls = row.estimatedVehicleJourney.estimatedCalls?.estimatedCall;
        return calls && calls.length > 0
          ? (calls[calls.length - 1].latestExpectedArrivalTime ?? '')
          : '';
      },
      valueFormatter: (value: string) => formatMinuteResolution(value),
    },
    {
      field: 'recordedAtTime',
      headerName: 'Recorded at',
      flex: 1,
      valueGetter: (_value: string, row: Extrajourney) =>
        row.estimatedVehicleJourney.recordedAtTime,
      valueFormatter: (value: string) => formatMinuteResolution(value),
    },
    {
      field: 'expiresAtEpochMs',
      headerName: 'Expires at',
      flex: 1,
      valueGetter: (_value: number, row: Extrajourney) =>
        row.estimatedVehicleJourney.expiresAtEpochMs,
      valueFormatter: (value: number | null | undefined) =>
        value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '',
    },
  ];

  return (
    <Box sx={{ width: '100%', maxWidth: 1400, mx: 'auto', p: { xs: 1, sm: 2 } }}>
      {failedCodespaces.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Could not load trips from: {failedCodespaces.join(', ')}. The list below may be
          incomplete.
        </Alert>
      )}
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={showPastArrivals}
              onChange={event => setShowPastArrivals(event.target.checked)}
            />
          }
          label="Show completed trips"
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={showExpired}
              onChange={event => setShowExpired(event.target.checked)}
            />
          }
          label="Show expired trips"
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={showHiddenFields}
              onChange={event => setShowHiddenFields(event.target.checked)}
            />
          }
          label="Show hidden fields"
        />
        <Typography variant="body2" color="text.secondary">
          Showing {rows?.length ?? 0} of {plannedTrips?.length ?? 0} trips
        </Typography>
      </Stack>
      <DataGrid
        rows={rows}
        columns={columns}
        columnVisibilityModel={{
          id: showHiddenFields,
          latestExpectedArrivalTime: showHiddenFields,
          expiresAtEpochMs: showHiddenFields,
        }}
        disableColumnMenu
        disableRowSelectionOnClick
        rowHeight={56}
        pageSizeOptions={[10, 25, 50]}
        initialState={{
          pagination: { paginationModel: { pageSize: 10 } },
          sorting: { sortModel: [{ field: 'departureTimeName', sort: 'desc' }] },
        }}
        getRowClassName={params => {
          const journey = (params.row as Extrajourney).estimatedVehicleJourney;
          if (journey?.cancellation) return 'row-cancelled';
          const calls = journey?.estimatedCalls?.estimatedCall ?? [];
          if (calls.length > 0 && calls.every(c => c.cancellation)) return 'row-cancelled';
          return '';
        }}
        sx={{
          border: 0,
          borderRadius: 2,
          boxShadow: 1,
          bgcolor: 'background.paper',
          overflow: 'hidden',
          '& .MuiDataGrid-columnHeaders': {
            bgcolor: 'rgba(0, 0, 0, 0.04)',
          },
          '& .MuiDataGrid-columnHeaderTitle': {
            fontWeight: 600,
          },
          '& .MuiDataGrid-cell': {
            display: 'flex',
            alignItems: 'center',
          },
          '& .MuiDataGrid-row:nth-of-type(even)': {
            bgcolor: 'rgba(0, 0, 0, 0.02)',
          },
          // Rows aren't clickable, so suppress the default (themed) hover highlight
          // while keeping the zebra stripe steady.
          '& .MuiDataGrid-row:hover': {
            bgcolor: 'transparent',
          },
          '& .MuiDataGrid-row:nth-of-type(even):hover': {
            bgcolor: 'rgba(0, 0, 0, 0.02)',
          },
          '& .MuiDataGrid-row.Mui-selected, & .MuiDataGrid-row.Mui-selected:hover': {
            bgcolor: 'transparent',
          },
          '& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within, & .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within':
            {
              outline: 'none',
            },
          '& .row-cancelled': {
            textDecoration: 'line-through',
            color: 'text.disabled',
          },
        }}
      />
      <Snackbar
        open={!!savedMessage}
        autoHideDuration={4000}
        onClose={() => setSavedMessage(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSavedMessage(null)}
          severity="success"
          variant="filled"
          sx={{ width: '100%' }}
        >
          {savedMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
