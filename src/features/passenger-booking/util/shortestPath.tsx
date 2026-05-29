// Geometry helpers for ordering pickup/dropoff and the driver's intermediate
// stops on the booking map. Pure functions — no React, no map runtime — so
// they're cheap to unit-test in isolation.

export type LngLat = [number, number];

// Great-circle distance in km between two [lng, lat] points. We only need
// a metric for comparing path lengths, so any monotonic distance would work —
// Haversine just keeps the math honest across latitudes.
export const haversineKm = (a: LngLat, b: LngLat): number => {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(s));
};

// Inserts two stops (a pickup and its dropoff) into a FIXED sequence of middle
// stops. The existing middle stops keep their relative order; only the two new
// stops are positioned — at the slots that minimise the total path length,
// subject to the pickup being at or before the dropoff. Origin and destination
// stay pinned to the ends. Returns the resulting middle items (existing + the
// two inserted) in order; origin/destination are not included.
export const insertStopsByShortestPath = <T,>(
  origin: LngLat,
  destination: LngLat,
  fixedMiddle: { item: T; coord: LngLat }[],
  pickup: { item: T; coord: LngLat },
  dropoff: { item: T; coord: LngLat }
): T[] => {
  const slots = fixedMiddle.length; // slot s means "immediately before fixedMiddle[s]"; slot === slots is "at the end"

  const pathCost = (mids: { coord: LngLat }[]): number => {
    let cost = haversineKm(origin, mids[0].coord);
    for (let i = 0; i < mids.length - 1; i++) cost += haversineKm(mids[i].coord, mids[i + 1].coord);
    cost += haversineKm(mids[mids.length - 1].coord, destination);
    return cost;
  };

  let best: { item: T; coord: LngLat }[] | null = null;
  let bestCost = Infinity;

  for (let pickupSlot = 0; pickupSlot <= slots; pickupSlot++) {
    for (let dropoffSlot = pickupSlot; dropoffSlot <= slots; dropoffSlot++) {
      const candidate: { item: T; coord: LngLat }[] = [];
      for (let s = 0; s <= slots; s++) {
        if (s === pickupSlot) candidate.push(pickup);
        if (s === dropoffSlot) candidate.push(dropoff);
        if (s < slots) candidate.push(fixedMiddle[s]);
      }
      const cost = pathCost(candidate);
      if (cost < bestCost) {
        bestCost = cost;
        best = candidate;
      }
    }
  }

  return (best ?? [pickup, dropoff]).map(entry => entry.item);
};
