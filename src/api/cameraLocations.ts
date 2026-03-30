import type { ApiCameraLocations } from '../types/api';

const API_BASE: string = import.meta.env.VITE_API_BASE_URL ?? '';

export async function fetchCameraLocations(params: {
  date?: string;
  start_date?: string;
  end_date?: string;
}): Promise<ApiCameraLocations> {
  const searchParams = new URLSearchParams();

  if (params.date) {
    searchParams.set('date', params.date);
  } else if (params.start_date && params.end_date) {
    searchParams.set('start_date', params.start_date);
    searchParams.set('end_date', params.end_date);
  } else {
    throw new Error('Either date or start_date and end_date must be provided');
  }

  const url = `${API_BASE}/api/camera-locations?${searchParams.toString()}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Failed to fetch camera locations: ${res.status} ${res.statusText}`);
  }

  const body: unknown = await res.json();
  return body as ApiCameraLocations;
}

export function getCameraLocationsUrl(params: { date?: string; start_date?: string; end_date?: string }): string {
  const searchParams = new URLSearchParams();
  if (params.date) searchParams.set('date', params.date);
  if (params.start_date) searchParams.set('start_date', params.start_date);
  if (params.end_date) searchParams.set('end_date', params.end_date);
  return `${API_BASE}/api/camera-locations?${searchParams.toString()}`;
}
