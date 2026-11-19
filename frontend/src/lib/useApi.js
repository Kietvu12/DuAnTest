import { useCallback, useEffect, useState } from 'react';
import { api } from './api';

/** Fetches `path` whenever it changes; keeps the previous data visible while reloading. */
export function useApi(path) {
  const [state, setState] = useState({ data: null, error: null, loading: Boolean(path) });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!path) {
      setState({ data: null, error: null, loading: false });
      return undefined;
    }
    const controller = new AbortController();
    setState((prev) => ({ ...prev, loading: true, error: null }));
    api(path, { signal: controller.signal })
      .then((data) => setState({ data, error: null, loading: false }))
      .catch((error) => {
        if (error.name !== 'AbortError') setState({ data: null, error, loading: false });
      });
    return () => controller.abort();
  }, [path, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { ...state, reload };
}
