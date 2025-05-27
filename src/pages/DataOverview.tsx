import { useEffect, useState } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { fetchStopPlaces } from '../data/fetchStopPlaces.tsx';
import type { Name, StopPlace, StopPlaceContext } from '../data/StopPlaceContext.tsx';
import { getIconUrl } from '../data/iconLoader.ts';

export default function DataOverview() {
  const [stopPlaces, setStopPlaces] = useState<StopPlaceContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStopPlaces()
      .then(data => {
        setStopPlaces(data);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to fetch data');
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="alert alert-info">Loading...</div>;
  if (error) return <div className="alert alert-danger">{error}</div>;

  const rows = stopPlaces?.data.stopPlace || [];

  const columns = [
    { field: 'id', headerName: 'ID', width: 200 },
    {
      field: 'nameValue',
      headerName: 'Name',
      width: 250,
      valueGetter: (_value: Name, row: StopPlace) => row.name.value,
    },
    {
      field: 'longitude',
      headerName: 'Longitude',
      width: 150,
      valueGetter: (_value: number, row: StopPlace) =>
        row.geometry.legacyCoordinates?.[0]?.[0] ?? '',
    },
    {
      field: 'latitude',
      headerName: 'Latitude',
      width: 150,
      valueGetter: (_value: number, row: StopPlace) =>
        row.geometry.legacyCoordinates?.[0]?.[1] ?? '',
    },
    {
      field: 'stopPlaceType',
      headerName: 'Type',
      width: 100,
      renderCell: ({ row }: { row: StopPlace }) => {
        const url = getIconUrl(row.stopPlaceType);

        return (
          <img
            src={url}
            alt={row.stopPlaceType}
            style={{ width: 48, height: 48, objectFit: 'contain' }}
          />
        );
      },
    },
  ];

  return (
    <div style={{ height: 600, width: '100%' }}>
      <DataGrid rows={rows} columns={columns} />
    </div>
  );
}
