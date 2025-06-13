import { useEffect, useState } from "react";
import { DataGrid } from "@mui/x-data-grid";
import type { Extrajourney } from "../../shared/model/Extrajourney.tsx";
import { useQueryExtraJourney } from "./hooks/useQueryExtraJourney.tsx";

export default function CarPoolingTrips() {
  const [plannedTrips, setPlannedTrips] = useState<Extrajourney[] | undefined>(
    undefined,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const queryExtraJourneys = useQueryExtraJourney();

  useEffect(() => {
    queryExtraJourneys("ENT", "ENT:Authority:ENT", true)
      .then((response) => {
        setPlannedTrips(response.data);
        setLoading(false);
      })
      .catch((error) => {
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

  console.log("data", plannedTrips);

  const rows = plannedTrips;

  const columns = [
    { field: "id", headerName: "ID" },
    {
      field: "nameValue",
      headerName: "Name",
      valueGetter: (_value: string, row: Extrajourney) =>
        row.estimatedVehicleJourney.estimatedCalls.estimatedCall[0]
          .destinationDisplay,
    },
  ];

  return (
    <div>
      <DataGrid rows={rows} columns={columns} />
    </div>
  );
}
