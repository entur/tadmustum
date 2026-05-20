import { useEffect, useMemo, useState } from 'react';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import type { Extrajourney } from '../../shared/model/Extrajourney.tsx';
import { useQueryExtraJourney } from './hooks/useQueryExtraJourney.tsx';
import Button from '@mui/material/Button';
import { useNavigate } from 'react-router-dom';
import { Box, Checkbox, FormControlLabel, Stack, Typography } from '@mui/material';
import dayjs from 'dayjs';

const formatMinuteResolution = (value: string | null | undefined) =>
  value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '';

export default function CarPoolingTrips() {
  const navigate = useNavigate();
  const [plannedTrips, setPlannedTrips] = useState<Extrajourney[] | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPastArrivals, setShowPastArrivals] = useState(false);
  const [showExpired, setShowExpired] = useState(false);

  const queryExtraJourneys = useQueryExtraJourney();

  useEffect(() => {
    queryExtraJourneys('ENT', 'ENT:Authority:ENT', true)
      .then(response => {
        setPlannedTrips(response.data);
        setLoading(false);
      })
      .catch(error => {
        setError(error);
        setLoading(false);
      });
  }, [queryExtraJourneys]);

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
      field: 'id',
      headerName: 'ID',
      minWidth: 220,
      flex: 1,
      renderCell: params => (
        <Box>
          <Button
            variant="contained"
            size="small"
            onClick={() => navigate(`/plan-trip/${params.row.id}`)}
            style={{ marginLeft: 8 }}
          >
            Edit
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={() => navigate(`/book-trip/${params.row.id}`)}
            style={{ marginLeft: 8 }}
          >
            Book Ride
          </Button>{' '}
          {params.row.id}
        </Box>
      ),
    },
    {
      field: 'lineNameValue',
      headerName: 'Line name',
      flex: 1,
      valueGetter: (_value: string, row: Extrajourney) =>
        row.estimatedVehicleJourney.publishedLineName,
    },
    {
      field: 'destinationDisplayValue',
      headerName: 'Destination display',
      flex: 1,
      valueGetter: (_value: string, row: Extrajourney) =>
        row.estimatedVehicleJourney.estimatedCalls?.estimatedCall[0].destinationDisplay,
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
    <div>
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
        <Typography variant="body2" color="text.secondary">
          Showing {rows?.length ?? 0} of {plannedTrips?.length ?? 0} trips
        </Typography>
      </Stack>
      <DataGrid
        rows={rows}
        columns={columns}
        initialState={{
          sorting: { sortModel: [{ field: 'departureTimeName', sort: 'desc' }] },
        }}
      />
    </div>
  );
}
