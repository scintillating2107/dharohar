"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet } from "@/lib/api-client";
import type { SystemSettings } from "@/types";

interface State<T> {
  key: string | null;
  data: T | undefined;
  error: string | null;
  done: boolean;
}

/**
 * Fetches `path` (re-fetching when it changes, on `reload()`, and every `pollMs` if given).
 * Pass `null` to skip. Previous data stays visible while a new path loads.
 */
export function useApi<T>(path: string | null, opts: { pollMs?: number } = {}) {
  const [state, setState] = useState<State<T>>({ key: null, data: undefined, error: null, done: false });
  const [nonce, setNonce] = useState(0);
  const { pollMs } = opts;

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    apiGet<T>(path)
      .then((data) => {
        if (!cancelled) setState({ key: path, data, error: null, done: true });
      })
      .catch((err: Error) => {
        if (!cancelled) setState((s) => ({ key: path, data: s.data, error: err.message || "Request failed", done: true }));
      });
    return () => {
      cancelled = true;
    };
  }, [path, nonce]);

  useEffect(() => {
    if (!path || !pollMs) return;
    const timer = setInterval(() => setNonce((n) => n + 1), pollMs);
    return () => clearInterval(timer);
  }, [path, pollMs]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const loading = path !== null && (state.key !== path || !state.done);
  return {
    data: state.data,
    error: state.key === path ? state.error : null,
    loading,
    /** True only before the first response for the current path */
    initialLoading: loading && state.data === undefined,
    reload,
  };
}

/** Server-side thresholds used for confidence badges. */
export function useSystemSettings(): SystemSettings | null {
  return useApi<{ settings: SystemSettings }>("/api/settings").data?.settings ?? null;
}
