import type { ApiCameraLocation, ApiCameraLocations } from '../types/api';
import { getSupabaseClient } from '../lib/supabaseClient';

/**
 * PostgREST RPC for one SAPOL calendar day. Names must match the Postgres function exposed to
 * PostgREST.
 *
 * @remarks When a date-range analogue is added server-side, expose a matching constant and
 * optional overload here; the app currently only queries by single `date`.
 */
export const API_RESOLVED_LOCATIONS_BY_DATE_BY_REGION = 'api_resolved_locations_by_date_by_region';

/**
 * Postgres parameter name for {@link API_RESOLVED_LOCATIONS_BY_DATE_BY_REGION}. PostgREST matches
 * JSON keys from `.rpc` to SQL argument names (`q_date`).
 */
export const RPC_ARG_Q_DATE_FOR_BY_REGION = 'q_date' as const;

/**
 * Parses one layer of accidental JSON-string encoding from Postgres / PostgREST.
 *
 * @param value - Possibly already-parsed object or JSON string.
 */
function unwrapJsonIfString(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

/** Treats Postgres `NULL` arrays or omitted keys as empty lists for GeoJSON pipelines. */
function asCameraLocationArray(value: unknown): ApiCameraLocation[] {
  const unwrapped = unwrapJsonIfString(value);
  return Array.isArray(unwrapped) ? (unwrapped as ApiCameraLocation[]) : [];
}

/**
 * Normalizes `{ locations: { country, metro }, dateRange }` from RPC:
 * Postgres often stores keys as snake_case in SQL but your function may already emit camelCase;
 * **`NULL` aggregates become `null` in JSON** — this coerces those to empty arrays so the map can
 * render. No extra decoding is required for ordinary JSONB responses: `supabase-js` already parses
 * them.
 *
 * @param raw - Raw `.rpc` payload.
 * @returns Typed payload with non-null arrays.
 */
export function normalizeCameraLocationsPayload(raw: unknown): ApiCameraLocations {
  const root = unwrapJsonIfString(raw);
  if (!root || typeof root !== 'object') {
    throw new Error('Camera locations RPC returned an invalid payload');
  }

  const o = root as Record<string, unknown>;
  const locBlockRaw = o.locations !== undefined ? unwrapJsonIfString(o.locations) : undefined;

  let country: ApiCameraLocation[] = [];
  let metro: ApiCameraLocation[] = [];

  if (locBlockRaw && typeof locBlockRaw === 'object' && !Array.isArray(locBlockRaw)) {
    const L = locBlockRaw as Record<string, unknown>;
    country = asCameraLocationArray(L.country);
    metro = asCameraLocationArray(L.metro);
  }

  const dr = unwrapJsonIfString(o.dateRange);
  if (!dr || typeof dr !== 'object' || Array.isArray(dr)) {
    throw new Error('Camera locations RPC payload is missing valid dateRange');
  }

  const dateRange = dr as ApiCameraLocations['dateRange'];

  return {
    dateRange,
    locations: { country, metro },
  };
}

/**
 * Loads camera location bundles for SAPOL metro vs country zones via Supabase RPC.
 *
 * @param params.date - SAPOL day `YYYY-MM-DD` mapped to Postgres `q_date` on the RPC.
 */
export async function fetchCameraLocations(params: { date: string }): Promise<ApiCameraLocations> {
  const supabase = getSupabaseClient();
  const rpcResult = await supabase.rpc(API_RESOLVED_LOCATIONS_BY_DATE_BY_REGION, {
    [RPC_ARG_Q_DATE_FOR_BY_REGION]: params.date,
  });

  const rpcErrorMessage = rpcResult.error?.message;
  const data = rpcResult.data as unknown;

  if (rpcErrorMessage) {
    throw new Error(`Failed to fetch camera locations: ${rpcErrorMessage}`);
  }
  if (data === null || data === undefined) {
    throw new Error('No data returned from camera locations RPC');
  }

  return normalizeCameraLocationsPayload(data);
}
