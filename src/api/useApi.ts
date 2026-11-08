import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { api } from './client';

export function useApi<T = any>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(Boolean(path));
  const [refreshing, setRefreshing] = useState(false);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const load = useCallback(async (silent = false) => {
    if (!path) return;
    if (!silent) setLoading(true);
    try {
      const result = await api.get(path);
      if (alive.current) {
        setData(result as T);
        setError('');
      }
    } catch (loadError) {
      if (alive.current) setError(loadError instanceof Error ? loadError.message : 'Request failed');
    } finally {
      if (alive.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [path]);

  useFocusEffect(useCallback(() => {
    void load(true);
  }, [load]));

  const refresh = useCallback(() => {
    setRefreshing(true);
    return load(true);
  }, [load]);

  return { data, error, loading, refreshing, refresh, reload: load };
}
