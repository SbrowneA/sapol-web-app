import { useState, useEffect, useCallback } from 'react';
import { fetchCameraLocations } from '../api/cameraLocations';
import { formatSapolDate } from '../lib/sapolDate';
import type { ApiCameraLocations } from '../types/api';

/**
 * Fetches locations for one SAPOL day. SAPOL labels data by **which day it is in South Australia**
 * (`Australia/Adelaide`). The `date` query param and `dateStr` use that SA day (via
 * {@link formatSapolDate}), not the UTC date from `toISOString()`.
 *
 * @param initialDate - Optional seed for internal `Date` state (defaults to `new Date()`).
 * @returns `dateStr` is `YYYY-MM-DD` for the SA day of the current selection; `setDate` is driven
 *   by the picker’s anchored `Date` values.
 */
export function useCameraLocations(initialDate?: Date) {
  const [date, setDate] = useState<Date>(() => initialDate ?? new Date());
  const [data, setData] = useState<ApiCameraLocations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchCameraLocations({ date: formatSapolDate(date) });
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const setDateAndRefetch = useCallback((newDate: Date) => {
    setDate(newDate);
  }, []);

  return {
    date,
    setDate: setDateAndRefetch,
    dateStr: formatSapolDate(date),
    data,
    loading,
    error,
    refetch,
  };
}
