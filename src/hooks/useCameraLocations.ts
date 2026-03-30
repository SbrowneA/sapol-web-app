import { useState, useEffect, useCallback } from 'react';
import { fetchCameraLocations } from '../api/cameraLocations';
import type { ApiCameraLocations } from '../types/api';

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function useCameraLocations(initialDate?: Date) {
  const [date, setDate] = useState<Date>(() => initialDate ?? new Date());
  const [data, setData] = useState<ApiCameraLocations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchCameraLocations({ date: formatDate(date) });
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
    dateStr: formatDate(date),
    data,
    loading,
    error,
    refetch,
  };
}
