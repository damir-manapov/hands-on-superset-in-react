import { CSSProperties, ReactNode } from 'react';
import { useSupersetChart } from '../hooks/useSupersetChart';
import './SupersetChart.css';

function SupersetChart({
  chartId,
  supersetUrl = 'http://localhost:8088',
  backendUrl = 'http://localhost:3001',
  height = 400,
}: {
  chartId: string;
  supersetUrl?: string;
  backendUrl?: string;
  height?: number;
}) {
  const { iframeRef, loading, error } = useSupersetChart({
    chartId,
    supersetUrl,
    backendUrl,
  });

  return (
    <div className="superset-chart" style={{ height: `${height}px` }}>
      <iframe
        ref={iframeRef}
        className="superset-chart__iframe"
        title={`Superset Chart ${chartId}`}
        style={{ width: '100%', height: '100%', border: 'none' }}
      />
      {loading && <Overlay>Loading chart…</Overlay>}
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
      className="superset-chart__overlay"
      style={{
        position: 'absolute',
        inset: 0,
        backgroundColor: 'rgba(255,255,255,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
        pointerEvents: 'none',
        transition: 'opacity 0.2s ease-out, visibility 0.2s ease-out',
        ...(style ?? {}),
      }}
    >
      <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.8 }}>{children}</p>
    </div>
  );
}

export default SupersetChart;
