import { useEffect, useRef, useState, useMemo } from 'react';
import { embedDashboard, EmbeddedDashboard } from '@superset-ui/embedded-sdk';

interface SupersetDashboardProps {
  /** Embedded Dashboard UUID from “Enable Embedding” */
  dashboardId: string;
  /** Superset origin used for minting tokens; must match token's `aud` */
  supersetUrl?: string; // e.g. 'http://localhost:8088'
  /** Your backend origin that mints guest tokens */
  backendUrl?: string;  // e.g. 'http://localhost:3001'
  height?: number | string; // optional override
}

export default function SupersetDashboard({
  dashboardId,
  supersetUrl = 'http://localhost:8088',
  backendUrl = 'http://localhost:3001',
  height = 800,
}: SupersetDashboardProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const destroyRef = useRef<null | (() => void)>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Stable fetcher instance (avoids re-embedding loops)
  const fetchGuestToken = useMemo(() => {
    return async (): Promise<string> => {
      const res = await fetch(`${backendUrl}/api/superset/guest-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // <— recommended; harmless if backend doesn’t use cookies
        body: JSON.stringify({
          resources: [{ type: 'dashboard' as const, id: dashboardId }],
          user: { username: 'guest', first_name: 'Guest', last_name: 'User' },
          rls: [],
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Guest token failed: ${res.status} ${res.statusText} ${text}`);
      }
      const data = (await res.json()) as { token: string };
      if (!data?.token) throw new Error('Guest token missing in response');
      return data.token;
    };
  }, [backendUrl, dashboardId]);

  useEffect(() => {
    let cancelled = false;
  
    async function run() {
      if (!mountRef.current) return;
      setLoading(true);
      setError(null);
  
      // clear any prior embed
      destroyRef.current?.();
      destroyRef.current = null;
  
      try {
        const embedded = await embedDashboard({
          id: dashboardId,
          supersetDomain: supersetUrl,
          mountPoint: mountRef.current,
          fetchGuestToken,
          dashboardUiConfig: { hideTitle: false, hideChartControls: false, hideTab: false, filters: { expanded: true } },
        });
  
        // make a unified destroy function regardless of SDK shape
        const makeDestroy = (obj: unknown): (() => void) => {
          // v1: object with destroy()
          if (obj && typeof obj === 'object' && 'destroy' in obj && typeof (obj as any).destroy === 'function') {
            return () => (obj as any).destroy();
          }
          // some builds: object with unmount()
          if (obj && typeof obj === 'object' && 'unmount' in obj && typeof (obj as any).unmount === 'function') {
            return () => (obj as any).unmount();
          }
          // older examples (rare): returned a function
          if (typeof obj === 'function') {
            return obj as () => void;
          }
          // fallback no-op
          return () => {};
        };
  
        if (!cancelled) {
          destroyRef.current = makeDestroy(embedded as unknown as EmbeddedDashboard);
          setLoading(false);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message ?? 'Failed to load dashboard');
          setLoading(false);
        }
      }
    }
  
    void run();
    return () => {
      cancelled = true;
      destroyRef.current?.();
      destroyRef.current = null;
    };
  }, [dashboardId, supersetUrl, fetchGuestToken]);

  return (
    <div style={{ position: 'relative', width: '100%', height: typeof height === 'number' ? `${height}px` : height }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
      {loading && (
        <div style={overlayStyle}>
          <p>Loading dashboard…</p>
        </div>
      )}
      {error && (
        <div style={{ ...overlayStyle, color: 'red' }}>
          <p>Error: {error}</p>
        </div>
      )}
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  backgroundColor: 'rgba(255,255,255,0.9)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 10,
};
