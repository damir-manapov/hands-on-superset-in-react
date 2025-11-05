import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { embedDashboard } from '@superset-ui/embedded-sdk';

type BackoffOpts = { tries?: number; baseMs?: number; maxMs?: number };

type UseSupersetDashboardOpts = {
  dashboardId: string; // Embedded Dashboard UUID
  supersetUrl?: string; // must match token 'aud' (your Superset origin)
  backendUrl?: string; // your backend origin that mints guest tokens
  user?: { username: string; first_name?: string; last_name?: string };
  rls?: Array<{ clause: string }>;
  backoff?: BackoffOpts; // optional override
  debug?: boolean;
};

type TokenState = {
  token: string | null;
  expMs: number; // ms timestamp
};

const DEFAULTS = {
  supersetUrl: 'http://localhost:8088',
  backendUrl: 'http://localhost:3001',
  user: { username: 'guest', first_name: 'Guest', last_name: 'User' },
  rls: [] as Array<{ clause: string }>,
  backoff: { tries: 4, baseMs: 300, maxMs: 5000 } as BackoffOpts,
  refreshSkewMs: 60_000, // refresh 60s before expiry
};

function base64UrlDecode(s: string) {
  // convert base64url -> base64 and decode
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = s.length % 4 ? 4 - (s.length % 4) : 0;
  return atob(s + '='.repeat(pad));
}

function decodeJwtExpMs(token: string): number | null {
  try {
    const [, payload] = token.split('.');
    const json = JSON.parse(base64UrlDecode(payload)) as { exp?: number };
    // exp is seconds since epoch
    return typeof json.exp === 'number' ? json.exp * 1000 : null;
  } catch {
    return null;
  }
}

async function sleep(ms: number) {
  await new Promise(r => setTimeout(r, ms));
}

async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  { tries = 4, baseMs = 300, maxMs = 5000 }: BackoffOpts
): Promise<T> {
  let attempt = 0;
  let lastErr: unknown;
  while (attempt < tries) {
    try {
      return await fn();
    } catch (e: unknown) {
      lastErr = e;
      // retry only on transient errors (network/5xx)
      const status =
        typeof e === 'object' &&
        e !== null &&
        'response' in e &&
        typeof e.response === 'object' &&
        e.response !== null &&
        'status' in e.response &&
        typeof e.response.status === 'number'
          ? e.response.status
          : undefined;
      const transient = !status || (status >= 500 && status < 600);
      if (!transient) break;
      const backoff = Math.min(maxMs, baseMs * Math.pow(2, attempt));
      await sleep(backoff);
    }
    attempt++;
  }
  throw lastErr;
}

function toDestroyFn(obj: unknown): () => void {
  if (typeof obj === 'function') return obj as () => void; // ← cast, not Function
  if (obj && typeof obj === 'object') {
    const objRecord = obj as Record<string, unknown>;
    if (typeof objRecord.destroy === 'function') {
      const destroyFn = objRecord.destroy as () => void;
      return () => destroyFn();
    }
    if (typeof objRecord.unmount === 'function') {
      const unmountFn = objRecord.unmount as () => void;
      return () => unmountFn();
    }
  }
  return () => {};
}

/**
 * useSupersetDashboard
 * Embeds a Superset dashboard and auto-refreshes the guest token before expiry.
 */
export function useSupersetDashboard(opts: UseSupersetDashboardOpts) {
  const {
    dashboardId,
    supersetUrl = DEFAULTS.supersetUrl,
    backendUrl = DEFAULTS.backendUrl,
    user = DEFAULTS.user,
    rls = DEFAULTS.rls,
    backoff = DEFAULTS.backoff,
    debug = false,
  } = opts;

  const ref = useRef<HTMLDivElement | null>(null);
  const destroyRef = useRef<() => void>(() => {});
  const refreshTimer = useRef<number | null>(null);
  const tokenState = useRef<TokenState>({ token: null, expMs: 0 });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // clears token refresh timer
  const clearRefreshTimer = useCallback(() => {
    if (refreshTimer.current) {
      window.clearTimeout(refreshTimer.current);
      refreshTimer.current = null;
    }
  }, []);

  // fetch token from backend; caches and schedules refresh
  const getToken = useCallback(
    async (force = false): Promise<string> => {
      const now = Date.now();
      const cached = tokenState.current;
      if (
        !force &&
        cached.token &&
        now < cached.expMs - DEFAULTS.refreshSkewMs
      ) {
        return cached.token;
      }

      const request = async () => {
        const res = await fetch(`${backendUrl}/api/superset/guest-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include', // harmless if backend doesn't use cookies
          body: JSON.stringify({
            resources: [{ type: 'dashboard', id: dashboardId }],
            user,
            rls,
          }),
        });
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(
            `guest-token ${res.status} ${res.statusText} ${text}`
          );
        }
        const data = (await res.json()) as { token: string };
        const expMs = decodeJwtExpMs(data.token) ?? now + 5 * 60 * 1000; // fallback 5m
        tokenState.current = { token: data.token, expMs };
        // Schedule refresh before token expiry
        clearRefreshTimer();
        const skew = DEFAULTS.refreshSkewMs;
        const delay = Math.max(1000, expMs - skew - now);
        refreshTimer.current = window.setTimeout(() => {
          void (async () => {
            try {
              if (debug)
                console.log('[useSupersetDashboard] refreshing token…');
              // Force getToken(true) to fetch new token immediately
              await getToken(true);
            } catch (e: unknown) {
              if (debug) {
                let errorMessage: string;
                if (e instanceof Error) {
                  errorMessage = e.message;
                } else if (
                  e !== null &&
                  e !== undefined &&
                  (typeof e === 'string' ||
                    typeof e === 'number' ||
                    typeof e === 'boolean')
                ) {
                  errorMessage = String(e);
                } else if (
                  typeof e === 'object' &&
                  e !== null &&
                  'message' in e &&
                  typeof e.message === 'string'
                ) {
                  errorMessage = e.message;
                } else {
                  errorMessage = 'unknown error';
                }
                console.warn(
                  '[useSupersetDashboard] token refresh failed:',
                  errorMessage
                );
              }
              // Let SDK call fetchGuestToken again on demand; we'll retry then.
            }
          })();
        }, delay);
        if (debug)
          console.log(
            '[useSupersetDashboard] scheduled token refresh in',
            delay,
            'ms'
          );
        return data.token;
      };

      return fetchWithRetry(request, backoff);
    },
    [backendUrl, dashboardId, backoff, rls, clearRefreshTimer, debug, user]
  );

  // fetchGuestToken for SDK (uses our cache/refresh logic)
  const sdkFetchGuestToken = useMemo(() => {
    return async (): Promise<string> => {
      const t = await getToken(false);
      if (debug)
        console.log(
          '[useSupersetDashboard] sdkFetchGuestToken -> token len',
          t.length
        );
      return t;
    };
  }, [getToken, debug]);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    destroyRef.current();
    tokenState.current = { token: null, expMs: 0 };
    clearRefreshTimer();
    // will be re-embedded by effect below
  }, [clearRefreshTimer]);

  // (re)embed when inputs change
  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!ref.current) return;

      // Only set loading if there's no existing iframe
      // This prevents showing loading overlay when content is already partially loaded
      const existingIframe = ref.current.querySelector('iframe');
      if (!existingIframe) {
        setLoading(true);
      }
      setError(null);

      // cleanup previous instance if any
      destroyRef.current();
      destroyRef.current = () => {};

      try {
        // Prime token so we can fail early if backend is down
        await getToken(false);

        const embedded = (await embedDashboard({
          id: dashboardId,
          supersetDomain: supersetUrl, // must equal token 'aud'
          mountPoint: ref.current,
          fetchGuestToken: sdkFetchGuestToken,
          dashboardUiConfig: {
            hideTitle: false,
            hideChartControls: false,
            hideTab: false,
            filters: { expanded: true },
          },
          // debug,
        })) as unknown;

        if (!cancelled) {
          destroyRef.current = toDestroyFn(embedded);

          // Hide loading overlay immediately after embedDashboard returns
          // The SDK creates the iframe synchronously, so we can clear loading right away
          // This allows users to see content as it progressively loads inside the iframe
          setLoading(false);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          const errorMessage =
            e instanceof Error ? e.message : 'Failed to load dashboard';
          setError(errorMessage);
          setLoading(false);
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
      destroyRef.current();
      clearRefreshTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboardId, supersetUrl, backendUrl, sdkFetchGuestToken]);

  return { ref, loading, error, reload };
}
