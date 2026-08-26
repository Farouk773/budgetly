"use client";

import { useEffect, useState } from "react";
import type { AnalyticsResponse, ApiError } from "@/backend/types";
import { subscribeAnalyticsChanged } from "@/components/dashboard/analytics/analyticsBus";

type FetchState<T> = { path: string; data: T | null; error: string | null };

/** Generic fetch-on-mount(-and-on-path-change) hook shared by every analytics
 * chart component. `isLoading` is derived at render time by comparing the
 * requested `path` to the path the last completed request resolved for —
 * this avoids resetting state synchronously inside the effect body (which
 * only setState calls made from an async callback, e.g. .then/.catch,
 * are meant for). Also refetches whenever notifyAnalyticsChanged() fires
 * elsewhere on the page (a payment, a contribution, a deletion...), so the
 * curve reflects a new entry immediately instead of only on next page load. */
export function useAnalyticsData<T extends AnalyticsResponse>(
  path: string
): { data: T | null; isLoading: boolean; error: string | null } {
  const [state, setState] = useState<FetchState<T>>({ path: "", data: null, error: null });
  const [refreshNonce, setRefreshNonce] = useState(0);

  useEffect(() => subscribeAnalyticsChanged(() => setRefreshNonce((n) => n + 1)), []);

  useEffect(() => {
    let cancelled = false;

    fetch(path)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) {
          throw new Error((body as ApiError).error ?? "Une erreur est survenue");
        }
        return body as T;
      })
      .then((body) => {
        if (!cancelled) setState({ path, data: body, error: null });
      })
      .catch(() => {
        if (!cancelled) {
          setState({ path, data: null, error: "Impossible de charger ces données pour le moment." });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [path, refreshNonce]);

  const isLoading = state.path !== path;
  return {
    data: isLoading ? null : state.data,
    error: isLoading ? null : state.error,
    isLoading,
  };
}
