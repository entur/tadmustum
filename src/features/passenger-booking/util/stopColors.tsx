// Stop marker colours, shared by the booking route list and the booking map so
// the same stop looks the same in both. They mirror the trip editor's markers.
export const STOP_COLORS = {
  origin: '#4CAF50',
  destination: '#f44336',
  intermediate: '#2196F3',
  // Cancelled stops are greyed out wherever they appear, so a passenger can see
  // at a glance which of the driver's stops are no longer served.
  cancelled: '#9e9e9e',
} as const;
