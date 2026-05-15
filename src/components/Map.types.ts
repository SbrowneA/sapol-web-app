/**
 * GeoJSON `properties` attached to street line features built from camera location API rows.
 */
export type StreetFeatureProperties = {
  cameraLocationId: number;
  streetName: string;
  suburbName: string;
  startDate: string;
  endDate: string;
  regionType: 'country' | 'metro';
};

/**
 * GeoJSON `properties` on suburb polygon features; includes `suburbId` for highlight lookup keyed by source + id.
 */
export type SuburbFeatureProperties = {
  cameraLocationId: number;
  streetName: string;
  suburbName: string;
  suburbId: number;
};

/** Street rows returned from `queryRenderedFeatures` when building hover/click UI. */
export interface QueriedStreetFeature {
  properties: StreetFeatureProperties;
  id?: number | string;
  source?: string;
}
