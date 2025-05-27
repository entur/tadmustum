import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Tooltip,
} from "@mui/material";
import { InfoOutlined } from "@mui/icons-material";
import Typography from "@mui/material/Typography";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { Dayjs } from "dayjs";
import { gql, useMutation } from "@apollo/client";
import type { Feature, Polygon } from "geojson";
import type { CarPoolingMapMode } from "./CarPoolingMapMode.tsx";
import { useOrganizations } from "../hooks/useOrganizations.tsx";
import { useOperators } from "../hooks/useOperators.tsx";

export interface WorkAreaContentProps {
  mapDrawMode: CarPoolingMapMode;
  onAddFlexibleStop: () => void;
  onRemoveFlexibleStop: (id: string) => void;
  onStopCreatedCallback: () => null | Feature;
  onSave?: (data: {
    lineName: string;
    destinationDisplay: string;
    departureDate: null | Dayjs;
    departureStopName: string;
    destinationStopName: string;
    arrivalDate: null | Dayjs;
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

function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}

const CarPoolingTripData: React.FC<WorkAreaContentProps> = (stops) => {
  const {
    mapDrawMode,
    onAddFlexibleStop,
    onRemoveFlexibleStop,
    onStopCreatedCallback,
  } = stops;
  const { authorities, allowedCodespaces } = useOrganizations();
  const [selectedAutority, setSelectedAutority] = useState<string>("");
  const operators = useOperators();
  const [selectedOperator, setSelectedOperator] = useState<string>("");
  const [lineName, setLineName] = useState<string>("");
  const [departureDate, setDepartureDate] = useState<Dayjs | null>(null);
  const [arrivalDate, setArrivalDate] = useState<Dayjs | null>(null);
  const [destinationDisplay, setDestinationDisplay] = useState<string>("");
  const [departureStopName, setDepartureStopName] = useState<string>("");
  const [destinationStopName, seSetDestinationStopName] = useState<string>("");
  const [departureStop, setDepartureStop] = useState<Feature | null>(null);
  const [arrivalStop, setArrivalStop] = useState<Feature | null>(null);
  const [currentStop, setCurrentStop] = useState<
    null | "departure" | "arrival"
  >(null);
  const prevDrawMode = usePrevious(mapDrawMode);

  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [createOrUpdateExtrajourney, { loading }] =
    useMutation(CREATE_EXTRA_JOURNEY);

  const handleSave = () => {
    // TODO: implement save logic or call onSave prop
    const departureOuterRing = (departureStop?.geometry as Polygon)
      .coordinates[0];
    const departurePoslist = departureOuterRing
      .map((coord) => coord.join(" "))
      .join(" ");

    const destinationOuterRing = (arrivalStop?.geometry as Polygon)
      .coordinates[0];
    const destinationPoslist = destinationOuterRing
      .map((coord) => coord.join(" "))
      .join(" \n");

    createOrUpdateExtrajourney({
      variables: {
        codespace: allowedCodespaces[0].id, // TODO: Remove hard coding
        authority: selectedAutority,
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
            operatorRef: selectedOperator, // TODO: Pick operator
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
                  departureStopAssignment: {
                    expectedFlexibleArea: {
                      polygon: {
                        exterior: {
                          posList: departurePoslist,
                        },
                      },
                    },
                  },
                },
                {
                  order: 2,
                  stopPointName: destinationStopName,
                  destinationDisplay: destinationDisplay,
                  aimedArrivalTime: arrivalDate,
                  expectedArrivalTime: arrivalDate,
                  arrivalBoardingActivity: "alighting",
                  departureStopAssignment: {
                    expectedFlexibleArea: {
                      polygon: {
                        exterior: {
                          posList: destinationPoslist,
                        },
                      },
                    },
                  },
                },
              ],
            },
          },
        },
      },
    }).then();
  };

  const handleCancel = () => {
    // TODO: implement cancel logic or call onCancel prop
    setLineName("");
    setDestinationDisplay("");
    setDepartureStopName("");
    seSetDestinationStopName("");
    removeDepartureStop();
    removeArrivalStop();
  };

  const handleDetailsClose = () => {
    setDialogOpen(false);
  };

  const removeDepartureStop = () => {
    if (departureStop) {
      onRemoveFlexibleStop(departureStop?.id as string);
    }
    setDepartureStop(null);
  };
  const removeArrivalStop = () => {
    if (arrivalStop) {
      onRemoveFlexibleStop(arrivalStop?.id as string);
    }
    setArrivalStop(null);
  };

  const startAddDepartureStop = () => {
    setCurrentStop("departure");
    onAddFlexibleStop();
  };

  const startAddArrivalStop = () => {
    setCurrentStop("arrival");
    onAddFlexibleStop();
  };

  const handleFlexibleStopDrawingState = useCallback(() => {
    if (prevDrawMode == "drawing" && mapDrawMode != "drawing") {
      const stopCreatedCallback = onStopCreatedCallback();

      console.log("Result", stopCreatedCallback);
      if (currentStop == "departure") {
        console.log("set departure");
        setDepartureStop(stopCreatedCallback);
      } else if (currentStop == "arrival") {
        console.log("set arrival");
        setArrivalStop(stopCreatedCallback);
      }
      setCurrentStop(null);
      console.log("mode changed, ", prevDrawMode, mapDrawMode);
    }
  }, [currentStop, mapDrawMode, onStopCreatedCallback, prevDrawMode]);

  useEffect(() => {
    handleFlexibleStopDrawingState();

    if (authorities.length && !selectedAutority) {
      setSelectedAutority(authorities[0].id);
    }
  }, [handleFlexibleStopDrawingState, authorities, selectedAutority]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, p: 2 }}>
      <Typography variant="h5" component="h1">
        Trip data
      </Typography>
      <InputLabel id="authority-select-label">Authority</InputLabel>
      <Select
        labelId="authority-select-label"
        value={selectedAutority}
        label="Authority"
        onChange={(e) => setSelectedAutority(e.target.value)}
      >
        {authorities.map((organisation) => (
          <MenuItem key={organisation.id} value={organisation.id}>
            {organisation.name}
          </MenuItem>
        ))}
      </Select>
      <InputLabel id="operator-select-label">Operator</InputLabel>
      <Select
        labelId="operator-select-label"
        value={selectedOperator}
        label="Operator"
        onChange={(e) => setSelectedOperator(e.target.value)}
      >
        {operators.map((operator) => (
          <MenuItem key={operator.id} value={operator.id}>
            {operator.name}
          </MenuItem>
        ))}
      </Select>
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
        <Button
          variant="contained"
          disabled={departureStop != null || mapDrawMode != "viewing"}
          onClick={startAddDepartureStop}
        >
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
        <Button
          variant="contained"
          disabled={arrivalStop != null || mapDrawMode != "viewing"}
          onClick={startAddArrivalStop}
        >
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
