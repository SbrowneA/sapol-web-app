type ApiCameraLocation = {
  cameraLocationId: number;
  resolvedLocationId: number;
  streetName: string;
  suburbName: string;
  suburbId: number;
  startDate: string;
  endDate: string;
  streetGeom: GeoJSON.Geometry;
  suburbGeom: GeoJSON.Geometry;
};

type ApiCameraLocations = {
  locations: {
    country: ApiCameraLocation[];
    metro: ApiCameraLocation[];
  };
  dateRange: { startDate: string; endDate: string };
};

export type { ApiCameraLocation, ApiCameraLocations };
