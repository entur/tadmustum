import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import { Box } from "@mui/material";
import type { Feature } from "geojson";
import CarPoolingTripDataForm from "./CarPoolingTripDataForm.tsx";
import { useMutateExtrajourney } from "../hooks/useMutateExtrajourney.tsx";
import type { CarPoolingTripDataFormData } from "../model/CarPoolingTripDataFormData.tsx";
import type { MapModes } from "../../../shared/components/EditableMap.tsx";
import type { AppError } from "../../../shared/error-message/AppError.tsx";
import { useQueryExtraJourney } from "../hooks/useQueryOneExtraJourney.tsx";
import type { Extrajourney } from "../../../shared/model/Extrajourney.tsx";
import dayjs from "dayjs";
import loadFeatureUtil from "../util/loadFeatureUtil.tsx";

export interface CarPoolingTripDataProps {
  tripId?: string;
  onAddFlexibleStop: () => void;
  onRemoveFlexibleStop: (id: string) => void;
  onStopCreatedCallback: () => Feature | null | undefined;
  loadedFlexibleStop: (stops: Feature[]) => void;
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
  const {
    onAddFlexibleStop,
    onRemoveFlexibleStop,
    onStopCreatedCallback,
    tripId,
    loadedFlexibleStop,
  } = stops;
  const [departureStop, setDepartureStop] = useState<Feature | null>(null);
  const [arrivalStop, setArrivalStop] = useState<Feature | null>(null);
  const [currentStop, setCurrentStop] = useState<
    null | "departure" | "arrival"
  >(null);
  const [error, setError] = useState<AppError | undefined>(undefined);
  const [currentTripId, setCurrentTripId] = useState<string | undefined>(
    undefined,
  );
  const [initialState, setInitialState] = useState<
    CarPoolingTripDataFormData | undefined
  >(undefined);

  const mutateExtrajourney = useMutateExtrajourney();
  const handleSubmitCallback = async (formData: CarPoolingTripDataFormData) => {
    formData.id = currentTripId;
    const result = await mutateExtrajourney(formData);
    if (result.error) {
      setError(result.error);
    } else {
      setCurrentTripId(result.data);
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
  const queryOneExtraJourney = useQueryExtraJourney();
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

  useEffect(() => {
    const mapToFormdData = (
      journey: Extrajourney,
    ): CarPoolingTripDataFormData => {
      return {
        codespace: "ENT",
        authority: "ENT:Authority:ENT",
        operator: journey.estimatedVehicleJourney.operatorRef,
        id: journey.id,
        lineName: journey.estimatedVehicleJourney.publishedLineName,
        destinationDisplay:
          journey.estimatedVehicleJourney.estimatedCalls.estimatedCall[0]
            .destinationDisplay,
        departureStopName:
          journey.estimatedVehicleJourney.estimatedCalls.estimatedCall[0]
            .stopPointName,
        departureDatetime: dayjs(
          journey.estimatedVehicleJourney.estimatedCalls.estimatedCall[0]
            .aimedDepartureTime,
        ),
        departureFlexibleStop:
          journey.estimatedVehicleJourney.estimatedCalls.estimatedCall[0]
            .departureStopAssignment.expectedFlexibleArea.polygon.exterior
            .posList,
        destinationStopName:
          journey.estimatedVehicleJourney.estimatedCalls.estimatedCall[1]
            .stopPointName,
        destinationDatetime: dayjs(
          journey.estimatedVehicleJourney.estimatedCalls.estimatedCall[1]
            .aimedArrivalTime,
        ),
        destinationFlexibleStop:
          journey.estimatedVehicleJourney.estimatedCalls.estimatedCall[1]
            .departureStopAssignment.expectedFlexibleArea.polygon.exterior
            .posList,
      };
    };
    const loadInitialState = (id?: string) => {
      if (!id) return;
      queryOneExtraJourney("ENT", "ENT:Authority:ENT", id)
        .then((result) => {
          if (result.data?.extraJourney) {
            const state = mapToFormdData(
              result.data.extraJourney as Extrajourney,
            );
            setInitialState(state);
            const departure = loadFeatureUtil({
              posList: state.departureFlexibleStop,
            });
            setDepartureStop(departure);
            const destination = loadFeatureUtil({
              posList: state.destinationFlexibleStop,
            });
            setArrivalStop(destination);

            loadedFlexibleStop([departure, destination]);
          }
        })
        .catch((error) => {
          setError(error);
        });
    };
    loadInitialState(tripId);
  }, [queryOneExtraJourney, tripId]);

  useImperativeHandle(ref, () => ({
    handleEditableMapModeChange,
  }));

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, p: 2 }}>
      <CarPoolingTripDataForm
        initialState={initialState}
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
