import { useEffect, useState } from 'react';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import type { Extrajourney } from '../../shared/model/Extrajourney.tsx';
import { useQueryExtraJourney } from './hooks/useQueryExtraJourney.tsx';
import Button from '@mui/material/Button';
import { useNavigate } from 'react-router-dom';
import { Box, Typography } from '@mui/material';

export default function CarPoolingTrips() {
  const navigate = useNavigate();
  const [plannedTrips, setPlannedTrips] = useState<Extrajourney[] | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) {
    return <div className="alert alert-info">Loading...</div>;
  }

  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }

  const rows = plannedTrips;

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
    },
  ];

  return (
    <div>
      <DataGrid rows={rows} columns={columns} />
    </div>
  );
}
