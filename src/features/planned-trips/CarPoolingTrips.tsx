import { useEffect, useMemo, useState } from 'react';
import { DataGrid, useGridApiRef, type GridColDef } from '@mui/x-data-grid';
import type { Extrajourney } from '../../shared/model/Extrajourney.tsx';
import { useQueryExtraJourney } from './hooks/useQueryExtraJourney.tsx';
import { useCancelExtrajourney } from '../plan-trip/hooks/useCancelExtrajourney.tsx';
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

// A trip counts as cancelled when the journey itself is flagged cancelled, or
// when every one of its stops is cancelled. (A trip with only *some* cancelled
// stops is "partially cancelled" and is left visible.) Shared by the row filter
// and the row styling so the two never disagree.
const isTripCancelled = (trip: Extrajourney): boolean => {
  const journey = trip.estimatedVehicleJourney;
  const calls = journey?.estimatedCalls?.estimatedCall ?? [];
  return Boolean(journey?.cancellation) || (calls.length > 0 && calls.every(c => c.cancellation));
};

export default function CarPoolingTrips() {
  const navigate = useNavigate();
  const location = useLocation();
  const [plannedTrips, setPlannedTrips] = useState<Extrajourney[] | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPastArrivals, setShowPastArrivals] = useState(false);
  const [showExpired, setShowExpired] = useState(false);
  const [showCancelled, setShowCancelled] = useState(false);
  const [showHiddenFields, setShowHiddenFields] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [cancellingTripId, setCancellingTripId] = useState<string | null>(null);
  const [highlightedTripId, setHighlightedTripId] = useState<string | null>(null);
  // Drives the one-shot attention pulse; once it has played we keep a steady
  // highlight so paging away and back doesn't re-trigger the blink.
  const [hasPulsed, setHasPulsed] = useState(false);
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });
  const [failedCodespaces, setFailedCodespaces] = useState<string[]>([]);
  const apiRef = useGridApiRef();

  const queryExtraJourneys = useQueryExtraJourney();
  const cancelExtrajourney = useCancelExtrajourney();
  const { authorities, allowedCodespaces } = useAuthorities();
  const adminCodespaceIds = new Set(
    allowedCodespaces.filter(c => c.permissions.includes('ADMIN_CARPOOLING_DATA')).map(c => c.id)
  );
  // Trips don't carry the authority name; resolve it from the codespace prefix
  // of lineRef against the authorities the user has access to. Trips can only
  // appear in the list if their codespace was queried, so a hit is guaranteed.
  const authorityNameByCodespace = useMemo(
    () => new Map(authorities.map(a => [a.id.split(':')[0], a.name])),
    [authorities]
  );
  // Cancelling re-submits the journey and must send the full authority id, not
  // just the codespace prefix; resolve it from the trip's codespace the same way
  // the name lookup above does.
  const authorityIdByCodespace = useMemo(
    () => new Map(authorities.map(a => [a.id.split(':')[0], a.id])),
    [authorities]
  );

  useEffect(() => {
    const state = location.state as { savedMessage?: string; savedTripId?: string } | null;
    if (state?.savedMessage || state?.savedTripId) {
      if (state.savedMessage) setSavedMessage(state.savedMessage);
      if (state.savedTripId) setHighlightedTripId(state.savedTripId);
      // Drop the state so the snackbar/highlight don't re-trigger on back/forward
      // or refresh.
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
      if (!showCancelled && isTripCancelled(trip)) return false;
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
  }, [plannedTrips, showPastArrivals, showExpired, showCancelled]);

  const handleCancelTrip = async (trip: Extrajourney) => {
    const codespace = trip.estimatedVehicleJourney.lineRef?.split(':')[0] ?? '';
    const authority = authorityIdByCodespace.get(codespace);
    if (!authority) {
      setActionError('Could not resolve the authority for this trip; cannot cancel it.');
      return;
    }
    setCancellingTripId(trip.id ?? null);
    const { error } = await cancelExtrajourney(trip, authority);
    setCancellingTripId(null);
    if (error) {
      setActionError(`Could not cancel the trip: ${error.message}`);
      return;
    }
    // Reflect the cancellation locally so the row updates (and, with "Show
    // cancelled trips" off, drops out of the list) without a full refetch.
    setPlannedTrips(prev =>
      prev?.map(t =>
        t.id === trip.id
          ? {
              ...t,
              estimatedVehicleJourney: { ...t.estimatedVehicleJourney, cancellation: true },
            }
          : t
      )
    );
    setSavedMessage('Trip cancelled.');
  };

  // Once the saved row is in the grid, jump to the page that holds it and scroll
  // it into view so the user immediately sees the trip they just created/edited.
  useEffect(() => {
    if (!highlightedTripId || !rows?.length) return;
    const api = apiRef.current;
    if (!api?.getSortedRowIds) return;
    const sortedIds = api.getSortedRowIds();
    const index = sortedIds.indexOf(highlightedTripId);
    if (index < 0) return;
    const page = Math.floor(index / paginationModel.pageSize);
    setPaginationModel(prev => (prev.page === page ? prev : { ...prev, page }));
    api.scrollToIndexes?.({ rowIndex: index });
  }, [highlightedTripId, rows, apiRef, paginationModel.pageSize]);

  // Let the pulse play once, then settle into a steady (non-animated) highlight.
  // The 2.2s matches the animation below (1.1s × 2 iterations).
  useEffect(() => {
    if (!highlightedTripId) return;
    setHasPulsed(false);
    const timer = setTimeout(() => setHasPulsed(true), 2200);
    return () => clearTimeout(timer);
  }, [highlightedTripId]);

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
      minWidth: 290,
      sortable: false,
      filterable: false,
      renderCell: params => {
        // Codespace is encoded in the trip's lineRef as `<CODESPACE>:CarPooling:<uuid>`.
        // It identifies which Firestore partition the trip lives in, so it must
        // be in the URL for the edit/book pages to know which tenant to query.
        const codespace = params.row.estimatedVehicleJourney.lineRef?.split(':')[0] ?? '';
        // Edit and Book both go through write mutations on nunamnir, so only
        // show them when the user actually has admin on that codespace —
        // otherwise the buttons just lead to a 403.
        const canModify = adminCodespaceIds.has(codespace);
        const cancelled = isTripCancelled(params.row as Extrajourney);
        return (
          <Box>
            {canModify && (
              <Button
                variant="contained"
                size="small"
                onClick={() => navigate(`/plan-trip/${codespace}/${params.row.id}`)}
              >
                Edit
              </Button>
            )}
            {canModify && (
              <Button
                variant="outlined"
                size="small"
                onClick={() => navigate(`/book-trip/${codespace}/${params.row.id}`)}
                style={{ marginLeft: 8 }}
              >
                Book Ride
              </Button>
            )}
            {canModify && !cancelled && (
              <Button
                variant="outlined"
                color="error"
                size="small"
                disabled={cancellingTripId === params.row.id}
                onClick={() => handleCancelTrip(params.row as Extrajourney)}
                style={{ marginLeft: 8 }}
              >
                {cancellingTripId === params.row.id ? 'Cancelling…' : 'Cancel'}
              </Button>
            )}
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
      field: 'authority',
      headerName: 'Authority',
      minWidth: 140,
      flex: 1,
      valueGetter: (_value: string, row: Extrajourney) => {
        const codespace = row.estimatedVehicleJourney.lineRef?.split(':')[0] ?? '';
        return authorityNameByCodespace.get(codespace) ?? codespace;
      },
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
              checked={showCancelled}
              onChange={event => setShowCancelled(event.target.checked)}
            />
          }
          label="Show cancelled trips"
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
          authority: showHiddenFields,
          latestExpectedArrivalTime: showHiddenFields,
          expiresAtEpochMs: showHiddenFields,
        }}
        apiRef={apiRef}
        disableColumnMenu
        disableRowSelectionOnClick
        rowHeight={56}
        pageSizeOptions={[10, 25, 50]}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        initialState={{
          sorting: { sortModel: [{ field: 'departureTimeName', sort: 'desc' }] },
        }}
        getRowClassName={params => {
          const classes: string[] = [];
          if ((params.row as Extrajourney).id === highlightedTripId) {
            classes.push('row-highlighted');
            // Only attach the animating class until the pulse has run once.
            if (!hasPulsed) classes.push('row-highlighted-pulse');
          }
          if (isTripCancelled(params.row as Extrajourney)) {
            classes.push('row-cancelled');
          }
          return classes.join(' ');
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
          // Draw attention to the trip the user just created/edited: a green tint
          // with a left accent bar, briefly pulsing to catch the eye on arrival.
          // Selectors carry the extra `.MuiDataGrid-row` qualifier so they beat
          // the zebra-stripe and hover rules above on specificity.
          '@keyframes rowHighlightPulse': {
            '0%': { backgroundColor: 'rgba(46, 125, 50, 0.32)' },
            '100%': { backgroundColor: 'rgba(46, 125, 50, 0.14)' },
          },
          '& .MuiDataGrid-row.row-highlighted, & .MuiDataGrid-row.row-highlighted:hover': {
            backgroundColor: 'rgba(46, 125, 50, 0.14)',
            boxShadow: 'inset 4px 0 0 0 #2e7d32',
          },
          // The blink only runs while the one-shot `row-highlighted-pulse` class
          // is present, so re-rendering the row (e.g. paging away and back) after
          // it has played leaves just the steady highlight above.
          '& .MuiDataGrid-row.row-highlighted-pulse': {
            animation: 'rowHighlightPulse 1.1s ease-out 2',
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
      <Snackbar
        open={!!actionError}
        autoHideDuration={6000}
        onClose={() => setActionError(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setActionError(null)}
          severity="error"
          variant="filled"
          sx={{ width: '100%' }}
        >
          {actionError}
        </Alert>
      </Snackbar>
    </Box>
  );
}
