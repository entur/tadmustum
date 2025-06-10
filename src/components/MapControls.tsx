import { NavigationControl, GeolocateControl } from 'react-map-gl/maplibre';

export function MapControls() {
  return (
    <>
      <NavigationControl position="top-right" />
      <GeolocateControl position="top-right" />
    </>
  );
}
