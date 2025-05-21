import React, { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Tooltip,
} from "@mui/material";
import { InfoOutlined } from "@mui/icons-material";
import Typography from "@mui/material/Typography";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { Dayjs } from "dayjs";
import { gql, useMutation } from "@apollo/client";
import {
  type Polygon,
  type FeatureOf,
} from "@deck.gl-community/editable-layers";

export interface WorkAreaContentProps {
  departureStop: FeatureOf<Polygon> | null;
  arrivalStop: FeatureOf<Polygon> | null;
  onSetDepartureStop: (poly: FeatureOf<Polygon> | null) => void;
  onSetArrivalStop: (poly: FeatureOf<Polygon> | null) => void;
  onSave?: (data: {
    lineName: string;
    destinationDisplay: string;
    departureDate: Dayjs | null;
    departureStopName: string;
    destinationStopName: string;
    arrivalDate: Dayjs | null;
  }) => void;
  onCancel?: () => void;
  onDetailsOpen?: () => void;
}

const CREATE_EXTRA_JOURNEY = gql`
  mutation CreateOrUpdateExtrajourney(
    $codespace: String!
    $authority: String!
    $input: ExtrajourneyInput!
  ) {
    createOrUpdateExtrajourney(
      codespace: $codespace
      authority: $authority
      input: $input
    )
  }
`;

const CarPoolingTripData: React.FC<WorkAreaContentProps> = (stops) => {
  const { departureStop, onSetDepartureStop, arrivalStop, onSetArrivalStop } =
    stops;
  const [lineName, setLineName] = useState<string>("");
  const [departureDate, setDepartureDate] = useState<Dayjs | null>(null);
  const [arrivalDate, setArrivalDate] = useState<Dayjs | null>(null);
  const [destinationDisplay, setDestinationDisplay] = useState<string>("");
  const [departureStopName, setDepartureStopName] = useState<string>("");
  const [destinationStopName, seSetDestinationStopName] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [createOrUpdateExtrajourney, { loading }] =
    useMutation(CREATE_EXTRA_JOURNEY);

  const handleSave = () => {
    // TODO: implement save logic or call onSave prop

    createOrUpdateExtrajourney({
      variables: {
        codespace: "ENT", // TODO: Remove hard coding
        authority: "ENT:Authority:ENT", // TODO: Remove hard coding
        input: {
          estimatedVehicleJourney: {
            recordedAtTime: "", //TODO: Generate iso time stamp
            lineRef: "", // TODO: Generate CodeSpaced "ENT:LINE" UUID reference
            directionRef: "0",
            estimatedVehicleJourneyCode: "", // TODO: ...
            extraJourney: true,
            vehicleMode: "car",
            routeRef: "", // TODO: ...
            publishedLineName: lineName,
            groupOfLinesRef: "",
            externalLineRef: "",
            operatorRef: "", // TODO: Pick operator
            monitored: true,
            dataSource: "ENT", // TODO: Remove hard coding
            estimatedCalls: {
              estimatedCall: [
                {
                  order: 1,
                  stopPointName: departureStopName,
                  destinationDisplay: destinationDisplay,
                  aimedDepartureTime: departureDate,
                  expectedDepartureTime: departureDate,
                  departureBoardingActivity: "boarding",
                },
                {
                  order: 2,
                  stopPointName: destinationStopName,
                  destinationDisplay: destinationDisplay,
                  aimedArrivalTime: arrivalDate,
                  expectedArrivalTime: arrivalDate,
                  arrivalBoardingActivity: "alighting",
                },
              ],
            },
          },
        },
      },
    }).then();

    console.log({ lineName: lineName });
  };

  const handleCancel = () => {
    // TODO: implement cancel logic or call onCancel prop
    setLineName("");
    setDestinationDisplay("");
    setDepartureStopName("");
    seSetDestinationStopName("");
  };

  const handleDetailsClose = () => {
    setDialogOpen(false);
  };

  const removeDepartureStop = () => {
    onSetDepartureStop(null);
  };
  const removeArrivalStop = () => {
    onSetArrivalStop(null);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, p: 2 }}>
      <Typography variant="h5" component="h1">
        Trip data
      </Typography>

      <TextField
        label="Line name"
        value={lineName}
        onChange={(e) => setLineName(e.target.value)}
        fullWidth
      />
      <TextField
        label="Destination display"
        value={destinationDisplay}
        onChange={(e) => setDestinationDisplay(e.target.value)}
        fullWidth
      />

      <Box>
        <Typography variant="h6" component="h2">
          Departure
        </Typography>
        <TextField
          label="Departure stop name"
          value={departureStopName}
          onChange={(e) => setDepartureStopName(e.target.value)}
          fullWidth
        />
        <DateTimePicker
          label="Select departure date"
          value={departureDate}
          onChange={(newValue) => setDepartureDate(newValue)}
        />
        <Button variant="contained" disabled={departureStop != null}>
          Add stop
        </Button>
        <Button
          variant="contained"
          disabled={departureStop == null}
          onClick={removeDepartureStop}
        >
          Remove stop
        </Button>
      </Box>

      <Box>
        <Typography variant="h6" component="h2">
          Arrival
        </Typography>
        <TextField
          label="Destination stop name"
          value={destinationStopName}
          onChange={(e) => seSetDestinationStopName(e.target.value)}
          fullWidth
        />
        <DateTimePicker
          label="Select arrival date"
          value={arrivalDate}
          onChange={(newValue) => setArrivalDate(newValue)}
        />
        <Button variant="contained" disabled={arrivalStop != null}>
          Add stop
        </Button>
        <Button
          variant="contained"
          disabled={arrivalStop == null}
          onClick={removeArrivalStop}
        >
          Remove stop
        </Button>
      </Box>

      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
        <Button variant="contained" onClick={handleSave}>
          Submit trip
        </Button>
        <Button variant="outlined" onClick={handleCancel}>
          Cancel
        </Button>
        <Tooltip title="More info">
          <IconButton>
            <InfoOutlined />
          </IconButton>
        </Tooltip>
      </Box>

      <Dialog open={dialogOpen} onClose={handleDetailsClose} fullWidth>
        <DialogTitle>Details</DialogTitle>
        <DialogContent>{/* TODO: add details content here */}</DialogContent>
        <DialogActions>
          <Button onClick={handleDetailsClose} disabled={loading}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CarPoolingTripData;
