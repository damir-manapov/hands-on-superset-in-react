import { CSSProperties, ReactNode } from 'react';
import { useSupersetDashboard } from '../hooks/useSupersetDashboard';

function SupersetDashboard({
  dashboardId,
  supersetUrl = 'http://localhost:8088',
  backendUrl = 'http://localhost:3001',
  // if you have an app header, pass its height in px
  offsetTop = 0,
}: {
  dashboardId: string;
  supersetUrl?: string;
  backendUrl?: string;
  offsetTop?: number; // e.g. 64 for a header
}) {
  const { ref, loading, error /*, reload*/ } = useSupersetDashboard({
    dashboardId,
    supersetUrl,
    backendUrl,
  });

  return (
    <div
      className="superset-viewport"
      style={{
        position: 'relative',
        width: '100%',
        height: '100vh',
      }}
    >
      <div
        ref={ref}
        className="superset-mount"
        style={{ width: '100%', height: '100%' }}
      />
      {loading && <Overlay>Loading…</Overlay>}
      {error && <Overlay style={{ color: 'red' }}>Error: {error}</Overlay>}
    </div>
  );
}

type OverlayProps = {
  children: ReactNode;
  style?: CSSProperties;
};

function Overlay({ children, style }: OverlayProps) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        backgroundColor: 'rgba(255,255,255,0.9)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
        ...(style ?? {}),
      }}
    >
      <p>{children}</p>
    </div>
  );
}

export default SupersetDashboard;
