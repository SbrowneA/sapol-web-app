type ApiCameraLocation = {
  cameraLocationId: number;
  suburbName: string;
  streetName: string;
  suburbId: number;
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
