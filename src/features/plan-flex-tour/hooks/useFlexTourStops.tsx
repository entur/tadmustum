import type { Feature, Point, Position } from 'geojson';
import { useCallback, useState } from 'react';

/**
 * Which slot a pending map draw belongs to: the vehicle anchor, or the booked stop at the
 * given index.
 */
type PendingTarget = { kind: 'anchor' } | { kind: 'booked'; index: number };

export interface UseFlexTourStopsOptions {
  onAddFlexibleStop: () => void;
  onRemoveFlexibleStop: (id: string) => void;
}

export interface FlexTourStopsController {
  drawingStopsAllowed: boolean;
  /** Starts a draw whose result lands on the vehicle anchor. */
  startAddAnchor: () => void;
  /** Starts a draw whose result lands on the booked stop at `index`. */
  startAddBookedStop: (index: number) => void;
  removeStop: (featureId: string | null) => void;
  onStopCreated: (feature: Feature) => void;
  onDrawingStateChange: (isDrawing: boolean) => void;
  /** Registers the callback that receives a completed draw for a slot. */
  setOnStopPlaced: (handler: StopPlacedHandler) => void;
}

export type StopPlacedHandler = (
  target: PendingTarget,
  featureId: string,
  position: Position
) => void;

/**
 * Routes map-drawn stops into the flex tour form.
 *
 * The map only knows how to draw a feature; it has no idea which row asked for it. Each "place
 * on map" button records its slot before starting the draw, and the resulting feature is handed
 * to the form for that slot only. A draw that arrives without a pending slot (a stray draw
 * event) is dropped rather than guessed into a row.
 */
export function useFlexTourStops({
  onAddFlexibleStop,
  onRemoveFlexibleStop,
}: UseFlexTourStopsOptions): FlexTourStopsController {
  const [pending, setPending] = useState<PendingTarget | null>(null);
  const [drawingStopsAllowed, setDrawingStopsAllowed] = useState<boolean>(true);
  const [onStopPlaced, setOnStopPlaced] = useState<StopPlacedHandler>(() => () => {});

  const startAddAnchor = useCallback(() => {
    setPending({ kind: 'anchor' });
    onAddFlexibleStop();
  }, [onAddFlexibleStop]);

  const startAddBookedStop = useCallback(
    (index: number) => {
      setPending({ kind: 'booked', index });
      onAddFlexibleStop();
    },
    [onAddFlexibleStop]
  );

  const removeStop = useCallback(
    (featureId: string | null) => {
      if (featureId) {
        onRemoveFlexibleStop(featureId);
      }
    },
    [onRemoveFlexibleStop]
  );

  const onStopCreated = useCallback(
    (feature: Feature) => {
      if (pending && feature.geometry?.type === 'Point') {
        const position = (feature.geometry as Point).coordinates;
        onStopPlaced(pending, feature.id as string, position);
      }
      setPending(null);
    },
    [pending, onStopPlaced]
  );

  const onDrawingStateChange = useCallback((isDrawing: boolean) => {
    setDrawingStopsAllowed(!isDrawing);
    // Defensive: if a draw ends without producing a stop, clear the pending slot so a stale
    // value can't capture a later unrelated create.
    if (!isDrawing) {
      setPending(null);
    }
  }, []);

  return {
    drawingStopsAllowed,
    startAddAnchor,
    startAddBookedStop,
    removeStop,
    onStopCreated,
    onDrawingStateChange,
    // Wrapped: React treats a bare function passed to a setter as an updater, so store it
    // behind one.
    setOnStopPlaced: useCallback(
      (handler: StopPlacedHandler) => setOnStopPlaced(() => handler),
      []
    ),
  };
}
