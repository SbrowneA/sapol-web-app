import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { ApiCameraLocations } from '../types/api';
import type { Feature, FeatureCollection } from 'geojson';
import type { MapOptions } from './MapControls';

const SOURCE_IDS = {
  countryStreets: 'country-streets',
  countrySuburbs: 'country-suburbs',
  metroStreets: 'metro-streets',
  metroSuburbs: 'metro-suburbs',
  countryStreetsHover: 'country-streets-hover',
  countrySuburbsHover: 'country-suburbs-hover',
  metroStreetsHover: 'metro-streets-hover',
  metroSuburbsHover: 'metro-suburbs-hover',
} as const;

const HIGHLIGHT_SOURCE_MAP: Record<string, string> = {
  [SOURCE_IDS.countryStreets]: SOURCE_IDS.countryStreetsHover,
  [SOURCE_IDS.countrySuburbs]: SOURCE_IDS.countrySuburbsHover,
  [SOURCE_IDS.metroStreets]: SOURCE_IDS.metroStreetsHover,
  [SOURCE_IDS.metroSuburbs]: SOURCE_IDS.metroSuburbsHover,
};

const STREET_LAYER_IDS = ['country-streets-line', 'metro-streets-line'] as const;
const SUBURB_LAYER_IDS = ['country-suburbs-fill', 'metro-suburbs-fill'] as const;
const HOVER_LAYER_IDS = [...STREET_LAYER_IDS, ...SUBURB_LAYER_IDS] as const;

const REGION_COLORS = { country: '#2563eb', metro: '#ea580c' } as const;

function formatDateShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateRange(startDate: string, endDate: string): string {
  if (startDate === endDate) return formatDateShort(startDate);
  return `${formatDateShort(startDate)} – ${formatDateShort(endDate)}`;
}

type StreetFeatureProperties = {
  cameraLocationId: number;
  streetName: string;
  suburbName: string;
  startDate: string;
  endDate: string;
  regionType: 'country' | 'metro';
};

function locationsToStreetFeatures(
  locations: ApiCameraLocations['locations']['country'] | ApiCameraLocations['locations']['metro'],
  regionType: 'country' | 'metro'
): Feature[] {
  return locations
    .filter((loc) => loc.streetGeom && (loc.streetGeom.type === 'LineString' || loc.streetGeom.type === 'MultiLineString'))
    .map((loc) => ({
      type: 'Feature' as const,
      id: loc.cameraLocationId,
      geometry: loc.streetGeom,
      properties: {
        cameraLocationId: loc.cameraLocationId,
        streetName: loc.streetName,
        suburbName: loc.suburbName,
        startDate: loc.startDate,
        endDate: loc.endDate,
        regionType,
      },
    }));
}

function locationsToSuburbFeatures(
  locations: ApiCameraLocations['locations']['country'] | ApiCameraLocations['locations']['metro'],
  uniqueSuburbs: boolean
): Feature[] {
  const filtered = locations.filter(
    (loc) => loc.suburbGeom && (loc.suburbGeom.type === 'Polygon' || loc.suburbGeom.type === 'MultiPolygon')
  );
  if (!uniqueSuburbs) {
    return filtered.map((loc) => ({
      type: 'Feature' as const,
      id: loc.cameraLocationId,
      geometry: loc.suburbGeom,
      properties: { cameraLocationId: loc.cameraLocationId, streetName: loc.streetName, suburbName: loc.suburbName },
    }));
  }
  const seen = new Set<number>();
  return filtered
    .filter((loc) => {
      if (seen.has(loc.suburbId)) return false;
      seen.add(loc.suburbId);
      return true;
    })
    .map((loc) => ({
      type: 'Feature' as const,
      id: loc.cameraLocationId,
      geometry: loc.suburbGeom,
      properties: { cameraLocationId: loc.cameraLocationId, streetName: loc.streetName, suburbName: loc.suburbName },
    }));
}

function emptyFeatureCollection(): FeatureCollection {
  return { type: 'FeatureCollection', features: [] };
}

function buildPopupHTML(features: QueriedStreetFeature[]): string {
  const blocks = features.map((f) => {
    const props = f.properties;
    const color = REGION_COLORS[props.regionType];
    const regionLabel = props.regionType === 'metro' ? 'Metro' : 'Country';
    const dateStr = formatDateRange(props.startDate, props.endDate);
    return `
      <div class="map-street-popup-block">
        <div class="map-street-popup-region" style="color: ${color}">${regionLabel}</div>
        <div class="map-street-popup-title">${escapeHtml(props.streetName)}, ${escapeHtml(props.suburbName)}</div>
        <div class="map-street-popup-dates">${escapeHtml(dateStr)}</div>
      </div>
    `;
  });
  return blocks.join('');
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

interface QueriedStreetFeature {
  properties: StreetFeatureProperties;
  id?: number | string;
  source?: string;
}

interface MapProps {
  data: ApiCameraLocations | null;
  loading?: boolean;
  options?: MapOptions;
  resetPositionTrigger?: number;
}

function syncSuburbLayerOptions(map: maplibregl.Map, options: MapOptions) {
  const show = options.showSuburbs;
  const baseOn = show && options.suburbOutlineSuburbs;
  const dashedOn = show && options.suburbOutlineSuburbs;
  const fillOp = show && options.suburbHighlightOnInteraction ? 0.2 : 0;

  for (const id of ['country-suburbs-base-outline', 'metro-suburbs-base-outline'] as const) {
    try {
      map.setLayoutProperty(id, 'visibility', baseOn ? 'visible' : 'none');
    } catch {
      /* layer not ready */
    }
  }
  for (const id of ['country-suburbs-hover-outline', 'metro-suburbs-hover-outline'] as const) {
    try {
      map.setLayoutProperty(id, 'visibility', dashedOn ? 'visible' : 'none');
    } catch {
      /* layer not ready */
    }
  }
  try {
    map.setPaintProperty('country-suburbs-hover', 'fill-opacity', fillOp);
    map.setPaintProperty('metro-suburbs-hover', 'fill-opacity', fillOp);
  } catch {
    /* layer not ready */
  }
}

function applyDataToMap(map: maplibregl.Map, data: ApiCameraLocations, options: MapOptions, fitBounds: boolean) {
  const countryStreets = locationsToStreetFeatures(data.locations?.country ?? [], 'country');
  const countrySuburbs = locationsToSuburbFeatures(data.locations?.country ?? [], options.uniqueSuburbs);
  const metroStreets = locationsToStreetFeatures(data.locations?.metro ?? [], 'metro');
  const metroSuburbs = locationsToSuburbFeatures(data.locations?.metro ?? [], options.uniqueSuburbs);

  const countryStreetsSource = map.getSource(SOURCE_IDS.countryStreets) as maplibregl.GeoJSONSource | undefined;
  if (!countryStreetsSource?.setData) return;

  countryStreetsSource.setData({
    type: 'FeatureCollection',
    features: countryStreets,
  });
  (map.getSource(SOURCE_IDS.countrySuburbs) as maplibregl.GeoJSONSource).setData({
    type: 'FeatureCollection',
    features: options.showSuburbs ? countrySuburbs : [],
  });
  (map.getSource(SOURCE_IDS.metroStreets) as maplibregl.GeoJSONSource).setData({
    type: 'FeatureCollection',
    features: metroStreets,
  });
  (map.getSource(SOURCE_IDS.metroSuburbs) as maplibregl.GeoJSONSource).setData({
    type: 'FeatureCollection',
    features: options.showSuburbs ? metroSuburbs : [],
  });

  map.setLayoutProperty('country-suburbs-fill', 'visibility', options.showSuburbs ? 'visible' : 'none');
  map.setLayoutProperty('metro-suburbs-fill', 'visibility', options.showSuburbs ? 'visible' : 'none');
  syncSuburbLayerOptions(map, options);

  if (fitBounds) {
    const allFeatures = [
      ...countryStreets,
      ...metroStreets,
      ...(options.showSuburbs ? [...countrySuburbs, ...metroSuburbs] : []),
    ];
    if (allFeatures.length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      const addToBounds = (f: Feature) => {
        if (f.geometry.type === 'Point') {
          bounds.extend(f.geometry.coordinates as [number, number]);
        } else if (f.geometry.type === 'LineString') {
          f.geometry.coordinates.forEach((c) => bounds.extend(c as [number, number]));
        } else if (f.geometry.type === 'Polygon') {
          f.geometry.coordinates[0].forEach((c) => bounds.extend(c as [number, number]));
        } else if (f.geometry.type === 'MultiLineString') {
          f.geometry.coordinates.flat().forEach((c) => bounds.extend(c as [number, number]));
        } else if (f.geometry.type === 'MultiPolygon') {
          f.geometry.coordinates.flat(2).forEach((c) => bounds.extend(c as [number, number]));
        }
      };
      allFeatures.forEach(addToBounds);
      map.fitBounds(bounds, { padding: 40, maxZoom: 14 });
    }
  }
}

const DEFAULT_OPTIONS: MapOptions = {
  showSuburbs: true,
  uniqueSuburbs: true,
  fitAllLocations: false,
  streetInteraction: 'click',
  suburbInteraction: 'hover',
  suburbHighlightOnInteraction: true,
  suburbOutlineSuburbs: true,
};

const DEFAULT_CENTER: [number, number] = [138.6, -34.9];
const DEFAULT_ZOOM = 10;

function fitMapToData(map: maplibregl.Map, data: ApiCameraLocations, options: MapOptions) {
  const countryStreets = locationsToStreetFeatures(data.locations?.country ?? [], 'country');
  const countrySuburbs = locationsToSuburbFeatures(data.locations?.country ?? [], options.uniqueSuburbs);
  const metroStreets = locationsToStreetFeatures(data.locations?.metro ?? [], 'metro');
  const metroSuburbs = locationsToSuburbFeatures(data.locations?.metro ?? [], options.uniqueSuburbs);
  const allFeatures = [
    ...countryStreets,
    ...metroStreets,
    ...(options.showSuburbs ? [...countrySuburbs, ...metroSuburbs] : []),
  ];
  if (allFeatures.length === 0) return;
  const bounds = new maplibregl.LngLatBounds();
  const addToBounds = (f: Feature) => {
    if (f.geometry.type === 'Point') {
      bounds.extend(f.geometry.coordinates as [number, number]);
    } else if (f.geometry.type === 'LineString') {
      f.geometry.coordinates.forEach((c) => bounds.extend(c as [number, number]));
    } else if (f.geometry.type === 'Polygon') {
      f.geometry.coordinates[0].forEach((c) => bounds.extend(c as [number, number]));
    } else if (f.geometry.type === 'MultiLineString') {
      f.geometry.coordinates.flat().forEach((c) => bounds.extend(c as [number, number]));
    } else if (f.geometry.type === 'MultiPolygon') {
      f.geometry.coordinates.flat(2).forEach((c) => bounds.extend(c as [number, number]));
    }
  };
  allFeatures.forEach(addToBounds);
  map.fitBounds(bounds, { padding: 40, maxZoom: 14 });
}

export function Map({ data, loading, options = DEFAULT_OPTIONS, resetPositionTrigger = 0 }: MapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const dataRef = useRef<ApiCameraLocations | null>(null);
  const optionsRef = useRef<MapOptions>(options);
  const hasPerformedInitialFitRef = useRef(false);
  dataRef.current = data;
  optionsRef.current = options;

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const key = import.meta.env.VITE_MAPTILER_KEY;
    if (!key) {
      console.warn('VITE_MAPTILER_KEY is not set. Map tiles may not load.');
    }

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: `https://api.maptiler.com/maps/streets-v4/style.json?key=${key}`,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    });

    mapRef.current = map;

    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(mapContainerRef.current);

    map.on('load', () => {
      requestAnimationFrame(() => map.resize());
      map.addSource(SOURCE_IDS.countryStreets, {
        type: 'geojson',
        data: emptyFeatureCollection(),
        promoteId: { '': 'cameraLocationId' },
      });
      map.addSource(SOURCE_IDS.countrySuburbs, {
        type: 'geojson',
        data: emptyFeatureCollection(),
      });
      map.addSource(SOURCE_IDS.metroStreets, {
        type: 'geojson',
        data: emptyFeatureCollection(),
        promoteId: { '': 'cameraLocationId' },
      });
      map.addSource(SOURCE_IDS.metroSuburbs, {
        type: 'geojson',
        data: emptyFeatureCollection(),
      });

      map.addSource(SOURCE_IDS.countryStreetsHover, {
        type: 'geojson',
        data: emptyFeatureCollection(),
      });
      map.addSource(SOURCE_IDS.countrySuburbsHover, {
        type: 'geojson',
        data: emptyFeatureCollection(),
      });
      map.addSource(SOURCE_IDS.metroStreetsHover, {
        type: 'geojson',
        data: emptyFeatureCollection(),
      });
      map.addSource(SOURCE_IDS.metroSuburbsHover, {
        type: 'geojson',
        data: emptyFeatureCollection(),
      });

      map.addLayer({
        id: 'country-suburbs-fill',
        type: 'fill',
        source: SOURCE_IDS.countrySuburbs,
        paint: { 'fill-color': '#93c5fd', 'fill-opacity': 0.25 },
      });
      map.addLayer({
        id: 'country-suburbs-base-outline',
        type: 'line',
        source: SOURCE_IDS.countrySuburbs,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#2563eb',
          'line-opacity': 0.32,
          'line-width': 1.25,
        },
      });
      map.addLayer({
        id: 'country-streets-line',
        type: 'line',
        source: SOURCE_IDS.countryStreets,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#2563eb',
          'line-opacity': 0.5,
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            8, 3,
            12, 4,
            16, 6,
          ],
        },
      });
      map.addLayer({
        id: 'metro-suburbs-fill',
        type: 'fill',
        source: SOURCE_IDS.metroSuburbs,
        paint: { 'fill-color': '#fdba74', 'fill-opacity': 0.25 },
      });
      map.addLayer({
        id: 'metro-suburbs-base-outline',
        type: 'line',
        source: SOURCE_IDS.metroSuburbs,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#ea580c',
          'line-opacity': 0.32,
          'line-width': 1.25,
        },
      });
      map.addLayer({
        id: 'metro-streets-line',
        type: 'line',
        source: SOURCE_IDS.metroStreets,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#ea580c',
          'line-opacity': 0.5,
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            8, 3,
            12, 4,
            16, 6,
          ],
        },
      });

      map.addLayer({
        id: 'country-suburbs-hover',
        type: 'fill',
        source: SOURCE_IDS.countrySuburbsHover,
        paint: { 'fill-color': '#93c5fd', 'fill-opacity': 0.2 },
      });
      map.addLayer({
        id: 'country-suburbs-hover-outline',
        type: 'line',
        source: SOURCE_IDS.countrySuburbsHover,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#1d4ed8',
          'line-opacity': 0.95,
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            8,
            2,
            12,
            2.5,
            16,
            3,
          ],
          'line-dasharray': [3, 2],
        },
      });
      map.addLayer({
        id: 'country-streets-hover',
        type: 'line',
        source: SOURCE_IDS.countryStreetsHover,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#2563eb',
          'line-opacity': 1,
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            8, 6,
            12, 8,
            16, 12,
          ],
        },
      });
      map.addLayer({
        id: 'metro-suburbs-hover',
        type: 'fill',
        source: SOURCE_IDS.metroSuburbsHover,
        paint: { 'fill-color': '#fdba74', 'fill-opacity': 0.2 },
      });
      map.addLayer({
        id: 'metro-suburbs-hover-outline',
        type: 'line',
        source: SOURCE_IDS.metroSuburbsHover,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#c2410c',
          'line-opacity': 0.95,
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            8,
            2,
            12,
            2.5,
            16,
            3,
          ],
          'line-dasharray': [3, 2],
        },
      });
      map.addLayer({
        id: 'metro-streets-hover',
        type: 'line',
        source: SOURCE_IDS.metroStreetsHover,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#ea580c',
          'line-opacity': 1,
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            8, 6,
            12, 8,
            16, 12,
          ],
        },
      });

      if (dataRef.current) {
        const shouldFit = optionsRef.current.fitAllLocations;
        applyDataToMap(map, dataRef.current, optionsRef.current, shouldFit);
        if (shouldFit) hasPerformedInitialFitRef.current = true;
      }

      const popup = new maplibregl.Popup({ closeOnClick: true });

      let clickLockedStreetFeatures: maplibregl.MapGeoJSONFeature[] | null = null;
      let clickLockedSuburbFeatures: maplibregl.MapGeoJSONFeature[] | null = null;
      let lastMousePoint: [number, number] | null = null;

      const pushToHighlightSource = (
        f: maplibregl.MapGeoJSONFeature,
        bySource: Record<string, Feature[]>
      ) => {
        const highlightSource = f.source && HIGHLIGHT_SOURCE_MAP[f.source];
        if (highlightSource && f.geometry) {
          const geom = JSON.parse(JSON.stringify(f.geometry)) as Feature['geometry'];
          bySource[highlightSource].push({
            type: 'Feature',
            geometry: geom,
            properties: {},
          });
        }
      };

      const flushHighlightSources = (bySource: Record<string, Feature[]>) => {
        (Object.entries(bySource) as [string, Feature[]][]).forEach(([sourceId, feats]) => {
          const geoJsonSource = map.getSource(sourceId) as maplibregl.GeoJSONSource | undefined;
          if (geoJsonSource?.setData) {
            geoJsonSource.setData({
              type: 'FeatureCollection',
              features: feats,
            });
          }
        });
      };

      const rebuildHighlightLayers = (
        hoverFeatures: maplibregl.MapGeoJSONFeature[],
        lockedStreets: maplibregl.MapGeoJSONFeature[] | null,
        lockedSuburbs: maplibregl.MapGeoJSONFeature[] | null
      ) => {
        const opts = optionsRef.current;
        const bySource: Record<string, Feature[]> = {
          [SOURCE_IDS.countryStreetsHover]: [],
          [SOURCE_IDS.countrySuburbsHover]: [],
          [SOURCE_IDS.metroStreetsHover]: [],
          [SOURCE_IDS.metroSuburbsHover]: [],
        };

        const wantSuburbHoverGeom =
          opts.showSuburbs &&
          (opts.suburbHighlightOnInteraction || opts.suburbOutlineSuburbs);

        if (wantSuburbHoverGeom) {
          const suburbGeoms =
            opts.suburbInteraction === 'click' && lockedSuburbs && lockedSuburbs.length > 0
              ? lockedSuburbs
              : opts.suburbInteraction === 'hover'
                ? hoverFeatures.filter(
                    (f) => f.layer?.id && (SUBURB_LAYER_IDS as readonly string[]).includes(f.layer.id)
                  )
                : [];
          suburbGeoms.forEach((f) => {
            if (!f.layer?.id || !(SUBURB_LAYER_IDS as readonly string[]).includes(f.layer.id)) return;
            pushToHighlightSource(f, bySource);
          });
        }

        const streetSource =
          opts.streetInteraction === 'click' && lockedStreets && lockedStreets.length > 0
            ? lockedStreets
            : hoverFeatures.filter(
                (f) => f.layer?.id && (STREET_LAYER_IDS as readonly string[]).includes(f.layer.id)
              );
        streetSource.forEach((f) => {
          if (!f.layer?.id || !(STREET_LAYER_IDS as readonly string[]).includes(f.layer.id)) return;
          pushToHighlightSource(f, bySource);
        });

        flushHighlightSources(bySource);
      };

      const clearHighlightLayers = () => {
        [
          SOURCE_IDS.countryStreetsHover,
          SOURCE_IDS.countrySuburbsHover,
          SOURCE_IDS.metroStreetsHover,
          SOURCE_IDS.metroSuburbsHover,
        ].forEach((id) => {
          const source = map.getSource(id) as maplibregl.GeoJSONSource | undefined;
          if (source?.setData) {
            source.setData(emptyFeatureCollection());
          }
        });
      };

      const showPopupAt = (lngLat: { lng: number; lat: number }, features: QueriedStreetFeature[]) => {
        if (features.length === 0) return;
        popup.setLngLat(lngLat).setHTML(buildPopupHTML(features)).addTo(map);
      };

      const queryHoverLayers = (point: [number, number]) => {
        try {
          return map.queryRenderedFeatures(point, { layers: [...HOVER_LAYER_IDS] });
        } catch {
          return [];
        }
      };

      popup.on('close', () => {
        clickLockedStreetFeatures = null;
        if (lastMousePoint) {
          rebuildHighlightLayers(
            queryHoverLayers(lastMousePoint),
            null,
            clickLockedSuburbFeatures
          );
        } else {
          rebuildHighlightLayers([], null, clickLockedSuburbFeatures);
        }
      });

      map.on('mousemove', (e) => {
        lastMousePoint = [e.point.x, e.point.y];
        let allFeatures: maplibregl.MapGeoJSONFeature[];
        try {
          allFeatures = map.queryRenderedFeatures(e.point, {
            layers: [...HOVER_LAYER_IDS],
          });
        } catch {
          allFeatures = [];
        }
        const streetFeatures: QueriedStreetFeature[] = allFeatures
          .filter((f) => f.layer?.id && (STREET_LAYER_IDS as readonly string[]).includes(f.layer.id))
          .map((f) => ({
            properties: (f.properties || {}) as StreetFeatureProperties,
            id: f.id,
            source: f.source,
          }));

        const opts = optionsRef.current;
        const suburbUnderCursor = allFeatures.some(
          (f) => f.layer?.id && (SUBURB_LAYER_IDS as readonly string[]).includes(f.layer.id)
        );
        const suburbClickable =
          opts.showSuburbs &&
          opts.suburbInteraction === 'click' &&
          (opts.suburbHighlightOnInteraction || opts.suburbOutlineSuburbs);

        map.getCanvas().style.cursor =
          streetFeatures.length > 0 || (suburbClickable && suburbUnderCursor) ? 'pointer' : '';

        rebuildHighlightLayers(allFeatures, clickLockedStreetFeatures, clickLockedSuburbFeatures);

        if (optionsRef.current.streetInteraction === 'hover') {
          if (streetFeatures.length > 0) {
            showPopupAt(e.lngLat, streetFeatures);
          } else {
            popup.remove();
          }
        }
      });

      map.on('mouseleave', () => {
        map.getCanvas().style.cursor = '';
        lastMousePoint = null;
        if (optionsRef.current.streetInteraction === 'hover') {
          clearHighlightLayers();
          popup.remove();
        } else if (
          (clickLockedStreetFeatures && clickLockedStreetFeatures.length > 0) ||
          (clickLockedSuburbFeatures && clickLockedSuburbFeatures.length > 0)
        ) {
          rebuildHighlightLayers([], clickLockedStreetFeatures, clickLockedSuburbFeatures);
        } else {
          clearHighlightLayers();
        }
      });

      map.on('click', (e) => {
        const opts = optionsRef.current;
        lastMousePoint = [e.point.x, e.point.y];

        let streetFeats: (maplibregl.MapGeoJSONFeature & { properties: StreetFeatureProperties })[] = [];
        let suburbFeats: maplibregl.MapGeoJSONFeature[] = [];
        try {
          streetFeats = map.queryRenderedFeatures(e.point, {
            layers: [...STREET_LAYER_IDS],
          }) as (maplibregl.MapGeoJSONFeature & { properties: StreetFeatureProperties })[];
        } catch {
          streetFeats = [];
        }
        try {
          suburbFeats = map.queryRenderedFeatures(e.point, { layers: [...SUBURB_LAYER_IDS] });
        } catch {
          suburbFeats = [];
        }

        if (opts.suburbInteraction === 'click' && opts.showSuburbs) {
          if (suburbFeats.length > 0 && streetFeats.length === 0) {
            clickLockedSuburbFeatures = suburbFeats;
            popup.remove();
            clickLockedStreetFeatures = null;
          } else {
            clickLockedSuburbFeatures = null;
          }
        }

        if (opts.streetInteraction === 'click') {
          if (streetFeats.length > 0) {
            const streetFeatures: QueriedStreetFeature[] = streetFeats.map((f) => ({
              properties: f.properties as StreetFeatureProperties,
              id: f.id,
              source: f.source,
            }));
            clickLockedStreetFeatures = streetFeats;
            showPopupAt(e.lngLat, streetFeatures);
          } else {
            clickLockedStreetFeatures = null;
          }
        }

        rebuildHighlightLayers(
          queryHoverLayers([e.point.x, e.point.y]),
          clickLockedStreetFeatures,
          clickLockedSuburbFeatures
        );
      });
    });

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const runUpdate = () => {
      try {
        map.getSource(SOURCE_IDS.countryStreets);
      } catch {
        return;
      }
      const currentData = dataRef.current;
      const currentOptions = optionsRef.current;
      if (currentData) {
        const shouldFit =
          currentOptions.fitAllLocations && !hasPerformedInitialFitRef.current;
        applyDataToMap(map, currentData, currentOptions, shouldFit);
        if (shouldFit) hasPerformedInitialFitRef.current = true;
      } else {
        map.setLayoutProperty('country-suburbs-fill', 'visibility', currentOptions.showSuburbs ? 'visible' : 'none');
        map.setLayoutProperty('metro-suburbs-fill', 'visibility', currentOptions.showSuburbs ? 'visible' : 'none');
        syncSuburbLayerOptions(map, currentOptions);
      }
    };

    if (map.isStyleLoaded()) {
      runUpdate();
    } else {
      const onLoad = () => runUpdate();
      map.once('load', onLoad);
      return () => {
        map.off('load', onLoad);
      };
    }
  }, [data, options]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || resetPositionTrigger <= 0) return;
    const currentOptions = optionsRef.current;
    const runReset = () => {
      if (currentOptions.fitAllLocations && data) {
        fitMapToData(map, data, currentOptions);
      } else {
        map.flyTo({ center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM });
      }
    };
    if (!map.isStyleLoaded()) {
      map.once('load', runReset);
    } else {
      runReset();
    }
  }, [resetPositionTrigger, data, options]);

  return (
    <div className="map-wrapper">
      {loading && (
        <div className="map-loading" aria-live="polite">
          <span className="map-loading-spinner" aria-hidden="true" />
          Loading locations…
        </div>
      )}
      <div ref={mapContainerRef} className="map-container" />
    </div>
  );
}
