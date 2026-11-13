// OpenTripPlanner replaces {from} and {to} with the passenger's pickup and drop-off as `lat,lng`.
const createBookingUrl = (codespace: string, code: string) =>
  `${window.location.origin}/book-trip/${codespace}/${code}?from_coordinate={from}&to_coordinate={to}`;

export default createBookingUrl;
