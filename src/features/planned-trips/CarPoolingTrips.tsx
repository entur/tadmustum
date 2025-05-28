import { useEffect, useState } from "react";
import { fetchStopPlaces } from "../../shared/data/fetchStopPlaces.tsx";
import type {
  Name,
  StopPlace,
  StopPlaceContext,
} from "../../shared/data/StopPlaceContext.tsx";
import { DataGrid } from "@mui/x-data-grid";

export default function CarPoolingTrips() {
  const [stopPlaces, setStopPlaces] = useState<StopPlaceContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStopPlaces()
      .then((data) => {
        setStopPlaces(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to fetch data");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="alert alert-info">Loading...</div>;
  }

  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }

  console.log("data", stopPlaces);

  const rows = stopPlaces?.data.stopPlace;

  const columns = [
    { field: "id", headerName: "ID" },
    {
      field: "nameValue",
      headerName: "Name",
      valueGetter: (_value: Name, row: StopPlace) => row.name.value,
    },
  ];

  return (
    <div>
      <DataGrid rows={rows} columns={columns} />
    </div>
  );
}
