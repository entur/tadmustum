import { forwardRef, useCallback, useImperativeHandle, useState } from "react";
import { Box } from "@mui/material";
import type { Feature } from "geojson";
import CarPoolingTripDataForm from "./CarPoolingTripDataForm.tsx";
import { useCreateOrUpdateExtrajourney } from "../hooks/useCreateOrUpdateExtrajourney.tsx";
import type { CarPoolingTripDataFormData } from "../model/CarPoolingTripDataFormData.tsx";
import type { MapModes } from "../../../shared/components/EditableMap.tsx";
import type { AppError } from "../../../shared/error-message/AppError.tsx";

export interface CarPoolingTripDataProps {
  onAddFlexibleStop: () => void;
  onRemoveFlexibleStop: (id: string) => void;
  onStopCreatedCallback: () => Feature | null | undefined;
}

export type CarPoolingTripDataHandle = {
  handleEditableMapModeChange: (args: {
    prevMode: MapModes;
    mode: MapModes;
  }) => void;
};

const CarPoolingTripData = forwardRef<
  CarPoolingTripDataHandle,
  CarPoolingTripDataProps
>((stops, ref) => {
  const [drawingStopsAllowed, setDrawingStopsAllowed] = useState<boolean>(true);
  const { onAddFlexibleStop, onRemoveFlexibleStop, onStopCreatedCallback } =
    stops;
  const [departureStop, setDepartureStop] = useState<Feature | null>(null);
  const [arrivalStop, setArrivalStop] = useState<Feature | null>(null);
  const [currentStop, setCurrentStop] = useState<
    null | "departure" | "arrival"
  >(null);
  const [error, setError] = useState<AppError | undefined>(undefined);

  const createOrUpdateExtrajourney = useCreateOrUpdateExtrajourney();
  const handleSubmitCallback = async (formData: CarPoolingTripDataFormData) => {
    const result = await createOrUpdateExtrajourney(formData);
    if (result.error) {
      setError(result.error);
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

  const handleEditableMapModeChange = useCallback(
    (args: { prevMode: MapModes; mode: MapModes }) => {
      if (args.prevMode == "drawing" && args.mode != "drawing") {
        const stopCreatedCallback = onStopCreatedCallback();

        if (currentStop == "departure") {
          setDepartureStop(stopCreatedCallback ? stopCreatedCallback : null);
        } else if (currentStop == "arrival") {
          setArrivalStop(stopCreatedCallback ? stopCreatedCallback : null);
        }
        setCurrentStop(null);
      }

      setDrawingStopsAllowed(args.mode === "viewing");
    },
    [currentStop, onStopCreatedCallback],
  );

  useImperativeHandle(ref, () => ({
    handleEditableMapModeChange,
  }));

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, p: 2 }}>
      <CarPoolingTripDataForm
        onAddDeparturestopClick={startAddDepartureStop}
        onRemoveDepartureStopClick={removeDepartureStop}
        onAddDestinationtopClick={startAddArrivalStop}
        onRemoveDestinationStopClick={removeArrivalStop}
        onResetCallback={handleResetCallback}
        onSubmitCallback={handleSubmitCallback}
        drawingStopsAllowed={drawingStopsAllowed}
        mapDepartureFlexibleStop={departureStop}
        mapDestinationFlexibleStop={arrivalStop}
        appError={error}
      />
    </Box>
  );
});

export default CarPoolingTripData;
