import { CSSProperties, ReactNode, useEffect, useState } from 'react';
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
  const [showLoading, setShowLoading] = useState(true);

  // Hide loading overlay immediately when iframe is detected or loading becomes false
  useEffect(() => {
    if (!loading) {
      // Loading is false, hide overlay immediately
      setShowLoading(false);
      return;
    }

    // While loading, check if iframe exists
    if (ref.current) {
      const iframe = ref.current.querySelector('iframe');
      if (iframe) {
        // Iframe exists, hide loading overlay immediately even if loading is still true
        setShowLoading(false);
      } else {
        // No iframe yet, show loading
        setShowLoading(true);
      }
    }
  }, [loading, ref]);

  // Poll for iframe creation to hide overlay as soon as it appears
  useEffect(() => {
    if (showLoading && ref.current) {
      const checkInterval = setInterval(() => {
        const iframe = ref.current?.querySelector('iframe');
        if (iframe) {
          setShowLoading(false);
          clearInterval(checkInterval);
        }
      }, 50); // Check every 50ms for faster detection

      return () => clearInterval(checkInterval);
    }
  }, [showLoading, ref]);

  return (
    <div
      className="superset-viewport"
      style={{
        position: 'relative',
        width: '100%',
        height: offsetTop > 0 ? `calc(100vh - ${offsetTop}px)` : '100%',
      }}
    >
      <div
        ref={ref}
        className="superset-mount"
        style={{ width: '100%', height: '100%' }}
      />
      {showLoading && <Overlay>Loading…</Overlay>}
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
        backgroundColor: 'rgba(255,255,255,0.3)', // Very transparent so content is clearly visible
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
        pointerEvents: 'none', // Allow interaction with content below
        transition: 'opacity 0.15s ease-out, visibility 0.15s ease-out', // Quick fade out
        ...(style ?? {}),
      }}
    >
      <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.7 }}>{children}</p>
    </div>
  );
}

export default SupersetDashboard;
