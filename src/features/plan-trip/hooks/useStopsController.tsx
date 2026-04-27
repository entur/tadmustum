import type { Feature } from 'geojson';
import { useCallback, useEffect, useState } from 'react';

export interface UseStopsControllerOptions {
  onAddFlexibleStop: () => void;
  onRemoveFlexibleStop: (id: string) => void;
  onDepartureStopChange: (id: string | null) => void;
  onArrivalStopChange: (id: string | null) => void;
}

export interface StopsController {
  departureStop: Feature | null;
  arrivalStop: Feature | null;
  drawingStopsAllowed: boolean;
  startAddDepartureStop: () => void;
  startAddArrivalStop: () => void;
  removeDepartureStop: () => void;
  removeArrivalStop: () => void;
  resetStops: () => void;
  initializeStops: (departure: Feature, arrival: Feature) => void;
  onStopCreated: (feature: Feature) => void;
  onDrawingStateChange: (isDrawing: boolean) => void;
}

export function useStopsController({
  onAddFlexibleStop,
  onRemoveFlexibleStop,
  onDepartureStopChange,
  onArrivalStopChange,
}: UseStopsControllerOptions): StopsController {
  const [departureStop, setDepartureStop] = useState<Feature | null>(null);
  const [arrivalStop, setArrivalStop] = useState<Feature | null>(null);
  const [currentStop, setCurrentStop] = useState<null | 'departure' | 'arrival'>(null);
  const [drawingStopsAllowed, setDrawingStopsAllowed] = useState<boolean>(true);

  useEffect(() => {
    onDepartureStopChange((departureStop?.id as string) ?? null);
  }, [departureStop, onDepartureStopChange]);

  useEffect(() => {
    onArrivalStopChange((arrivalStop?.id as string) ?? null);
  }, [arrivalStop, onArrivalStopChange]);

  const removeDepartureStop = useCallback(() => {
    if (departureStop) {
      onRemoveFlexibleStop(departureStop.id as string);
    }
    setDepartureStop(null);
  }, [departureStop, onRemoveFlexibleStop]);

  const removeArrivalStop = useCallback(() => {
    if (arrivalStop) {
      onRemoveFlexibleStop(arrivalStop.id as string);
    }
    setArrivalStop(null);
  }, [arrivalStop, onRemoveFlexibleStop]);

  const resetStops = useCallback(() => {
    removeDepartureStop();
    removeArrivalStop();
  }, [removeDepartureStop, removeArrivalStop]);

  const startAddDepartureStop = useCallback(() => {
    setCurrentStop('departure');
    onAddFlexibleStop();
  }, [onAddFlexibleStop]);

  const startAddArrivalStop = useCallback(() => {
    setCurrentStop('arrival');
    onAddFlexibleStop();
  }, [onAddFlexibleStop]);

  const initializeStops = useCallback((departure: Feature, arrival: Feature) => {
    setDepartureStop(departure);
    setArrivalStop(arrival);
  }, []);

  const onStopCreated = useCallback(
    (feature: Feature) => {
      if (currentStop === 'departure') {
        setDepartureStop(feature);
      } else if (currentStop === 'arrival') {
        setArrivalStop(feature);
      } else if (!departureStop) {
        // No active draw target (click-to-add path): fill the next empty slot.
        setDepartureStop(feature);
      } else if (!arrivalStop) {
        setArrivalStop(feature);
      }
      setCurrentStop(null);
    },
    [currentStop, departureStop, arrivalStop]
  );

  const onDrawingStateChange = useCallback((isDrawing: boolean) => {
    setDrawingStopsAllowed(!isDrawing);
    // Defensive: if drawing ends without producing a stop (e.g. a future
    // cancel path), clear currentStop so a stale value can't promote a later
    // unrelated create.
    if (!isDrawing) {
      setCurrentStop(null);
    }
  }, []);

  return {
    departureStop,
    arrivalStop,
    drawingStopsAllowed,
    startAddDepartureStop,
    startAddArrivalStop,
    removeDepartureStop,
    removeArrivalStop,
    resetStops,
    initializeStops,
    onStopCreated,
    onDrawingStateChange,
  };
}
