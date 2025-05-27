import React, { useCallback, useEffect, useState } from "react";
import { Box } from "@mui/material";
import { Dayjs } from "dayjs";
import type { Feature } from "geojson";
import type { CarPoolingMapMode } from "./CarPoolingMapMode.tsx";
import CarPoolingTripDataForm, {
  type CarPoolingTripDataFormData,
} from "./CarPoolingTripDataForm.tsx";
import usePrevious from "./usePrevious.tsx";
import { useCreateOrUpdateExtrajourney } from "../hooks/useCreateOrUpdateExtrajourney.tsx";

export interface WorkAreaContentProps {
  mapDrawMode: CarPoolingMapMode;
  onAddFlexibleStop: () => void;
  onRemoveFlexibleStop: (id: string) => void;
  onStopCreatedCallback: () => Feature | null;
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

const CarPoolingTripData: React.FC<WorkAreaContentProps> = (stops) => {
  const {
    mapDrawMode,
    onAddFlexibleStop,
    onRemoveFlexibleStop,
    onStopCreatedCallback,
  } = stops;
  const [departureStop, setDepartureStop] = useState<Feature | null>(null);
  const [arrivalStop, setArrivalStop] = useState<Feature | null>(null);
  const [currentStop, setCurrentStop] = useState<
    null | "departure" | "arrival"
  >(null);
  const prevDrawMode = usePrevious<CarPoolingMapMode | undefined>(
    mapDrawMode,
    undefined,
  );

  const createOrUpdateExtrajourney = useCreateOrUpdateExtrajourney();
  // CarPoolingTripData.tsx
  const handleSubmitCallback = async (formData: CarPoolingTripDataFormData) => {
    try {
      console.log("Submitting:", formData);
      createOrUpdateExtrajourney(formData).then(); // Add await
      console.log("Submission successful");
    } catch (error) {
      console.error("Submission failed:", error);
    }
  };

  const handleResetCallback = () => {
    removeDepartureStop();
    removeArrivalStop();
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

      if (currentStop == "departure") {
        setDepartureStop(stopCreatedCallback);
      } else if (currentStop == "arrival") {
        setArrivalStop(stopCreatedCallback);
      }
      setCurrentStop(null);
    }
  }, [currentStop, mapDrawMode, onStopCreatedCallback, prevDrawMode]);

  useEffect(() => {
    handleFlexibleStopDrawingState();
  }, [handleFlexibleStopDrawingState]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, p: 2 }}>
      <CarPoolingTripDataForm
        onAddDeparturestopClick={startAddDepartureStop}
        onRemoveDepartureStopClick={removeDepartureStop}
        onAddDestinationtopClick={startAddArrivalStop}
        onRemoveDestinationStopClick={removeArrivalStop}
        onResetCallback={handleResetCallback}
        onSubmitCallback={handleSubmitCallback}
        drawingStopsAllowed={mapDrawMode == "viewing"}
        mapDepartureFlexibleStop={departureStop}
        mapDestinationFlexibleStop={arrivalStop}
      />
    </Box>
  );
};

export default CarPoolingTripData;
