import { Box, Stack, useTheme } from '@mui/material';
import { useMap } from 'react-map-gl/maplibre';
import { useTranslation } from 'react-i18next';
import { useEffect, useState, useMemo } from 'react';
import { useLayerVisibility } from '../../hooks/useLayerVisibility.ts';
import { LayerSwitch } from './LayerSwitch';
import LayersIcon from '@mui/icons-material/Layers';
import MapIcon from '@mui/icons-material/Map';
import { MapControlUnit, RenderMapPanel, type PanelUIDefinition } from './MapControlUnit';

import {
  LAYER_ID_STOPS_CIRCLE,
  LAYER_ID_STOPS_ICON,
  LAYER_ID_STOPS_TEXT,
  LAYER_ID_OSM_RASTER,
} from '../../map/mapStyle';

const mapLayerStyleDefinitions = [
  { id: LAYER_ID_STOPS_CIRCLE, labelKey: 'map.layers.circles' },
  { id: LAYER_ID_STOPS_ICON, labelKey: 'map.layers.icons' },
  { id: LAYER_ID_STOPS_TEXT, labelKey: 'map.layers.text' },
  { id: LAYER_ID_OSM_RASTER, labelKey: 'map.layers.basemap' },
];

export function LayerControl() {
  const { current: mapRef } = useMap();
  const { t } = useTranslation();
  const theme = useTheme();

  const { visibility: layerVisibility, toggle: toggleLayer } = useLayerVisibility(
    mapLayerStyleDefinitions.map(l => l.id)
  );

  const [activePanelControlId, setActivePanelControlId] = useState<string | null>(null);

  const controlPanelDefinitions = useMemo<PanelUIDefinition[]>(() => {
    const layerPanelContent = (
      <Stack spacing={1}>
        {mapLayerStyleDefinitions.map(({ id, labelKey }) => (
          <LayerSwitch
            key={id}
            id={id}
            label={t(labelKey, id)}
            checked={layerVisibility[id] ?? true}
            onChange={toggleLayer}
          />
        ))}
      </Stack>
    );

    return [
      {
        controlId: 'layers-panel-control',
        icon: <LayersIcon />,
        panelTitle: t('map.layers.title', 'Map Layers'),
        panelContent: layerPanelContent,
        ariaLabelOpen: t('map.layers.toggleOpen', 'Open layer controls'),
        ariaLabelCloseButton: t('map.layers.toggleClose', 'Close layer controls'),
        panelMinWidth: 220,
      },
      {
        controlId: 'another-panel-control',
        icon: <MapIcon />,
        panelTitle: 'Another Panel',
        panelContent: <div>Content for another panel. This demonstrates the concept.</div>,
        ariaLabelOpen: 'Open another panel',
        ariaLabelCloseButton: 'Close another panel',
        panelMinWidth: 200,
      },
    ];
  }, [t, layerVisibility, toggleLayer]);

  useEffect(() => {
    if (!mapRef || activePanelControlId !== 'layers-panel-control') return;
    const map = mapRef.getMap();
    const apply = () => {
      mapLayerStyleDefinitions.forEach(({ id }) => {
        const vis = layerVisibility[id] ? 'visible' : 'none';
        if (map.getLayer(id)) {
          if (map.getLayoutProperty(id, 'visibility') !== vis) {
            map.setLayoutProperty(id, 'visibility', vis);
          }
        }
      });
    };
    const handleStyleData = () => {
      if (map.isStyleLoaded()) apply();
    };
    map.on('styledata', handleStyleData);
    if (map.isStyleLoaded()) apply();
    return () => {
      map.off('styledata', handleStyleData);
    };
  }, [mapRef, layerVisibility, activePanelControlId]);

  const handleRequestPanelToggle = (controlId: string) => {
    setActivePanelControlId(prevId => (prevId === controlId ? null : controlId));
  };

  const currentActivePanelDef = controlPanelDefinitions.find(
    def => def.controlId === activePanelControlId
  );

  return (
    <Box
      sx={{
        position: 'absolute',
        top: theme.spacing(1.5),
        right: theme.spacing(1.5),
        zIndex: 10,
        display: 'flex',
        alignItems: 'flex-start',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing(1),
          transition: theme.transitions.create(['transform'], {
            duration: theme.transitions.duration.short,
            easing: theme.transitions.easing.easeInOut,
          }),
          transform: theme.spacing(1),
          zIndex: theme.zIndex.drawer + 1,
        }}
      >
        {controlPanelDefinitions.map(definition => (
          <MapControlUnit
            key={definition.controlId}
            definition={definition}
            isActive={activePanelControlId === definition.controlId}
            onRequestToggle={handleRequestPanelToggle}
          />
        ))}
      </Box>

      {currentActivePanelDef && (
        <Box
          sx={{
            marginLeft: theme.spacing(1),
          }}
        >
          <RenderMapPanel
            definition={currentActivePanelDef}
            isOpen={!!activePanelControlId}
            onCloseRequest={() => setActivePanelControlId(null)}
          />
        </Box>
      )}
    </Box>
  );
}
