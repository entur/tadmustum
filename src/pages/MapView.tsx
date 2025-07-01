import { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import type { MapRef as ReactMapRef } from 'react-map-gl/maplibre';
import type { Map as MaplibreMap, MapLibreEvent } from 'maplibre-gl';

import { useStopsGeoJSON } from '../hooks/useStopsGeoJSON';
import { useStopsSource } from '../hooks/useStopsSource';
import { useResizableSidebar } from '../hooks/useResizableSidebar';
import { useSearch } from '../components/search';
import type { SearchResultItem } from '../components/search/searchTypes';

import { createMapStyle } from '../map/mapStyle';
import { Sidebar } from '../components/sidebar/Sidebar.tsx';
import { ToggleButton } from '../components/sidebar/ToggleButton.tsx';
import { MapContainer } from '../components/map/MapContainer.tsx';
import { MapControls } from '../components/map/MapControls.tsx';
import { LayerControl } from '../components/map/LayerControl';
import { RegisterIcons } from '../map/RegisterIcons';

export default function MapView() {
  const theme = useTheme();
  const mapStyle = useMemo(() => createMapStyle(theme), [theme]);
  const { geojson: stopsGeoJSON, loading: geoJsonLoading, error: geoJsonError } = useStopsGeoJSON();
  const reactMapRef = useRef<ReactMapRef | null>(null);
  const rawMapRef = useRef<MaplibreMap | null>(null);
  const { width, collapsed, setIsResizing, toggle } = useResizableSidebar(300, true);
  const [mapLoadedByComponent, setMapLoadedByComponent] = useState(false);

  useStopsSource(rawMapRef, stopsGeoJSON, geoJsonLoading, geoJsonError);

  const handleMapLoad = (evt: MapLibreEvent) => {
    rawMapRef.current = evt.target as MaplibreMap;
    setMapLoadedByComponent(true);
  };

  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  const {
    setActiveSearchContext,
    registerSearchFunction,
    searchResults,
    activeSearchContext,
    selectedItem,
    setSelectedItem,
  } = useSearch();

  const searchMapFeatures = useCallback(
    async (query: string, filters: string[]): Promise<SearchResultItem[]> => {
      if (geoJsonLoading || !stopsGeoJSON?.features) return [];
      const lowerQuery = query.toLowerCase();

      const results = stopsGeoJSON.features
        .filter(feature => {
          const nameMatch = feature.properties.name?.toLowerCase().includes(lowerQuery);
          const typeMatch = filters.length === 0 || filters.includes(feature.properties.icon);
          return !!nameMatch && typeMatch;
        })
        .map(feature => ({
          id: feature.properties.id,
          name: feature.properties.name,
          type: 'map' as const,
          coordinates: feature.geometry.coordinates as [number, number],
          originalData: feature.properties,
        }));
      return results;
    },
    [geoJsonLoading, stopsGeoJSON]
  );

  useEffect(() => {
    setActiveSearchContext('map');
    registerSearchFunction('map', searchMapFeatures);
    return () => {
      registerSearchFunction('map', null);
    };
  }, [setActiveSearchContext, registerSearchFunction, searchMapFeatures]);

  useEffect(() => {
    if (activeSearchContext === 'map' && searchResults.length > 0 && reactMapRef.current) {
      const firstMapResult = searchResults.find(
        result => result.type === 'map' && result.coordinates
      );

      if (firstMapResult?.coordinates) {
        reactMapRef.current.flyTo({ center: firstMapResult.coordinates, zoom: 18, duration: 2000 });
      }
    }
  }, [searchResults, activeSearchContext]);

  useEffect(() => {
    if (selectedItem?.coordinates && reactMapRef.current) {
      reactMapRef.current.flyTo({
        center: selectedItem.coordinates,
        zoom: 18,
        duration: 2000,
      });
      setSelectedItem(null);
    }
  }, [selectedItem, setSelectedItem]);

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100vw',
        height: 'calc(100vh - 64px)',
      }}
    >
      <Sidebar
        width={width}
        collapsed={collapsed}
        onMouseDownResize={() => setIsResizing(true)}
        theme={theme}
        toggleCollapse={toggle}
      />
      <ToggleButton collapsed={collapsed} sidebarWidth={width} onClick={toggle} />
      <Box
        className="map-box"
        sx={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: collapsed ? 0 : width + 4,
          right: 0,
          zIndex: 1,
        }}
      >
        <MapContainer mapStyle={mapStyle} onLoad={handleMapLoad} mapRef={reactMapRef}>
          {mapLoadedByComponent && <RegisterIcons />}
          {mapLoadedByComponent && <MapControls />}
          {mapLoadedByComponent && <LayerControl />}
        </MapContainer>
      </Box>
    </Box>
  );
}
