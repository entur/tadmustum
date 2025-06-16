import { useEffect, useState } from "react";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import type { Extrajourney } from "../../shared/model/Extrajourney.tsx";
import { useQueryExtraJourney } from "./hooks/useQueryExtraJourney.tsx";
import Button from "@mui/material/Button";
import { useNavigate } from "react-router-dom";
import { Box } from "@mui/material";

export default function CarPoolingTrips() {
  const navigate = useNavigate();
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

  const rows = plannedTrips;

  const columns: GridColDef[] = [
    {
      field: "id",
      headerName: "ID",
      renderCell: (params) => (
        <Box>
          {params.row.id}{" "}
          <Button
            variant="contained"
            size="small"
            onClick={() => navigate(`/plan-trip/${params.row.id}`)}
          >
            Edit
          </Button>
        </Box>
      ),
    },
    {
      field: "lineNameValue",
      headerName: "Line name",
      valueGetter: (_value: string, row: Extrajourney) =>
        row.estimatedVehicleJourney.publishedLineName,
    },
    {
      field: "destinationDisplayValue",
      headerName: "Destination display",
      valueGetter: (_value: string, row: Extrajourney) =>
        row.estimatedVehicleJourney.estimatedCalls?.estimatedCall[0]
          .destinationDisplay,
    },
    {
      field: "departureStopName",
      headerName: "Departure stop name",
      valueGetter: (_value: string, row: Extrajourney) =>
        row.estimatedVehicleJourney.estimatedCalls?.estimatedCall[0]
          .stopPointName,
    },
    {
      field: "departureTimeName",
      headerName: "Departure time",
      valueGetter: (_value: string, row: Extrajourney) =>
        row.estimatedVehicleJourney.estimatedCalls?.estimatedCall[0]
          .aimedDepartureTime,
    },
    {
      field: "arrivalStopName",
      headerName: "Arrival stop name",
      valueGetter: (_value: string, row: Extrajourney) =>
        row.estimatedVehicleJourney?.estimatedCalls?.estimatedCall[1]
          .stopPointName,
    },
    {
      field: "arrivalTimeName",
      headerName: "Arrival time",
      valueGetter: (_value: string, row: Extrajourney) =>
        row.estimatedVehicleJourney.estimatedCalls.estimatedCall[1]
          .aimedArrivalTime,
    },
  ];

  return (
    <div>
      <DataGrid rows={rows} columns={columns} />
    </div>
  );
}
