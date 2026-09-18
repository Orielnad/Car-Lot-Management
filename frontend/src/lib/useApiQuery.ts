import { useCallback, useEffect, useState } from 'react';
import { ApiError } from './api';

interface QueryState<T> {
  data: T | null;
  error: string | null;
  isLoading: boolean;
  refetch: () => void;
}

/** Small shared fetch-on-mount hook so every screen gets the same loading/error/retry shape. */
export function useApiQuery<T>(fetcher: () => Promise<T>, deps: unknown[] = []): QueryState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);

  const load = useCallback(() => {
    setIsLoading(true);
    setError(null);
    fetcher()
      .then((result) => setData(result))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'אירעה שגיאה בטעינת הנתונים.'))
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, reloadToken]);

  return { data, error, isLoading, refetch: () => setReloadToken((t) => t + 1) };
}
