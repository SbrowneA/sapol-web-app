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
} as const;

function locationsToStreetFeatures(locations: ApiCameraLocations['locations']['country'] | ApiCameraLocations['locations']['metro']): Feature[] {
  return locations
    .filter((loc) => loc.streetGeom && (loc.streetGeom.type === 'LineString' || loc.streetGeom.type === 'MultiLineString'))
    .map((loc) => ({
      type: 'Feature' as const,
      geometry: loc.streetGeom,
      properties: { cameraLocationId: loc.cameraLocationId, streetName: loc.streetName, suburbName: loc.suburbName },
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
      geometry: loc.suburbGeom,
      properties: { cameraLocationId: loc.cameraLocationId, streetName: loc.streetName, suburbName: loc.suburbName },
    }));
}

function emptyFeatureCollection(): FeatureCollection {
  return { type: 'FeatureCollection', features: [] };
}

interface MapProps {
  data: ApiCameraLocations | null;
  loading?: boolean;
  options?: MapOptions;
  resetPositionTrigger?: number;
}

function applyDataToMap(map: maplibregl.Map, data: ApiCameraLocations, options: MapOptions, fitBounds: boolean) {
  const countryStreets = locationsToStreetFeatures(data.locations?.country ?? []);
  const countrySuburbs = locationsToSuburbFeatures(data.locations?.country ?? [], options.uniqueSuburbs);
  const metroStreets = locationsToStreetFeatures(data.locations?.metro ?? []);
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

const DEFAULT_OPTIONS: MapOptions = { showSuburbs: true, uniqueSuburbs: true };

function fitMapToData(map: maplibregl.Map, data: ApiCameraLocations, options: MapOptions) {
  const countryStreets = locationsToStreetFeatures(data.locations?.country ?? []);
  const countrySuburbs = locationsToSuburbFeatures(data.locations?.country ?? [], options.uniqueSuburbs);
  const metroStreets = locationsToStreetFeatures(data.locations?.metro ?? []);
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
      center: [138.6, -34.9],
      zoom: 10,
    });

    mapRef.current = map;

    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(mapContainerRef.current);

    map.on('load', () => {
      requestAnimationFrame(() => map.resize());
      const sources = [
        { id: SOURCE_IDS.countryStreets, data: emptyFeatureCollection() },
        { id: SOURCE_IDS.countrySuburbs, data: emptyFeatureCollection() },
        { id: SOURCE_IDS.metroStreets, data: emptyFeatureCollection() },
        { id: SOURCE_IDS.metroSuburbs, data: emptyFeatureCollection() },
      ];

      sources.forEach(({ id, data }) => {
        map.addSource(id, { type: 'geojson', data });
      });

      map.addLayer({
        id: 'country-suburbs-fill',
        type: 'fill',
        source: SOURCE_IDS.countrySuburbs,
        paint: { 'fill-color': '#93c5fd', 'fill-opacity': 0.4 },
      });
      map.addLayer({
        id: 'country-streets-line',
        type: 'line',
        source: SOURCE_IDS.countryStreets,
        paint: { 'line-color': '#2563eb', 'line-width': 2 },
      });
      map.addLayer({
        id: 'metro-suburbs-fill',
        type: 'fill',
        source: SOURCE_IDS.metroSuburbs,
        paint: { 'fill-color': '#fdba74', 'fill-opacity': 0.4 },
      });
      map.addLayer({
        id: 'metro-streets-line',
        type: 'line',
        source: SOURCE_IDS.metroStreets,
        paint: { 'line-color': '#ea580c', 'line-width': 2 },
      });

      if (dataRef.current) {
        applyDataToMap(map, dataRef.current, optionsRef.current, false);
      }
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
        applyDataToMap(map, currentData, currentOptions, false);
      } else {
        map.setLayoutProperty('country-suburbs-fill', 'visibility', currentOptions.showSuburbs ? 'visible' : 'none');
        map.setLayoutProperty('metro-suburbs-fill', 'visibility', currentOptions.showSuburbs ? 'visible' : 'none');
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
    if (!map || resetPositionTrigger <= 0 || !data) return;
    if (!map.isStyleLoaded()) {
      map.once('load', () => fitMapToData(map, data, optionsRef.current));
    } else {
      fitMapToData(map, data, options);
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
