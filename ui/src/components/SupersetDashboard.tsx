import { useSupersetDashboard } from "../hooks/useSupersetDashboard";

function SupersetDashboard({
  dashboardId,
  supersetUrl = "http://localhost:8088",
  backendUrl = "http://localhost:3001",
  height = 800,
}: {
  dashboardId: string;
  supersetUrl?: string;
  backendUrl?: string;
  height?: number | string;
}) {
  const { ref, loading, error /*, reload*/ } = useSupersetDashboard({
    dashboardId,
    supersetUrl,
    backendUrl,
  });

  return (
    <div style={{ position: "relative", width: "100%", height }}>
      <div ref={ref} style={{ width: "100%", height: "100%" }} />
      {loading && <Overlay>Loading dashboard…</Overlay>}
      {error && <Overlay style={{ color: "red" }}>Error: {error}</Overlay>}
    </div>
  );
}

function Overlay({ children, style = {} }: any) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        backgroundColor: "rgba(255,255,255,0.9)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10,
        ...style,
      }}
    >
      <p>{children}</p>
    </div>
  );
}

export default SupersetDashboard;
