import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  GeolocateControl,
  Map,
  type MapRef,
  NavigationControl,
  Marker,
  Source,
  Layer,
} from 'react-map-gl/maplibre';
import { Box } from '@mui/material';
import { LocationOn, FmdGood, DirectionsWalk } from '@mui/icons-material';
import { mapStyle } from '../../../shared/util/mapStyle.ts';
import type { Extrajourney } from '../../../shared/model/Extrajourney';
import type { Feature, LineString, Point } from 'geojson';
import loadFeatureFromFlexArea from '../../plan-trip/util/loadFeatureFromFlexArea.tsx';
import { shortestPathThrough } from '../util/shortestPath.tsx';

interface PassengerBookingMapProps {
  trip: Extrajourney | null;
  onPickupLocationSelect?: (coordinates: [number, number], address?: string) => void;
  onDropoffLocationSelect?: (coordinates: [number, number], address?: string) => void;
  pickupLocation?: [number, number];
  dropoffLocation?: [number, number];
}

export default function PassengerBookingMap({
  trip,
  onPickupLocationSelect,
  onDropoffLocationSelect,
  pickupLocation,
  dropoffLocation,
}: PassengerBookingMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [selectionMode, setSelectionMode] = useState<'pickup' | 'dropoff' | null>(null);

  // Extract trip route data
  const tripData = useMemo(
    () => trip?.estimatedVehicleJourney.estimatedCalls?.estimatedCall || [],
    [trip]
  );

  // Extract flexible areas for pickup and dropoff zones
  const getFlexibleAreas = useCallback((): Feature<Point>[] => {
    if (!trip) return [];

    const areas: Feature<Point>[] = [];
    tripData.forEach((call, index) => {
      const flexArea = call.departureStopAssignment?.expectedFlexibleArea;
      const feature = loadFeatureFromFlexArea(flexArea);
      if (feature) {
        feature.properties = {
          ...feature.properties,
          stopName: call.stopPointName,
          type: index === 0 ? 'pickup' : index === tripData.length - 1 ? 'dropoff' : 'stop',
          order: call.order,
        };
        areas.push(feature);
      }
    });
    return areas;
  }, [trip, tripData]);

  // Route line drawn on the map. Origin and destination stay pinned to the
  // first and last stops; the trip's intermediate stops plus any selected
  // pickup/dropoff are reordered to form the shortest path between them.
  // Without a pickup or dropoff we keep the driver's stop order untouched.
  const createRouteLineString = useCallback((): Feature<LineString> | null => {
    if (!trip || tripData.length < 2) return null;

    const flexAreas = getFlexibleAreas();
    if (flexAreas.length < 2) return null;

    const originCoord = flexAreas[0].geometry.coordinates as [number, number];
    const destinationCoord = flexAreas[flexAreas.length - 1].geometry.coordinates as [
      number,
      number,
    ];

    const coordinates: [number, number][] =
      pickupLocation || dropoffLocation
        ? shortestPathThrough(originCoord, destinationCoord, [
            ...flexAreas.slice(1, -1).map(area => area.geometry.coordinates as [number, number]),
            ...(pickupLocation ? [pickupLocation] : []),
            ...(dropoffLocation ? [dropoffLocation] : []),
          ])
        : flexAreas.map(area => area.geometry.coordinates as [number, number]);

    return {
      type: 'Feature',
      properties: { type: 'route' },
      geometry: {
        type: 'LineString',
        coordinates,
      },
    };
  }, [trip, tripData, getFlexibleAreas, pickupLocation, dropoffLocation]);

  // Handle map clicks for location selection
  const handleMapClick = useCallback(
    (event: { lngLat: { lng: number; lat: number } }) => {
      if (!selectionMode) return;

      const { lng, lat } = event.lngLat;
      const coordinates: [number, number] = [lng, lat];

      if (selectionMode === 'pickup' && onPickupLocationSelect) {
        onPickupLocationSelect(coordinates);
      } else if (selectionMode === 'dropoff' && onDropoffLocationSelect) {
        onDropoffLocationSelect(coordinates);
      }

      setSelectionMode(null); // Reset selection mode
    },
    [selectionMode, onPickupLocationSelect, onDropoffLocationSelect]
  );

  // Fit map to show the trip route plus any selected pickup/dropoff. Without
  // this the view stays anchored on the driver's origin/destination and a
  // pickup or dropoff outside the trip's bounding box ends up off-screen.
  useEffect(() => {
    if (!isMapReady || !mapRef.current || !trip) return;

    const flexAreas = getFlexibleAreas();
    if (flexAreas.length === 0) return;

    const points: [number, number][] = flexAreas.map(
      area => area.geometry.coordinates as [number, number]
    );
    if (pickupLocation) points.push(pickupLocation);
    if (dropoffLocation) points.push(dropoffLocation);

    let minLng = Infinity,
      maxLng = -Infinity;
    let minLat = Infinity,
      maxLat = -Infinity;
    points.forEach(([lng, lat]) => {
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
    });

    const padding = 0.01;
    mapRef.current.fitBounds(
      [
        [minLng - padding, minLat - padding],
        [maxLng + padding, maxLat + padding],
      ],
      { padding: 40, duration: 1000 }
    );
  }, [isMapReady, trip, getFlexibleAreas, pickupLocation, dropoffLocation]);

  const flexibleAreas = getFlexibleAreas();
  const routeLine = createRouteLineString();

  return (
    <Box sx={{ height: '400px', width: '100%', position: 'relative' }}>
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: 10.7522,
          latitude: 59.9139,
          zoom: 10,
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle={mapStyle}
        onLoad={() => setIsMapReady(true)}
        onClick={handleMapClick}
        cursor={selectionMode ? 'crosshair' : 'default'}
        interactiveLayerIds={['flexible-areas']}
      >
        <NavigationControl position="top-right" />
        <GeolocateControl position="top-right" />

        {/* Route Line */}
        {routeLine && (
          <Source type="geojson" data={routeLine}>
            <Layer
              id="route-line"
              type="line"
              paint={{
                'line-color': '#FF9800',
                'line-width': 4,
                'line-dasharray': [2, 2],
              }}
            />
          </Source>
        )}

        {/* Stop Markers */}
        {flexibleAreas.map((area, index) => {
          const [centerLng, centerLat] = area.geometry.coordinates;

          const color =
            area.properties?.type === 'pickup'
              ? '#4CAF50'
              : area.properties?.type === 'dropoff'
                ? '#f44336'
                : '#2196F3';

          return (
            <Marker key={`marker-${index}`} longitude={centerLng} latitude={centerLat}>
              <Box
                sx={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  backgroundColor: color,
                  border: '3px solid white',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '12px',
                }}
              >
                {index + 1}
              </Box>
            </Marker>
          );
        })}

        {/* Pickup Location Marker */}
        {pickupLocation && (
          <Marker longitude={pickupLocation[0]} latitude={pickupLocation[1]}>
            <LocationOn
              sx={{
                color: '#4CAF50',
                fontSize: 32,
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
              }}
            />
          </Marker>
        )}

        {/* Dropoff Location Marker */}
        {dropoffLocation && (
          <Marker longitude={dropoffLocation[0]} latitude={dropoffLocation[1]}>
            <FmdGood
              sx={{
                color: '#f44336',
                fontSize: 32,
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
              }}
            />
          </Marker>
        )}

        {/* Selection Mode Indicator */}
        {selectionMode && (
          <Box
            sx={{
              position: 'absolute',
              top: 16,
              left: 16,
              backgroundColor: 'rgba(0,0,0,0.8)',
              color: 'white',
              padding: 1,
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              zIndex: 1,
            }}
          >
            <DirectionsWalk />
            Click on the map to select your {selectionMode} location
          </Box>
        )}
      </Map>

      {/* Map Controls */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          zIndex: 1,
        }}
      >
        <Box
          component="button"
          onClick={() => setSelectionMode(selectionMode === 'pickup' ? null : 'pickup')}
          sx={{
            backgroundColor: selectionMode === 'pickup' ? '#4CAF50' : 'white',
            color: selectionMode === 'pickup' ? 'white' : '#4CAF50',
            border: '2px solid #4CAF50',
            borderRadius: 1,
            padding: '8px 16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            fontSize: '14px',
            fontWeight: 'bold',
            '&:hover': {
              backgroundColor: selectionMode === 'pickup' ? '#45a049' : '#f5f5f5',
            },
          }}
        >
          <LocationOn fontSize="small" />
          {selectionMode === 'pickup' ? 'Cancel' : 'Select Pickup'}
        </Box>

        <Box
          component="button"
          onClick={() => setSelectionMode(selectionMode === 'dropoff' ? null : 'dropoff')}
          sx={{
            backgroundColor: selectionMode === 'dropoff' ? '#f44336' : 'white',
            color: selectionMode === 'dropoff' ? 'white' : '#f44336',
            border: '2px solid #f44336',
            borderRadius: 1,
            padding: '8px 16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            fontSize: '14px',
            fontWeight: 'bold',
            '&:hover': {
              backgroundColor: selectionMode === 'dropoff' ? '#d32f2f' : '#f5f5f5',
            },
          }}
        >
          <FmdGood fontSize="small" />
          {selectionMode === 'dropoff' ? 'Cancel' : 'Select Dropoff'}
        </Box>
      </Box>
    </Box>
  );
}
