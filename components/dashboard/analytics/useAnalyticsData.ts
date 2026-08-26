"use client";

import { useEffect, useState } from "react";
import type { AnalyticsResponse, ApiError } from "@/backend/types";

/** Generic fetch-on-mount(-and-on-path-change) hook shared by every analytics
 * chart component (same fetch + useState pattern as PurchaseSimulator/LoanCard,
 * generalized so each chart doesn't repeat the loading/error boilerplate). */
export function useAnalyticsData<T extends AnalyticsResponse>(
  path: string
): { data: T | null; isLoading: boolean; error: string | null } {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetch(path)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) {
          throw new Error((body as ApiError).error ?? "Une erreur est survenue");
        }
        return body as T;
      })
      .then((body) => {
        if (!cancelled) setData(body);
      })
      .catch(() => {
        if (!cancelled) {
          setData(null);
          setError("Impossible de charger ces données pour le moment.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [path]);

  return { data, isLoading, error };
}
