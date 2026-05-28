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

// Shortest Hamiltonian path from `origin` to `destination` through every
// point in `middle`. Brute-forces permutations — fine because real carpooling
// trips have a handful of stops, not dozens. The returned array is
// [origin, ...reordered middle, destination].
export const shortestPathThrough = (
  origin: LngLat,
  destination: LngLat,
  middle: LngLat[]
): LngLat[] => {
  if (middle.length === 0) return [origin, destination];

  let bestCost = Infinity;
  let bestOrder = middle.slice();

  const order = middle.slice();
  const pathCost = () => {
    let cost = haversineKm(origin, order[0]);
    for (let i = 0; i < order.length - 1; i++) cost += haversineKm(order[i], order[i + 1]);
    cost += haversineKm(order[order.length - 1], destination);
    return cost;
  };

  const permute = (k: number) => {
    if (k === order.length) {
      const cost = pathCost();
      if (cost < bestCost) {
        bestCost = cost;
        bestOrder = order.slice();
      }
      return;
    }
    for (let i = k; i < order.length; i++) {
      [order[k], order[i]] = [order[i], order[k]];
      permute(k + 1);
      [order[k], order[i]] = [order[i], order[k]];
    }
  };
  permute(0);

  return [origin, ...bestOrder, destination];
};
