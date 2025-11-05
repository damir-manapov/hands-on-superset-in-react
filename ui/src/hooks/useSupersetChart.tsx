import { useCallback, useEffect, useRef, useState } from 'react';

type UseSupersetChartOpts = {
  chartId: string;
  supersetUrl?: string;
  backendUrl?: string;
};

/**
 * useSupersetChart
 * Embeds a Superset chart via iframe and manages guest token refresh.
 */
export function useSupersetChart(opts: UseSupersetChartOpts) {
  const {
    chartId,
    supersetUrl = 'http://localhost:8088',
    backendUrl = 'http://localhost:3001',
  } = opts;

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const refreshTimer = useRef<number | null>(null);
  const tokenState = useRef<{ token: string | null; expMs: number }>({
    token: null,
    expMs: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch guest token from backend
  const fetchGuestToken = useCallback(async (): Promise<string> => {
    try {
      const response = await fetch(`${backendUrl}/api/superset/guest-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resources: [{ type: 'chart', id: chartId }],
          rls: [],
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch guest token: ${response.statusText}`);
      }

      const data = (await response.json()) as { token: string };
      return data.token;
    } catch (e: unknown) {
      const errorMessage =
        e instanceof Error ? e.message : 'Failed to fetch guest token';
      throw new Error(errorMessage);
    }
  }, [backendUrl, chartId]);

  // Decode JWT to get expiration time
  const decodeJwtExpMs = useCallback((token: string): number => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1] ?? '')) as {
        exp?: number;
      };
      return (payload.exp ?? 0) * 1000; // Convert to milliseconds
    } catch {
      return Date.now() + 3600000; // Default to 1 hour if decode fails
    }
  }, []);

  // Update iframe src with fresh token
  const updateIframeSrc = useCallback(
    (token: string) => {
      if (!iframeRef.current) return;

      const chartUrl = `${supersetUrl}/superset/explore/?slice_id=${chartId}&standalone=true&guest_token=${encodeURIComponent(token)}`;
      iframeRef.current.src = chartUrl;
    },
    [supersetUrl, chartId]
  );

  // Schedule token refresh
  const scheduleRefresh = useCallback(
    (expMs: number) => {
      if (refreshTimer.current) {
        window.clearTimeout(refreshTimer.current);
      }

      const now = Date.now();
      const timeUntilExpiry = expMs - now;
      const refreshTime = Math.max(timeUntilExpiry - 60000, 5000); // Refresh 1 min before expiry, or at least 5s

      refreshTimer.current = window.setTimeout(() => {
        void (async () => {
          try {
            const newToken = await fetchGuestToken();
            const newExpMs = decodeJwtExpMs(newToken);
            tokenState.current = { token: newToken, expMs: newExpMs };
            updateIframeSrc(newToken);
            scheduleRefresh(newExpMs);
          } catch (e: unknown) {
            console.error('[useSupersetChart] Token refresh failed:', e);
          }
        })();
      }, refreshTime);
    },
    [fetchGuestToken, decodeJwtExpMs, updateIframeSrc]
  );

  // Initialize chart
  useEffect(() => {
    let cancelled = false;

    async function initChart() {
      try {
        setLoading(true);
        setError(null);

        const token = await fetchGuestToken();
        const expMs = decodeJwtExpMs(token);
        tokenState.current = { token, expMs };

        if (!cancelled && iframeRef.current) {
          updateIframeSrc(token);
          scheduleRefresh(expMs);
          setLoading(false);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          const errorMessage =
            e instanceof Error ? e.message : 'Failed to load chart';
          setError(errorMessage);
          setLoading(false);
        }
      }
    }

    void initChart();

    return () => {
      cancelled = true;
      if (refreshTimer.current) {
        window.clearTimeout(refreshTimer.current);
      }
    };
  }, [
    chartId,
    supersetUrl,
    backendUrl,
    fetchGuestToken,
    decodeJwtExpMs,
    updateIframeSrc,
    scheduleRefresh,
  ]);

  return { iframeRef, loading, error };
}
